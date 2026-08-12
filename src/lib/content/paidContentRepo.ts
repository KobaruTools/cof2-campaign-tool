/**
 * Téléchargement AUTHENTIFIÉ du lot de contenu payant d'une source (PER-321), depuis
 * le bucket privé `paid-books` au chemin `{sourceSlug}/content.json`. Même régime que
 * les PDF payants (`paidBooks.ts`, PER-252) : pas d'URL signée, on télécharge via la
 * SESSION et la RLS Storage (migration 0011) décide selon l'entitlement du compte
 * courant. Réservé au navigateur.
 *
 * IMPORTANT : un utilisateur NON entitlé (ou l'anonyme /play) n'atteint jamais cette
 * fonction — le chargeur (`loadPaidContent`) ne l'appelle que pour des sources déjà
 * confirmées accessibles par le manifeste. En cas de refus/absence (4xx), on renvoie
 * `null` (rien à charger) plutôt que de lever : une source entitlée sans `content.json`
 * (ex. le Bestiaire, qui n'apporte pas de contenu de construction) est un cas normal.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const BUCKET = 'paid-books';

/**
 * Télécharge et parse le lot JSON d'une source. `null` si le fichier est absent ou
 * l'accès refusé (4xx — indiscernables par conception côté Storage). LÈVE sur toute
 * autre erreur (réseau, 5xx, JSON illisible) : le chargeur la traite en best-effort.
 */
export async function fetchPaidContentJson(
  sourceSlug: string,
  contentVersion?: number,
): Promise<unknown | null> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  // Aucune session : jamais de contenu payant. Traité comme « rien à charger ».
  if (!accessToken) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const path = `${sourceSlug}/content.json`;
  // CACHE-BUSTING (essentiel) : Supabase Storage sert l'objet avec `cache-control: max-age=3600`, si
  // bien qu'après une republication (upsert au MÊME chemin) le navigateur resservait l'ANCIEN corps
  // pendant une heure — le contenu ne se mettait pas à jour malgré un vidage d'IndexedDB. On force donc
  // (1) un paramètre de version dans l'URL (une version bumpée = une URL neuve, jamais en cache) et
  // (2) `cache: 'no-store'` (le navigateur ne relit jamais sa copie HTTP). Le `?version=` est ignoré par
  // l'endpoint Storage mais suffit à distinguer les URLs.
  const query = contentVersion === undefined ? '' : `?version=${contentVersion}`;
  const endpoint = `${baseUrl}/storage/v1/object/authenticated/${BUCKET}/${path}${query}`;

  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Refus RLS ou fichier absent : Storage renvoie 400/404 sans divulguer l'existence.
  // Du point de vue du chargeur, tout 4xx = « aucun lot à fusionner pour cette source ».
  if (response.status >= 400 && response.status < 500) return null;
  if (!response.ok) {
    throw new Error(`Téléchargement du contenu payant échoué (HTTP ${response.status}).`);
  }
  return (await response.json()) as unknown;
}

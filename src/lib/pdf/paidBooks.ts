/**
 * Téléchargement AUTHENTIFIÉ des PDF payants du bucket privé `paid-books` (PER-252),
 * pour alimenter le visualiseur intégré (`PdfBookViewer`). Réservé au navigateur.
 *
 * Décisions (grill du 2026-07-27) :
 *  - **Pas d'URL signée** : on télécharge le fichier via la SESSION authentifiée. La
 *    RLS Storage (migration 0011) décide selon l'entitlement de l'utilisateur courant
 *    (même prédicat que les créatures, PER-242). Aucune URL publique, aucun TTL.
 *  - **Progression réelle** : plutôt que `supabase.storage.download()` (qui n'expose
 *    aucune progression), on `fetch` l'endpoint `authenticated` avec le jeton de
 *    session et on lit le `ReadableStream` → pourcentage via `Content-Length`. Le
 *    visualiseur affiche un indicateur pendant le chargement (fichier ~43 Mo).
 *  - **Cache MÉMOIRE de session** : le `Blob` téléchargé est gardé dans une `Map` au
 *    niveau MODULE (survit aux remontages de la modale, vidé au rechargement de la
 *    page) → rouvrir le même livre dans la même session est instantané. Pas de cache
 *    persistant (IndexedDB jugé superflu pour une consultation ponctuelle).
 *
 * Le `Blob` (immuable) est passé tel quel à react-pdf (`<Document file={blob}>`), ce
 * qui évite le détachement d'`ArrayBuffer` qu'un `Uint8Array` partagé subirait au
 * transfert vers le worker pdf.js.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const BUCKET = 'paid-books';

/**
 * Erreur d'ACCÈS REFUSÉ (non entitlé) — distincte d'une erreur technique. Levée quand
 * la RLS Storage refuse le téléchargement (401/403), pour afficher un message clair
 * (« Vous n'avez pas débloqué ce livre ») plutôt qu'une erreur générique.
 */
export class PaidBookAccessError extends Error {
  constructor(message = 'Accès au livre payant refusé.') {
    super(message);
    this.name = 'PaidBookAccessError';
  }
}

/** Cache mémoire de session : slug de source → PDF déjà téléchargé (`Blob`). */
const blobCache = new Map<string, Blob>();
/** Téléchargements en cours (dédoublonnage : deux ouvertures simultanées partagent la promesse). */
const inFlight = new Map<string, Promise<Blob>>();

/**
 * Télécharge le PDF payant d'une source (`{sourceSlug}/book.pdf`) via la session
 * authentifiée, avec progression. Sert le cache mémoire si déjà chargé cette session.
 *
 * @param sourceSlug slug de la source (segment de chemin ; ex. `'bestiaire'`)
 * @param onProgress rappel `(0..1 | null)` : fraction téléchargée, ou `null` si la
 *   taille totale est inconnue (progression indéterminée)
 * @throws {PaidBookAccessError} si l'accès est refusé (non entitlé)
 * @throws {Error} sur toute autre erreur (réseau, session absente, HTTP…)
 */
export async function downloadPaidBook(
  sourceSlug: string,
  onProgress?: (fraction: number | null) => void,
): Promise<Blob> {
  const cached = blobCache.get(sourceSlug);
  if (cached) {
    onProgress?.(1);
    return cached;
  }
  const pending = inFlight.get(sourceSlug);
  if (pending) return pending;

  const promise = fetchPaidBook(sourceSlug, onProgress)
    .then((blob) => {
      blobCache.set(sourceSlug, blob);
      return blob;
    })
    .finally(() => {
      inFlight.delete(sourceSlug);
    });
  inFlight.set(sourceSlug, promise);
  return promise;
}

/** Effectue le téléchargement streamé (sans cache) — cœur de `downloadPaidBook`. */
async function fetchPaidBook(
  sourceSlug: string,
  onProgress?: (fraction: number | null) => void,
): Promise<Blob> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    // Aucune session (déconnecté, ou session joueur anonyme non entitlée) : l'accès
    // payant n'est jamais servi sans compte → traité comme un refus d'accès.
    throw new PaidBookAccessError();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const path = `${sourceSlug}/book.pdf`;
  const endpoint = `${baseUrl}/storage/v1/object/authenticated/${BUCKET}/${path}`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Refus d'accès. Supabase Storage NE renvoie PAS 403 sur refus RLS : un objet non
  // autorisé apparaît « introuvable » (HTTP 400, corps `{"statusCode":"404",...}`) pour
  // ne pas divulguer son existence — indiscernable, par conception, d'un fichier
  // réellement absent. Du point de vue de l'utilisateur, 400/401/403/404 signifient tous
  // « tu n'as pas accès à ce livre » → message clair (accès refusé), pas une erreur
  // technique. Les autres statuts (5xx, réseau) restent des erreurs génériques.
  if ([400, 401, 403, 404].includes(response.status)) {
    throw new PaidBookAccessError();
  }
  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement du livre échoué (HTTP ${response.status}).`);
  }

  // Taille totale (pour la progression) : `Content-Length` si présent, sinon on
  // signale une progression indéterminée (`null`).
  const totalHeader = response.headers.get('Content-Length');
  const total = totalHeader ? Number.parseInt(totalHeader, 10) : NaN;
  const hasTotal = Number.isFinite(total) && total > 0;
  onProgress?.(hasTotal ? 0 : null);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (hasTotal) onProgress?.(Math.min(1, received / total));
    }
  }
  onProgress?.(1);

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

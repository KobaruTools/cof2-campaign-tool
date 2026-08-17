/**
 * Illustration/portrait de PNJ (PER-437) : socle stockage — upload, remplacement,
 * retrait et téléchargement de l'illustration d'un PNJ dans le bucket privé
 * `npc-portraits` (migration 0035). Réservé au navigateur.
 *
 * Variante DÉDIÉE de `characterPortrait.ts` (bucket séparé, RLS différente : le
 * MJ seul écrit, toute la campagne lit) plutôt qu'une factorisation forcée —
 * les deux entités (`Npc`/`Character`) restent distinctes en base, cf. la
 * convention déjà suivie pour les autres primitives de la milestone PNJ.
 *
 * Un PNJ a AU PLUS une illustration, à un chemin déterministe et stable
 * (`{npcId}/portrait`) : un nouvel envoi ÉCRASE l'ancienne (`upsert`).
 * L'existence de l'illustration n'est PAS dupliquée dans `campaign_npcs` :
 * l'absence d'objet dans le bucket EST l'état « pas d'illustration ».
 *
 * L'image est TOUJOURS ré-encodée en WebP côté client avant l'envoi, comme le
 * portrait de personnage.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

const BUCKET = 'npc-portraits';

/** Formats acceptés en ENTRÉE (avant compression) — même choix que le portrait de personnage, pas de svg. */
const ACCEPTED_INPUT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Taille max du fichier ORIGINAL avant même de tenter de le décoder. */
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 Mio

/** Dimension max (plus grand côté) après redimensionnement. */
const MAX_DIMENSION = 800;

/** Qualité d'encodage WebP cible. */
const WEBP_QUALITY = 0.82;

/** Erreur de VALIDATION (format/taille) — message déjà présentable au MJ, pas une erreur technique. */
export class NpcPortraitValidationError extends Error {}

function portraitPath(npcId: string): string {
  return `${npcId}/portrait`;
}

function portraitCropPath(npcId: string): string {
  return `${npcId}/portrait-crop.json`;
}

/** Valide le fichier choisi par le MJ avant toute tentative de décodage. */
export function validateNpcPortraitFile(file: { size: number; type: string }): void {
  if (!ACCEPTED_INPUT_TYPES.has(file.type)) {
    throw new NpcPortraitValidationError(
      "Format d'image non pris en charge — utilisez un PNG, un JPEG ou un WebP.",
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new NpcPortraitValidationError(
      `Image trop volumineuse (max ${Math.floor(MAX_INPUT_BYTES / (1024 * 1024))} Mo).`,
    );
  }
}

/** Redimensionne (plus grand côté ≤ `MAX_DIMENSION`) et ré-encode en WebP via un canvas navigateur. */
async function compressNpcPortraitImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Contexte canvas indisponible pour la compression de l'image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  );
  if (!blob) throw new Error("Échec de l'encodage de l'image compressée.");
  return blob;
}

/**
 * Dépose ou remplace l'illustration d'un PNJ. Valide le fichier, le
 * redimensionne/compresse, puis l'envoie avec sa zone de recadrage (écrase
 * l'éventuelle illustration existante). La RLS (migration 0035) refuse
 * l'envoi si l'appelant n'est pas le MJ propriétaire de la campagne du PNJ.
 *
 * @throws {NpcPortraitValidationError} format ou taille d'origine refusés
 * @throws {Error} échec technique (réseau, refus RLS, encodage…)
 */
export async function uploadNpcPortrait(
  npcId: string,
  file: File,
  cropRect: PortraitCropRect,
): Promise<void> {
  validateNpcPortraitFile(file);
  const compressed = await compressNpcPortraitImage(file);

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(portraitPath(npcId), compressed, {
      contentType: 'image/webp',
      upsert: true,
    });
  if (error) throw error;

  const cropBlob = new Blob([JSON.stringify(cropRect)], { type: 'application/json' });
  const { error: cropError } = await supabase.storage
    .from(BUCKET)
    .upload(portraitCropPath(npcId), cropBlob, {
      contentType: 'application/json',
      upsert: true,
    });
  if (cropError) throw cropError;
}

/** Retire l'illustration personnalisée d'un PNJ. */
export async function removeNpcPortrait(npcId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([portraitPath(npcId), portraitCropPath(npcId)]);
  if (error) throw error;
}

/**
 * Télécharge l'illustration d'un PNJ, ou `null` s'il n'en a pas (objet
 * absent — pas une erreur : c'est l'état par défaut de tout PNJ).
 */
export async function downloadNpcPortrait(npcId: string): Promise<Blob | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(portraitPath(npcId));
  if (error) {
    // Supabase Storage ne distingue pas « objet absent » d'un refus RLS côté
    // client (cf. characterPortrait.ts) — dans les deux cas, l'appelant doit
    // simplement retomber sur « pas d'illustration » plutôt que planter.
    return null;
  }
  return data;
}

/**
 * Télécharge la zone de recadrage carrée choisie par le MJ pour l'illustration
 * du PNJ, ou `null` si absente — l'appelant doit alors se replier sur l'image
 * entière.
 */
export async function downloadNpcPortraitCropRect(npcId: string): Promise<PortraitCropRect | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(portraitCropPath(npcId));
  if (error) return null;
  try {
    return JSON.parse(await data.text()) as PortraitCropRect;
  } catch {
    return null;
  }
}

/**
 * Portrait de personnage personnalisé (PER-382) : socle stockage — upload,
 * remplacement, retrait et téléchargement du portrait d'un personnage dans le
 * bucket privé `character-portraits` (migration 0020). Réservé au navigateur.
 *
 * Un personnage a AU PLUS un portrait, à un chemin déterministe et stable
 * (`{characterId}/portrait`, sans extension — le type MIME est celui déclaré à
 * l'upload) : un nouvel envoi ÉCRASE l'ancien (`upsert`), il n'y a jamais
 * d'historique ni de listing à faire. L'existence du portrait n'est PAS
 * dupliquée dans le blob `Character` (JSONB) : l'absence d'objet dans le bucket
 * EST l'état « pas de portrait personnalisé » (cf. mémoire de design
 * PER-382→385 — objectif explicite de ne pas alourdir la fiche).
 *
 * L'image est TOUJOURS ré-encodée en WebP côté client (redimensionnement +
 * compression canvas) avant l'envoi, quel que soit le format d'origine accepté
 * (png/jpeg/webp) — la limite de taille serveur (bucket, migration 0020) n'est
 * qu'un garde-fou de disponibilité (compte gratuit sans carte).
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const BUCKET = 'character-portraits';

/** Formats acceptés en ENTRÉE (avant compression) — décision du ticket PER-382, pas de svg. */
const ACCEPTED_INPUT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Taille max du fichier ORIGINAL avant même de tenter de le décoder (évite de geler l'onglet sur une photo énorme). */
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // 15 Mio

/** Dimension max (plus grand côté) après redimensionnement. */
const MAX_DIMENSION = 800;

/** Qualité d'encodage WebP cible. */
const WEBP_QUALITY = 0.82;

/** Erreur de VALIDATION (format/taille) — message déjà présentable au joueur, pas une erreur technique. */
export class PortraitValidationError extends Error {}

function portraitPath(characterId: string): string {
  return `${characterId}/portrait`;
}

/** Valide le fichier choisi par l'utilisateur avant toute tentative de décodage. */
export function validatePortraitFile(file: { size: number; type: string }): void {
  if (!ACCEPTED_INPUT_TYPES.has(file.type)) {
    throw new PortraitValidationError(
      "Format d'image non pris en charge — utilisez un PNG, un JPEG ou un WebP.",
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new PortraitValidationError(
      `Image trop volumineuse (max ${Math.floor(MAX_INPUT_BYTES / (1024 * 1024))} Mo).`,
    );
  }
}

/** Redimensionne (plus grand côté ≤ `MAX_DIMENSION`) et ré-encode en WebP via un canvas navigateur. */
async function compressPortraitImage(file: Blob): Promise<Blob> {
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
 * Dépose ou remplace le portrait d'un personnage. Valide le fichier, le
 * redimensionne/compresse, puis l'envoie (écrase l'éventuel portrait existant).
 * La RLS (migration 0020) refuse l'envoi si l'appelant n'est ni le joueur
 * propriétaire du personnage ni le MJ de sa campagne.
 *
 * @throws {PortraitValidationError} format ou taille d'origine refusés
 * @throws {Error} échec technique (réseau, refus RLS, encodage…)
 */
export async function uploadCharacterPortrait(characterId: string, file: File): Promise<void> {
  validatePortraitFile(file);
  const compressed = await compressPortraitImage(file);

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(portraitPath(characterId), compressed, {
      contentType: 'image/webp',
      upsert: true,
    });
  if (error) throw error;
}

/** Retire le portrait personnalisé d'un personnage (redevient l'illustration standard). */
export async function removeCharacterPortrait(characterId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage.from(BUCKET).remove([portraitPath(characterId)]);
  if (error) throw error;
}

/**
 * Télécharge le portrait personnalisé d'un personnage, ou `null` s'il n'en a pas
 * (objet absent — pas une erreur : c'est l'état par défaut de tout personnage).
 */
export async function downloadCharacterPortrait(characterId: string): Promise<Blob | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(portraitPath(characterId));
  if (error) {
    // Supabase Storage ne distingue pas « objet absent » d'un refus RLS côté
    // client (les deux remontent une erreur générique, cf. paidBooks.ts) — dans
    // les deux cas, l'appelant doit simplement retomber sur l'illustration
    // standard plutôt que planter.
    return null;
  }
  return data;
}

/**
 * Applique un recadrage (zone en pixels de l'image source) et produit un
 * nouveau `File` — utilisé par `PortraitImportDialog` (PER-392) avant l'envoi.
 * Le fichier recadré retraverse ensuite `compressPortraitImage` (inchangé),
 * qui gère le redimensionnement/ré-encodage final en WebP.
 */
export interface CropAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropImageToFile(file: File, area: CropAreaPixels): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const width = Math.max(1, Math.round(area.width));
  const height = Math.max(1, Math.round(area.height));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexte canvas indisponible pour le recadrage.');
  ctx.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, width, height);
  bitmap.close();

  const type = file.type || 'image/png';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type));
  if (!blob) throw new Error("Échec de l'encodage de l'image recadrée.");
  return new File([blob], file.name, { type: blob.type });
}

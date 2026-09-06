'use client';

/**
 * Déclenche l'export PDF « Fiche officielle (BBE) » (PER-202) — même patron que
 * `downloadCampaignEditorPdf.tsx` (PER-201), sans couleur d'accent par profil (la trame BBE
 * a une esthétique dorée fixe).
 */
import { pdf } from '@react-pdf/renderer';
import { buildCharacterPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { OfficialBbeDocument } from '@/components/pdf/officialBbe/OfficialBbeDocument';
import { fontsReady } from '@/components/pdf/registerFonts';
import type { Character } from '@/lib/character/types';

export async function downloadOfficialBbePdf(character: Character, playerName: string | null = null): Promise<void> {
  const data = buildCharacterPdfData(character, playerName);
  await fontsReady;
  const blob = await pdf(<OfficialBbeDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

'use client';

/**
 * Déclenche l'export PDF « Campaign Editor » (PER-201) — même patron que
 * `downloadCharacterExport` (`transferExport.ts`, export JSON) : construit les données,
 * rend le PDF côté navigateur (`@react-pdf/renderer`, 100% client), puis télécharge via un
 * `Blob`/ancre éphémère.
 */
import { pdf } from '@react-pdf/renderer';
import { buildCharacterPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { CampaignEditorDocument } from '@/components/pdf/campaignEditor/CampaignEditorDocument';
import { classColor } from '@/lib/ui/classColors';
import type { Character } from '@/lib/character/types';

export async function downloadCampaignEditorPdf(character: Character, playerName: string | null = null): Promise<void> {
  const data = buildCharacterPdfData(character, playerName);
  const accent = classColor(character.classId);
  const blob = await pdf(<CampaignEditorDocument data={data} accent={accent} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

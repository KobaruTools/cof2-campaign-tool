/**
 * Document PDF « Fiche officielle (BBE) » (PER-202) — reproduction vectorielle (pas de
 * form-fill : le PDF source n'a pas d'AcroForm, cf. plan) de la trame papier officielle
 * Chroniques Oubliées Fantasy, à partir de `CampaignEditorPdfData` (`buildCharacterPdfData`,
 * partagée avec le format Campaign Editor de PER-201).
 */
import { Document, Page } from '@react-pdf/renderer';
import type { CampaignEditorPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { mapPathsToBbeSlots } from '@/lib/character/pdfExport/mapPathsToBbeSlots';
import { DecorativeFrame } from './DecorativeFrame';
import { Page1 } from './Page1';
import { Page2 } from './Page2';
import { styles } from './styles';

export function OfficialBbeDocument({ data }: { data: CampaignEditorPdfData }) {
  const slots = mapPathsToBbeSlots(data.paths);
  return (
    <Document title={data.identity.name} author="Chroniques Oubliées Fantasy — fiche officielle">
      <Page size="LETTER" style={styles.page}>
        <DecorativeFrame>
          <Page1 data={data} peoplePath={slots.peoplePath} />
        </DecorativeFrame>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <DecorativeFrame>
          <Page2 identity={data.identity} slots={slots} />
        </DecorativeFrame>
      </Page>
    </Document>
  );
}

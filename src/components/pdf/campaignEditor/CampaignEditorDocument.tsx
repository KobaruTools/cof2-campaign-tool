/**
 * Document PDF « Campaign Editor » (PER-201) : rendu vectoriel maison, aux couleurs de l'app,
 * de la couche de données `CampaignEditorPdfData` (`buildCharacterPdfData.ts`). Mise en page
 * LIBRE (flexbox, pagination automatique de `@react-pdf/renderer`) plutôt que calquée pixel à
 * pixel sur la trame papier officielle : le contenu d'un personnage est de longueur variable
 * (1 à 6 voies, texte de rang libre, équipement ouvert), une trame à 2 pages fixes casserait.
 */
import { Document, Page, Text } from '@react-pdf/renderer';
import type { CampaignEditorPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { DEFAULT_ACCENT, styles } from './styles';
import { IdentitySection } from './IdentitySection';
import { AbilitiesSection } from './AbilitiesSection';
import { DerivedStatsSection } from './DerivedStatsSection';
import { AttacksEquipmentSection } from './AttacksEquipmentSection';
import { PathsSection } from './PathsSection';

export function CampaignEditorDocument({
  data,
  accent = DEFAULT_ACCENT,
}: {
  data: CampaignEditorPdfData;
  /** Couleur du profil principal (`classColor(classId)`), cohérente avec le reste de l'app. */
  accent?: string;
}) {
  return (
    <Document title={data.identity.name} author="Campaign Editor">
      <Page size="A4" style={styles.page} wrap>
        <IdentitySection identity={data.identity} accent={accent} />
        {data.identity.description && <Text style={styles.description}>{data.identity.description}</Text>}
        <AbilitiesSection abilities={data.abilities} accent={accent} />
        <DerivedStatsSection derived={data.derived} accent={accent} />
        <AttacksEquipmentSection attacks={data.attacks} equipment={data.equipment} accent={accent} />
        <PathsSection paths={data.paths} accent={accent} />
      </Page>
    </Document>
  );
}

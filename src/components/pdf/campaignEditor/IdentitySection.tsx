import { Text, View } from '@react-pdf/renderer';
import type { CampaignEditorPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { styles } from './styles';

export function IdentitySection({
  identity,
  accent,
}: {
  identity: CampaignEditorPdfData['identity'];
  accent: string;
}) {
  return (
    <View style={[styles.headerRow, { borderBottomColor: accent }]}>
      <View>
        <Text style={styles.characterName}>{identity.name}</Text>
        <Text style={styles.identitySubtitle}>
          {identity.ancestryName} — {identity.className}
          {identity.playerName ? ` — Joué par ${identity.playerName}` : ''}
        </Text>
      </View>
      <Text style={[styles.levelBadge, { color: accent }]}>Niveau {identity.level}</Text>
    </View>
  );
}

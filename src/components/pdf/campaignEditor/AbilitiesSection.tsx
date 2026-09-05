import { Text, View } from '@react-pdf/renderer';
import type { CampaignEditorPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { styles } from './styles';

export function AbilitiesSection({
  abilities,
  accent,
}: {
  abilities: CampaignEditorPdfData['abilities'];
  accent: string;
}) {
  return (
    <View>
      <Text style={[styles.sectionTitle, { backgroundColor: accent }]}>Caractéristiques</Text>
      <View style={styles.grid}>
        {abilities.map((a) => (
          <View key={a.id} style={styles.statBox}>
            <Text style={styles.statLabel}>{a.id}</Text>
            <Text style={styles.statValue}>{a.value >= 0 ? `+${a.value}` : a.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

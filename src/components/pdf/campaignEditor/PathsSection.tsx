import { Text, View } from '@react-pdf/renderer';
import type { CampaignEditorPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { RichRuns } from './RichRuns';
import { styles } from './styles';

export function PathsSection({ paths, accent }: { paths: CampaignEditorPdfData['paths']; accent: string }) {
  return (
    <View>
      <Text style={[styles.sectionTitle, { backgroundColor: accent }]}>Voies & capacités</Text>
      {paths.map((group) => (
        <View key={group.title} style={styles.pathBlock} wrap={false}>
          <Text style={[styles.pathTitle, { borderBottomColor: accent }]}>{group.title}</Text>
          {group.ranks.map((rank) => (
            <View key={rank.rank} style={styles.rankRow}>
              <Text style={styles.rankBadge}>Rang {rank.rank}</Text>
              <View style={styles.rankBody}>
                <Text style={styles.rankName}>{rank.name}</Text>
                <RichRuns runs={rank.runs} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

import { Text, View } from '@react-pdf/renderer';
import type { CampaignEditorPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { styles } from './styles';

export function DerivedStatsSection({
  derived,
  accent,
}: {
  derived: CampaignEditorPdfData['derived'];
  accent: string;
}) {
  const boxes: { label: string; value: string }[] = [
    { label: 'Init.', value: `${derived.initiative}` },
    { label: 'Déf.', value: `${derived.defense}` },
    { label: 'Pts de vigueur', value: `${derived.maxHp}` },
    { label: 'Pts de chance', value: `${derived.luckPoints}` },
    { label: 'Dés récup.', value: `${derived.recoveryDiceCount}${derived.recoveryDie}` },
    ...(derived.manaPoints !== null ? [{ label: 'Pts de mana', value: `${derived.manaPoints}` }] : []),
  ];
  return (
    <View>
      <Text style={[styles.sectionTitle, { backgroundColor: accent }]}>Statistiques dérivées</Text>
      <View style={styles.grid}>
        {boxes.map((b) => (
          <View key={b.label} style={styles.statBox}>
            <Text style={styles.statLabel}>{b.label}</Text>
            <Text style={styles.statValue}>{b.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

import { Text, View } from '@react-pdf/renderer';
import type { CampaignEditorPdfData } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { styles } from './styles';

function AttackRow({ label, attack, weaponName, damage }: { label: string; attack: number; weaponName: string; damage: string }) {
  return (
    <View style={styles.tableRow}>
      <Text style={{ width: 60 }}>{label}</Text>
      <Text style={styles.tableCellName}>{weaponName}</Text>
      <Text style={styles.tableCellValue}>Touche 1d20{attack >= 0 ? '+' : ''}{attack}</Text>
      <Text style={styles.tableCellValue}>DM {damage}</Text>
    </View>
  );
}

export function AttacksEquipmentSection({
  attacks,
  equipment,
  accent,
}: {
  attacks: CampaignEditorPdfData['attacks'];
  equipment: string[];
  accent: string;
}) {
  return (
    <View>
      <Text style={[styles.sectionTitle, { backgroundColor: accent }]}>Armes</Text>
      <View style={styles.table}>
        <AttackRow
          label="Contact"
          attack={attacks.melee.attack}
          weaponName={attacks.melee.weapon?.name ?? 'Mains nues'}
          damage={attacks.melee.weapon?.damage ?? '—'}
        />
        {attacks.ranged.weapon && (
          <AttackRow
            label="Distance"
            attack={attacks.ranged.attack}
            weaponName={attacks.ranged.weapon.name}
            damage={attacks.ranged.weapon.damage}
          />
        )}
        <View style={styles.tableRow}>
          <Text style={{ width: 60 }}>Magie</Text>
          <Text style={styles.tableCellName} />
          <Text style={styles.tableCellValue}>
            Touche 1d20{attacks.magic.attack >= 0 ? '+' : ''}
            {attacks.magic.attack}
          </Text>
          <Text style={styles.tableCellValue} />
        </View>
      </View>
      <Text style={[styles.sectionTitle, { backgroundColor: accent }]}>Équipement</Text>
      <View>
        {equipment.length === 0 ? (
          <Text style={styles.equipmentLine}>—</Text>
        ) : (
          equipment.map((line, i) => (
            <Text key={i} style={styles.equipmentLine}>
              • {line}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

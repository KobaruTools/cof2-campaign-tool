/**
 * Page 1 de la « Fiche officielle (BBE) » (PER-202) : identité, caractéristiques, voie du
 * peuple, statistiques dérivées, attaques/armes et équipement. Positionnement ABSOLU en
 * coordonnées mesurées sur la trame de référence (`layout.ts`) — pas de flexbox approximatif :
 * l'objectif est une reproduction fidèle de la trame BBE, pas une mise en page libre inspirée
 * de son style (contrairement à Campaign Editor, PER-201).
 */
import { Text, View } from '@react-pdf/renderer';
import type { CampaignEditorPdfData, PdfPathGroup } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { RankRowsAbsolute } from './RankRowsAbsolute';
import { DiamondPips } from './DiamondPips';
import { TitleBandValue } from './TitleBandValue';
import { GOLD, GRAY_BORDER, styles } from './styles';
import { PAGE1 } from './layout';

function Abs({
  x,
  y,
  w,
  h,
  children,
  style,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  children?: React.ReactNode;
  style?: React.ComponentProps<typeof View>['style'];
}) {
  return (
    <View style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, style]}>
      {children}
    </View>
  );
}

function Band({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <Abs x={x} y={y} w={w} h={h} style={{ backgroundColor: GOLD, justifyContent: 'center', paddingHorizontal: 6 }}>
      <Text style={{ color: '#fff', fontWeight: 700, fontSize: 8.5, textTransform: 'uppercase' }}>{label}</Text>
    </Abs>
  );
}

function BoxValue({ x, y, w, h, value, big }: { x: number; y: number; w: number; h: number; value: string; big?: boolean }) {
  return (
    <Abs x={x} y={y} w={w} h={h} style={{ borderWidth: 1, borderColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontWeight: 700, fontSize: big ? 13 : 9 }}>{value}</Text>
    </Abs>
  );
}


export function Page1({ data, peoplePath }: { data: CampaignEditorPdfData; peoplePath: PdfPathGroup | null }) {
  const { identity, abilities, derived, attacks, equipment } = data;
  const L = PAGE1;

  return (
    <View style={{ flexGrow: 1 }}>
      {/* En-tête : logo + identité + niveau */}
      <Abs x={L.header.logoX} y={L.header.logoY} w={200}>
        <Text style={styles.logoLine1}>CHRONIQUES</Text>
        <Text style={styles.logoLine1}>OUBLIÉES</Text>
        <Text style={styles.logoLine2}>FANTASY</Text>
      </Abs>
      {/* Encadrement du nom : filets simples au-dessus/en dessous (la double-barre + losange
          mesurée sur la trame de référence rendait mal à cette échelle — simplifié sur retour
          visuel PER-202). */}
      <Abs x={L.header.ornamentX} y={L.header.barTopGapY} w={L.header.ornamentW} h={0.6} style={{ borderBottomWidth: 1, borderBottomColor: GOLD }} />
      <Abs x={L.header.ornamentX} y={L.header.barBottomY} w={L.header.ornamentW} h={0.6} style={{ borderBottomWidth: 1, borderBottomColor: GOLD }} />
      <Abs x={L.header.nameCenterX - L.header.nameWidth / 2} y={L.header.nameTextY} w={L.header.nameWidth}>
        <Text style={{ fontSize: 14, fontWeight: 700, textAlign: 'center' }}>{identity.name}</Text>
      </Abs>
      <Abs x={L.header.nameCenterX - L.header.nameWidth / 2} y={L.header.captionY} w={L.header.nameWidth}>
        <Text style={{ fontSize: 7, fontWeight: 700, color: GOLD, textTransform: 'uppercase', textAlign: 'center' }}>
          Nom du personnage
        </Text>
      </Abs>
      <Abs x={L.header.nameCenterX - L.header.nameWidth / 2} y={L.header.subtitleY} w={L.header.nameWidth}>
        <Text style={{ fontSize: 6.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase', textAlign: 'center' }}>
          {identity.ancestryName} — {identity.className}
        </Text>
      </Abs>
      <Abs x={L.header.nivX} y={L.header.nivY} w={L.header.nivLabelW} h={L.header.nivH} style={{ backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>NIV.</Text>
      </Abs>
      <BoxValue x={L.header.nivX + L.header.nivLabelW} y={L.header.nivY} w={L.header.nivValueW} h={L.header.nivH} value={`${identity.level}`} />

      <Abs x={51} y={95} w={110}>
        <Text style={{ fontSize: 7, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Joueur</Text>
        <Text style={{ fontSize: 9, marginTop: 2 }}>{identity.playerName ?? ''}</Text>
        <View style={{ borderBottomWidth: 0.75, borderBottomColor: GOLD, marginTop: identity.playerName ? 2 : 12 }} />
      </Abs>

      {/* Pas de description ici : la trame de référence n'a pas ce champ en page 1 (déjà
          affiché en page 2, « Description du personnage ») — l'ajouter en doublon débordait
          sur les éléments positionnés en absolu juste en dessous dès que le texte dépassait
          2-3 lignes (constaté PER-202). */}

      {/* Caractéristiques */}
      <Band x={L.caracteristiques.x} y={L.caracteristiques.bandY} w={L.caracteristiques.w} h={L.caracteristiques.bandH} label="Caractéristiques" />
      <Abs x={L.caracteristiques.valueX} y={L.caracteristiques.columnHeadersY} w={L.caracteristiques.valueW}>
        <Text style={{ fontSize: 6.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase', textAlign: 'center' }}>Valeur</Text>
      </Abs>
      <Abs x={L.caracteristiques.notesX} y={L.caracteristiques.columnHeadersY} w={L.caracteristiques.notesW}>
        <Text style={{ fontSize: 6.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase', textAlign: 'center' }}>Notes</Text>
      </Abs>
      {abilities.map((a, i) => {
        const rowY = L.caracteristiques.firstRowY + i * L.caracteristiques.rowH;
        return (
          <View key={a.id}>
            <Abs
              x={L.caracteristiques.x}
              y={rowY}
              w={L.caracteristiques.labelW}
              h={28}
              style={{ backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: 700, fontSize: 8 }}>{a.id}</Text>
            </Abs>
            <BoxValue x={L.caracteristiques.valueX} y={rowY} w={L.caracteristiques.valueW} h={28} value={a.value >= 0 ? `+${a.value}` : `${a.value}`} />
            <Abs
              x={L.caracteristiques.notesX}
              y={rowY}
              w={L.caracteristiques.notesW}
              h={28}
              style={{ borderWidth: 0.75, borderColor: GRAY_BORDER }}
            />
          </View>
        );
      })}

      {/* Voie du peuple */}
      <TitleBandValue
        x={L.voieDuPeuple.x}
        y={L.voieDuPeuple.y}
        w={L.voieDuPeuple.w}
        h={L.voieDuPeuple.bandH}
        label="Voie du peuple"
        value={peoplePath?.title ?? ''}
      />
      <Abs
        x={L.voieDuPeuple.x}
        y={L.voieDuPeuple.firstRowY}
        w={L.voieDuPeuple.w}
        h={L.voieDuPeuple.rowH * 5}
        style={{ borderWidth: 1, borderColor: GOLD, borderTopWidth: 0 }}
      />
      <RankRowsAbsolute
        x={L.voieDuPeuple.x}
        firstRowY={L.voieDuPeuple.firstRowY}
        width={L.voieDuPeuple.w}
        rowH={L.voieDuPeuple.rowH}
        checkboxSize={L.voieDuPeuple.checkboxSize}
        group={peoplePath}
      />

      {/* Statistiques dérivées */}
      <BoxValue x={L.stats.initX} y={L.stats.initDefY} w={L.stats.initW} h={L.stats.initDefH - 16} value={`${derived.initiative >= 0 ? '+' : ''}${derived.initiative}`} big />
      <Band x={L.stats.initX} y={L.stats.initDefY + L.stats.initDefH - 16} w={L.stats.initW} h={16} label="Init." />
      <BoxValue x={L.stats.defX} y={L.stats.initDefY} w={L.stats.defW} h={L.stats.initDefH - 16} value={`${derived.defense}`} big />
      <Band x={L.stats.defX} y={L.stats.initDefY + L.stats.initDefH - 16} w={L.stats.defW} h={16} label="Déf." />

      <BoxValue x={L.stats.x} y={L.stats.vigueurY} w={L.stats.w} h={L.stats.vigueurH - 16} value={`${derived.maxHp}`} big />
      <Band x={L.stats.x} y={L.stats.vigueurY + L.stats.vigueurH - 16} w={L.stats.w} h={16} label="Pts de vigueur" />

      <Abs x={L.stats.x} y={L.stats.chanceY} w={L.stats.w} h={L.stats.chanceH - 16} style={{ borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 }}>
        <DiamondPips count={derived.luckPoints} />
      </Abs>
      <Band x={L.stats.x} y={L.stats.chanceY + L.stats.chanceH - 16} w={L.stats.w} h={16} label="Points de chance" />
      <Abs x={L.stats.x} y={L.stats.chanceY + L.stats.chanceH + 3} w={L.stats.w}>
        <Text style={{ fontSize: 6.5 }}>+10 à un test</Text>
      </Abs>

      <Abs x={L.stats.x} y={L.stats.recupY} w={L.stats.w} h={L.stats.recupH - 16} style={{ borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 }}>
        <DiamondPips count={derived.recoveryDiceCount} />
      </Abs>
      <Band x={L.stats.x} y={L.stats.recupY + L.stats.recupH - 16} w={L.stats.w} h={16} label="Dés de récupération" />
      <Abs x={L.stats.x} y={L.stats.recupY + L.stats.recupH + 3} w={L.stats.w}>
        <Text style={{ fontSize: 6 }}>Restauration PV = (d+1/2 niv.) PV</Text>
      </Abs>

      {derived.manaPoints !== null && (
        <>
          <BoxValue x={L.stats.x} y={L.stats.manaY} w={L.stats.w} h={L.stats.manaH - 16} value={`${derived.manaPoints}`} big />
          <Band x={L.stats.x} y={L.stats.manaY + L.stats.manaH - 16} w={L.stats.w} h={16} label="Points de mana" />
        </>
      )}

      {/* Identité (Famille / Profil / Idéal héroïque / Travers) */}
      {(
        [
          { label: 'Famille', value: identity.familyName },
          { label: 'Profil', value: identity.className },
          { label: 'Idéal héroïque', value: null },
          { label: 'Travers', value: null },
        ] as const
      ).map(({ label, value }, i) => (
        <Abs key={label} x={L.bottomLeft.x} y={L.bottomLeft.identityLabelsY + i * L.bottomLeft.identityRowH} w={186}>
          <Text style={{ fontSize: 7, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>{label}</Text>
          {value ? (
            <Text style={{ fontSize: 9, marginTop: 2 }}>{value}</Text>
          ) : (
            <View style={{ borderBottomWidth: 0.75, borderBottomColor: GOLD, marginTop: 14 }} />
          )}
        </Abs>
      ))}

      {/* Attaques (contact/distance/magique) */}
      <Abs x={L.bottomLeft.x} y={L.bottomLeft.columnHeadersY} w={L.bottomLeft.labelW}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Attaques</Text>
      </Abs>
      <Abs x={L.bottomLeft.totalX} y={L.bottomLeft.columnHeadersY} w={L.bottomLeft.totalW}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Total</Text>
      </Abs>
      {(
        [
          { label: 'Contact', total: attacks.melee.attack, sub: 'FOR' },
          { label: 'Distance', total: attacks.ranged.attack, sub: 'AGI' },
          { label: 'Magique', total: attacks.magic.attack, sub: 'VOL' },
        ] as const
      ).map((row, i) => {
        const y = L.bottomLeft.attaquesY + i * L.bottomLeft.rowH;
        return (
          <View key={row.label}>
            <Band x={L.bottomLeft.x} y={y} w={L.bottomLeft.labelW} h={28} label={row.label} />
            <BoxValue x={L.bottomLeft.totalX} y={y} w={L.bottomLeft.totalW} h={28} value={`${row.total >= 0 ? '+' : ''}${row.total}`} />
            <Abs x={L.bottomLeft.nivX} y={y} w={L.bottomLeft.nivW} h={28} style={{ borderWidth: 0.75, borderColor: GRAY_BORDER, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 6, color: '#9a9a9a' }}>NIV.</Text>
            </Abs>
            <Abs x={L.bottomLeft.abilX} y={y} w={L.bottomLeft.abilW} h={28} style={{ borderWidth: 0.75, borderColor: GRAY_BORDER, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 6, color: '#9a9a9a' }}>{row.sub}</Text>
            </Abs>
          </View>
        );
      })}

      {/* Armes & attaques : libellés en texte simple (pas un bandeau plein), comme la trame de
          référence — contrairement à « Caractéristiques »/« Voie du peuple », ce n'est pas un
          titre de section mais un en-tête de colonnes. */}
      <Abs x={L.armes.x} y={L.armes.bandY} w={150}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Armes</Text>
      </Abs>
      <Abs x={L.armes.attackX} y={L.armes.bandY} w={L.armes.attackW}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Attaque</Text>
      </Abs>
      <Abs x={L.armes.dmX} y={L.armes.bandY} w={L.armes.dmW}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>DM</Text>
      </Abs>
      {(
        [
          { weapon: attacks.melee.weapon, total: attacks.melee.attack },
          { weapon: attacks.ranged.weapon, total: attacks.ranged.attack },
          { weapon: null, total: attacks.magic.attack },
        ] as const
      ).map((row, i) => {
        const y = L.armes.firstNameY + i * L.armes.rowSpacing;
        return (
          <View key={i}>
            <Abs x={L.armes.x} y={y} w={L.armes.attackX - L.armes.x - 4} h={L.armes.nameH} style={{ borderWidth: 1, borderColor: GOLD, justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 7.5 }}>{row.weapon?.name ?? '—'}</Text>
            </Abs>
            <Abs x={L.armes.attackX} y={y} w={L.armes.attackW} h={L.armes.nameH} style={{ borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 7 }}>
                1d20{row.total >= 0 ? '+' : ''}
                {row.total}
              </Text>
            </Abs>
            <Abs x={L.armes.dmX} y={y} w={L.armes.dmW} h={L.armes.nameH} style={{ borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 7 }}>{row.weapon?.damage ?? '—'}</Text>
            </Abs>
            <Abs
              x={L.armes.x}
              y={y + L.armes.nameH + 3}
              w={L.stats.defX + L.stats.defW - L.armes.x}
              h={L.armes.placeholderH}
              style={{ borderWidth: 0.75, borderColor: GRAY_BORDER, justifyContent: 'center', paddingHorizontal: 4 }}
            >
              <Text style={{ fontSize: 6.5, color: '#9a9a9a', textTransform: 'uppercase' }}>Spécial/portée</Text>
            </Abs>
          </View>
        );
      })}

      {/* Équipement */}
      <Band x={L.equipement.x} y={L.equipement.bandY} w={L.equipement.w} h={L.equipement.bandH} label="Équipement" />
      <Abs x={L.equipement.x} y={L.equipement.boxY} w={L.equipement.w} h={L.equipement.boxH} style={{ borderWidth: 1, borderColor: GOLD, padding: 4 }}>
        {equipment.length === 0 ? (
          <Text style={styles.placeholderText}>—</Text>
        ) : (
          <Text style={{ fontSize: 7, lineHeight: 1.4 }}>{equipment.join(', ')}</Text>
        )}
      </Abs>
    </View>
  );
}

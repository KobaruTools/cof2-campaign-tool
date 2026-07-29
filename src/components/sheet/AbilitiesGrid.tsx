'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AbilityId, Ancestry } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import type { AncestryChoice } from '@/lib/character/ancestry';
import type {
  AbilityFormBonusSource,
  AbilityModSource,
  AbilityOverrideSource,
  BonusDieSource,
} from '@/lib/character/effects';
import type { AbilityBonusItemSource } from '@/lib/character/equipment';
import { abilityTotalColor, abilityTotalFontSize } from '@/lib/ui/abilityColors';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';
import { AbilityBreakdownTooltip } from '@/components/AbilityBreakdownTooltip';
import { AppTooltip } from '@/components/AppTooltip';
import { BreakdownContent } from '@/components/BreakdownContent';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { SignedNumberField } from '@/components/SignedNumberField';

export interface AbilitiesGridProps {
  /**
   * Les 7 valeurs SAISIES du personnage (base + modificateurs de peuple déjà inclus).
   * Les modificateurs permanents de capacités (`abilityMods`) viennent PAR-DESSUS.
   */
  abilities: Record<AbilityId, number>;
  /**
   * Édition en place : si fourni, chaque caractéristique devient un champ
   * numérique. Sinon, affichage en lecture seule. La fiche est permissive — la
   * saisie n'est jamais bornée (avertissements gérés ailleurs). On édite la valeur
   * SAISIE (base + peuple) ; le bonus de capacité reste appliqué par-dessus.
   */
  onChange?: (id: AbilityId, value: number) => void;
  /**
   * Détail « base + peuple (+ capacités) = total » au survol du chiffre. Fourni
   * ensemble : valeurs de base, peuple et résolution de ses modificateurs. Absent
   * (peuple inconnu) → pas d'infobulle.
   */
  baseAbilities?: Record<AbilityId, number>;
  ancestry?: Ancestry;
  ancestryChoices?: AncestryChoice;
  /**
   * Modificateurs PERMANENTS de caractéristiques apportés par les capacités (genre
   * `ability-bonus`, ex. « +1 en CON » d'Endurer). S'ajoutent au total affiché.
   */
  abilityMods?: Partial<Record<AbilityId, number>>;
  /** Capacités sources de ces modificateurs, par caractéristique (pour le détail). */
  abilityModSources?: Partial<Record<AbilityId, AbilityModSource[]>>;
  /**
   * SURCHARGES de caractéristiques par une TRANSFORMATION active (PER-74, ex. Transformation en loup) :
   * la valeur est IMPOSÉE (absolue) tant que la forme est active, ÉCRASANT saisie + modificateurs. En
   * LECTURE, le total affiché devient cette valeur (couleur d'alerte + détail « imposée par la forme »).
   * Absent = aucune transformation active. Ignoré en édition (on édite la valeur saisie).
   */
  abilityOverrides?: Partial<Record<AbilityId, AbilityOverrideSource>>;
  /**
   * Caractéristiques bénéficiant d'un DÉ BONUS permanent (genre `ability-bonus-die`),
   * chacune avec la/les capacité(s) source(s) — icône double-d20 + pastille de capacité
   * dans le détail.
   */
  bonusDieSources?: Partial<Record<AbilityId, BonusDieSource[]>>;
  /**
   * Bonus de caractéristique EN DELTA conditionnés à une FORME active (PER-74, ex. Forme puissante :
   * +2 FOR sous forme de loup ou d'hybride). S'ajoutent au total affiché en lecture — PAR-DESSUS la
   * surcharge de forme (loup FOR 3 → 5) comme par-dessus la valeur de base (hybride). Absent = aucun.
   * Ignoré en édition. Cohérent avec `effectiveAbilities` (qui applique le même delta aux stats dérivées).
   */
  abilityFormBonuses?: Partial<Record<AbilityId, AbilityFormBonusSource[]>>;
  /**
   * Bonus/malus de caractéristique apportés par les OBJETS PORTÉS (PER-272, ex. « Bottes de
   * vivacité » +1 AGI). S'ajoutent au total affiché et se listent dans le détail sous le nom
   * de l'objet (libellé texte : la source est un objet, pas une capacité — pas de puce de
   * voie). Contrairement aux bonus de forme, ils sont comptés MÊME EN ÉDITION : on édite la
   * valeur saisie, et un objet équipé reste équipé pendant qu'on la corrige.
   */
  abilityEquipmentBonuses?: Partial<Record<AbilityId, AbilityBonusItemSource[]>>;
}

/**
 * Les 7 caractéristiques de la fiche, en lecture ou en édition. Reprend le
 * langage visuel du récapitulatif du wizard (icône + code + valeur colorée).
 * Au survol du chiffre, une infobulle détaille « base + peuple = total » quand
 * le peuple est fourni.
 */
export function AbilitiesGrid({
  abilities,
  onChange,
  baseAbilities,
  ancestry,
  ancestryChoices,
  abilityMods,
  abilityModSources,
  abilityOverrides,
  bonusDieSources,
  abilityFormBonuses,
  abilityEquipmentBonuses,
}: AbilitiesGridProps) {
  const canExplain = baseAbilities != null && ancestry != null && ancestryChoices != null;
  return (
    // Lecture : grille de 7 colonnes ÉGALES (`minmax(0, 1fr)`) — les 7 caractéristiques
    // tiennent TOUJOURS sur une seule ligne. Le minimum `0` de `minmax` neutralise la
    // largeur mini du contenu (icône, texte), donc les colonnes rétrécissent sans jamais
    // déborder ni passer à la ligne (indispensable ici : `body { overflow-x: hidden }`
    // rognerait tout débordement au lieu de le rendre scrollable). En pleine largeur,
    // les colonnes égales recréent l'espacement maximal d'origine. En ÉDITION (champs
    // larges) on bascule sur un `auto-fit` qui, lui, s'autorise le retour à la ligne.
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: onChange
          ? 'repeat(auto-fit, minmax(88px, 1fr))'
          : 'repeat(7, minmax(0, 1fr))',
        justifyItems: 'center',
        alignItems: 'start',
        columnGap: { xs: 0.5, sm: 1 },
        rowGap: 1,
      }}
    >
      {ABILITY_IDS.map((id) => {
        const entered = abilities[id];
        const featureMod = abilityMods?.[id] ?? 0;
        // Surcharge de transformation (PER-74) : uniquement en LECTURE (en édition on édite la saisie).
        const override = onChange ? undefined : abilityOverrides?.[id];
        // Bonus de forme en delta (PER-74, ex. Forme puissante) : en LECTURE seulement, s'ajoute au total
        // PAR-DESSUS l'override (loup FOR 3 → 5) comme par-dessus la valeur de base (hybride).
        const formSources = (onChange ? undefined : abilityFormBonuses?.[id]) ?? [];
        const formSum = formSources.reduce((sum, s) => sum + s.value, 0);
        // Apport des OBJETS PORTÉS (PER-272) : compté en lecture ET en édition (l'objet reste équipé
        // pendant qu'on corrige la valeur saisie), et par-dessus une surcharge de forme comme les
        // bonus de forme. Cohérent avec `effectiveAbilities`, qui l'applique en dernier.
        const equipmentSources = abilityEquipmentBonuses?.[id] ?? [];
        const equipmentSum = equipmentSources.reduce((sum, s) => sum + s.value, 0);
        // Modificateur affiché à côté du champ en ÉDITION : capacités + objets portés (tout ce qui
        // s'ajoute à la valeur saisie).
        const mod = featureMod + equipmentSum;
        // Lecture : on montre le total effectif (saisie + capacités + objets + forme), ou la valeur IMPOSÉE
        // par une transformation active (+ deltas). Édition : on édite la valeur SAISIE (chip « +N » par-dessus).
        const effective = (override ? override.value : entered + featureMod) + formSum + equipmentSum;
        const dieSources = bonusDieSources?.[id];
        const dieSourceNames = dieSources?.map((s) => s.name);
        // Tout le bloc porte l'infobulle de détail ; l'icône de dé bonus reste À CÔTÉ
        // du chiffre mais SANS sa propre bulle (`noTooltip`) pour ne pas empiler deux
        // tooltips — sa note est repliée dans l'infobulle de détail (`bonusDieSources`).
        const value = onChange ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <SignedNumberField
              layout="stacked"
              size="small"
              value={entered}
              onChange={(v) => onChange(id, v)}
              slotProps={{
                htmlInput: { style: { textAlign: 'center', fontWeight: 700, color: abilityTotalColor(entered, id) } },
              }}
              sx={{ width: 64 }}
            />
            {mod !== 0 && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                {mod > 0 ? '+' : '−'}
                {Math.abs(mod)}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              // Valeur imposée par une transformation → couleur d'alerte pour signaler l'état temporaire.
              color: override ? 'warning.main' : abilityTotalColor(effective, id),
              fontStyle: override ? 'italic' : 'normal',
              fontSize: abilityTotalFontSize(effective, '1.25rem'),
            }}
          >
            {effective > 0 ? '+' : ''}
            {effective}
          </Typography>
        );
        const featureTerms = [
          ...[...(abilityModSources?.[id] ?? []), ...formSources].map((s) => ({
            name: s.name,
            value: s.value,
            featureId: s.featureId,
          })),
          // Objets portés (PER-272) : sans `featureId` → rendus en libellé texte (nom de l'objet),
          // là où une capacité s'affiche en puce de voie.
          ...equipmentSources.map((s) => ({ name: s.name, value: s.value })),
        ];
        // Chiffre (ou champ) + dé bonus inline, sur la même rangée, l'ensemble centré
        // dans le bloc. Le badge est posé en `noTooltip` : c'est le bloc entier qui
        // déclenche l'unique infobulle.
        const valueRow = (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            {value}
            {dieSourceNames && <BonusDieBadge ability={id} sources={dieSourceNames} noTooltip />}
          </Stack>
        );
        // Le bloc entier (icône + code + chiffre + dé bonus) porte le cadre au survol
        // ET l'infobulle de détail, déclenchés sur toute sa surface.
        const block = (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.25,
              // `minWidth: 0` + `width: 100%` : le bloc remplit sa cellule de grille et
              // peut rétrécir sous la largeur mini de son contenu (sinon un item de
              // grille garde `min-width: auto` et déborderait). Contenu centré à
              // l'intérieur. Paddings horizontaux quasi nuls sur mobile pour gagner de
              // la place quand les colonnes deviennent étroites.
              width: '100%',
              minWidth: 0,
              px: { xs: 0, sm: 0.5 },
              py: { xs: 0.25, sm: 0.5 },
              borderRadius: 2,
              border: 1,
              borderColor: 'transparent',
              cursor: canExplain && !onChange ? 'help' : 'default',
              transition: (theme) => theme.transitions.create(['background-color', 'border-color']),
              '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
            }}
          >
            <AbilityIcon ability={id} title size={32} />
            <Typography variant="subtitle2" color="text.secondary" title={ABILITY_NAMES[id]} sx={{ fontWeight: 'bold' }}>
              {id}
            </Typography>
            {valueRow}
          </Box>
        );
        // Transformation active : le détail additif (base + peuple + capacités) n'a plus de sens
        // (la forme IMPOSE une valeur absolue) → info-bulle dédiée expliquant la surcharge + sa source.
        if (override) {
          return (
            <AppTooltip
              key={id}
              title={
                <Box sx={{ py: 0.5 }}>
                  <BreakdownContent
                    title={ABILITY_NAMES[id]}
                    breakdown={{
                      // Total imposé par la forme + delta(s) de forme éventuel(s) (ex. loup 3 + Forme puissante 2 = 5)
                      // + apport des objets portés (PER-272), qui agissent aussi sous forme animale.
                      total: override.value + formSum + equipmentSum,
                      terms: [
                        { label: override.name, value: override.value, featureId: override.featureId },
                        ...formSources.map((s) => ({ label: s.name, value: s.value, featureId: s.featureId })),
                        ...equipmentSources.map((s) => ({ label: s.name, value: s.value })),
                      ],
                      note: `Valeur imposée par la transformation (${override.name}).${
                        formSources.length ? ' Bonus de forme ajouté par-dessus.' : ''
                      }${equipmentSources.length ? ' Apport des objets portés ajouté par-dessus.' : ''}`,
                      page: override.page,
                    }}
                    page={override.page}
                  />
                </Box>
              }
            >
              {block}
            </AppTooltip>
          );
        }
        return canExplain ? (
          <AbilityBreakdownTooltip
            key={id}
            abilityId={id}
            baseAbilities={baseAbilities}
            ancestry={ancestry}
            ancestryChoices={ancestryChoices}
            featureTerms={featureTerms}
            bonusDieSources={dieSources}
          >
            {block}
          </AbilityBreakdownTooltip>
        ) : (
          <Box key={id} sx={{ display: 'contents' }}>
            {block}
          </Box>
        );
      })}
    </Box>
  );
}

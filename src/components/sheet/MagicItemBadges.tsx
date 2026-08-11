'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { ABILITY_IDS, type AbilityId } from '@/data/schema';
import type {
  ItemAbilityBonuses,
  ItemDerivedBonuses,
  ItemTestBonuses,
  MagicProperty,
} from '@/lib/character/types';
import { ITEM_DERIVED_STAT_IDS } from '@/lib/character/types';
import { MAGIC_PROPERTY_RULES, magicPropertyLabel } from '@/lib/character/magicItem';
import { ITEM_TEST_TARGET_IDS } from '@/lib/character/equipment';
import { testDomainById } from '@/data';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import {
  DERIVED_MOD_DISPLAY_ID,
  DERIVED_MOD_NAMES,
  DERIVED_MOD_SHORT_NAMES,
} from '@/lib/ui/derivedStats';
import { AbilityIcon } from '@/components/AbilityIcon';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DieIcon } from '@/components/DieIcon';
import { AppTooltip } from '@/components/AppTooltip';
import { PageRefText } from '@/components/SourceRef';

/**
 * Badges d'ENCHANTEMENT (PER-85/272/273/275/307) : pastilles custom (≠ Chip MUI, cf.
 * conventions) partagées entre la ligne d'inventaire (`EquipmentList`) et l'aperçu live de
 * la modale de saisie (`ItemDialog`) — extraites ici pour éviter un import circulaire entre
 * les deux (`EquipmentList` importe `ItemDialog`).
 */

/**
 * Badge du bonus de DEF MAGIQUE d'une armure enchantée (PER-85, retour propriétaire) :
 * pastille custom en teinte SECONDAIRE, distincte de la DEF mondaine (« DEF +5 ») avec
 * laquelle elle ne doit pas se confondre. Info-bulle rappelant qu'elle s'ajoute à la DEF
 * totale mais reste hors du surcoût de mana (p. 178).
 */
export function MagicDefBadge({ value }: { value: number }) {
  return (
    <AppTooltip
      title={
        <PageRefText>
          Bonus magique de l’équipement : s’ajoute à la DEF totale (cumulable avec les autres
          objets équipés), hors surcoût de mana des sorts en armure (p. 178).
        </PageRefText>
      }
    >
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          verticalAlign: 'baseline',
          ml: 0.75,
          px: 0.6,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.72rem',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          cursor: 'help',
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
        })}
      >
        +{value} magique
      </Box>
    </AppTooltip>
  );
}

/**
 * Badge du bonus magique +N d'une ARME (PER-307) : « +N magique », en teinte SECONDAIRE comme la
 * DEF magique. Le +N joue en attaque ET aux dommages (p. 251) ; l'info-bulle le rappelle. Distinct
 * de la DEF magique (`MagicDefBadge`), qui vise les objets défensifs.
 */
export function MagicWeaponBonusBadge({ value }: { value: number }) {
  return (
    <AppTooltip
      title={
        <PageRefText>{`Bonus magique de l’arme : +${value} en attaque et aux dommages (p. 251).`}</PageRefText>
      }
    >
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          verticalAlign: 'baseline',
          ml: 0.75,
          px: 0.6,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.72rem',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          cursor: 'help',
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
        })}
      >
        +{value} magique
      </Box>
    </AppTooltip>
  );
}

/**
 * Badges des PROPRIÉTÉS d'un objet magique (PER-307) : une pastille par propriété (Affûtée, Fléau des
 * démons, Feu, Défense supérieure, Résistance feu 10, Parade +2…), teinte secondaire comme les autres
 * enchantements. Le texte de règle VERBATIM (avec sa page source) est rappelé en info-bulle. Badges
 * custom (≠ Chip MUI, cf. conventions).
 */
export function MagicPropertyBadges({ properties }: { properties: MagicProperty[] }) {
  return (
    <>
      {properties.map((prop, i) => {
        const rule = MAGIC_PROPERTY_RULES[prop.kind];
        return (
          <AppTooltip
            key={`${prop.kind}-${i}`}
            title={<PageRefText>{`${rule.verbatim} (p. ${rule.sourcePage})`}</PageRefText>}
            maxWidth={360}
          >
            <Box
              component="span"
              sx={(theme) => ({
                display: 'inline-block',
                verticalAlign: 'baseline',
                ml: 0.75,
                px: 0.6,
                borderRadius: 0.75,
                fontWeight: 700,
                fontSize: '0.72rem',
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                cursor: 'help',
                color: theme.palette.secondary.main,
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
              })}
            >
              {magicPropertyLabel(prop)}
            </Box>
          </AppTooltip>
        );
      })}
    </>
  );
}

/**
 * Pastille d'un apport signé d'objet enchanté (caractéristique PER-272, statistique dérivée
 * PER-273) : icône + score signé + libellé court. Même langage visuel que `MagicDefBadge`
 * (pastille custom, ≠ Chip MUI), mais teintée par le SIGNE : un malus se lit en « warning »
 * pour qu'un objet maudit ne passe pas pour un bonus. L'info-bulle rappelle la condition
 * (l'objet doit être équipé).
 */
export function ItemBonusBadge({
  value,
  icon,
  label,
  tooltip,
}: {
  value: number;
  icon: ReactNode;
  label: string;
  tooltip: ReactNode;
}) {
  const positive = value > 0;
  return (
    <AppTooltip title={tooltip}>
      <Box
        component="span"
        sx={(theme) => {
          const color = positive ? theme.palette.secondary.main : theme.palette.warning.main;
          return {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.25,
            verticalAlign: 'baseline',
            ml: 0.75,
            px: 0.6,
            borderRadius: 0.75,
            fontWeight: 700,
            fontSize: '0.72rem',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            cursor: 'help',
            color,
            bgcolor: alpha(color, 0.12),
            border: `1px solid ${alpha(color, 0.45)}`,
          };
        }}
      >
        {icon}
        {positive ? '+' : '−'}
        {Math.abs(value)} {label}
      </Box>
    </AppTooltip>
  );
}

/**
 * Badges des bonus/malus de CARACTÉRISTIQUES d'un objet enchanté (PER-272) : une pastille par
 * caractéristique, dans l'ordre canonique.
 */
export function AbilityBonusBadges({ bonuses }: { bonuses: ItemAbilityBonuses }) {
  return (
    <>
      {ABILITY_IDS.filter((id) => bonuses[id]).map((id) => {
        const value = bonuses[id]!;
        return (
          <ItemBonusBadge
            key={id}
            value={value}
            label={id}
            icon={<AbilityIcon ability={id} size={13} color="currentColor" />}
            tooltip={`${value > 0 ? 'Bonus' : 'Malus'} de ${ABILITY_NAMES[id]} (${
              value > 0 ? '+' : '−'
            }${Math.abs(value)}) apporté par cet objet : compte tant qu’il est équipé, et se répercute sur tout ce qui découle de la caractéristique (DEF, PV, initiative, tests…).`}
          />
        );
      })}
    </>
  );
}

/**
 * Badges des bonus/malus de STATISTIQUES DÉRIVÉES d'un objet enchanté (PER-273) : une
 * pastille par stat touchée (PV, initiative, chance…), dans l'ordre canonique. L'apport agit
 * DIRECTEMENT sur la stat, comme un bonus de voie. La DÉFENSE en est absente par conception
 * (cf. `ItemDerivedStatId`) : l'enchantement défensif passe par la DEF magique, seul canal à
 * savoir se répercuter sur les calculs d'armure (`MagicDefBadge`).
 */
export function DerivedBonusBadges({ bonuses }: { bonuses: ItemDerivedBonuses }) {
  return (
    <>
      {ITEM_DERIVED_STAT_IDS.filter((id) => bonuses[id]).map((id) => {
        const value = bonuses[id]!;
        const sign = value > 0 ? '+' : '−';
        return (
          <ItemBonusBadge
            key={id}
            value={value}
            label={DERIVED_MOD_SHORT_NAMES[id]}
            icon={
              <DerivedStatIcon
                statId={DERIVED_MOD_DISPLAY_ID[id]}
                size={13}
                color="currentColor"
                sx={{ border: 'none' }}
              />
            }
            tooltip={`${value > 0 ? 'Bonus' : 'Malus'} de ${DERIVED_MOD_NAMES[id]} (${sign}${Math.abs(
              value,
            )}) apporté par cet objet : compte tant qu’il est équipé et s’ajoute à la statistique, comme un bonus de voie.`}
          />
        );
      })}
    </>
  );
}

/**
 * Badges des bonus/malus aux TESTS d'un objet enchanté (PER-275) : une pastille par cible, dans
 * l'ordre canonique (les 7 caracs puis les domaines). Le libellé porte la cible — code de la
 * carac (« FOR ») ou nom du domaine (« Discrétion ») — et l'info-bulle rappelle la règle de
 * cumul propre à cette famille : c'est un bonus de MAGIE, il s'ajoute aux bonus de compétence
 * des voies mais pas à un autre bonus de magie sur le même test.
 */
export function TestBonusBadges({ bonuses }: { bonuses: ItemTestBonuses }) {
  return (
    <>
      {ITEM_TEST_TARGET_IDS.filter((id) => bonuses[id]).map((id) => {
        const value = bonuses[id]!;
        const domain = testDomainById.get(id);
        const ability = domain ? null : (id as AbilityId);
        const sign = value > 0 ? '+' : '−';
        return (
          <ItemBonusBadge
            key={id}
            value={value}
            label={domain ? domain.label : id}
            icon={
              ability ? (
                <AbilityIcon ability={ability} size={13} color="currentColor" />
              ) : (
                <DieIcon die="d20" size={13} noTooltip />
              )
            }
            tooltip={`${value > 0 ? 'Bonus' : 'Malus'} de ${sign}${Math.abs(value)} ${
              domain ? `aux tests de ${domain.label}` : `à TOUS les tests de ${ABILITY_NAMES[ability!]}`
            } apporté par cet objet : compte tant qu’il est équipé. C’est un bonus de magie — il se cumule aux bonus de compétence des voies, mais pas à un autre bonus de magie sur le même test (on retient le meilleur).`}
          />
        );
      })}
    </>
  );
}

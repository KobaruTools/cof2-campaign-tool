'use client';

/**
 * Mini-fiche d'une CRÉATURE/compagnon octroyé(e) par une capacité (golem, familier,
 * démon, zombie… et, à venir, compagnon animal du rôdeur / familier fantastique).
 * Affiche le `CreatureProfile` structuré (PER-69) : caractéristiques (avec icône) +
 * stats dérivées. Réutilise le rendu enrichi (`RichInline`) pour les valeurs au format
 * richText (DEF/PV/DM : dés, formules, `rang`/`niveau`). Les stats recopiées du MAÎTRE
 * (Init., attaque) reprennent directement le total des statistiques dérivées du
 * personnage. Conçu pour être INSÉRÉ partout où une capacité porte un profil.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ABILITY_IDS, type AbilityId, type CreatureProfile, type DerivedStatId, type MasterStatRef } from '@/data/schema';
import type { Abilities, DerivedStats } from '@/lib/engine';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { RichInline } from './FeatureRichText';

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Libellés des stats dérivées recopiées du maître (info-bulle). */
const MASTER_STAT_LABEL: Partial<Record<DerivedStatId, string>> = {
  initiative: 'Initiative',
  magicAttack: 'Attaque magique',
  meleeAttack: 'Attaque au contact',
  rangedAttack: 'Attaque à distance',
  def: 'Défense',
  maxHp: 'Points de vigueur',
};

const isMasterRef = (v: string | MasterStatRef): v is MasterStatRef =>
  typeof v === 'object' && v !== null && 'fromMaster' in v;

/** Valeur d'une stat dérivée du maître (gère l'écart de nom `def` ↔ `defense`). */
const masterValue = (derived: DerivedStats, stat: DerivedStatId): number =>
  stat === 'def' ? derived.defense : (derived[stat] as number);

/** Un libellé court + sa valeur (DEF, PV, Init., Attaque, DM). */
function StatItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box component="span" sx={{ fontSize: '0.9rem' }}>
        {children}
      </Box>
    </Stack>
  );
}

/**
 * Stat recopiée du maître : son total dérivé (info-bulle « Initiative du maître »).
 * Sans contexte de stats dérivées (ex. aperçu du wizard), repli sur un libellé.
 */
function MasterStatValue({ stat, masterDerived }: { stat: DerivedStatId; masterDerived?: DerivedStats }) {
  const label = MASTER_STAT_LABEL[stat] ?? stat;
  if (!masterDerived) {
    return (
      <Typography component="span" variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        {label} du maître
      </Typography>
    );
  }
  return (
    <Tooltip title={`${label} du maître`} arrow>
      <Box component="span" sx={{ fontWeight: 700, cursor: 'help', fontVariantNumeric: 'tabular-nums' }}>
        {masterValue(masterDerived, stat)}
      </Box>
    </Tooltip>
  );
}

export interface CreatureStatBlockProps {
  profile: CreatureProfile;
  /** Caractéristiques du personnage MAÎTRE — pour résoudre les valeurs richText. */
  abilities: Abilities;
  /** Niveau du personnage — pour `niveau` et les dés évolutifs. */
  level: number;
  /** Rang atteint dans la voie hôte — pour le terme `rang` des stats de la créature. */
  rank: number;
  /** Stats dérivées du maître — pour recopier Init./attaque (absent → libellé de repli). */
  masterDerived?: DerivedStats;
  /**
   * Caractéristiques de la créature bénéficiant d'un DÉ BONUS (icône double-d20),
   * octroyé par une amélioration retenue (ex. golem « Forme de félin » → AGI). Voir
   * `creatureBonusDiceForPath`.
   */
  bonusDieAbilities?: Set<AbilityId>;
  /**
   * La DÉFENSE ALTERNATIVE (`profile.defenseAlt`) est-elle active ? Résolu en amont par le
   * maître (capacité acquise + interrupteur de condition actif, ex. cavalier-r2 « en selle »).
   * `true` → la DEF affichée devient l'alternative ; sinon la DEF de base.
   */
  defenseAltActive?: boolean;
}

export function CreatureStatBlock({
  profile,
  abilities,
  level,
  rank,
  masterDerived,
  bonusDieAbilities,
  defenseAltActive,
}: CreatureStatBlockProps) {
  const rich = (text: string) => <RichInline text={text} abilities={abilities} level={level} rank={rank} />;
  const defAlt = profile.defenseAlt;
  // Dés bonus de la créature = dés INNÉS (notés « * » dans le livre, portés par le profil)
  // UNIS aux dés octroyés par une option de voie retenue (ex. golem « Forme de félin »). Système
  // unifié avec la fiche de personnage (PER-107) : icône double-d20 à droite de la valeur.
  const allBonusDice = new Set<AbilityId>([...(profile.bonusDieAbilities ?? []), ...(bonusDieAbilities ?? [])]);
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.25,
        bgcolor: (t) => alpha(t.palette.text.primary, 0.025),
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 0.75 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
          {profile.name.toUpperCase()}
        </Typography>
        {profile.type && (
          <Typography variant="caption" color="text.secondary">
            {profile.type}
          </Typography>
        )}
      </Stack>

      {/* Caractéristiques de la créature (valeurs fixes), avec l'icône de la fiche. Certaines
          créatures n'ont PAS de bloc de caractéristiques dans le livre (ex. écuyer du chevalier :
          seulement Init/DEF/PV/Att/DM) → grille omise. */}
      {profile.abilities && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.75 }}>
          {ABILITY_IDS.map((id) => (
            <Tooltip key={id} title={ABILITY_NAMES[id]} arrow>
              <Stack
                spacing={0.1}
                sx={{
                  alignItems: 'center',
                  borderRadius: 0.5,
                  py: 0.4,
                  cursor: 'help',
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
                }}
              >
                <AbilityIcon ability={id} size={16} />
                <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  {id}
                </Typography>
                <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {signed(profile.abilities![id])}
                  </Typography>
                  {allBonusDice.has(id) && <BonusDieBadge ability={id} size={12} />}
                </Stack>
              </Stack>
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Stats dérivées + attaque. */}
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 0.5 }}>
        <StatItem label="DEF">
          {defAlt && defenseAltActive ? (
            // DEF alternative active (ex. en selle) : DEF égale à celle du maître, info-bulle de provenance.
            <Tooltip
              title={`${defAlt.conditionLabel} (${defAlt.sourceLabel}) : DEF égale à celle du chevalier. Hors selle : DEF de base.`}
              arrow
            >
              <Box component="span" sx={{ fontWeight: 700, cursor: 'help', fontVariantNumeric: 'tabular-nums' }}>
                {isMasterRef(defAlt.value)
                  ? masterDerived
                    ? masterValue(masterDerived, defAlt.value.fromMaster)
                    : 'DEF du maître'
                  : rich(defAlt.value)}
              </Box>
            </Tooltip>
          ) : (
            rich(profile.defense)
          )}
        </StatItem>
        <StatItem label="PV">{rich(profile.hitPoints)}</StatItem>
        <StatItem label="Init.">
          {isMasterRef(profile.initiative) ? (
            <MasterStatValue stat={profile.initiative.fromMaster} masterDerived={masterDerived} />
          ) : (
            rich(profile.initiative)
          )}
        </StatItem>
      </Stack>
      {profile.attack && (
        <Stack direction="row" spacing={2} sx={{ mt: 0.5, flexWrap: 'wrap', alignItems: 'center', rowGap: 0.5 }}>
          <StatItem label={profile.attack.label ?? 'Attaque'}>
            {profile.attack.fromMaster ? (
              <MasterStatValue stat={profile.attack.fromMaster} masterDerived={masterDerived} />
            ) : (
              // Valeur PROPRE à la créature (bonus fixe, ex. Ruade +5) — affichée telle quelle.
              <Box component="span" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {profile.attack.value}
              </Box>
            )}
          </StatItem>
          <StatItem label="DM">{rich(profile.attack.damage)}</StatItem>
        </Stack>
      )}
      {profile.note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          {profile.note}
        </Typography>
      )}
    </Box>
  );
}

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
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import type { ReactNode } from 'react';
import { ABILITY_IDS, type AbilityId, type CreatureProfile, type CreatureSize, type DerivedStatId, type MasterStatRef } from '@/data/schema';
import type { Abilities, DerivedStats } from '@/lib/engine';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { CREATURE_SIZE_LABELS, resolveCreatureAbilities } from '@/lib/ui/creature';
import type { DerivedStatId as UiDerivedStatId } from '@/lib/ui/derivedStats';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { AbilityValueBadge } from '@/components/AbilityValueBadge';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { PageRefText, SourceRef } from '@/components/SourceRef';
import { MetaPill } from '@/components/MetaPill';
import { creatureDefenseBreakdown } from '@/lib/character/companions';
import type { StatBreakdown } from '@/lib/character/statBreakdown';
import { damageReductionBadges } from '@/components/bestiary/creatureDefenseBadges';
import { DefenseBadge } from './DefenseBadge';
import { CapabilityChip, RichInline } from './FeatureRichText';

/**
 * Pastille de TAILLE d'un compagnon (PER-175) — même « tag » que le bestiaire (`MetaPill`),
 * avec info-bulle « Taille » au survol, posée à droite du nom. Rendue seulement si le profil
 * porte une `size`.
 */
export function CompanionSizePill({ size }: { size: CreatureSize }) {
  return (
    <AppTooltip title="Taille">
      <Box component="span" sx={{ cursor: 'help' }}>
        <MetaPill>{CREATURE_SIZE_LABELS[size]}</MetaPill>
      </Box>
    </AppTooltip>
  );
}

/**
 * Bloc compact « icône de stat dérivée cerclée + valeur » (PER-233), calqué sur le
 * résumé de l'écran de MJ (`CompactDerivedStats`) : l'icône remplace le libellé texte
 * (« DEF », « Init. », « Attaque »…). Sert à rendre les stats d'une créature (DEF, PV,
 * Init., attaque + DM) sur UNE seule ligne.
 *
 * Pas d'info-bulle sur le bloc lui-même : la nature de la stat se lit à l'icône, un
 * tooltip « Défense »/« Points de vigueur » ferait doublon sans rien apporter. Seul
 * compte le tooltip de DÉTAIL, porté par la VALEUR (`RichInline` pour la formule/les dés,
 * `MasterStatValue` pour « … du maître ») — il explique d'où vient le nombre.
 */
function CreatureStatChip({
  statId,
  children,
}: {
  statId: UiDerivedStatId;
  children: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: 'center',
        px: 0.75,
        py: 0.4,
        borderRadius: 0.75,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
      }}
    >
      <DerivedStatIcon statId={statId} size={22} />
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '0.9rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Box>
    </Stack>
  );
}

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

/**
 * Stat recopiée du maître : son total dérivé (info-bulle « Initiative du maître »).
 * Sans contexte de stats dérivées (ex. aperçu du wizard), repli sur un libellé.
 */
function MasterStatValue({
  stat,
  masterDerived,
  offset,
  mobileEnlarge = false,
}: {
  stat: DerivedStatId;
  masterDerived?: DerivedStats;
  offset?: number;
  /** Chiffre agrandi sur mobile (`xs`) — carte « Compagnons » ; jamais le DM qui suit. */
  mobileEnlarge?: boolean;
}) {
  const label = MASTER_STAT_LABEL[stat] ?? stat;
  const suffix = offset ? ` + ${offset}` : '';
  if (!masterDerived) {
    return (
      <Typography component="span" variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        {label} du maître{suffix}
      </Typography>
    );
  }
  return (
    <AppTooltip title={`${label} du maître${suffix}`}>
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          cursor: 'help',
          fontVariantNumeric: 'tabular-nums',
          fontSize: mobileEnlarge ? { xs: '1.05rem', sm: 'inherit' } : undefined,
        }}
      >
        {masterValue(masterDerived, stat) + (offset ?? 0)}
      </Box>
    </AppTooltip>
  );
}

export interface CreatureAbilitiesGridProps {
  profile: CreatureProfile;
  /**
   * Caractéristiques du MAÎTRE — pour résoudre les valeurs `abilitiesFromMaster` (ex. Minimoï,
   * dont les carac sont des deltas sur celles du personnage). Absent → deltas seuls (maître à 0).
   */
  masterAbilities?: Abilities;
  /**
   * Caractéristiques de la créature bénéficiant d'un DÉ BONUS (icône double-d20),
   * octroyé par une amélioration retenue (ex. golem « Forme de félin » → AGI). Voir
   * `creatureBonusDiceForPath`.
   */
  bonusDieAbilities?: Set<AbilityId>;
  /**
   * Style : `compact` (défaut, petites puces — mini-fiche « Voies & capacités ») ou `large`
   * (grandes puces bordées, chiffre qui grandit avec la valeur — même rendu que le bloc du
   * bestiaire, PER-175, pour la colonne droite de la carte compagnon).
   */
  variant?: 'compact' | 'large';
  /**
   * Icône/chiffre agrandis sur mobile (breakpoint `xs`), hauteur de puce libre — la largeur
   * reste contrainte par la grille à 7 colonnes. Réservé à la carte « Compagnons » (PER-233
   * retour mobile) ; `false` ailleurs (mini-fiche « Voies & capacités ») pour ne rien changer.
   */
  mobileEnlarge?: boolean;
}

/**
 * Grille des 7 caractéristiques d'une créature, avec l'icône de la fiche et l'éventuel dé bonus
 * inné/octroyé (double-d20). Les valeurs sont RÉSOLUES (`resolveCreatureAbilities`) : fixes
 * (`abilities`) ou dérivées du maître (`abilitiesFromMaster`). `null` si le profil n'a pas de bloc
 * de caractéristiques dans le livre (ex. écuyer). Le variant `large` reprend le style du bestiaire.
 */
export function CreatureAbilitiesGrid({ profile, masterAbilities, bonusDieAbilities, variant = 'compact', mobileEnlarge = false }: CreatureAbilitiesGridProps) {
  const resolved = resolveCreatureAbilities(profile, masterAbilities);
  if (!resolved) return null;
  // Dés bonus de la créature = dés INNÉS (notés « * » dans le livre, portés par le profil)
  // UNIS aux dés octroyés par une option de voie retenue (ex. golem « Forme de félin »). Système
  // unifié avec la fiche de personnage (PER-107) : icône double-d20 à droite de la valeur.
  const allBonusDice = new Set<AbilityId>([...(profile.bonusDieAbilities ?? []), ...(bonusDieAbilities ?? [])]);
  const large = variant === 'large';
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: large ? 0.75 : 0.5 }}>
      {ABILITY_IDS.map((id) => (
        <AppTooltip key={id} title={ABILITY_NAMES[id]}>
          {/* Bloc « icône + code + valeur » partagé (`AbilityValueBadge`) : chiffre
              teinté fort/faible comme partout ailleurs, dé bonus posé en ornement. */}
          <AbilityValueBadge
            ability={id}
            value={resolved[id]}
            iconSize={large ? 30 : 16}
            showCode
            codeVariant={large ? 'subtitle2' : 'caption'}
            valueVariant={large ? 'h6' : 'caption'}
            scaleBase={large ? '1.2rem' : undefined}
            adornment={allBonusDice.has(id) ? <BonusDieBadge ability={id} size={large ? 14 : 12} /> : undefined}
            // Mobile (carte « Compagnons ») : icône + chiffre agrandis, largeur inchangée
            // (grille figée à 7 colonnes) — seule la hauteur de la puce grandit avec `py`.
            iconSx={mobileEnlarge && !large ? { width: { xs: 22, sm: 16 }, height: { xs: 22, sm: 16 } } : undefined}
            valueSx={mobileEnlarge && !large ? { fontSize: { xs: '0.95rem', sm: undefined } } : undefined}
            sx={{
              borderRadius: large ? 1.5 : 0.5,
              border: 1,
              borderColor: 'divider',
              py: large ? { xs: 0.5, sm: 0.6 } : mobileEnlarge ? { xs: 0.9, sm: 0.4 } : 0.4,
              cursor: 'help',
              bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
            }}
          />
        </AppTooltip>
      ))}
    </Box>
  );
}

/** Montant signé court d'une contribution de breakdown (« +3 », « −1 »). */
function signedContribution(n: number): string {
  return n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/**
 * PUCES DE RÉDUCTION DE DÉGÂTS de la créature (PER-74), accolées au chiffre de DÉFENSE — une
 * protection se lit dans le cadre défensif. Mêmes badges que la carte Défense d'une fiche et que le
 * bloc de bestiaire (`damageReductionBadges`), donc même lecture partout. Cas d'usage : la RD feu 10
 * que le chevalier dragon accorde à son drake (p. 147), portée par `CreatureUpgrade.damageReduction`.
 * `null` si la créature n'a aucune RD.
 */
function CreatureDefenseBadges({ profile }: { profile: CreatureProfile }) {
  const badges = damageReductionBadges(profile.damageReduction);
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map(({ key, ...badge }) => (
        <DefenseBadge key={key} {...badge} compact fullWidth={false} />
      ))}
    </>
  );
}

/**
 * Valeur de DÉFENSE d'une créature AVEC ventilation par source (PER-256) : le total dans un encadré
 * (même style que l'encadré de formule de la fiche), dont l'info-bulle liste les contributions —
 * termes de la valeur de base en texte (« Base », « Rang »), bonus propagés du maître en PUCE DE VOIE
 * (`CapabilityChip`), exactement comme le breakdown des stats du personnage (DefenseBadge, PER-137).
 * N'est utilisé que quand un bonus du maître touche la DEF ; sinon on rend la valeur simple (RichInline).
 */
function CreatureDefenseValue({ breakdown }: { breakdown: StatBreakdown }) {
  const tooltip = (
    <Box sx={{ minWidth: 170 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Défense
      </Typography>
      {breakdown.contributions.map((c, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            fontVariantNumeric: 'tabular-nums',
            mb: 0.25,
          }}
        >
          {/* Source liée à une capacité → puce de voie (couleur + icône + rang) ; terme de base → texte. */}
          {c.featureId ? <CapabilityChip featureId={c.featureId} label={null} /> : <span>{c.label}</span>}
          {/* La valeur de BASE (1re contribution) s'affiche nue (« 10 ») ; les apports suivants signés. */}
          <span style={{ fontWeight: 600 }}>{i === 0 ? String(c.value) : signedContribution(c.value)}</span>
        </Box>
      ))}
      <Divider sx={{ my: 0.5 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontWeight: 700 }}>
        <span>Total</span>
        <span>{breakdown.total}</span>
      </Box>
    </Box>
  );
  return (
    <AppTooltip title={tooltip}>
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          minHeight: '22px',
          whiteSpace: 'nowrap',
          px: 0.6,
          lineHeight: 1,
          borderRadius: 1,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          cursor: 'help',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          border: 1,
          borderColor: alpha(theme.palette.primary.main, 0.35),
        })}
      >
        {breakdown.total}
      </Box>
    </AppTooltip>
  );
}

/**
 * Rend la valeur de DÉFENSE d'une créature (hors DEF alternative « en selle », traitée à part) : avec
 * ventilation par source si un bonus du maître y contribue (PER-256), sinon la valeur enrichie simple.
 */
function creatureDefenseNode(
  profile: CreatureProfile,
  abilities: Abilities,
  level: number,
  rank: number,
): ReactNode {
  const breakdown = creatureDefenseBreakdown(profile, abilities, level, rank);
  if (breakdown) return <CreatureDefenseValue breakdown={breakdown} />;
  return <RichInline text={profile.defense ?? ''} abilities={abilities} level={level} rank={rank} />;
}

export interface CreatureStatsLineProps {
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
   * La DÉFENSE ALTERNATIVE (`profile.defenseAlt`) est-elle active ? Résolu en amont par le
   * maître (capacité acquise + interrupteur de condition actif, ex. cavalier-r2 « en selle »).
   * `true` → la DEF affichée devient l'alternative ; sinon la DEF de base.
   */
  defenseAltActive?: boolean;
  /**
   * Affiche le PV verbatim dans la ligne (défaut `true`). La section « Compagnons »
   * (PER-233) le passe à `false` : les PV y sont rendus par la BARRE DE VIE interactive,
   * plus par un texte.
   */
  showHitPoints?: boolean;
  /**
   * Icônes cerclées (DEF/Init./attaque) agrandies sur mobile (`xs`) — utilisé uniquement par
   * `CreatureDerivedStats` (carte « Compagnons », retour mobile PER-233) ; sans effet sur
   * `CreatureStatsLine`.
   */
  mobileEnlarge?: boolean;
}

/**
 * Ligne des stats dérivées d'une créature : DEF, PV (optionnel), Init., puis attaque
 * (label + DM) et note verbatim. Extraite de `CreatureStatBlock` pour être partagée avec
 * la carte de la section « Compagnons » (PER-233), qui masque les PV (`showHitPoints=false`).
 */
export function CreatureStatsLine({
  profile,
  abilities,
  level,
  rank,
  masterDerived,
  defenseAltActive,
  showHitPoints = true,
}: CreatureStatsLineProps) {
  const rich = (text: string) => <RichInline text={text} abilities={abilities} level={level} rank={rank} />;
  // Créature SANS bloc de stats (Serviteur invisible, p. 96 — « une force, pas une créature ») :
  // description enrichie à la place des blocs DEF/PV/Init./attaque, résolue sur les caractéristiques
  // du MAÎTRE (ex. `[CHA]`, `[=CHA]`). Pas de barre de vie ni de grille de caractéristiques (gérées
  // en amont par l'absence de `hitPoints`/`abilities`).
  if (profile.descriptionRich) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {rich(profile.descriptionRich)}
      </Typography>
    );
  }
  const defAlt = profile.defenseAlt;
  const attack = profile.attack;
  // Icône de l'attaque : l'attaque d'un compagnon est PHYSIQUE (Ruade, Morsure, contact…),
  // même quand son JET recopie l'attaque MAGIQUE du maître (`fromMaster: 'magicAttack'` ne
  // désigne que la source du bonus, pas la nature de l'attaque). On affiche donc l'épée de
  // l'attaque au contact par défaut — l'icône d'attaque magique laisserait croire, à tort,
  // que la créature lance des sorts. Seule une attaque explicitement à distance garde son icône.
  const attackStatId: UiDerivedStatId = attack?.fromMaster === 'rangedAttack' ? 'rangedAttack' : 'meleeAttack';
  return (
    <>
      {/* Stats dérivées + attaque, en blocs « icône + valeur » (comme le résumé MJ), sur une
          seule ligne (retour à la ligne seulement si la largeur l'impose). */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 0.5 }}>
        {(profile.defense || defAlt) && (
          <CreatureStatChip statId="defense">
            {defAlt && defenseAltActive ? (
              // DEF alternative active (ex. cavalier « en selle ») : l'explication de la
              // bascule est un vrai DÉTAIL (elle dit d'où vient le nombre), on la garde en
              // info-bulle sur la valeur — au lieu du tooltip « Défense » redondant retiré.
              <AppTooltip
                title={`${defAlt.conditionLabel} (${defAlt.sourceLabel}) : DEF égale à celle du chevalier. Hors selle : DEF de base.`}
              >
                <Box component="span" sx={{ cursor: 'help' }}>
                  {isMasterRef(defAlt.value)
                    ? masterDerived
                      ? masterValue(masterDerived, defAlt.value.fromMaster)
                      : 'DEF du maître'
                    : rich(defAlt.value)}
                </Box>
              </AppTooltip>
            ) : (
              creatureDefenseNode(profile, abilities, level, rank)
            )}
            <CreatureDefenseBadges profile={profile} />
          </CreatureStatChip>
        )}
        {showHitPoints && profile.hitPoints && (
          <CreatureStatChip statId="maxHp">{rich(profile.hitPoints)}</CreatureStatChip>
        )}
        {profile.initiative && (
          <CreatureStatChip statId="initiative">
            {isMasterRef(profile.initiative) ? (
              <MasterStatValue
                stat={profile.initiative.fromMaster}
                masterDerived={masterDerived}
                offset={profile.initiative.offset}
              />
            ) : (
              rich(profile.initiative)
            )}
          </CreatureStatChip>
        )}
        {attack && (
          // Attaque + DM réunis dans un seul bloc : valeur du jet (recopiée du maître ou propre) ·
          // dégâts. Le tooltip de détail utile (« … du maître ») reste porté par la valeur.
          <CreatureStatChip statId={attackStatId}>
            {attack.fromMaster ? (
              <MasterStatValue stat={attack.fromMaster} masterDerived={masterDerived} />
            ) : (
              <Box component="span">{attack.value}</Box>
            )}
            {/* DM optionnel : certaines attaques n'infligent pas de DM (ex. dard du pseudo-dragon,
                dont l'effet est le poison). On omet alors le « · DM ». */}
            {attack.damage && (
              <>
                <Box component="span" sx={{ opacity: 0.5 }}>
                  ·
                </Box>
                {rich(attack.damage)}
              </>
            )}
            {attack.bonusDie && (
              <BonusDieBadge ability="attaque" tooltipTitle="Dé bonus à l'attaque" size={14} />
            )}
          </CreatureStatChip>
        )}
        {/* Attaques SUPPLÉMENTAIRES (PER-94, ex. Baliste du Golem supérieur). Le jet reprend
            l'attaque magique du maître (comme l'attaque de base d'un compagnon) ; le DM est déjà
            baké (dé + carac de la créature résolue). Icône à distance / contact selon `ranged`. */}
        {profile.extraAttacks?.map((extra, i) => (
          <CreatureStatChip key={i} statId={extra.ranged ? 'rangedAttack' : 'meleeAttack'}>
            <MasterStatValue stat="magicAttack" masterDerived={masterDerived} />
            <Box component="span" sx={{ opacity: 0.5 }}>
              ·
            </Box>
            {rich(extra.damage)}
          </CreatureStatChip>
        ))}
      </Stack>
      {/* Capacités spéciales (PER-175, modèle bestiaire) : nom en gras + texte enrichi
          (dés/formules/`rang`/`niveau` résolus contre le maître, glossaire auto). */}
      {profile.specialAbilities && profile.specialAbilities.length > 0 && (
        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
          {profile.specialAbilities.map((ab, i) => (
            <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {ab.name}.
              </Box>{' '}
              {rich(ab.richText ?? ab.text)}
            </Typography>
          ))}
        </Stack>
      )}
      {profile.note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          {profile.note}
        </Typography>
      )}
    </>
  );
}

/** Description enrichie d'une créature SANS bloc de stats (Serviteur invisible) — `null` sinon. */
export function CreatureDescriptionRich({
  profile,
  abilities,
  level,
  rank,
}: {
  profile: CreatureProfile;
  abilities: Abilities;
  level: number;
  rank: number;
}) {
  if (!profile.descriptionRich) return null;
  return (
    <Typography variant="body2" color="text.secondary" component="div" sx={{ lineHeight: 1.5 }}>
      <RichInline text={profile.descriptionRich} abilities={abilities} level={level} rank={rank} />
    </Typography>
  );
}

/**
 * Bloc COMPACT « icône de stat dérivée + valeur » façon bestiaire (PER-175) — bordé, centré.
 * Disposés côte à côte sur UNE seule ligne (grille) dans la colonne droite de la carte compagnon.
 */
function DerivedStatBlock({
  statId,
  children,
  mobileEnlarge = false,
}: {
  statId: UiDerivedStatId;
  children: ReactNode;
  mobileEnlarge?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        px: 0.6,
        py: mobileEnlarge ? { xs: 0.7, sm: 0.4 } : 0.4,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
      }}
    >
      {/* Icône cerclée (DEF/Init./attaque, y compris le disque du dé de DM inclus dans
          `children`) agrandie sur mobile — largeur libre ici (2-3 blocs par ligne, pas 7). */}
      <DerivedStatIcon
        statId={statId}
        size={20}
        title
        sx={mobileEnlarge ? { width: { xs: 26, sm: 20 }, height: { xs: 26, sm: 20 } } : undefined}
      />
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          fontSize: '0.9rem',
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.4,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Box>
    </Stack>
  );
}

/** Enrobe UNIQUEMENT le chiffre (jamais le DM qui suit) d'une taille agrandie sur mobile. */
function EnlargedStatValue({ mobileEnlarge, children }: { mobileEnlarge: boolean; children: ReactNode }) {
  if (!mobileEnlarge) return <>{children}</>;
  return (
    <Box component="span" sx={{ fontSize: { xs: '1.05rem', sm: 'inherit' } }}>
      {children}
    </Box>
  );
}

/**
 * Statistiques dérivées d'une créature sur UNE SEULE LIGNE (PER-175) — DEF, (PV), Init.,
 * attaque(s) en petits blocs bordés côte à côte, pour la colonne droite de la carte compagnon,
 * sous la grille de caractéristiques (même esprit que le bloc DEF/PV/Init. du bestiaire). Reprend
 * la résolution de `CreatureStatsLine` (richText DEF, recopie du maître Init./attaque, DEF « en selle »).
 */
export function CreatureDerivedStats({
  profile,
  abilities,
  level,
  rank,
  masterDerived,
  defenseAltActive,
  showHitPoints = false,
  mobileEnlarge = false,
}: CreatureStatsLineProps) {
  const rich = (text: string) => <RichInline text={text} abilities={abilities} level={level} rank={rank} />;
  const defAlt = profile.defenseAlt;
  const attack = profile.attack;
  const attackStatId: UiDerivedStatId = attack?.fromMaster === 'rangedAttack' ? 'rangedAttack' : 'meleeAttack';
  type Block = { key: string; statId: UiDerivedStatId; content: ReactNode };
  // Rangée 1 : DEF / (PV) / Init. — Rangée 2 : attaque(s), à la ligne (1 attaque = pleine largeur,
  // 2 attaques = 2 colonnes), pour ne pas serrer les DM contre les stats défensives.
  const statBlocks: Block[] = [];
  const attackBlocks: Block[] = [];
  if (profile.defense || defAlt) {
    statBlocks.push({
      key: 'def',
      statId: 'defense',
      content: (
        <>
          <EnlargedStatValue mobileEnlarge={mobileEnlarge}>
            {defAlt && defenseAltActive ? (
              <AppTooltip
                title={`${defAlt.conditionLabel} (${defAlt.sourceLabel}) : DEF égale à celle du chevalier. Hors selle : DEF de base.`}
              >
                <Box component="span" sx={{ cursor: 'help' }}>
                  {isMasterRef(defAlt.value)
                    ? masterDerived
                      ? masterValue(masterDerived, defAlt.value.fromMaster)
                      : 'DEF du maître'
                    : rich(defAlt.value)}
                </Box>
              </AppTooltip>
            ) : (
              creatureDefenseNode(profile, abilities, level, rank)
            )}
          </EnlargedStatValue>
          <CreatureDefenseBadges profile={profile} />
        </>
      ),
    });
  }
  if (showHitPoints && profile.hitPoints) statBlocks.push({ key: 'hp', statId: 'maxHp', content: rich(profile.hitPoints) });
  if (profile.initiative) {
    statBlocks.push({
      key: 'init',
      statId: 'initiative',
      content: (
        <EnlargedStatValue mobileEnlarge={mobileEnlarge}>
          {isMasterRef(profile.initiative) ? (
            <MasterStatValue
              stat={profile.initiative.fromMaster}
              masterDerived={masterDerived}
              offset={profile.initiative.offset}
            />
          ) : (
            rich(profile.initiative)
          )}
        </EnlargedStatValue>
      ),
    });
  }
  if (attack) {
    attackBlocks.push({
      key: 'atk',
      statId: attackStatId,
      content: (
        <>
          {/* Chiffre du jet initial agrandi sur mobile — le DM qui suit garde sa taille. */}
          <EnlargedStatValue mobileEnlarge={mobileEnlarge}>
            {attack.fromMaster ? (
              <MasterStatValue stat={attack.fromMaster} masterDerived={masterDerived} />
            ) : (
              <Box component="span">{attack.value}</Box>
            )}
          </EnlargedStatValue>
          {/* DM optionnel (ex. dard du pseudo-dragon : effet = poison, pas de DM). */}
          {attack.damage && (
            <>
              <Box component="span" sx={{ opacity: 0.5 }}>·</Box>
              {rich(attack.damage)}
            </>
          )}
          {attack.bonusDie && (
            <BonusDieBadge ability="attaque" tooltipTitle="Dé bonus à l'attaque" size={14} />
          )}
        </>
      ),
    });
  }
  (profile.extraAttacks ?? []).forEach((extra, i) => {
    attackBlocks.push({
      key: `xa${i}`,
      statId: extra.ranged ? 'rangedAttack' : 'meleeAttack',
      content: (
        <>
          <EnlargedStatValue mobileEnlarge={mobileEnlarge}>
            <MasterStatValue stat="magicAttack" masterDerived={masterDerived} />
          </EnlargedStatValue>
          <Box component="span" sx={{ opacity: 0.5 }}>·</Box>
          {rich(extra.damage)}
        </>
      ),
    });
  });
  if (statBlocks.length === 0 && attackBlocks.length === 0) return null;
  const row = (items: Block[]) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 0.6 }}>
      {items.map((b) => (
        <DerivedStatBlock key={b.key} statId={b.statId} mobileEnlarge={mobileEnlarge}>
          {b.content}
        </DerivedStatBlock>
      ))}
    </Box>
  );
  return (
    <Stack spacing={0.6}>
      {statBlocks.length > 0 && row(statBlocks)}
      {attackBlocks.length > 0 && row(attackBlocks)}
    </Stack>
  );
}

/**
 * Capacités spéciales d'une créature en BLOCS bordés sur 2 colonnes (PER-175) — même présentation
 * que les « Capacités » du bestiaire (nom en gras + texte enrichi RichInline). `null` si aucune.
 */
export function CreatureSpecialAbilityBlocks({
  profile,
  abilities,
  level,
  rank,
}: {
  profile: CreatureProfile;
  abilities: Abilities;
  level: number;
  rank: number;
}) {
  const list = profile.specialAbilities ?? [];
  if (list.length === 0) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.75 }}>
      {list.map((ab, i) => (
        <Box
          key={i}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.75, bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.25 }}>
            {ab.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.5 }}>
            <RichInline text={ab.richText ?? ab.text} abilities={abilities} level={level} rank={rank} />
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * TEXTE D'ORIGINE verbatim d'une créature + page source (PER-175), en bas de la mini-fiche — comme
 * la description du bestiaire (encadré info italique, icône plume). Rend TRAÇABLE au livre chaque
 * stat/capacité dérivée (ex. le « 1d4° DM » du lézard voltaïque, p. 135). `null` si absent.
 */
export function CreatureVerbatimSource({ profile }: { profile: CreatureProfile }) {
  const v = profile.verbatimSource;
  if (!v) return null;
  return (
    <AppAlert severity="info" icon={<HistoryEduOutlinedIcon />}>
      <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-line', lineHeight: 1.55, fontStyle: 'italic' }}>
        <PageRefText>{v.text}</PageRefText> <SourceRef page={v.sourcePage} />
      </Typography>
    </AppAlert>
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
  /** Caractéristiques de la créature bénéficiant d'un DÉ BONUS (icône double-d20). */
  bonusDieAbilities?: Set<AbilityId>;
  /** La DÉFENSE ALTERNATIVE (`profile.defenseAlt`) est-elle active ? */
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
        {profile.size && <CompanionSizePill size={profile.size} />}
        {profile.type && (
          <Typography variant="caption" color="text.secondary">
            {profile.type}
          </Typography>
        )}
      </Stack>

      {/* Caractéristiques de la créature (grille compacte), omises si le livre n'en donne pas. */}
      {resolveCreatureAbilities(profile, abilities) && (
        <Box sx={{ mb: 0.75 }}>
          <CreatureAbilitiesGrid profile={profile} masterAbilities={abilities} bonusDieAbilities={bonusDieAbilities} />
        </Box>
      )}

      <CreatureStatsLine
        profile={profile}
        abilities={abilities}
        level={level}
        rank={rank}
        masterDerived={masterDerived}
        defenseAltActive={defenseAltActive}
      />

      {/* Texte d'origine verbatim + page source (PER-175), en bas du bloc — traçabilité au livre. */}
      {profile.verbatimSource && (
        <Box sx={{ mt: 0.75 }}>
          <CreatureVerbatimSource profile={profile} />
        </Box>
      )}
    </Box>
  );
}

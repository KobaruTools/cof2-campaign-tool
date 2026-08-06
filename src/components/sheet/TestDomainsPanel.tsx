'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { testDomains } from '@/data';
import type { AbilityId } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import {
  COMPETENCE_CATEGORY_LABEL,
  freelyStackingAbilityTestBonuses,
  resolveTestBonus,
  type AbilityTestBonusSource,
  type MagicTestSource,
  type TestDomainBonus,
  type UniversalTestBonus,
} from '@/lib/character/effects';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { abilityTestGradient, abilityTestPanelBg, ABILITY_TEST_GRADIENT } from '@/lib/ui/abilityColors';
import { agiTestArmorAdjustment } from '@/lib/character/equipment';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import { AbilityIcon } from '@/components/AbilityIcon';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DieIcon } from '@/components/DieIcon';

export interface TestDomainsPanelProps {
  /** Bonus de compétence par domaine (cf. `testBonusSources`) — seuls les domaines avec
   *  un bonus y figurent ; les autres sont affichés à +0 depuis le catalogue. */
  bonuses: TestDomainBonus[];
  /**
   * Caractéristiques EFFECTIVES du personnage (saisie + modificateurs permanents). Servent
   * à RANGER chaque domaine sous sa carac gouvernante la plus élevée (multi-carac), à
   * l'option « inclure la carac », et à la ligne « test de [CARAC] » de chaque en-tête.
   */
  abilities: Record<AbilityId, number>;
  /**
   * Bonus ACTIFS à TOUS les tests de caractéristique (ex. Bénédiction, via son
   * interrupteur) — appliqués à la ligne « test de [CARAC] » de chaque en-tête (et,
   * quand « inclure la carac » est coché, aux tests de domaine). Vide = aucun buff actif.
   */
  abilityTestBonus?: AbilityTestBonusSource[];
  /**
   * Modificateurs à TOUS les tests de caractéristique venus des ÉTATS DE COMBAT posés par le MJ en
   * session (PER-104) : malus d'un effet situationnel (« -1 à tous les tests ») comme bonus d'un
   * buff de groupe (« Chant des héros +1 »). Se cumulent avec `abilityTestBonus` — dont ils sont
   * tenus à part parce qu'ils ne renvoient à AUCUNE capacité de la fiche : leur ligne de détail
   * porte le nom de l'état, là où un buff de capacité affiche sa pastille. Vide hors session.
   */
  statusTestBonus?: { id: string; label: string; value: number }[];
  /**
   * Bonus CHIFFRÉS à UNE caractéristique précise (ex. Tatouages, PER-125), regroupés par carac.
   * Ajoutés à la ligne « test de [CARAC] » de la carac visée (et, quand « inclure la carac » est
   * coché, à ses domaines). Distinct de `abilityTestBonus` (buff uniforme à toutes les caracs).
   */
  perAbilityTestBonus?: Partial<Record<AbilityId, AbilityTestBonusSource[]>>;
  /**
   * Sources de bonus de MAGIE aux tests (PER-275) : capacités marquées (Tatouages, p. 80) et
   * objets magiques PORTÉS. Elles NE se cumulent PAS entre elles — l'arbitrage (« on garde le
   * meilleur ») et l'addition au bonus de compétence sont faits par `resolveTestBonus`. Celles
   * de portée carac recoupent `perAbilityTestBonus`, dont on n'additionne donc que la part
   * librement cumulable. Absent = aucun bonus de magie.
   */
  magicTestBonuses?: MagicTestSource[];
  /**
   * Caractéristiques bénéficiant d'un DÉ BONUS permanent (badge double-d20), avec la/les
   * capacité(s) source(s) — affiché à droite de la ligne « test de [CARAC] ».
   */
  bonusDice?: Partial<Record<AbilityId, string[]>>;
  /**
   * Bonus de compétence UNIVERSEL en PLANCHER (ex. Éclectique, PER-102) : s'applique à
   * TOUS les tests de domaine sans autre bonus de profil/prestige. Les domaines déjà
   * bonifiés l'incluent dans leur total ; cette valeur sert la ligne récap « tous les
   * autres tests : +N ». Absent = pas de plancher universel.
   */
  universalBonus?: UniversalTestBonus | null;
  /**
   * Domaines bénéficiant d'un DÉ BONUS CONDITIONNEL actuellement actif (badge double-d20),
   * map domaine → capacité(s) source(s) — ex. Travail d'équipe (rôdeur) quand son interrupteur
   * « loup au contact » est actif (PER-108). Absent / vide = aucun.
   */
  testDice?: Map<string, string[]>;
  /**
   * Malus d'armure (« malus d'encombrement », p. 188, PER-209) = DEF mondaine de l'armure
   * portée − bonus magique, plancher 0. Appliqué AUTOMATIQUEMENT en soustraction aux tests
   * d'AGI (ligne « test de AGI » et domaines AGI quand la carac est incluse) ; rappelé au MJ,
   * SANS être appliqué, sur les 6 domaines de survie CON. 0 / absent = aucune armure gênante.
   */
  armorPenalty?: number;
  /**
   * Plafond d'AGI imposé par l'armure PORTÉE (`null` = aucun, PER-78). Appliqué à l'AGI
   * effective AVANT le malus d'armure sur la ligne « test de AGI » et les domaines AGI.
   */
  armorMaxAgi?: number | null;
  /**
   * Panneau de CONTENU pur (pas de titre, pas de cadre `SheetSection`, pas de repli) : c'est
   * l'appelant qui l'héberge dans sa propre `SheetSection` (fiche : onglet « Compétences &
   * tests » de la section « Statistiques dérivées » ; écran de MJ : section dédiée standard).
   * Les deux bascules d'affichage (cf. `TestDomainsToggles`) restent contrôlées par l'appelant
   * (préférence persistée, mêmes clés partagées entre fiche et écran de MJ) mais sont rendues
   * par LE PANNEAU LUI-MÊME, en haut à droite du contenu : sur la fiche, le bandeau d'onglets
   * de la `SheetSection` hôte ne laisse pas assez de place en en-tête pour les accueillir.
   */
  includeAbility: boolean;
  onIncludeAbilityChange: (value: boolean) => void;
  hideZero: boolean;
  onHideZeroChange: (value: boolean) => void;
}

export interface TestDomainsTogglesProps {
  includeAbility: boolean;
  onIncludeAbilityChange: (value: boolean) => void;
  hideZero: boolean;
  onHideZeroChange: (value: boolean) => void;
}

/** Bascules d'affichage de `TestDomainsPanel`, rendues par le panneau en haut de son contenu. */
export function TestDomainsToggles({
  includeAbility,
  onIncludeAbilityChange,
  hideZero,
  onHideZeroChange,
}: TestDomainsTogglesProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={includeAbility}
            onChange={(e) => onIncludeAbilityChange(e.target.checked)}
          />
        }
        label={<Typography variant="caption">Inclure la carac</Typography>}
        sx={{ mr: 0 }}
      />
      <FormControlLabel
        control={
          <Switch size="small" checked={hideZero} onChange={(e) => onHideZeroChange(e.target.checked)} />
        }
        label={<Typography variant="caption">Masquer les domaines sans bonus</Typography>}
        sx={{ mr: 0 }}
      />
    </Stack>
  );
}

/**
 * Domaines de survie (CON) sur lesquels le MJ PEUT — à sa seule appréciation — imposer le
 * malus d'armure (p. 188, PER-209). Liste validée propriétaire (2026-07-09). Les autres
 * tests de CON (maladies, poisons, étourdissement, affaiblissement, équitation) n'en
 * reçoivent aucun rappel.
 */
const SURVIVAL_CON_DOMAINS = new Set<string>([
  'endurance',
  'swimming',
  'long-running',
  'cold-resistance',
  'heat-resistance',
  'deprivation-resistance',
]);

/** Modificateur signé (« +3 », « +0 », « −2 »). */
const signed = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Clé React stable d'une source de magie (capacité, ou objet identifié par son nom). */
const magicKey = (s: MagicTestSource): string => s.featureId ?? `item:${s.name}`;

/**
 * Libellé d'une source de bonus de magie dans un détail de calcul : puce de voie quand la
 * source est une CAPACITÉ, simple libellé texte quand c'est un OBJET porté — même choix que les
 * apports de caractéristiques (PER-272), un objet n'ayant aucune voie à afficher.
 */
function MagicSourceLabel({ source }: { source: MagicTestSource }) {
  return (
    <>
      <Box component="span">Bonus de magie —</Box>
      {source.featureId ? (
        <CapabilityChip featureId={source.featureId} label={null} />
      ) : (
        <Box component="span">{source.name}</Box>
      )}
    </>
  );
}

/**
 * Lignes de détail d'un bonus de magie : la source RETENUE, puis les sources ÉCARTÉES en barré
 * avec le rappel du non-cumul (p. 80 / p. 203). Même langage visuel que les contributions
 * dominées d'un bonus de compétence (PER-73), pour que le joueur voie qu'un second objet
 * enchanté est bien pris en compte mais dominé.
 */
function MagicRows({ kept, dominated }: { kept: MagicTestSource | null; dominated: MagicTestSource[] }) {
  return (
    <>
      {kept && <BreakdownRow label={<MagicSourceLabel source={kept} />} value={signed(kept.value)} />}
      {dominated.map((s) => (
        <Box key={`magic-dom-${magicKey(s)}`} sx={{ mt: 0.25 }}>
          <BreakdownRow strike label={`Bonus de magie — ${s.name}`} value={signed(s.value)} />
          <Typography
            variant="caption"
            component="div"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', fontStyle: 'italic', color: 'text.secondary' }}
          >
            {kept?.featureId ? (
              <>
                Ne se cumule pas avec <CapabilityChip featureId={kept.featureId} label={null} />
              </>
            ) : (
              `Ne se cumule pas avec ${kept?.name ?? ''}`
            )}
          </Typography>
        </Box>
      ))}
    </>
  );
}

/**
 * Ligne de détail d'infobulle « libellé … valeur » : libellé à gauche (pouvant porter
 * une puce de voie, centrée verticalement dans la ligne), valeur à droite en chiffres
 * tabulaires. Même langage visuel que `BreakdownContent` (caractéristiques / stats
 * dérivées) pour harmoniser tous les détails de calcul de la fiche.
 */
function BreakdownRow({
  label,
  value,
  strong = false,
  muted = false,
  strike = false,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Ligne de total : libellé et valeur en gras. */
  strong?: boolean;
  /** Ligne secondaire (gris atténué). */
  muted?: boolean;
  /** Source dominée : libellé barré et grisé. */
  strike?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        fontVariantNumeric: 'tabular-nums',
        ...(muted && { color: 'text.secondary' }),
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
          minWidth: 0,
          ...(strike && { textDecoration: 'line-through', color: 'text.disabled' }),
        }}
      >
        {label}
      </Box>
      <Box component="span" sx={{ fontWeight: strong ? 700 : 600, whiteSpace: 'nowrap' }}>
        {value}
      </Box>
    </Box>
  );
}

/**
 * Pastille d'avertissement compacte (même langage visuel que le badge « +15 » et
 * `DefenseBadge` — PAS un Chip MUI). Sert à porter une ICÔNE (armure, avertissement) plutôt
 * qu'à réécrire un chiffre déjà affiché ailleurs : la teinte warning et son tooltip suffisent.
 * `outlined` (fond transparent + bord tireté) est le style par défaut de ces rappels ; l'icône
 * distingue leur nature (cuirasse = malus d'armure AGI appliqué ; triangle = rappel MJ optionnel
 * sur les tests de survie CON).
 */
function WarnPill({ children, outlined = false }: { children: ReactNode; outlined?: boolean }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        px: 0.75,
        height: 20,
        borderRadius: 1,
        fontSize: '0.7rem',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: theme.palette.warning.main,
        bgcolor: alpha(theme.palette.warning.main, outlined ? 0 : 0.12),
        border: `1px ${outlined ? 'dashed' : 'solid'} ${alpha(theme.palette.warning.main, 0.45)}`,
      })}
    >
      {children}
    </Box>
  );
}

/**
 * Contenu « Compétences & tests » : les 7 caractéristiques, chacune avec sa ligne
 * **« test de [CARAC] »** (icône d20 + modificateur de la carac, buff temporaire inclus —
 * ex. Bénédiction), et **regroupant ses domaines** avec leur **bonus de compétence plat**
 * (PER-89). Un domaine multi-carac est rangé sous sa carac la plus élevée chez le personnage
 * (égalité → première carac déclarée au catalogue, stable). Deux options de vue, pilotées
 * par l'appelant (`includeAbility`/`hideZero`, cf. `TestDomainsToggles`) : inclure la
 * meilleure carac dans le chiffre des domaines, et masquer les domaines à 0. Au survol :
 * provenance (capacité par catégorie de source, p. 203) et plafond +15. Lecture seule (les
 * interrupteurs des buffs vivent sur les cartes de capacité). Bloc de contenu pur — pas de
 * titre ni de cadre : l'appelant l'héberge dans sa propre `SheetSection`.
 */
export function TestDomainsPanel({
  bonuses,
  abilities,
  abilityTestBonus,
  statusTestBonus,
  perAbilityTestBonus,
  magicTestBonuses,
  bonusDice,
  universalBonus,
  testDice,
  armorPenalty,
  armorMaxAgi,
  includeAbility,
  onIncludeAbilityChange,
  hideZero,
  onHideZeroChange,
}: TestDomainsPanelProps) {
  const penalty = armorPenalty ?? 0;

  const byDomain = new Map(bonuses.map((b) => [b.domain, b]));

  const magicSources = magicTestBonuses ?? [];
  // Domaines bonifiés par un OBJET magique visant ce domaine précis : leur bonus ne vient pas de
  // `bonuses` (ce n'est pas un bonus de compétence de voie), il faut donc les rendre visibles
  // explicitement quand « masquer les domaines sans bonus » est coché.
  const magicDomains = new Set(
    magicSources.flatMap((s) => (s.scope.kind === 'domain' ? [s.scope.domain] : [])),
  );

  const lines = testDomains
    .map((d) => ({ d, bonus: byDomain.get(d.id) }))
    // Un domaine reste visible s'il porte un bonus chiffré (voie ou objet magique) OU un dé bonus
    // conditionnel actif.
    .filter(
      ({ d, bonus }) =>
        !hideZero ||
        (bonus?.total ?? 0) !== 0 ||
        magicDomains.has(d.id) ||
        (testDice?.has(d.id) ?? false),
    );

  // Buff actif uniforme sur TOUS les tests de carac (ex. Bénédiction : +1, +2 au rang 5).
  const buffSources = abilityTestBonus ?? [];
  // Même axe, autre provenance (PER-104) : les états posés par le MJ en session. Ils s'additionnent
  // aux buffs de capacité — un buff de groupe +1 annule un « -1 à tous les tests » subi.
  const statusSources = statusTestBonus ?? [];
  const testBuff =
    buffSources.reduce((sum, s) => sum + s.value, 0) +
    statusSources.reduce((sum, s) => sum + s.value, 0);

  return (
    <>
      {/* Bascules en haut à DROITE du bloc, sur la même ligne que le rappel de règle : l'en-tête
          de la `SheetSection` hôte n'a plus la place (bandeau d'onglets), cf. son action vide. */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', mb: 1.5 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ flex: '1 1 240px', minWidth: 0 }}>
          Test de carac (d20 + carac) par caractéristique, et bonus de compétence des domaines
          (cumul par domaine, plafond +15 — <SourceRef page={203} />).
        </Typography>
        <TestDomainsToggles
          includeAbility={includeAbility}
          onIncludeAbilityChange={onIncludeAbilityChange}
          hideZero={hideZero}
          onHideZeroChange={onHideZeroChange}
        />
      </Stack>
      <Stack spacing={2.5}>
        {ABILITY_IDS.map((ability) => {
          // Un domaine multi-carac (ex. Équitation CON/CHA, Survie en forêt AGI/PER) apparaît
          // sous CHACUNE de ses caracs : le bonus de compétence est le même, seule la carac que
          // le MJ ajoute au jet change selon l'action. Le tooltip l'explique (cf. `multiAbility`).
          const group = lines
            .filter((l) => l.d.abilities.includes(ability))
            .sort((a, b) => a.d.label.localeCompare(b.d.label, 'fr'));

          const rawAbilityMod = abilities[ability] ?? 0;
          // Effet de l'armure portée sur les seuls tests d'AGI : plafond d'AGI (PER-78) PUIS
          // malus d'armure (PER-209), composés dans le bon ordre par le helper pur. Les autres
          // caracs (et l'AGI sans armure gênante) restent inchangées.
          const isAgi = ability === 'AGI';
          const agiAdj = isAgi ? agiTestArmorAdjustment(rawAbilityMod, armorMaxAgi ?? null, penalty) : null;
          const agiCapBites = agiAdj?.capped ?? false;
          const agiPenalty = agiAdj?.penalty ?? 0;
          const abilityMod = agiAdj ? agiAdj.cappedAgi : rawAbilityMod;
          // Bonus CHIFFRÉS propres à CETTE carac (ex. Prescience, PER-137) — HORS bonus de magie
          // (Tatouages), qui obéissent à un non-cumul et passent par `resolveTestBonus`.
          const perCaracSources = freelyStackingAbilityTestBonuses(perAbilityTestBonus?.[ability]);
          const perCaracBonus = perCaracSources.reduce((sum, s) => sum + s.value, 0);
          // Test de carac NU : seules les sources de magie de portée CARAC s'appliquent (un objet
          // « +5 en Discrétion » ne bonifie pas un test d'AGI générique), et une seule compte.
          const caracMagic = resolveTestBonus({ magic: magicSources, ability });
          const caracTest = abilityMod + testBuff + perCaracBonus + caracMagic.abilityMagic - agiPenalty;
          const caracBuffed = testBuff !== 0 || perCaracBonus !== 0 || caracMagic.abilityMagic !== 0;
          const dice = bonusDice?.[ability] ?? [];

          // Détail de la ligne « test de [CARAC] » : carac de base + chaque buff actif + bonus propres,
          // aligné comme les infobulles de stats dérivées (chiffres à droite, total en bas).
          const testBreakdown = (
            <Box sx={{ minWidth: 180, py: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Test de {ABILITY_NAMES[ability]} ({ability})
              </Typography>
              <BreakdownRow label={`Caractéristique ${ability}`} value={signed(rawAbilityMod)} />
              {agiCapBites && (
                <BreakdownRow
                  muted
                  label={
                    <>
                      <Box component="span">Plafond d'armure</Box>
                      <SourceRef page={188} />
                    </>
                  }
                  value={signed(abilityMod - rawAbilityMod)}
                />
              )}
              {buffSources.map((s) => (
                <BreakdownRow
                  key={s.featureId}
                  label={<CapabilityChip featureId={s.featureId} label={null} />}
                  value={signed(s.value)}
                />
              ))}
              {/* États de combat posés par le MJ (PER-104) : libellé nu, aucune capacité à pointer. */}
              {statusSources.map((s) => (
                <BreakdownRow key={s.id} label={s.label} value={signed(s.value)} />
              ))}
              {perCaracSources.map((s) => (
                <BreakdownRow
                  key={s.featureId}
                  label={<CapabilityChip featureId={s.featureId} label={null} />}
                  value={signed(s.value)}
                />
              ))}
              <MagicRows kept={caracMagic.keptMagic} dominated={caracMagic.dominatedMagic} />
              {agiPenalty > 0 && (
                <BreakdownRow
                  label={
                    <>
                      <Box component="span" sx={{ color: 'warning.main' }}>
                        Malus d'armure
                      </Box>
                      <SourceRef page={188} />
                    </>
                  }
                  value={
                    <Box component="span" sx={{ color: 'warning.main' }}>
                      {signed(-agiPenalty)}
                    </Box>
                  }
                />
              )}
              <Divider sx={{ my: 0.5 }} />
              {/* La ligne de total porte le « d20 » : c'est un jet, pas une valeur figée. */}
              <BreakdownRow strong label="Total" value={`d20 ${signed(caracTest)}`} />
            </Box>
          );

          return (
            <Box key={ability}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  // Collé au tableau des domaines qui suit : pas de marge basse et coins bas
                  // carrés (le tableau reprend les coins arrondis en bas). Sans domaines, l'en-tête
                  // reste une pastille entièrement arrondie.
                  mb: 0,
                  px: 1,
                  py: 0.5,
                  borderRadius: group.length > 0 ? '4px 4px 0 0' : 1,
                  // Dégradé gauche→droite : du gris de fond actuel (`action.hover`) vers la
                  // teinte d'identité de la carac légèrement désaturée (PER-224 → tests).
                  background: (theme) =>
                    abilityTestGradient(ability, theme.palette.action.hover, ABILITY_TEST_GRADIENT.header),
                }}
              >
                <AbilityIcon ability={ability} size={24} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {ABILITY_NAMES[ability]} ({ability})
                </Typography>
                <AppTooltip title={testBreakdown}>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: 'center',
                      cursor: 'help',
                      color: caracBuffed ? 'secondary.main' : 'text.secondary',
                    }}
                  >
                    <DieIcon die="d20" size={18} noTooltip />
                    <Typography variant="subtitle2" color="inherit" sx={{ fontWeight: 700 }}>
                      {signed(caracTest)}
                    </Typography>
                  </Stack>
                </AppTooltip>
                {dice.length > 0 && <BonusDieBadge ability={ability} sources={dice} size={16} />}
                {agiPenalty > 0 && (
                  <AppTooltip
                    title={
                      <Box sx={{ py: 0.5, maxWidth: 240 }}>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Malus d'armure appliqué : le chiffre affiché est déjà minoré de{' '}
                          {signed(-agiPenalty)} sur tous les tests d'AGI (<SourceRef page={188} />).
                        </Typography>
                      </Box>
                    }
                  >
                    <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }}>
                      {/* Le chiffre est DÉJÀ dans le total « d20 −N » à gauche : plutôt que de le
                          réécrire, la pastille signale seulement la SOURCE — l'armure portée — via
                          son icône (cuirasse). Le tooltip porte la valeur et la référence de page. */}
                      <WarnPill outlined>
                        <ItemTypeIcon type="armor" size={13} />
                      </WarnPill>
                    </Box>
                  </AppTooltip>
                )}
              </Stack>
              {group.length > 0 && (
                <Box
                  sx={{
                    p: 1,
                    // Coins bas arrondis + haut carré : le tableau prolonge l'en-tête au-dessus.
                    borderRadius: '0 0 4px 4px',
                    // Fond plat très faible de la teinte de la carac, sous les cellules (qui
                    // portent leur propre dégradé) : matérialise chaque « tableau » de tests.
                    background: abilityTestPanelBg(ability),
                  }}
                >
                <Grid container spacing={1}>
                  {group.map(({ d, bonus }) => {
                    // Bonus de compétence de ce domaine + bonus de magie applicable à CE test
                    // (couple carac × domaine), arbitré et plafonné par le moteur.
                    const resolved = resolveTestBonus({
                      competence: bonus,
                      magic: magicSources,
                      ability,
                      domain: d.id,
                    });
                    const flat = resolved.flat;
                    const has = (bonus?.sources.length ?? 0) > 0 || flat !== 0;
                    const die = testDice?.get(d.id);
                    // Carac EFFECTIVE incluse : AGI déjà plafonnée par l'armure (PER-78) comme la
                    // ligne d'en-tête, pas l'AGI brute.
                    const abilityValue = abilityMod;
                    // Rappel MJ (non appliqué) du malus d'armure sur les tests de survie CON (p. 188).
                    const survivalConReminder = penalty > 0 && SURVIVAL_CON_DOMAINS.has(d.id);
                    // « Inclure la carac » ajoute LA carac du groupe courant, le buff actif uniforme ET
                    // le bonus propre à cette carac (tatouage…) — un test de domaine est aussi un test de
                    // carac. Pour un domaine multi-carac, ce bloc est rendu une fois par carac (le bonus
                    // de compétence est identique ; seule la carac ajoutée diffère). Le malus d'armure
                    // (AGI seulement, PER-209) est retranché comme sur la ligne d'en-tête.
                    // Le bonus de magie de portée CARAC (tatouage, objet visant la carac) n'entre
                    // que lorsqu'on inclut la carac — comme le buff uniforme : il est déjà porté
                    // par la ligne d'en-tête. Celui de portée DOMAINE est dans `flat`.
                    const display = includeAbility
                      ? flat + abilityValue + testBuff + perCaracBonus + resolved.abilityMagic - agiPenalty
                      : flat;
                    const multiAbility = d.abilities.length > 1;
                    // Sources de magie à détailler ici : celles de portée domaine toujours, celles
                    // de portée carac seulement quand la carac est incluse (sinon on annoncerait un
                    // terme qui n'est pas dans le chiffre affiché).
                    const showMagic = includeAbility || resolved.keptMagic?.scope.kind === 'domain';
                    const magicRows = showMagic ? resolved : null;

                    // Nombre de lignes CHIFFRÉES qui se cumulent (hors sources dominées, barrées) : sert à
                    // n'afficher une ligne « Total » que lorsqu'il y a au moins deux termes à sommer.
                    const contributingRows =
                      (includeAbility
                        ? 1 +
                          buffSources.length +
                          statusSources.length +
                          perCaracSources.length +
                          (agiPenalty > 0 ? 1 : 0)
                        : 0) +
                      (bonus?.sources.length ?? 0) +
                      (magicRows?.keptMagic ? 1 : 0);

                    const breakdown =
                      has || includeAbility || magicRows?.keptMagic || d.description || multiAbility || survivalConReminder ? (
                        <Box sx={{ minWidth: 180, py: 0.5 }}>
                          {d.description && (
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }}
                            >
                              {d.description}
                            </Typography>
                          )}
                          {multiAbility && (
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', fontStyle: 'italic', color: 'text.secondary', mb: has || includeAbility ? 0.5 : 0 }}
                            >
                              Ce domaine relève de plusieurs caractéristiques ({d.abilities.join(', ')}) : le type
                              de jet à lancer est décidé par le MJ selon l’action. Le même bonus apparaît donc sous
                              chacune de ces caractéristiques.
                            </Typography>
                          )}
                          {includeAbility && (
                            <BreakdownRow label={`Caractéristique ${ability}`} value={signed(rawAbilityMod)} />
                          )}
                          {includeAbility && agiCapBites && (
                            <BreakdownRow
                              muted
                              label={
                                <>
                                  <Box component="span">Plafond d'armure</Box>
                                  <SourceRef page={188} />
                                </>
                              }
                              value={signed(abilityValue - rawAbilityMod)}
                            />
                          )}
                          {includeAbility &&
                            buffSources.map((s) => (
                              <BreakdownRow
                                key={s.featureId}
                                label={<CapabilityChip featureId={s.featureId} label={null} />}
                                value={signed(s.value)}
                              />
                            ))}
                          {includeAbility &&
                            statusSources.map((s) => (
                              <BreakdownRow key={s.id} label={s.label} value={signed(s.value)} />
                            ))}
                          {includeAbility &&
                            perCaracSources.map((s) => (
                              <BreakdownRow
                                key={s.featureId}
                                label={<CapabilityChip featureId={s.featureId} label={null} />}
                                value={signed(s.value)}
                              />
                            ))}
                          {includeAbility && agiPenalty > 0 && (
                            <BreakdownRow
                              label={
                                <>
                                  <Box component="span" sx={{ color: 'warning.main' }}>
                                    Malus d'armure
                                  </Box>
                                  <SourceRef page={188} />
                                </>
                              }
                              value={
                                <Box component="span" sx={{ color: 'warning.main' }}>
                                  {signed(-agiPenalty)}
                                </Box>
                              }
                            />
                          )}
                          {bonus?.sources.map((s) => (
                            <BreakdownRow
                              key={s.featureId}
                              label={
                                <>
                                  <Box component="span">{COMPETENCE_CATEGORY_LABEL[s.category]} —</Box>
                                  <CapabilityChip featureId={s.featureId} label={null} />
                                </>
                              }
                              value={signed(s.value)}
                            />
                          ))}
                          {/* Sources DOMINÉES (PER-73) : prises en compte mais battues dans leur catégorie
                              (max par catégorie, p. 203) → affichées BARRÉES + la capacité qui les domine
                              (puce de voie). Ex. une capacité empruntée égalée par une vraie voie de profil. */}
                          {magicRows && (
                            <MagicRows kept={magicRows.keptMagic} dominated={magicRows.dominatedMagic} />
                          )}
                          {bonus?.dominated?.map((dom) => (
                            <Box key={`dom-${dom.source.featureId}`} sx={{ mt: 0.25 }}>
                              <BreakdownRow
                                strike
                                label={`${COMPETENCE_CATEGORY_LABEL[dom.source.category]} — ${dom.source.name}`}
                                value={signed(dom.source.value)}
                              />
                              <Typography
                                variant="caption"
                                component="div"
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', fontStyle: 'italic', color: 'text.secondary' }}
                              >
                                Ne se cumule pas avec{' '}
                                <CapabilityChip featureId={dom.dominatedBy.featureId} label={null} />
                              </Typography>
                            </Box>
                          ))}
                          {contributingRows > 1 && (
                            <>
                              <Divider sx={{ my: 0.5 }} />
                              <BreakdownRow strong label="Total" value={signed(display)} />
                            </>
                          )}
                          {resolved.capped && (
                            <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                              Bonus plafonné à +15, bonus de magie compris (<SourceRef page={203} />).
                            </Typography>
                          )}
                          {survivalConReminder && (
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', fontStyle: 'italic', color: 'warning.main', mt: has || includeAbility ? 0.5 : 0 }}
                            >
                              Malus d'armure éventuel : {signed(-penalty)}. Le MJ <em>peut</em> l'imposer sur les
                              tests de survie ; son application, sa valeur et le périmètre des tests concernés
                              restent à sa libre appréciation (<SourceRef page={188} />).
                            </Typography>
                          )}
                        </Box>
                      ) : null;

                    const row = (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 1,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          // Même dégradé carac que l'en-tête, mais BEAUCOUP moins intense (cellules
                          // très nombreuses → volontairement subtil). Les cellules bonifiées gardent
                          // le gris de fond discret comme base (moitié de l'opacité de survol) ; les
                          // cellules à 0 partent de transparent — dans les deux cas la teinte de la
                          // carac colore faiblement le bord droit pour rattacher visuellement le test.
                          background: (theme) =>
                            abilityTestGradient(
                              ability,
                              has
                                ? alpha(theme.palette.text.primary, theme.palette.action.hoverOpacity / 2)
                                : 'transparent',
                              ABILITY_TEST_GRADIENT.cell,
                            ),
                          cursor: breakdown ? 'help' : undefined,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" color={has || die ? undefined : 'text.disabled'} noWrap>
                            {d.label}
                          </Typography>
                          {multiAbility && (
                            <Typography variant="caption" color="text.secondary">
                              {d.abilities.map((a) => (a === ability ? `[${a}]` : a)).join(' / ')}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          {die && <BonusDieBadge ability={d.label} sources={die} size={14} />}
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: has ? 700 : 400 }}
                            color={has || die || (includeAbility && display !== 0) ? undefined : 'text.disabled'}
                          >
                            {signed(display)}
                          </Typography>
                          {/* Badge de plafond custom (≠ Chip MUI) : même langage visuel que
                              DefenseBadge — pastille warning bordée, le tooltip de la ligne porte
                              déjà l'explication du plafond +15 (p. 203). */}
                          {resolved.capped && (
                            <Box
                              component="span"
                              sx={(theme) => ({
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 0.75,
                                height: 20,
                                borderRadius: 1,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                lineHeight: 1,
                                whiteSpace: 'nowrap',
                                color: theme.palette.warning.main,
                                bgcolor: alpha(theme.palette.warning.main, 0.12),
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
                              })}
                            >
                              +15
                            </Box>
                          )}
                          {/* Rappel MJ (non appliqué) du malus d'armure sur les tests de survie CON :
                              pastille warning TIRETÉE, réduite à une icône d'avertissement (rien n'est
                              imposé). Le détail — valeur du malus et libre appréciation — est dans le tooltip. */}
                          {survivalConReminder && (
                            <WarnPill outlined>
                              <WarningAmberRoundedIcon sx={{ fontSize: 14 }} />
                            </WarnPill>
                          )}
                        </Stack>
                      </Box>
                    );

                    return (
                      <Grid key={d.id} size={{ xs: 6, sm: 4 }}>
                        {breakdown ? (
                          <AppTooltip title={breakdown}>
                            {row}
                          </AppTooltip>
                        ) : (
                          row
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
      {universalBonus && (
        <AppTooltip
          title={
            <Box sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ display: 'block' }}>
                {universalBonus.name} : bonus de compétence universel appliqué à tout test
                sans bonus de voie de profil ou de prestige (se cumule avec le bonus de peuple).
              </Typography>
            </Box>
          }
        >
          <Box
            sx={{
              mt: 2,
              px: 1,
              py: 0.75,
              borderRadius: 1,
              cursor: 'help',
              borderTop: (theme) => `1px dashed ${alpha(theme.palette.text.secondary, 0.4)}`,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Tous les autres tests <Typography component="span" variant="caption">({universalBonus.name})</Typography>
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {signed(universalBonus.value)}
            </Typography>
          </Box>
        </AppTooltip>
      )}
    </>
  );
}

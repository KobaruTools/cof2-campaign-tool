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
  type AbilityTestBonusSource,
  type TestDomainBonus,
  type UniversalTestBonus,
} from '@/lib/character/effects';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { agiTestArmorAdjustment } from '@/lib/character/equipment';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import { AbilityIcon } from '@/components/AbilityIcon';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DieIcon } from '@/components/DieIcon';
import { SheetSection } from '@/components/sheet/SheetSection';

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
   * Bonus CHIFFRÉS à UNE caractéristique précise (ex. Tatouages, PER-125), regroupés par carac.
   * Ajoutés à la ligne « test de [CARAC] » de la carac visée (et, quand « inclure la carac » est
   * coché, à ses domaines). Distinct de `abilityTestBonus` (buff uniforme à toutes les caracs).
   */
  perAbilityTestBonus?: Partial<Record<AbilityId, AbilityTestBonusSource[]>>;
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
 * `DefenseBadge` — PAS un Chip MUI). `outlined` (fond transparent + bord tireté) sert au
 * rappel MJ *optionnel* (CON survie) pour le distinguer du malus RÉELLEMENT appliqué (AGI,
 * fond plein).
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
 * Encadré « Compétences & tests » : les 7 caractéristiques, chacune avec sa ligne
 * **« test de [CARAC] »** (icône d20 + modificateur de la carac, buff temporaire inclus —
 * ex. Bénédiction), et **regroupant ses domaines** avec leur **bonus de compétence plat**
 * (PER-89). Un domaine multi-carac est rangé sous sa carac la plus élevée chez le personnage
 * (égalité → première carac déclarée au catalogue, stable). Deux options de vue (en haut à
 * droite) : inclure la meilleure carac dans le chiffre des domaines, et masquer les domaines
 * à 0. Au survol : provenance (capacité par catégorie de source, p. 203) et plafond +15.
 * Lecture seule (les interrupteurs des buffs vivent sur les cartes de capacité).
 */
export function TestDomainsPanel({ bonuses, abilities, abilityTestBonus, perAbilityTestBonus, bonusDice, universalBonus, testDice, armorPenalty, armorMaxAgi }: TestDomainsPanelProps) {
  const penalty = armorPenalty ?? 0;
  const [includeAbility, setIncludeAbility] = usePersistedBoolean('test-domains:include-ability', false);
  // Coché par défaut : on n'affiche d'emblée que les domaines effectivement bonifiés
  // (les centaines de domaines à 0 sont masqués tant que l'utilisateur ne les demande pas).
  const [hideZero, setHideZero] = usePersistedBoolean('test-domains:hide-zero', true);

  const byDomain = new Map(bonuses.map((b) => [b.domain, b]));

  const lines = testDomains
    .map((d) => ({ d, bonus: byDomain.get(d.id) }))
    // Un domaine reste visible s'il porte un bonus chiffré OU un dé bonus conditionnel actif.
    .filter(({ d, bonus }) => !hideZero || (bonus?.total ?? 0) !== 0 || (testDice?.has(d.id) ?? false));

  // Buff actif uniforme sur TOUS les tests de carac (ex. Bénédiction : +1, +2 au rang 5).
  const buffSources = abilityTestBonus ?? [];
  const testBuff = buffSources.reduce((sum, s) => sum + s.value, 0);

  const toggles = (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      <FormControlLabel
        control={
          <Switch size="small" checked={includeAbility} onChange={(e) => setIncludeAbility(e.target.checked)} />
        }
        label={<Typography variant="caption">Inclure la carac</Typography>}
        sx={{ mr: 0 }}
      />
      <FormControlLabel
        control={<Switch size="small" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />}
        label={<Typography variant="caption">Masquer les domaines sans bonus</Typography>}
        sx={{ mr: 0 }}
      />
    </Stack>
  );

  return (
    <SheetSection
      title="Compétences & tests"
      icon="tests"
      collapsible
      defaultCollapsed
      persistKey="test-domains"
      // Les toggles n'ont aucun sens quand le bloc est replié : on ne les affiche que déplié.
      action={(collapsed) => (collapsed ? null : toggles)}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Test de carac (d20 + carac) par caractéristique, et bonus de compétence des domaines
        (cumul par domaine, plafond +15 — <SourceRef page={203} />).
      </Typography>
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
          // Bonus CHIFFRÉS propres à CETTE carac (ex. Tatouages, PER-125).
          const perCaracSources = perAbilityTestBonus?.[ability] ?? [];
          const perCaracBonus = perCaracSources.reduce((sum, s) => sum + s.value, 0);
          const caracTest = abilityMod + testBuff + perCaracBonus - agiPenalty;
          const caracBuffed = testBuff !== 0 || perCaracBonus !== 0;
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
              {perCaracSources.map((s) => (
                <BreakdownRow
                  key={s.featureId}
                  label={<CapabilityChip featureId={s.featureId} label={null} />}
                  value={signed(s.value)}
                />
              ))}
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
                  mb: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <AbilityIcon ability={ability} size={24} sx={{ color: 'text.secondary' }} />
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
                      <WarnPill>{signed(-agiPenalty)}</WarnPill>
                    </Box>
                  </AppTooltip>
                )}
              </Stack>
              {group.length > 0 && (
                <Grid container spacing={1}>
                  {group.map(({ d, bonus }) => {
                    const flat = bonus?.total ?? 0;
                    const has = (bonus?.sources.length ?? 0) > 0;
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
                    const display = includeAbility ? flat + abilityValue + testBuff + perCaracBonus - agiPenalty : flat;
                    const multiAbility = d.abilities.length > 1;

                    // Nombre de lignes CHIFFRÉES qui se cumulent (hors sources dominées, barrées) : sert à
                    // n'afficher une ligne « Total » que lorsqu'il y a au moins deux termes à sommer.
                    const contributingRows =
                      (includeAbility ? 1 + buffSources.length + perCaracSources.length + (agiPenalty > 0 ? 1 : 0) : 0) +
                      (bonus?.sources.length ?? 0);

                    const breakdown =
                      has || includeAbility || d.description || multiAbility || survivalConReminder ? (
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
                          {bonus?.capped && (
                            <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                              Bonus de compétence plafonné à +15 (<SourceRef page={203} />).
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
                          // Fond plus discret que celui des en-têtes de carac (`action.hover`),
                          // pour mieux démarquer les blocs : moitié de l'opacité de survol.
                          bgcolor: has
                            ? (theme) =>
                                alpha(theme.palette.text.primary, theme.palette.action.hoverOpacity / 2)
                            : undefined,
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
                          {bonus?.capped && (
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
                              pastille warning TIRETÉE (distincte du malus AGI réellement appliqué, plein).
                              « MJ ? » souligne que rien n'est imposé — le détail est dans le tooltip. */}
                          {survivalConReminder && <WarnPill outlined>MJ ?</WarnPill>}
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
    </SheetSection>
  );
}

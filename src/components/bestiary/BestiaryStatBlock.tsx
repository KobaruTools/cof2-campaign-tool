'use client';

/**
 * Bloc de stats d'une CRÉATURE DU BESTIAIRE (entité `Creature`, stats FIXES du livre —
 * PER-237). DISTINCT de `CreatureStatBlock`, qui rend un `CreatureProfile` (créature
 * octroyée par une capacité, stats résolues contre un maître). Purement de l'affichage,
 * fidèle au bloc imprimé : identité (NC/taille/nature), grille des 7 caractéristiques
 * (dé bonus inné compris), DEF/PV/Init. avec leurs précisions, attaques et capacités
 * spéciales verbatim. Toute référence de page passe par `SourceRef`/`PageRefText`.
 */
import type { ReactNode } from 'react';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ABILITY_IDS, type ActionType, type Creature, type Feature } from '@/data/schema';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { ANCESTRY_MARKER_COLOR } from '@/lib/ui/classColors';
import {
  CREATURE_NATURE_LABELS,
  CREATURE_SIZE_LABELS,
  creatureNcLabel,
} from '@/lib/ui/creature';
import type { DerivedStatId } from '@/lib/ui/derivedStats';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { AbilityValueBadge } from '@/components/AbilityValueBadge';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DamageValue } from '@/components/DamageValue';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { PageRefText, SourceRef } from '@/components/SourceRef';

/**
 * Espacement unique (unités MUI) du bloc de stats : sert À LA FOIS d'écart INTERNE
 * de chaque grille (carac, stats dérivées, attaques, capacités — horizontal ET
 * vertical) et d'écart VERTICAL entre les sections. Un rythme unique = rendu plus
 * harmonieux (retour propriétaire).
 */
const BLOCK_GAP = 1;

/** Pilule d'identité neutre (NC, taille, nature) : même habillage discret que `SourceRef`. */
function MetaPill({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        lineHeight: 1,
        fontSize: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        color: 'text.secondary',
        bgcolor: alpha(theme.palette.text.primary, 0.06),
        border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
      })}
    >
      {label && (
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.3 }}>
          {label}
        </Box>
      )}
      {children}
    </Box>
  );
}

/**
 * Découpe le nom VERBATIM d'une capacité de créature (« Regard envoûtant (A) »,
 * « Invisibilité (A)* », « Souffle (L) ») en nom nu + marqueurs, afin de rendre
 * ces derniers en hexagones (comme les capacités de voie) plutôt qu'en texte :
 *  - `*` → qualité de sort ;
 *  - `(A/L/G/M)` → type(s) d'action (p. 227).
 */
function parseAbilityMarkers(name: string): {
  baseName: string;
  actionTypes: ActionType[];
  isSpell: boolean;
} {
  const isSpell = name.includes('*');
  const actionTypes = [...name.matchAll(/\(([ALGM])\)/g)].map((m) => m[1] as ActionType);
  const baseName = name.replace(/\s*\([ALGM]\)/g, '').replace(/\*/g, '').trim();
  return { baseName, actionTypes, isSpell };
}

/**
 * Marqueurs hexagonaux d'une capacité de créature, réutilisant `FeatureMarkerHexes`
 * (cohérence visuelle avec les voies) : on reconstitue le minimum d'un `Feature`
 * qu'il lit (`isSpell` / `actionTypes` / `actionTypesFromRank`). Couleur neutre de
 * voie de peuple. Ne rend rien si la capacité n'a ni sort ni type d'action.
 */
function CreatureAbilityMarkers({ name }: { name: string }) {
  const { actionTypes, isSpell } = parseAbilityMarkers(name);
  if (!isSpell && actionTypes.length === 0) return null;
  const markerFeature = { isSpell, actionTypes, actionTypesFromRank: undefined } as unknown as Feature;
  return <FeatureMarkerHexes feature={markerFeature} color={ANCESTRY_MARKER_COLOR} size={18} />;
}

/** Petit titre de section (Attaques / Capacités) : discret, en capitales espacées. */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="h3"
      sx={{
        fontWeight: 700,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'text.secondary',
        mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

/** Bloc « icône cerclée + valeur (+ précision) » d'une stat dérivée fixe (DEF/PV/Init.). */
function StatChip({
  statId,
  value,
  note,
}: {
  statId: DerivedStatId;
  value: number;
  note?: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        px: 1,
        py: 0.75,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
      }}
    >
      <DerivedStatIcon statId={statId} size={28} title />
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '1.15rem',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 0.5,
        }}
      >
        {value}
        {note && (
          <Box component="span" sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'text.secondary' }}>
            ({note})
          </Box>
        )}
      </Box>
    </Stack>
  );
}

export interface BestiaryStatBlockProps {
  creature: Creature;
}

export function BestiaryStatBlock({ creature }: BestiaryStatBlockProps) {
  const nc = creatureNcLabel(creature);
  const bonusDice = new Set(creature.bonusDieAbilities ?? []);
  // Stats dérivées fixes présentes : rendues en grille pleine largeur, une colonne
  // chacune, sans retour à la ligne (il n'y a pas d'autre bloc sur cette ligne).
  const derivedStats: { statId: DerivedStatId; value: number; note?: string }[] = [];
  if (creature.defense != null)
    derivedStats.push({ statId: 'defense', value: creature.defense, note: creature.defenseNote });
  if (creature.hitPoints != null)
    derivedStats.push({ statId: 'maxHp', value: creature.hitPoints, note: creature.hitPointsNote });
  if (creature.initiative != null)
    derivedStats.push({ statId: 'initiative', value: creature.initiative, note: creature.initiativeNote });
  const hasAttacks = !!creature.attacks && creature.attacks.length > 0;
  const hasSpecialAbilities = !!creature.specialAbilities && creature.specialAbilities.length > 0;
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: { xs: 1.25, sm: 1.75 },
        // Fond NOIR (pas blanc) légèrement plus opaque que les autres blocs de la page,
        // avec le même flou d'arrière-plan que l'en-tête : améliore la lisibilité du bloc
        // de stats par-dessus l'illustration de fond.
        bgcolor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* Identité : nom + NC/taille/nature + page source. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, letterSpacing: 0.5, mr: 'auto' }}>
          {creature.name}
        </Typography>
        <SourceRef page={creature.sourcePage} />
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: BLOCK_GAP }}>
        {nc && <MetaPill label="NC">{nc}</MetaPill>}
        {creature.size && <MetaPill>{CREATURE_SIZE_LABELS[creature.size]}</MetaPill>}
        {creature.nature?.map((n) => (
          <MetaPill key={n}>{CREATURE_NATURE_LABELS[n]}</MetaPill>
        ))}
      </Stack>

      {/* Grille des 7 caractéristiques (valeurs fixes) + dé bonus inné (double-d20).
          Style proche de la fiche de perso : grande icône, code, chiffre coloré qui
          grandit avec la valeur (`scaleBase`). */}
      {creature.abilities && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: BLOCK_GAP,
            mb: BLOCK_GAP,
          }}
        >
          {ABILITY_IDS.map((id) => (
            <AppTooltip key={id} title={ABILITY_NAMES[id]}>
              <AbilityValueBadge
                ability={id}
                value={creature.abilities![id]}
                iconSize={32}
                showCode
                codeVariant="subtitle2"
                valueVariant="h6"
                scaleBase="1.25rem"
                adornment={bonusDice.has(id) ? <BonusDieBadge ability={id} size={16} /> : undefined}
                sx={{
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  py: { xs: 0.5, sm: 0.75 },
                  cursor: 'help',
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
                }}
              />
            </AppTooltip>
          ))}
        </Box>
      )}

      {/* DEF / PV / Init. : grille pleine largeur, une colonne par stat, sans retour à la ligne. */}
      {derivedStats.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${derivedStats.length}, minmax(0, 1fr))`,
            gap: BLOCK_GAP,
            mb: BLOCK_GAP,
          }}
        >
          {derivedStats.map((s) => (
            <StatChip key={s.statId} statId={s.statId} value={s.value} note={s.note} />
          ))}
        </Box>
      )}

      {/* Séparateur entre les stats dérivées et le reste (attaques / capacités). */}
      {derivedStats.length > 0 && (hasAttacks || hasSpecialAbilities) && <Divider sx={{ mb: BLOCK_GAP }} />}

      {/* Attaques du bloc gras : titre + grille 3 colonnes de blocs compacts. */}
      {creature.attacks && creature.attacks.length > 0 && (
        <Box sx={{ mb: BLOCK_GAP }}>
          <SectionTitle>Attaques</SectionTitle>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: BLOCK_GAP,
              alignItems: 'start',
            }}
          >
            {creature.attacks.map((atk, i) => (
              <Box
                key={i}
                sx={{
                  px: 1,
                  py: 0.6,
                  borderRadius: 0.75,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                }}
              >
                {/* Nom seul (l'icône de score d'attaque descend devant le bonus, cf. fiche de perso). */}
                <Typography component="div" variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                  {atk.name}
                  {atk.attackCount && atk.attackCount > 1 && (
                    <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      {' '}
                      ({atk.attackCount} attaques)
                    </Box>
                  )}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.25, mt: 0.4 }}
                >
                  {/* Icône de score d'attaque (contact/distance) devant le bonus, comme sur la fiche. */}
                  {atk.bonus && (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <DerivedStatIcon statId={atk.range ? 'rangedAttack' : 'meleeAttack'} size={18} title />
                      <Typography component="span" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {atk.bonus}
                      </Typography>
                    </Stack>
                  )}
                  {atk.range && <MetaPill>{atk.range}</MetaPill>}
                  {atk.damage && (
                    <>
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        ·
                      </Box>
                      <DamageValue damage={atk.damage} size={16} sx={{ fontSize: '0.875rem' }} />
                    </>
                  )}
                </Stack>
                {atk.rider && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.4 }}>
                    {atk.rider}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Séparateur entre les attaques et les capacités spéciales. */}
      {hasAttacks && hasSpecialAbilities && <Divider sx={{ mb: BLOCK_GAP }} />}

      {/* Capacités : titre + grille 2 colonnes, chaque carte façon « rang de voie »
          (nom + hexagones de marqueurs sur une ligne, puis texte de règle verbatim). */}
      {hasSpecialAbilities && (
        <Box>
          <SectionTitle>Capacités</SectionTitle>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: BLOCK_GAP,
              alignItems: 'start',
            }}
          >
            {creature.specialAbilities!.map((ability, i) => {
              const { baseName } = parseAbilityMarkers(ability.name);
              return (
                <Box
                  key={i}
                  sx={{
                    px: 1,
                    py: 0.75,
                    borderRadius: 0.75,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.25, mb: 0.25 }}
                  >
                    <Typography component="span" variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {baseName}
                    </Typography>
                    <CreatureAbilityMarkers name={ability.name} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                    <PageRefText>{ability.text}</PageRefText>
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Notes de fin de bloc : la description (lore) puis le renvoi « Voir ci-dessus »
          des variantes — affichées tout en bas, dans un encadré façon « Alert » info
          (bleu clair désaturé, verre dépoli) avec une icône de plume/parchemin à
          gauche (retour propriétaire). */}
      {(creature.description || creature.sharedAbilitiesNote) && (
        <AppAlert severity="info" icon={<HistoryEduOutlinedIcon />} sx={{ mt: BLOCK_GAP }}>
          {creature.description && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.55, fontStyle: 'italic' }}>
              <PageRefText>{creature.description}</PageRefText>
            </Typography>
          )}
          {creature.sharedAbilitiesNote && (
            <Typography
              variant="body2"
              sx={{ fontStyle: 'italic', mt: creature.description ? 0.75 : 0 }}
            >
              <PageRefText>{creature.sharedAbilitiesNote}</PageRefText>
            </Typography>
          )}
        </AppAlert>
      )}
    </Box>
  );
}

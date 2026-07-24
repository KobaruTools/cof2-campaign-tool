'use client';

/**
 * Bloc de stats d'une CRÉATURE DU BESTIAIRE (entité `Creature`, stats FIXES du livre —
 * PER-237). DISTINCT de `CreatureStatBlock`, qui rend un `CreatureProfile` (créature
 * octroyée par une capacité, stats résolues contre un maître). Purement de l'affichage,
 * fidèle au bloc imprimé : identité (NC/taille/nature), grille des 7 caractéristiques
 * (dé bonus inné compris), DEF/PV/Init. avec leurs précisions, attaques et capacités
 * spéciales verbatim. Toute référence de page passe par `SourceRef`/`PageRefText`.
 */
import { useState, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import {
  ABILITY_IDS,
  type ActionType,
  type Creature,
  type CreatureSpecialAbility,
  type Feature,
} from '@/data/schema';
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
import { MetaPill } from '@/components/MetaPill';
import { PageRefText, SourceRef } from '@/components/SourceRef';
import { GlossaryText, RichInline } from '@/components/sheet/FeatureRichText';
import { VerbatimToggle } from '@/components/sheet/FeaturesByPath';

/**
 * Espacement unique (unités MUI) du bloc de stats : sert À LA FOIS d'écart INTERNE
 * de chaque grille (carac, stats dérivées, attaques, capacités — horizontal ET
 * vertical) et d'écart VERTICAL entre les sections. Un rythme unique = rendu plus
 * harmonieux (retour propriétaire).
 */
const BLOCK_GAP = 1;

/**
 * Habillage commun d'une carte d'attaque / de capacité : bord + fond discrets, et surtout une
 * INTERACTIVITÉ au survol (retour propriétaire) — le bord gagne en opacité et une très légère ombre
 * portée BLANCHE apparaît, pour signaler la carte pointée. `height: '100%'` : la carte remplit toute
 * la hauteur de sa cellule de grille (les cellules d'une même ligne s'égalisent via le `stretch` par
 * défaut de la grille, cf. retrait de `alignItems: 'start'`), pour des blocs de même hauteur, plus
 * lisibles. Le padding (`px`/`py`) reste propre à chaque type de carte (fusionné via `sx` en tableau).
 */
const interactiveBlockSx = (theme: Theme) => ({
  height: '100%',
  borderRadius: 0.75,
  border: 1,
  borderColor: alpha(theme.palette.text.primary, 0.12),
  bgcolor: alpha(theme.palette.text.primary, 0.04),
  transition: theme.transitions.create(['border-color', 'box-shadow'], { duration: 120 }),
  '&:hover': {
    borderColor: alpha(theme.palette.text.primary, 0.3),
    boxShadow: '0 2px 10px rgba(255, 255, 255, 0.1)',
  },
});

// `MetaPill` (NC, taille, nature) est désormais partagé — cf. `@/components/MetaPill` (PER-175).

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

/**
 * Bloc « icône cerclée + valeur (+ précision) » d'une stat dérivée fixe (DEF/PV/Init.).
 * En mode `dense` (écran de MJ), icône et chiffre sont rétrécis pour s'aligner
 * visuellement sur les cartes de personnages joueurs (moins imposant).
 */
function StatChip({
  statId,
  value,
  note,
  dense = false,
}: {
  statId: DerivedStatId;
  value: number;
  note?: string;
  dense?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        px: dense ? 0.75 : 1,
        py: dense ? 0.5 : 0.75,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
      }}
    >
      <DerivedStatIcon statId={statId} size={dense ? 20 : 28} title />
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          fontSize: dense ? '0.95rem' : '1.15rem',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 0.5,
        }}
      >
        {value}
        {note && (
          <Box
            component="span"
            sx={{ fontWeight: 500, fontSize: dense ? '0.75rem' : '0.85rem', color: 'text.secondary' }}
          >
            ({note})
          </Box>
        )}
      </Box>
    </Stack>
  );
}

/**
 * Rend le texte d'une capacité de créature. En mode ENRICHI (défaut), le même moteur que les rangs
 * de voie (`RichInline`) : dés en icônes, formules calculées contre les caractéristiques FIXES de la
 * créature, refs de page cliquables, puces de glossaire/états — le tout depuis `richText` s'il existe,
 * sinon depuis le `text` verbatim (déjà glosé). Sans caractéristiques (variante « Voir ci-dessus »),
 * on retombe sur `GlossaryText` (glossaire/refs de page sans résolution de formule). En mode VERBATIM
 * (toggle « Texte d'origine »), on rend le `text` brut, sans aucun traitement (relecture « comme dans
 * le livre »). Les créatures n'ayant ni dé évolutif ni rang de voie, `level`/`rank` sont inertes.
 */
function CreatureAbilityText({
  ability,
  creature,
  verbatim,
}: {
  ability: CreatureSpecialAbility;
  creature: Creature;
  verbatim: boolean;
}) {
  if (verbatim) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.55 }}>
        {ability.text}
      </Typography>
    );
  }
  const source = ability.richText ?? ability.text;
  return (
    <Typography variant="body2" color="text.secondary" component="div" sx={{ whiteSpace: 'pre-line', lineHeight: 1.55 }}>
      {creature.abilities ? (
        <RichInline
          text={source}
          abilities={creature.abilities}
          // Inertes pour une créature (stats fixes) : pas de rang de voie (→ `rank`). `level` sert
          // seulement au scaling des dés évolutifs, qu'on DÉSACTIVE ici (`evolvingDieBase`) : un dé
          // évolutif de créature est indexé sur le niveau de la VICTIME, non résolvable → on affiche
          // le dé de base + le « ° » (cf. RichInline). `nc` arrondi passé par acquit de conscience.
          level={Math.max(1, Math.round(creature.nc ?? 1))}
          rank={0}
          evolvingDieBase
        />
      ) : (
        <GlossaryText>{source}</GlossaryText>
      )}
    </Typography>
  );
}

export interface BestiaryStatBlockProps {
  creature: Creature;
  /**
   * Masque le pavé de notes de fin de bloc (description/lore + renvoi « Voir ci-dessus »).
   * Utilisé par l'écran de MJ où seule la partie chiffrée du combat compte (PER-247) ;
   * le bestiaire les affiche (défaut `false`).
   */
  hideNotes?: boolean;
  /**
   * Rend le bloc en version COMPACTE (caractéristiques + stats dérivées rétrécies),
   * pour s'aligner visuellement sur les cartes de personnages joueurs de l'écran de
   * MJ (PER-247) — le bestiaire l'affiche en taille pleine (défaut `false`).
   */
  dense?: boolean;
  /**
   * Rend la section « Capacités » REPLIABLE et REPLIÉE par défaut (écran de MJ, où les
   * cartes doivent rester compactes) — sans persistance. Le bestiaire l'affiche toujours
   * dépliée (défaut `false`).
   */
  collapsibleAbilities?: boolean;
}

export function BestiaryStatBlock({
  creature,
  hideNotes = false,
  dense = false,
  collapsibleAbilities = false,
}: BestiaryStatBlockProps) {
  // Bascule « Texte d'origine » (comme la fiche, PER-88) : rend le verbatim brut des capacités au
  // lieu du rendu enrichi. État LOCAL au bloc (se réinitialise en changeant de créature).
  const [verbatim, setVerbatim] = useState(false);
  // Section « Capacités » dépliée ? Repliée d'entrée quand `collapsibleAbilities` (pas de
  // persistance : simple état local qui se réinitialise en changeant de créature).
  const [abilitiesOpen, setAbilitiesOpen] = useState(!collapsibleAbilities);
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
        position: 'relative',
        // Rogne l'illustration en filigrane qui déborde du bloc (effet de style « crop »).
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: { xs: 1.25, sm: 1.75 },
        // Fond NOIR (pas blanc) légèrement plus opaque que les autres blocs de la page,
        // avec le même flou d'arrière-plan que l'en-tête : améliore la lisibilité du bloc
        // de stats par-dessus l'illustration de fond. `backdropFilter` crée aussi le contexte
        // d'empilement qui garde le filigrane (z-index -1) DERRIÈRE le contenu.
        bgcolor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      {/* Illustration de la créature (extraite du livre, détourée) en FILIGRANE : ancrée en haut à
          droite, dans une ENVELOPPE de taille FIXE (indépendante de la hauteur du bloc → rendu
          cohérent d'une créature à l'autre) ; `contain` fait tenir toute la silhouette dans cette
          enveloppe. Léger débord en haut/à droite rogné par `overflow` (effet de style), et fondu
          vers la gauche pour ne pas gêner la lecture. Purement décoratif (`aria-hidden`). Les
          variantes héritent de l'illustration de leur base (cf. `withIllustrations` dans
          `creatures.ts`). */}
      {creature.illustration && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: -14,
            right: -8,
            width: { xs: 200, sm: 288 },
            height: { xs: 240, sm: 340 },
            maxWidth: '70%',
            zIndex: -1,
            pointerEvents: 'none',
            opacity: 0.35,
            backgroundImage: `url(${creature.illustration})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top right',
            backgroundSize: 'contain',
            maskImage: 'linear-gradient(to left, #000 55%, transparent 96%)',
            WebkitMaskImage: 'linear-gradient(to left, #000 55%, transparent 96%)',
          }}
        />
      )}

      {/* Identité : nom + NC/taille/nature + page source. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 1 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, letterSpacing: 0.5, mr: 'auto' }}>
          {creature.name}
        </Typography>
        {/* Bascule « Texte d'origine » : proposée seulement s'il y a des capacités à enrichir. */}
        {hasSpecialAbilities && <VerbatimToggle value={verbatim} onChange={setVerbatim} />}
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
            gap: dense ? 0.75 : BLOCK_GAP,
            mb: BLOCK_GAP,
          }}
        >
          {ABILITY_IDS.map((id) => (
            <AppTooltip key={id} title={ABILITY_NAMES[id]}>
              {/* En mode dense, mêmes réglages que la carte de personnage joueur
                  (`CharacterPreviewCard`) : icône/chiffre à la taille par défaut,
                  code en `caption` — pour une parité visuelle sur l'écran de MJ. */}
              <AbilityValueBadge
                ability={id}
                value={creature.abilities![id]}
                iconSize={dense ? undefined : 32}
                showCode
                codeVariant={dense ? 'caption' : 'subtitle2'}
                valueVariant={dense ? undefined : 'h6'}
                scaleBase={dense ? undefined : '1.25rem'}
                adornment={
                  bonusDice.has(id) ? <BonusDieBadge ability={id} size={dense ? 12 : 16} /> : undefined
                }
                sx={{
                  borderRadius: dense ? 1 : 2,
                  border: 1,
                  borderColor: 'divider',
                  py: dense ? 0.5 : { xs: 0.5, sm: 0.75 },
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
            <StatChip key={s.statId} statId={s.statId} value={s.value} note={s.note} dense={dense} />
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
              // 3 colonnes dans le bestiaire (panneau large) ; 2 colonnes en mode dense
              // (carte étroite de l'écran de MJ) pour ne pas tasser les blocs d'attaque.
              gridTemplateColumns: {
                xs: '1fr',
                sm: dense ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
              },
              gap: BLOCK_GAP,
            }}
          >
            {creature.attacks.map((atk, i) => (
              <Box key={i} sx={[interactiveBlockSx, { px: 1, py: 0.6 }]}>
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
          {/* En-tête : titre simple dans le bestiaire, ou bouton repli/déploie (avec
              décompte) en mode repliable (écran de MJ), sans persistance. */}
          {collapsibleAbilities ? (
            <Box
              role="button"
              tabIndex={0}
              aria-expanded={abilitiesOpen}
              onClick={() => setAbilitiesOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAbilitiesOpen((o) => !o);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                userSelect: 'none',
                mb: abilitiesOpen ? 0.75 : 0,
              }}
            >
              <ExpandMoreIcon
                sx={{
                  fontSize: 16,
                  color: 'text.secondary',
                  transition: 'transform 0.15s',
                  transform: abilitiesOpen ? 'none' : 'rotate(-90deg)',
                }}
              />
              <Box
                component="span"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: 'text.secondary',
                }}
              >
                Capacités
                <Box component="span" sx={{ ml: 0.5, opacity: 0.7 }}>
                  ({creature.specialAbilities!.length})
                </Box>
              </Box>
            </Box>
          ) : (
            <SectionTitle>Capacités</SectionTitle>
          )}
          <Collapse in={abilitiesOpen} unmountOnExit>
          <Box
            sx={{
              display: 'grid',
              // 2 colonnes dans le bestiaire (panneau large) ; 1 seule colonne en mode
              // dense (carte étroite de l'écran de MJ), le texte des capacités étant verbeux.
              gridTemplateColumns: dense ? '1fr' : { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: BLOCK_GAP,
            }}
          >
            {creature.specialAbilities!.map((ability, i) => {
              const { baseName } = parseAbilityMarkers(ability.name);
              return (
                <Box key={i} sx={[interactiveBlockSx, { px: 1, py: 0.75 }]}>
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
                  <CreatureAbilityText ability={ability} creature={creature} verbatim={verbatim} />
                </Box>
              );
            })}
          </Box>
          </Collapse>
        </Box>
      )}

      {/* Notes de fin de bloc : la description (lore) puis le renvoi « Voir ci-dessus »
          des variantes — affichées tout en bas, dans un encadré façon « Alert » info
          (bleu clair désaturé, verre dépoli) avec une icône de plume/parchemin à
          gauche (retour propriétaire). */}
      {!hideNotes && (creature.description || creature.sharedAbilitiesNote) && (
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

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
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
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
import { AbilityCompactGrid } from '@/components/AbilityCompactGrid';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DamageValue } from '@/components/DamageValue';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { MetaPill } from '@/components/MetaPill';
import { PageRefText, SourceRef } from '@/components/SourceRef';
import { bookIdForSourceSlug } from '@/lib/ui/books';
import { normalizeSearchText } from '@/lib/ui/searchText';
import { CreaturePathBlock } from './CreaturePathBlock';
import { creatureDefenseBadges, splitHitPointsNote } from './creatureDefenseBadges';
import { lookupRiderKeyword } from '@/lib/bestiary/riderKeywords';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { GlossaryRichText, GlossaryText, RichInline } from '@/components/sheet/FeatureRichText';
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
export const interactiveBlockSx = (theme: Theme) => ({
  height: '100%',
  borderRadius: 0.75,
  border: 1,
  borderColor: alpha(theme.palette.text.primary, 0.12),
  bgcolor: alpha(theme.palette.common.black, 0.15),
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  transition: theme.transitions.create(['border-color', 'box-shadow'], { duration: 120 }),
  '&:hover': {
    borderColor: alpha(theme.palette.text.primary, 0.3),
    boxShadow: '0 2px 10px rgba(255, 255, 255, 0.1)',
  },
});

/**
 * Même apparence que le `:hover` de `interactiveBlockSx`, mais FORCÉE — pour surligner une carte de
 * capacité à distance (survol d'un rider d'attaque qui la référence, cf. `AttackRider`).
 */
const activeBlockSx = (theme: Theme) => ({
  borderColor: alpha(theme.palette.text.primary, 0.3),
  boxShadow: '0 2px 10px rgba(255, 255, 255, 0.1)',
});

/**
 * Clé de rapprochement d'un nom de capacité : le repli commun (casse, accents, ligatures `œ`/`æ`)
 * PLUS l'effondrement des espaces, propre à cet appariement — un rider d'attaque et la capacité
 * qu'il cite peuvent différer d'une espace ou d'un retour à la ligne.
 */
function normalizeAbilityKey(s: string): string {
  return normalizeSearchText(s).replace(/\s+/g, ' ').trim();
}

/**
 * Chip JAUNE (ambre) d'un dé de rider d'attaque — même teinte que le badge de DM bonus de la fiche
 * (`WeaponDamageBonusBadge`) : `DamageValue` (icône du dé + nombre) sur fond ambre désaturé.
 */
function RiderDiceChip({ dice, dense }: { dice: string; dense: boolean }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'baseline',
        px: 0.5,
        borderRadius: 0.75,
        color: 'text.primary',
        bgcolor: alpha(theme.palette.warning.main, 0.12),
        border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
      })}
    >
      <DamageValue damage={dice} size={dense ? 15 : 17} sx={{ fontSize: dense ? '0.8rem' : '0.9rem' }} />
    </Box>
  );
}

/**
 * Chip d'un rider d'attaque qui RÉFÉRENCE une capacité de la créature (« + pétrification » →
 * capacité « Pétrification » du karcaillou). Teinte violette (secondary). Info-bulle = la capacité
 * (nom + texte de règle). Au survol, remonte la clé au parent (`onHover`) pour SURLIGNER la carte
 * de la capacité correspondante plus bas (même effet que son propre survol).
 */
function AbilityRefChip({
  label,
  ability,
  onHover,
  abilityKey,
}: {
  label: string;
  ability: CreatureSpecialAbility;
  onHover: (key: string | null) => void;
  abilityKey: string;
}) {
  const tooltip = (
    <Box sx={{ maxWidth: 320 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {ability.name}
      </Typography>
      <Typography variant="body2" component="div" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
        <GlossaryRichText>{ability.richText ?? ability.text}</GlossaryRichText>
      </Typography>
    </Box>
  );
  return (
    <AppTooltip title={tooltip}>
      <Box
        component="span"
        onMouseEnter={() => onHover(abilityKey)}
        onMouseLeave={() => onHover(null)}
        sx={(theme) => ({
          display: 'inline-block',
          verticalAlign: 'baseline',
          px: 0.6,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.85em',
          lineHeight: 1.4,
          cursor: 'help',
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.14),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
          transition: theme.transitions.create('background-color', { duration: 120 }),
          '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.24) },
        })}
      >
        {label}
      </Box>
    </AppTooltip>
  );
}

/**
 * Chip d'un MOT-CLÉ D'EFFET récurrent (« régénération ») qui n'a pas de capacité du même nom sur la
 * créature (le livre nomme le mécanisme autrement). Teinte neutre (≠ chip violet d'une vraie capacité,
 * ≠ chip jaune d'un dé) : info-bulle GÉNÉRIQUE, aucune carte à surligner. Cf. `lookupRiderKeyword`.
 */
function KeywordChip({ label, explanation }: { label: string; explanation: string }) {
  return (
    <AppTooltip title={<Box sx={{ maxWidth: 300, lineHeight: 1.4 }}>{explanation}</Box>}>
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          verticalAlign: 'baseline',
          px: 0.6,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.85em',
          lineHeight: 1.4,
          cursor: 'help',
          color: 'text.primary',
          bgcolor: alpha(theme.palette.text.primary, 0.08),
          border: `1px solid ${alpha(theme.palette.text.primary, 0.28)}`,
        })}
      >
        {label}
      </Box>
    </AppTooltip>
  );
}

/**
 * Rend le RIDER d'une attaque (« + 1d8 d'électricité », « + poison », « + pétrification ») en ligne
 * enrichie : les dés en chip jaune (`RiderDiceChip`), les mots qui correspondent à une capacité de la
 * créature en chip violet cliquable-au-survol (`AbilityRefChip`, surligne la carte), le reste passé au
 * glossaire (`GlossaryText` : états préjudiciables, refs de page). `abilityByKey` = index nom→capacité.
 */
function AttackRider({
  rider,
  abilityByKey,
  onHoverAbility,
  dense,
}: {
  rider: string;
  abilityByKey: Map<string, CreatureSpecialAbility>;
  onHoverAbility: (key: string | null) => void;
  dense: boolean;
}) {
  // 1) On isole d'abord les dés (chip jaune) ; entre les dés, des segments de texte.
  const diceRe = /\d*d\d+/g; // local (mutable lastIndex) — pas de regex de module partagé.
  const segments: { kind: 'dice' | 'text'; value: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = diceRe.exec(rider))) {
    if (m.index > last) segments.push({ kind: 'text', value: rider.slice(last, m.index) });
    segments.push({ kind: 'dice', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < rider.length) segments.push({ kind: 'text', value: rider.slice(last) });

  // 2) Dans chaque segment de texte, on repère les NOMS DE CAPACITÉ (le plus long d'abord, en
  //    tokenisant sur espaces/ponctuation pour matcher « sucer le sang » aussi bien que « poison »).
  const nodes: ReactNode[] = [];
  segments.forEach((seg, si) => {
    if (seg.kind === 'dice') {
      nodes.push(<RiderDiceChip key={`d${si}`} dice={seg.value} dense={dense} />);
      return;
    }
    const tokens = seg.value.split(/(\s+|[(),])/).filter((t) => t !== '');
    let i = 0;
    let textRun = '';
    const flushText = (k: string) => {
      if (textRun) {
        nodes.push(<GlossaryText key={k}>{textRun}</GlossaryText>);
        textRun = '';
      }
    };
    while (i < tokens.length) {
      // Rapprochement du plus long segment de tokens : une capacité de la créature (précis, avec
      // surlignage) l'emporte ; à défaut un mot-clé d'effet générique (« régénération »).
      let matched: { label: string; key: string; len: number; kind: 'ability' | 'keyword' } | null =
        null;
      for (let len = Math.min(6, tokens.length - i); len >= 1 && !matched; len--) {
        const raw = tokens.slice(i, i + len).join('');
        const label = raw.trim(); // enlève un token espace de bord (« ␣régénération »)
        const key = normalizeAbilityKey(raw);
        if (!key || !label) continue;
        if (abilityByKey.has(key)) matched = { label, key, len, kind: 'ability' };
        else if (lookupRiderKeyword(key)) matched = { label, key, len, kind: 'keyword' };
      }
      if (matched) {
        flushText(`t${si}-${i}`);
        if (matched.kind === 'ability') {
          nodes.push(
            <AbilityRefChip
              key={`a${si}-${i}`}
              label={matched.label}
              ability={abilityByKey.get(matched.key)!}
              abilityKey={matched.key}
              onHover={onHoverAbility}
            />,
          );
        } else {
          nodes.push(
            <KeywordChip
              key={`k${si}-${i}`}
              label={matched.label}
              explanation={lookupRiderKeyword(matched.key)!.explanation}
            />,
          );
        }
        i += matched.len;
      } else {
        textRun += tokens[i];
        i++;
      }
    }
    flushText(`t${si}-end`);
  });

  return (
    <Box
      sx={{
        mt: 0.4,
        lineHeight: 1.5,
        fontSize: '0.875rem',
        color: 'text.secondary',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 0.35,
      }}
    >
      {nodes}
    </Box>
  );
}

// `MetaPill` (NC, taille, nature) est désormais partagé — cf. `@/components/MetaPill` (PER-175).

/**
 * Découpe le nom VERBATIM d'une capacité de créature (« Regard envoûtant (A) »,
 * « Invisibilité (A)* », « Souffle (L) ») en nom nu + marqueurs, afin de rendre
 * ces derniers en hexagones (comme les capacités de voie) plutôt qu'en texte :
 *  - `*` → qualité de sort ;
 *  - `(A/L/G/M)` → type(s) d'action (p. 227).
 */
export function parseAbilityMarkers(name: string): {
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
export function CreatureAbilityMarkers({ name }: { name: string }) {
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
 * En-tête de section. En mode `collapsible` (écran de MJ), rend un bouton repli/déploie
 * (chevron + libellé + décompte) piloté par `open`/`onToggle` — pour que « Voies &
 * capacités » et « Capacités » se replient d'un même geste et ne noient pas l'écran.
 * Sinon (bestiaire), simple `SectionTitle` toujours dépliée.
 */
function CollapsibleSectionHeader({
  label,
  count,
  collapsible,
  open,
  onToggle,
}: {
  label: string;
  count?: number;
  collapsible: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  if (!collapsible) return <SectionTitle>{label}</SectionTitle>;
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        userSelect: 'none',
        mb: open ? 0.75 : 0,
      }}
    >
      <ExpandMoreIcon
        sx={{
          fontSize: 16,
          color: 'text.secondary',
          transition: 'transform 0.15s',
          transform: open ? 'none' : 'rotate(-90deg)',
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
        {label}
        {count != null && (
          <Box component="span" sx={{ ml: 0.5, opacity: 0.7 }}>
            ({count})
          </Box>
        )}
      </Box>
    </Box>
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
  badges,
  dense = false,
}: {
  statId: DerivedStatId;
  value: number;
  note?: string;
  /**
   * Badges de TRAITS DÉFENSIFS (immunités d'état, immunités de type de dégât, réductions — dont la
   * RD imprimée avec les PV) rendus à droite du chiffre : cellule DEF seulement, c'est LE cadre
   * défensif (PER-260). Cf. `creatureDefenseBadges`.
   */
  badges?: DefenseBadgeData[];
  dense?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        // Les traits défensifs peuvent être nombreux (jusqu'à 4-5 badges sur un golem ou un
        // dragon) : la cellule les fait RETOMBER à la ligne plutôt que d'écraser le chiffre.
        flexWrap: 'wrap',
        rowGap: 0.5,
        px: 1,
        py: 0.75,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.common.black, 0.15),
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <DerivedStatIcon statId={statId} size={28} title />
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
      {/* Traits défensifs (immunités d'état, immunités de type de dégât, RD plates/typées, ÷2, et la
          RD imprimée avec les PV) : MÊMES badges que la carte Défense d'une fiche, TOUS accolés au
          chiffre de DEF — une protection se lit dans le cadre défensif, jamais à côté de la vie. */}
      {badges?.map(({ key, ...badge }) => (
        <DefenseBadge key={key} {...badge} compact={dense} fullWidth={false} />
      ))}
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
export function CreatureAbilityText({
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
        <GlossaryRichText>{source}</GlossaryRichText>
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
  /**
   * La créature provient d'un supplément PAYANT (source `is_paid`) → on marque son
   * NC d'une tête de loup (même icône que le Bestiaire dans la nav) pour signaler le
   * contenu premium. Défaut `false` (contenu gratuit : aucun marqueur).
   */
  paidSource?: boolean;
  /**
   * Slug de la SOURCE de contenu de la créature (`sources.slug`). Résolu vers le LIVRE
   * du renvoi (`SourceRef`) via `bookIdForSourceSlug` — mapping réel source → livre, à la
   * place d'un livre codé en dur. Absent (écran de MJ, contenu de base) → livre par défaut.
   */
  sourceSlug?: string;
  /**
   * Capacités HÉRITÉES de la créature de base (`baseCreatureId`), résolues par
   * l'appelant (qui charge le blob de la base). Le livre écrit « possède toutes les
   * capacités de X plus les suivantes » : on affiche donc RÉELLEMENT ces capacités —
   * marquées « hérité de X » — au lieu de les laisser en simple note. Vide/absent =
   * créature autonome (aucun héritage). `inheritedFromName` = nom de la base (libellé).
   */
  inheritedAbilities?: CreatureSpecialAbility[];
  inheritedFromName?: string;
  /**
   * Force les sections « Voies & capacités » et « Capacités » sur 2 colonnes MALGRÉ
   * `dense` — utilisé quand la carte de l'écran de MJ s'étale sur 2 colonnes (créature
   * lourde) : il y a alors la place. Sans effet hors `dense` (déjà 2 colonnes).
   */
  wideColumns?: boolean;
}

/**
 * Nom EXACT (verbatim livre) d'une `specialAbility` qui n'est pas une capacité de combat mais une
 * note d'éligibilité à la voie de prestige du familier fantastique (mineur/profil de magie/majeur,
 * même patron que `FantasticFamiliar`) — portée aujourd'hui par 3 créatures payantes du Bestiaire
 * (carnifurax, pestif, karcaillou). Tant qu'elle n'est pas wirée dans `fantastic-familiars.ts`
 * (ticket à créer), on l'exclut du rendu générique des capacités : sinon elle s'affiche comme une
 * compétence de combat ordinaire, y compris hors bestiaire (preview « Forme animale », carte
 * compagnon de l'écran MJ).
 */
const FANTASTIC_FAMILIAR_NOTE_NAME = 'Familier fantastique';

function isFantasticFamiliarNote(ability: CreatureSpecialAbility): boolean {
  return ability.name === FANTASTIC_FAMILIAR_NOTE_NAME;
}

export function BestiaryStatBlock({
  creature,
  hideNotes = false,
  dense = false,
  collapsibleAbilities = false,
  paidSource = false,
  sourceSlug,
  inheritedAbilities,
  inheritedFromName,
  wideColumns = false,
}: BestiaryStatBlockProps) {
  // Sections voies/capacités sur 2 colonnes dès qu'il y a la place : hors mode dense
  // (bestiaire), ou en dense quand la carte MJ est « large » (`wideColumns`).
  const sectionsTwoCols = !dense || wideColumns;
  const twoColTemplate = { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } as const;
  // Bascule « Texte d'origine » (comme la fiche, PER-88) : rend le verbatim brut des capacités au
  // lieu du rendu enrichi. État LOCAL au bloc (se réinitialise en changeant de créature).
  const [verbatim, setVerbatim] = useState(false);
  // Capacité actuellement pointée depuis un rider d'attaque (clé normalisée), pour surligner sa
  // carte plus bas. `null` = aucune. Cf. `AttackRider` (survol du chip) ↔ cartes de capacité.
  const [hoveredAbilityKey, setHoveredAbilityKey] = useState<string | null>(null);
  // Sections « Voies & capacités » et « Capacités » dépliées ? Repliées d'entrée quand
  // `collapsibleAbilities` (écran de MJ) pour ne pas noyer l'écran — pas de persistance
  // (simple état local qui se réinitialise en changeant de créature).
  const [abilitiesOpen, setAbilitiesOpen] = useState(!collapsibleAbilities);
  const [pathsOpen, setPathsOpen] = useState(!collapsibleAbilities);
  const nc = creatureNcLabel(creature);
  const bonusDice = new Set(creature.bonusDieAbilities ?? []);
  // Stats dérivées fixes présentes : rendues en grille pleine largeur, une colonne
  // chacune, sans retour à la ligne (il n'y a pas d'autre bloc sur cette ligne).
  const derivedStats: {
    statId: DerivedStatId;
    value: number;
    note?: string;
    badges?: DefenseBadgeData[];
  }[] = [];
  // Traits défensifs de la créature (immunités d'état/de type, RD plates ou typées, ÷2, et la RD
  // imprimée avec les PV) : TOUS remontés en badges dans le cadre DEF (PER-260).
  const defenseBadges = creatureDefenseBadges(creature);
  if (creature.defense != null)
    derivedStats.push({
      statId: 'defense',
      value: creature.defense,
      note: creature.defenseNote,
      badges: defenseBadges,
    });
  if (creature.hitPoints != null) {
    // La note de PV du livre est presque toujours une RD (« 90 (RD 5) ») : elle part en badge dans
    // le cadre Défense. Ne reste ici que le RESTE verbatim (rare : les formes de PV du nécrocrâne).
    const hp = splitHitPointsNote(creature.hitPointsNote);
    derivedStats.push({ statId: 'maxHp', value: creature.hitPoints, note: hp.note });
  }
  if (creature.initiative != null)
    derivedStats.push({ statId: 'initiative', value: creature.initiative, note: creature.initiativeNote });
  const hasAttacks = !!creature.attacks && creature.attacks.length > 0;
  const hasPaths = !!creature.paths && creature.paths.length > 0;
  // Capacités affichées = héritées de la base (résolues par l'appelant) PUIS propres, hors note
  // d'éligibilité « Familier fantastique » (cf. `isFantasticFamiliarNote`).
  const ownAbilities = (creature.specialAbilities ?? []).filter((a) => !isFantasticFamiliarNote(a));
  const inherited = (inheritedAbilities ?? []).filter((a) => !isFantasticFamiliarNote(a));
  const hasInheritedAbilities = inherited.length > 0;
  const abilityCount = inherited.length + ownAbilities.length;
  const hasSpecialAbilities = abilityCount > 0;
  // Cartes de capacité à rendre : héritées d'abord (marquées « hérité de X »), puis propres.
  const abilityCards: { ability: CreatureSpecialAbility; inheritedFrom?: string }[] = [
    ...inherited.map((ability) => ({ ability, inheritedFrom: inheritedFromName })),
    ...ownAbilities.map((ability) => ({ ability })),
  ];
  // Index nom-de-capacité (clé normalisée) → capacité : permet à un rider d'attaque de reconnaître
  // « + pétrification » comme un renvoi à la capacité « Pétrification » (chip + surlignage de sa carte).
  const abilityByKey = new Map<string, CreatureSpecialAbility>();
  for (const { ability } of abilityCards)
    abilityByKey.set(normalizeAbilityKey(parseAbilityMarkers(ability.name).baseName), ability);
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
          `creatures.ts`). La source est indifféremment un chemin public (contenu gratuit) ou une
          DATA URI embarquée dans le blob (contenu payant, PER-245) : l'URL est QUOTÉE pour que
          les `;` et `,` d'une data URI ne cassent pas la valeur CSS. */}
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
            backgroundImage: `url("${creature.illustration}")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top right',
            backgroundSize: 'contain',
            maskImage: 'linear-gradient(to left, #000 55%, transparent 96%)',
            WebkitMaskImage: 'linear-gradient(to left, #000 55%, transparent 96%)',
          }}
        />
      )}

      {/* Identité : nom + page source (collés à gauche), puis un espace flexible qui
          repousse la bascule « Texte d'origine » tout au coin HAUT-DROITE du bloc, sur la
          ligne du titre (PER-248). */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 1, width: '100%' }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
          {creature.name}
        </Typography>
        {/* Le nom de la créature sert de terme à cibler/surligner dans le visualiseur (PER-59/61).
            Le livre du renvoi est résolu depuis le slug de la source de la créature (mapping réel
            source → livre) : une créature du Bestiaire ouvre son PDF payant gaté, sinon le livre
            de base par défaut (slug absent, ou source sans livre adossé). */}
        {/* Créature CRÉÉE À LA MAIN par le MJ : `sourcePage` vaut 0 (sentinelle « aucune page de
            livre », cf. `customCreatureBlob`) — pas de renvoi à afficher. */}
        {creature.sourcePage > 0 && (
          <SourceRef
            page={creature.sourcePage}
            term={creature.name}
            book={bookIdForSourceSlug(sourceSlug)}
          />
        )}
        {/* Espace flexible : pousse la bascule à l'extrême droite. */}
        <Box sx={{ flexGrow: 1 }} />
        {/* Bascule « Texte d'origine » : proposée seulement s'il y a des capacités à enrichir. */}
        {hasSpecialAbilities && <VerbatimToggle value={verbatim} onChange={setVerbatim} />}
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: BLOCK_GAP }}>
        {/* Marqueur « contenu payant » (patte, comme le badge de livre du Bestiaire) à GAUCHE du NC. */}
        {paidSource && (
          <AppTooltip title="Créature du supplément Bestiaire (contenu payant)">
            <Box
              component="span"
              aria-label="Contenu payant : Bestiaire"
              sx={{ display: 'inline-flex', color: 'text.secondary' }}
            >
              <PetsOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
          </AppTooltip>
        )}
        {nc && <MetaPill label="NC">{nc}</MetaPill>}
        {creature.size && <MetaPill>{CREATURE_SIZE_LABELS[creature.size]}</MetaPill>}
        {creature.nature?.map((n) => (
          <MetaPill key={n}>{CREATURE_NATURE_LABELS[n]}</MetaPill>
        ))}
      </Stack>

      {/* Grille des 7 caractéristiques (valeurs fixes) + dé bonus inné (double-d20). En mode
          `dense` (écran de MJ), style COMPACT PARTAGÉ avec le reste du roster — extrait dans
          `AbilityCompactGrid` (Joueurs/Compagnons/Alliés/Adversaires, PARITÉ VISUELLE garantie
          par un composant unique plutôt que des réglages dupliqués). Hors `dense` (page bestiaire
          autonome) : grande icône, code, chiffre coloré qui grandit avec la valeur (`scaleBase`). */}
      {creature.abilities &&
        (dense ? (
          <Box sx={{ mb: BLOCK_GAP }}>
            <AbilityCompactGrid abilities={creature.abilities} bonusDieAbilities={bonusDice} />
          </Box>
        ) : (
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
                    bgcolor: (t) => alpha(t.palette.text.primary, 0.14),
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }}
                />
              </AppTooltip>
            ))}
          </Box>
        ))}

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
            <StatChip
              key={s.statId}
              statId={s.statId}
              value={s.value}
              note={s.note}
              badges={s.badges}
              dense={dense}
            />
          ))}
        </Box>
      )}

      {/* Séparateur entre les stats dérivées et le reste (attaques / voies / capacités). */}
      {derivedStats.length > 0 && (hasAttacks || hasPaths || hasSpecialAbilities) && (
        <Divider sx={{ mb: BLOCK_GAP }} />
      )}

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
                  {/* Icône de score d'attaque (contact/distance) devant le bonus, comme sur la fiche.
                      Agrandie hors mode dense (bestiaire) — retour proprio : trop petit à l'origine. */}
                  {atk.bonus && (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <DerivedStatIcon statId={atk.range ? 'rangedAttack' : 'meleeAttack'} size={24} title />
                      <Typography
                        component="span"
                        sx={{
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          fontSize: dense ? '0.875rem' : '1.1rem',
                        }}
                      >
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
                      <DamageValue
                        damage={atk.damage}
                        size={dense ? 16 : 20}
                        sx={{ fontSize: dense ? '0.875rem' : '1.05rem', fontWeight: 700 }}
                      />
                    </>
                  )}
                </Stack>
                {atk.rider && (
                  <AttackRider
                    rider={atk.rider}
                    abilityByKey={abilityByKey}
                    onHoverAbility={setHoveredAbilityKey}
                    dense={dense}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Voies de profil de la créature (ex. « Voie des illusions rang 5 »), rendues au
          format « Voies & capacités » de la fiche — insérées entre attaques et capacités,
          comme dans le bloc imprimé. */}
      {hasPaths && (
        <Box sx={{ mb: BLOCK_GAP }}>
          {hasAttacks && <Divider sx={{ mb: BLOCK_GAP }} />}
          <CollapsibleSectionHeader
            label="Voies & capacités"
            count={creature.paths!.length}
            collapsible={collapsibleAbilities}
            open={pathsOpen}
            onToggle={() => setPathsOpen((o) => !o)}
          />
          <Collapse in={pathsOpen} unmountOnExit>
            <CreaturePathBlock
              paths={creature.paths!}
              abilities={creature.abilities}
              nc={creature.nc}
              dense={dense}
              twoColumns={sectionsTwoCols}
            />
          </Collapse>
        </Box>
      )}

      {/* Séparateur entre les attaques/voies et les capacités spéciales. */}
      {(hasAttacks || hasPaths) && hasSpecialAbilities && <Divider sx={{ mb: BLOCK_GAP }} />}

      {/* Capacités : titre + grille 2 colonnes, chaque carte façon « rang de voie »
          (nom + hexagones de marqueurs sur une ligne, puis texte de règle verbatim). */}
      {hasSpecialAbilities && (
        <Box>
          {/* En-tête : titre simple dans le bestiaire, ou bouton repli/déploie (avec
              décompte) en mode repliable (écran de MJ), sans persistance. */}
          <CollapsibleSectionHeader
            label="Capacités"
            count={abilityCount}
            collapsible={collapsibleAbilities}
            open={abilitiesOpen}
            onToggle={() => setAbilitiesOpen((o) => !o)}
          />
          <Collapse in={abilitiesOpen} unmountOnExit>
          {/* Intro d'héritage (« possède toutes les capacités de X plus les suivantes »),
              rendue en tête de la section quand les capacités de la base sont affichées. */}
          {hasInheritedAbilities && creature.sharedAbilitiesNote && (
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: BLOCK_GAP }}>
              <PageRefText>{creature.sharedAbilitiesNote}</PageRefText>
            </Typography>
          )}
          <Box
            sx={{
              display: 'grid',
              // 2 colonnes quand il y a la place (bestiaire large, ou carte MJ « large ») ;
              // 1 seule sur carte MJ étroite, le texte des capacités étant verbeux.
              gridTemplateColumns: sectionsTwoCols ? twoColTemplate : '1fr',
              gap: BLOCK_GAP,
            }}
          >
            {abilityCards.map(({ ability, inheritedFrom }, i) => {
              const { baseName } = parseAbilityMarkers(ability.name);
              // Surlignée si un rider d'attaque pointant cette capacité est actuellement survolé.
              const highlighted = hoveredAbilityKey === normalizeAbilityKey(baseName);
              return (
                <Box
                  key={i}
                  sx={[interactiveBlockSx, { px: 1, py: 0.75 }, highlighted && activeBlockSx]}
                >
                  {/* Capacité héritée de la base : rappel discret de sa provenance. */}
                  {inheritedFrom && (
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'text.secondary', fontStyle: 'italic', mb: 0.25 }}
                    >
                      Hérité — {inheritedFrom}
                    </Typography>
                  )}
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
      {!hideNotes && (creature.description || (creature.sharedAbilitiesNote && !hasInheritedAbilities)) && (
        <AppAlert severity="info" icon={<HistoryEduOutlinedIcon />} sx={{ mt: BLOCK_GAP }}>
          {creature.description && (
            <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line', lineHeight: 1.55, fontStyle: 'italic' }}>
              <GlossaryRichText>{creature.description}</GlossaryRichText>
            </Typography>
          )}
          {/* Renvoi aux capacités de la base SEULEMENT si elles ne sont pas déjà affichées
              (base non chargée / héritage non résolu) : sinon la note vit en intro de section. */}
          {creature.sharedAbilitiesNote && !hasInheritedAbilities && (
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

'use client';

/**
 * Navigateur de l'aide-mémoire (PER-46) — consultation en LECTURE SEULE du référentiel de règles
 * CO2 (`@/data/reference`, 98 entrées : états, manœuvres, modificateurs, tables de difficulté /
 * poisons / encombrement…). Aucune mutation, aucun état de jeu, AUCUNE dépendance au modèle
 * `Character` ni au moteur : on ne consomme que les DONNÉES de règles.
 *
 * Disposition : barre de recherche plein texte en haut ; en dessous, un ONGLET par section (Combat /
 * Résolution / Environnement), et sous les onglets la table des matières — limitée aux sous-sections
 * de l'onglet courant — à gauche, le contenu à droite. Deux modes :
 *
 * MISE EN PAGE « ÉCRAN DE MJ » (PER-311) — le contenu d'un onglet se lit comme l'écran de MJ de
 * référence (`public/pdf/gm-screen.pdf`), et non plus comme une pile de cartes interminable :
 *   • un PANNEAU par sous-section (= une ancre de PER-310), à bandeau de titre TEINTÉ par famille de
 *     règles (`referenceStyle.ts`, teintes reprises des palettes existantes — pas de système parallèle) ;
 *   • ces panneaux répartis sur DEUX COLONNES à partir de `lg` (`splitReferenceColumns`, pur et testé),
 *     une seule en dessous ;
 *   • une entrée de texte est une AMORCE en gras coloré (le point d'entrée visuel du PDF), REPLIABLE
 *     dès qu'elle a du volume à cacher : repliée elle tient sur une ligne (`shortEffect`), dépliée
 *     elle montre le verbatim (`body`). Ce qui est déjà compact ne se replie PAS — les entrées dont
 *     le verbatim n'ajoute rien à l'effet court (les 10 états préjudiciables) et TOUS les tableaux,
 *     denses par nature. Cf. `TextEntryRow` pour le critère exact.
 *   • recherche et onglets sont COLLÉS sous l'en-tête global : on change d'onglet ou de recherche
 *     sans remonter, même au bas d'une page longue.
 *   • PARCOURS (recherche vide) : l'onglet (`?s=`) choisit la section rendue, sous-section par
 *     sous-section ; le sommaire saute d'un bloc à l'autre ;
 *   • RECHERCHE (recherche non vide) : liste À PLAT des entrées correspondantes, toutes sections
 *     confondues, groupées par section/sous-section — pour retrouver n'importe quelle règle vite.
 *     Aucun onglet n'est alors sélectionné : les onglets restent la porte de sortie vers le parcours.
 *
 * URL PARTAGEABLE (deux niveaux) : `?s=<section>` désigne l'onglet, et l'ANCRE `#<sous-section>`
 * désigne le bloc — `/reference?s=combat#maneuvers` ouvre l'onglet Combat sur les manœuvres. Onglets
 * et sommaire sont de VRAIES ancres (`component={NextLink}`), composées par les seuls
 * `referenceSectionHref` / `referenceSubsectionHref` / `subsectionAnchorId`.
 *
 * Rendu à la densité « page dédiée » du schéma : entrées `text` en amorce colorée + `body` VERBATIM
 * (+ `test` en puce distincte) ; entrées `table` en tableau compact à en-tête teinté et lignes
 * alternées, traversable horizontalement sur petit écran.
 *
 * MISE EN FORME du VERBATIM : le texte affiché passe par `<GlossaryText/>` (le rendu enrichi PARTAGÉ
 * avec les fiches de personnage), qui balise D'OFFICE les notions de règle — caractéristiques
 * (FOR/AGI…), stats dérivées (DEF, PV, Init…), jargon (DM, NC, RD…), états préjudiciables (pastille
 * rouge + effet en info-bulle), marqueurs d'action « (A)(L)(M)(G) », et renvois de page. La DONNÉE
 * (`body`, verbatim du livre) reste INCHANGÉE : seul le rendu ajoute le balisage. `GlossaryText` est
 * volontairement le variant SANS contexte de personnage (aucun dé/formule résolus) — cohérent avec
 * une page de référence générique.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, type Theme } from '@mui/material/styles';
import {
  REFERENCE_ENTRIES,
  type ReferenceEntry,
  type ReferenceSection,
  type ReferenceTableEntry,
  type ReferenceTextEntry,
} from '@/data/reference';
import {
  SECTION_ORDER,
  groupReferenceEntries,
  isReferenceSection,
  referenceSectionHref,
  referenceSubsectionHref,
  splitReferenceColumns,
  splitVerbatimParagraphs,
  subsectionAnchorId,
  type ReferenceSectionGroup,
  type ReferenceSubsectionGroup,
} from '@/lib/ui/reference';
import {
  subsectionAccentText,
  subsectionColor,
  subsectionHeaderBorder,
  subsectionPanelGradient,
} from '@/lib/ui/referenceStyle';
import { normalizeSearchText } from '@/lib/ui/searchText';
import { usePersistedState } from '@/lib/ui/usePersistedState';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { SourceRef } from '@/components/SourceRef';
import { GlossaryText } from '@/components/sheet/FeatureRichText';
import { AppTooltip } from '@/components/AppTooltip';

/**
 * Normalise pour une recherche indulgente : ni accents, ni ligatures, ni casse. Délégué au module
 * partagé `searchText.ts` — la version locale ne défaisait pas `œ`, si bien que taper « manoeuvre »
 * ne trouvait pas « Manœuvres ». (Les autres recherches de l'app — accueil, bestiaire, résumé de
 * fiche, visualiseur PDF — portent encore leur copie NFD et gagneraient à adopter ce module.)
 */
const norm = normalizeSearchText;

/**
 * Texte indexé d'une entrée pour la recherche : titre + mots-clés + effet court + verbatim, et pour
 * un tableau, les en-têtes, toutes les cellules et la note. Calculé une seule fois (mémoïsé) puis
 * normalisé à la volée pour la comparaison.
 */
function searchableText(entry: ReferenceEntry): string {
  const parts: string[] = [entry.title, ...entry.tags];
  if (entry.kind === 'text') {
    parts.push(entry.shortEffect, entry.body);
    if (entry.test) parts.push(entry.test);
  } else {
    parts.push(...entry.columns.map((c) => c.label));
    for (const row of entry.rows) parts.push(...Object.values(row));
    if (entry.note) parts.push(entry.note);
  }
  return parts.join(' ');
}

/**
 * Bascule « Texte d'origine » (comme sur les fiches, PER-88) : `false` (défaut) → rendu BALISÉ
 * (`RuleText` = `GlossaryText`) ; `true` → verbatim BRUT du livre, sans aucune mise en forme.
 * Piloté par le toggle en tête de page ; consommé par chaque `RuleText`.
 */
const ReferenceVerbatimContext = createContext(false);

/**
 * Rend une chaîne de texte de règle : balisée par `GlossaryText` (défaut) ou en VERBATIM brut si la
 * bascule « Texte d'origine » est active. Chokepoint unique de tout le texte affiché de la page — la
 * donnée reste le verbatim dans les deux cas, seul le rendu change. Les sauts de ligne sont préservés
 * par le conteneur `pre-line` du corps.
 */
function RuleText({ children }: { children: string }) {
  const verbatim = useContext(ReferenceVerbatimContext);
  return verbatim ? <>{children}</> : <GlossaryText>{children}</GlossaryText>;
}

/**
 * Interrupteur « Texte d'origine » de la page d'aide-mémoire : même visuel que celui des fiches
 * (`VerbatimToggle`, ToggleButton + icône livre), mais libellé adapté — ici le rendu enrichi pose des
 * PUCES DE RÈGLE (caractéristiques, DEF, états…), pas de dés/formules calculés (aucun personnage).
 */
function ReferenceVerbatimToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <ToggleButton
      value="verbatim"
      selected={value}
      size="small"
      aria-label="Texte d'origine"
      aria-pressed={value}
      onChange={() => onChange(!value)}
      sx={{ flexShrink: 0, ...(value ? { color: 'text.primary' } : undefined) }}
    >
      <AppTooltip
        title={
          value
            ? "Texte d'origine affiché — cliquez pour revenir au rendu enrichi (puces de règle)"
            : "Afficher le texte d'origine (verbatim du livre), sans mise en forme"
        }
      >
        <MenuBookOutlinedIcon fontSize="small" />
      </AppTooltip>
    </ToggleButton>
  );
}

/** Style commun des cartes / conteneurs (verre dépoli sombre, aligné sur le bestiaire). */
const panelSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
} as const;

/**
 * Verre dépoli des deux étages de la barre collée. Le conteneur collé n'a lui-même ni fond ni marge
 * (demande proprio) — ce sont donc ces deux panneaux qui doivent masquer le contenu qui défile
 * dessous, là où le `panelSx` ordinaire à 35 % le laissait transparaître.
 *
 * Noir à 50 % (demande proprio : un noir plein « ça ne va pas ») : c'est le FLOU qui fait le travail
 * de lisibilité, pas l'opacité. D'où un rayon plus large qu'ailleurs — à moitié transparent, un flou
 * de 6 px laisserait deviner le texte qui passe derrière.
 */
const stickyPanelSx = {
  ...panelSx,
  bgcolor: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
} as const;

export function ReferenceBrowser() {
  // Recherche persistée (comme le bestiaire) : le filtre survit au rechargement. La section de
  // parcours, elle, vit dans l'URL (`?s=`) pour être partageable et navigable par de vraies ancres.
  const [query, setQuery] = usePersistedState<string>(
    'reference:query',
    '',
    (raw) => (typeof raw === 'string' ? raw : undefined),
  );
  // Bascule « Texte d'origine » (comme sur les fiches) : persistée pour survivre au rechargement.
  const [verbatim, setVerbatim] = usePersistedState<boolean>(
    'reference:verbatim',
    false,
    (raw) => (typeof raw === 'boolean' ? raw : undefined),
  );
  const searchParams = useSearchParams();
  const sParam = searchParams.get('s');
  const activeSection: ReferenceSection = isReferenceSection(sParam) ? sParam : 'combat';

  /**
   * Nombre de COLONNES de panneaux (PER-311) : deux à partir de `lg`, une seule en dessous. Décidé
   * ICI plutôt que dans `SubsectionColumns` parce que le saut vers une ancre en dépend — la page
   * étant prérendue, la seconde colonne n'apparaît qu'APRÈS l'hydratation, et un saut calculé sur la
   * disposition à une colonne raterait sa cible de plusieurs centaines de pixels une fois le contenu
   * reflué. Le passer en dépendance de l'effet de saut suffit à le refaire au bon moment.
   */
  const columnCount = useMediaQuery((t: Theme) => t.breakpoints.up('lg')) ? 2 : 1;

  const searching = query.trim() !== '';

  // Table des matières complète (toutes sections), figée : sert de sommaire à gauche.
  const allGroups = useMemo(() => groupReferenceEntries(REFERENCE_ENTRIES), []);

  // Index de recherche normalisé, calculé une fois pour toutes.
  const searchIndex = useMemo(
    () => new Map(REFERENCE_ENTRIES.map((e) => [e.id, norm(searchableText(e))])),
    [],
  );

  // Résultats affichés : en recherche, les entrées correspondantes (toutes sections) regroupées ;
  // en parcours, la seule section active. Dans les deux cas on réutilise le regroupement ordonné.
  const groups: ReferenceSectionGroup[] = useMemo(() => {
    if (searching) {
      const q = norm(query.trim());
      const matches = REFERENCE_ENTRIES.filter((e) => searchIndex.get(e.id)?.includes(q));
      return groupReferenceEntries(matches);
    }
    return allGroups.filter((g) => g.section === activeSection);
  }, [searching, query, searchIndex, allGroups, activeSection]);

  // Nombre total d'entrées correspondantes (affiché en mode recherche).
  const matchCount = useMemo(
    () => groups.reduce((n, g) => n + g.subsections.reduce((m, s) => m + s.entries.length, 0), 0),
    [groups],
  );

  const activeGroup = allGroups.find((g) => g.section === activeSection);

  /**
   * Saut vers un bloc de sous-section (parcours uniquement) : les liens du sommaire portent déjà
   * l'ancre dans leur `href` — c'est ce qui rend l'URL partageable — mais ils désactivent le saut
   * brutal du navigateur (`scroll={false}`) pour glisser en douceur jusqu'au bloc.
   */
  const jumpToSubsection = (subsection: string) => {
    document
      .getElementById(subsectionAnchorId(subsection))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Ancre demandée par l'URL au chargement (`/reference?s=combat#maneuvers`) ou après un changement
   * d'onglet : on amène le bloc à l'écran une fois le contenu rendu. Sans ancre (clic sur un onglet),
   * on remonte en haut — les liens désactivent le défilement de Next (`scroll={false}`), sinon on
   * arriverait au milieu de la nouvelle section. Un clic dans le sommaire ne repasse PAS ici (ni
   * `activeSection` ni `searching` ne changent) : pas de double défilement. Une ancre qui ne
   * correspond à aucun bloc de l'onglet courant est simplement ignorée.
   *
   * `columnCount` est en dépendance (PER-311) : le passage à deux colonnes juste après l'hydratation
   * déplace les blocs, donc il faut REVISER le saut — sinon on atterrit à côté de l'ancre partagée.
   */
  useEffect(() => {
    if (searching) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else if (!id) window.scrollTo({ top: 0 });
  }, [activeSection, searching, columnCount]);

  /**
   * HAUTEUR VIVE de la barre collée (recherche + onglets). Le sommaire, les ancres et la sentinelle
   * en dépendent, et elle n'est PAS constante : la ligne « N entrées correspondantes » n'apparaît
   * qu'en recherche, et les onglets peuvent passer sur deux lignes en étroit. Mesurée plutôt que
   * devinée — une valeur en dur ferait atterrir les ancres partagées à côté dès qu'elle change.
   */
  const stickyRef = useRef<HTMLDivElement>(null);
  const [stickyHeight, setStickyHeight] = useState(0);
  useEffect(() => {
    const el = stickyRef.current;
    if (el == null) return;
    const observer = new ResizeObserver(() => setStickyHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * Hauteur de l'en-tête global collé (`AppHeader`, `position: sticky` en haut) : barre d'outils
   * (`minHeight` 44/48) + fil d'Ariane (30/34), filet compris. `AppHeader` n'en exporte pas de
   * constante et appartient à un autre périmètre — on la redit ici, au plus près de son usage.
   */
  const smUp = useMediaQuery((t: Theme) => t.breakpoints.up('sm'));
  const appHeaderHeight = smUp ? 83 : 75;
  /** Sous quoi tout doit se glisser : en-tête global + barre collée de la page. */
  const stuckHeight = appHeaderHeight + stickyHeight;

  /**
   * Bouton flottant « Haut de page » — LE MÊME que sur la fiche de personnage
   * (`<ScrollToTopButton/>`), révélé par une sentinelle plate placée JUSTE SOUS la barre collée.
   * Ce ne peut plus être la barre de recherche elle-même : collée, elle ne quitte jamais le viewport,
   * donc elle resterait éternellement « visible » et le bouton n'apparaîtrait jamais.
   */
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  useEffect(() => {
    const el = sentinelRef.current;
    if (el == null) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPastHeader(!entry.isIntersecting),
      { rootMargin: `-${stuckHeight}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [stuckHeight]);

  return (
   <ReferenceVerbatimContext.Provider value={verbatim}>
    <Stack spacing={2}>
      {/* BARRE COLLÉE (PER-311, 2ᵉ passe) : recherche + onglets restent accessibles pendant tout le
          défilement — sur une page longue, devoir remonter pour changer d'onglet est le geste qui
          casse la consultation en pleine partie. Elle se cale SOUS l'en-tête global, lui aussi collé.

          Le conteneur est NU (ni fond, ni marge, ni bordure — demande proprio) : il ne fait que
          coller et empiler. Ce sont les deux étages qui portent le fond, opaque, et ils sont SOUDÉS
          l'un à l'autre — rayons et filets mitoyens supprimés — pour ne former qu'un seul bloc. */}
      <Box
        ref={stickyRef}
        sx={{ position: 'sticky', top: `${appHeaderHeight}px`, zIndex: 3 }}
      >
      {/* Barre de recherche plein texte (titre + mots-clés + verbatim + cellules de table),
          avec à droite la bascule « Texte d'origine ». */}
      <Box
        sx={{
          ...stickyPanelSx,
          p: 1,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher une règle, un état, une table…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="Effacer la recherche"
                      onClick={() => setQuery('')}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <ReferenceVerbatimToggle value={verbatim} onChange={setVerbatim} />
        </Box>
        {searching && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, px: 0.5 }}>
            {matchCount === 0
              ? 'Aucune règle ne correspond à cette recherche.'
              : `${matchCount} entrée${matchCount > 1 ? 's' : ''} correspondante${matchCount > 1 ? 's' : ''}.`}
          </Typography>
        )}
      </Box>

      {/* Onglets de section : la navigation de premier niveau. Chaque onglet est une VRAIE ancre
          (`?s=…`, donc Ctrl/⌘+Clic et partage possibles) qui efface la recherche pour repasser en
          parcours. En recherche, aucun onglet n'est sélectionné (`value={false}`) : les résultats
          couvrent toutes les sections, un onglet allumé mentirait. */}
      <Box
        sx={{
          ...stickyPanelSx,
          px: { xs: 0.5, sm: 1 },
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
      >
        <Tabs
          value={searching ? false : activeSection}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          // Onglets-liens : MUI recommande `role="navigation"` quand les onglets sont des ancres.
          role="navigation"
          aria-label="Sections de l’aide-mémoire"
        >
          {SECTION_ORDER.map((section) => {
            const group = allGroups.find((g) => g.section === section);
            if (!group) return null;
            return (
              <Tab
                key={section}
                value={section}
                label={group.label}
                component={NextLink}
                href={referenceSectionHref(section)}
                scroll={false}
                onClick={() => setQuery('')}
                // Condensé : 40 px au lieu des 48 par défaut de MUI — la barre étant collée en
                // permanence, chaque pixel qu'elle prend est retiré au contenu.
                sx={{ textTransform: 'none', fontWeight: 700, minHeight: 40 }}
              />
            );
          })}
        </Tabs>
      </Box>
      </Box>

      {/* Sentinelle plate du bouton « Haut de page » : elle, contrairement à la barre collée,
          disparaît bel et bien sous l'en-tête quand on défile. */}
      <Box ref={sentinelRef} sx={{ height: 0, mt: '0 !important' }} aria-hidden />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {/* Sommaire de l'ONGLET COURANT : ses sous-sections, et rien d'autre (les autres sections
            sont à un onglet de là). Chaque entrée est une vraie ancre `?s=…#…` — partageable — dont
            le clic glisse jusqu'au bloc. Masqué en recherche (le contenu passe à plat). */}
        {!searching && activeGroup && (
          <Box
            component="nav"
            aria-label={`Sommaire — ${activeGroup.label}`}
            sx={{
              ...panelSx,
              p: 1,
              position: { md: 'sticky' },
              // Sous la barre collée (recherche + onglets), pas seulement sous l'en-tête global.
              top: { md: `${stuckHeight + 16}px` },
              maxHeight: { md: `calc(100vh - ${stuckHeight + 32}px)` },
              overflowY: 'auto',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 1.25,
                py: 0.5,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Sur cette page
            </Typography>
            <Stack>
              {/* Chaque entrée porte le FILET DE COULEUR de son panneau : le sommaire devient la
                  légende du codage couleur, et l'œil fait le lien entre les deux surfaces. */}
              {activeGroup.subsections.map((sub) => {
                const tint = subsectionColor(sub.subsection);
                return (
                  <Box
                    key={sub.subsection}
                    component={NextLink}
                    href={referenceSubsectionHref(activeSection, sub.subsection)}
                    scroll={false}
                    onClick={() => jumpToSubsection(sub.subsection)}
                    sx={{
                      textAlign: 'left',
                      textDecoration: 'none',
                      color: 'text.secondary',
                      fontSize: '0.9rem',
                      px: 1.25,
                      py: 0.5,
                      borderLeft: '3px solid',
                      borderLeftColor: alpha(tint, 0.65),
                      '&:hover': {
                        color: 'text.primary',
                        borderLeftColor: tint,
                        bgcolor: alpha(tint, 0.12),
                      },
                    }}
                  >
                    {sub.label}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Contenu : sous-sections de la section active (parcours) ou résultats à plat (recherche). */}
        <Box sx={{ minWidth: 0, gridColumn: searching ? '1 / -1' : 'auto' }}>
          {searching && matchCount === 0 ? (
            <Box sx={{ ...panelSx, p: 3 }}>
              <Typography color="text.secondary">
                Aucune règle ne correspond à «&nbsp;{query.trim()}&nbsp;». Essayez un autre terme, ou
                effacez la recherche pour parcourir par section.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={searching ? 3 : 4}>
              {(searching ? groups : activeGroup ? [activeGroup] : []).map((group) => (
                <Box key={group.section}>
                  {/* En mode recherche seulement : un intertitre de section coiffe ses sous-sections
                      (en parcours, la section est déjà annoncée par l'onglet actif + le sommaire). */}
                  {searching && (
                    <Typography
                      variant="h6"
                      sx={{ mb: 1, fontWeight: 700, color: 'primary.light' }}
                    >
                      {group.label}
                    </Typography>
                  )}
                  <SubsectionColumns
                    subsections={group.subsections}
                    columnCount={columnCount}
                    expandEntries={searching}
                    scrollMarginTop={stuckHeight + 12}
                  />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Bouton flottant « Haut de page », révélé dès que la barre de recherche passe sous la barre
          d'application. Ancré bas-droite, SOUS la pile de toasts (cf. z-index du composant). */}
      <ScrollToTopButton visible={scrolledPastHeader} />
    </Stack>
   </ReferenceVerbatimContext.Provider>
  );
}

/**
 * Les panneaux de sous-section d'un onglet, répartis en COLONNES (PER-311) — sur mobile
 * (`columnCount` = 1) la page redevient la pile verticale attendue.
 *
 * La répartition est calculée en JS (`splitReferenceColumns`, pur et testé) plutôt que déléguée à un
 * `column-count` CSS : le navigateur y couperait un panneau en deux entre deux colonnes, et le
 * découpage changerait à chaque rééquilibrage. On ne rend donc QU'UNE disposition à la fois — rendre
 * les deux et en masquer une dupliquerait les `id` d'ancre de PER-310, qui ne cibleraient plus rien.
 */
function SubsectionColumns({
  subsections,
  columnCount,
  expandEntries,
  scrollMarginTop,
}: {
  subsections: ReferenceSubsectionGroup[];
  columnCount: number;
  expandEntries: boolean;
  scrollMarginTop: number;
}) {
  const columns = splitReferenceColumns(subsections, columnCount);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        gap: 2,
        alignItems: 'start',
      }}
    >
      {columns.map((column, i) => (
        <Stack key={i} spacing={2} sx={{ minWidth: 0 }}>
          {column.map((sub) => (
            <SubsectionPanel
              key={sub.subsection}
              group={sub}
              expandEntries={expandEntries}
              scrollMarginTop={scrollMarginTop}
            />
          ))}
        </Stack>
      ))}
    </Box>
  );
}

/**
 * PANNEAU d'une sous-section : le bloc de base de la mise en page « écran de MJ ». Un panneau =
 * une sous-section = une ancre partageable (`#maneuvers`, PER-310) — d'où l'`id` porté ici, et le
 * `scrollMarginTop` qui dégage l'en-tête collé quand on y saute.
 *
 * Il porte le codage couleur de sa famille de règles : bandeau de titre teinté, filet sous le
 * bandeau, et dégradé d'extinction sur toute sa hauteur (cf. `referenceStyle.ts`). Ses entrées sont
 * séparées par un simple filet, sans carte imbriquée : c'est ce qui fait la densité du PDF.
 */
function SubsectionPanel({
  group,
  expandEntries,
  scrollMarginTop,
}: {
  group: ReferenceSubsectionGroup;
  expandEntries: boolean;
  scrollMarginTop: number;
}) {
  const accent = subsectionAccentText(group.subsection);
  return (
    <Box
      id={subsectionAnchorId(group.subsection)}
      sx={{
        ...panelSx,
        // Dégage l'en-tête global ET la barre collée : sans ça, sauter à une ancre partagée
        // amènerait le bandeau du panneau juste DERRIÈRE les onglets.
        scrollMarginTop: `${scrollMarginTop}px`,
        overflow: 'hidden',
        backgroundImage: subsectionPanelGradient(group.subsection),
      }}
    >
      <Box sx={{ px: 2, py: 0.75, borderBottom: subsectionHeaderBorder(group.subsection) }}>
        <Typography
          variant="overline"
          component="h2"
          sx={{
            display: 'block',
            m: 0,
            fontWeight: 800,
            letterSpacing: 0.6,
            lineHeight: 1.9,
            color: accent,
          }}
        >
          {group.label}
        </Typography>
      </Box>
      <Stack
        sx={{ px: 2, py: 0.5 }}
        divider={<Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.07)' }} />}
      >
        {group.entries.map((entry) =>
          entry.kind === 'text' ? (
            // Clé indexée sur le MODE : bascule parcours ⇄ recherche = on réapplique l'état déplié
            // par défaut. Elle ne dépend PAS du texte cherché, donc pas de remontage à chaque frappe.
            <TextEntryRow
              key={`${entry.id}:${expandEntries}`}
              entry={entry}
              accent={accent}
              defaultExpanded={expandEntries}
            />
          ) : (
            <TableEntryRow key={entry.id} entry={entry} accent={accent} />
          ),
        )}
      </Stack>
    </Box>
  );
}

/**
 * Le VERBATIM d'une entrée, en paragraphes : l'amorce colorée coiffe le premier, le renvoi de page
 * ferme le dernier. Une règle d'une seule phrase (les 10 états) retombe sur un unique paragraphe.
 * `lead` porte le titre en gras coloré — omis quand le titre est déjà affiché par l'en-tête repliable.
 */
function VerbatimParagraphs({
  entry,
  accent,
  lead,
}: {
  entry: ReferenceTextEntry;
  accent: string;
  lead: boolean;
}) {
  const paragraphs = splitVerbatimParagraphs(entry.body);
  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <Typography
          key={i}
          variant="body2"
          component="div"
          sx={{ color: 'text.primary', whiteSpace: 'pre-line', mt: i === 0 ? 0 : 0.75 }}
        >
          {i === 0 && lead && (
            <Box component="span" sx={{ fontWeight: 700, color: accent }}>
              {entry.title}&nbsp;:{' '}
            </Box>
          )}
          <RuleText>{paragraph}</RuleText>
          {i === paragraphs.length - 1 && (
            <SourceRef page={entry.sourcePage} term={entry.title} sx={{ ml: 0.75 }} />
          )}
        </Typography>
      ))}
      {entry.test && <TestBullet accent={accent}>{entry.test}</TestBullet>}
    </>
  );
}

/**
 * Entrée de texte, REPLIABLE quand elle a de quoi (PER-311, 2ᵉ passe — retour proprio : « le PDF
 * était ultra condensé, et c'était bien pratique »).
 *
 * Ce qui est repliable, et ce qui ne l'est pas, suit la CONSIGNE du proprio : on ne replie que ce
 * qui a réellement du volume à cacher. Le critère tombe tout seul du modèle de données — `shortEffect`
 * est par contrat « l'effet en UNE ligne » et `body` le verbatim complet :
 *   • `body` n'apporte rien de plus que `shortEffect` et pas de `test` → RIEN à replier, l'entrée
 *     reste à plat (c'est le cas des 10 états préjudiciables, « bien en l'état » d'après le proprio) ;
 *   • sinon → en-tête d'une ligne (titre + `shortEffect`) et verbatim replié dessous.
 * Les entrées `table` ne passent jamais par ici : un tableau est déjà dense, il reste toujours visible.
 *
 * Replié par défaut en parcours (c'est tout l'intérêt), déplié en recherche — on vient de demander
 * cette règle, la cacher derrière un chevron serait absurde.
 *
 * Pas d'`Accordion` MUI : ses gabarits (48 px de hauteur minimale, gouttières) ruineraient justement
 * la densité recherchée. En-tête cliquable maison + `Collapse`, à la façon des autres blocs de l'app.
 */
function TextEntryRow({
  entry,
  accent,
  defaultExpanded,
}: {
  entry: ReferenceTextEntry;
  accent: string;
  defaultExpanded: boolean;
}) {
  const preview = entry.shortEffect.trim();
  const collapsible = entry.body.trim() !== preview || Boolean(entry.test);
  const [open, setOpen] = useState(defaultExpanded);

  if (!collapsible) {
    return (
      <Box sx={{ py: 0.75 }}>
        <VerbatimParagraphs entry={entry} accent={accent} lead />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 0.25 }}>
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0.5,
          width: '100%',
          px: 0,
          py: 0.5,
          border: 0,
          bgcolor: 'transparent',
          color: 'inherit',
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          borderRadius: 1,
          '&:hover': { bgcolor: alpha(accent, 0.08) },
        }}
      >
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
            mt: '1px',
            flexShrink: 0,
            color: accent,
            transition: 'transform 150ms',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
        <Typography variant="body2" component="div" sx={{ color: 'text.secondary', minWidth: 0 }}>
          <Box component="span" sx={{ fontWeight: 700, color: accent }}>
            {entry.title}
            {open ? '' : ' : '}
          </Box>
          {/* Aperçu d'une ligne uniquement quand c'est replié : déplié, le verbatim le répéterait. */}
          {!open && <RuleText>{preview}</RuleText>}
        </Typography>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ pl: 2.75, pb: 0.75 }}>
          <VerbatimParagraphs entry={entry} accent={accent} lead={false} />
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Puce « mécanique de résolution » distincte, sous le verbatim d'une manœuvre / d'un test. Prend la
 * teinte de son panneau plutôt que le bleu primaire : dans une page où la couleur porte désormais le
 * classement par famille, un bleu isolé se lirait comme une famille de plus.
 */
function TestBullet({ children, accent }: { children: string; accent: string }) {
  return (
    <Box
      sx={{
        mt: 1,
        px: 1.25,
        py: 0.5,
        borderRadius: 1,
        borderLeft: '3px solid',
        borderLeftColor: alpha(accent, 0.7),
        bgcolor: alpha(accent, 0.08),
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: accent, display: 'block' }}>
        Résolution
      </Typography>
      <Typography variant="body2" component="div" sx={{ color: 'text.primary' }}>
        <RuleText>{children}</RuleText>
      </Typography>
    </Box>
  );
}

/**
 * Entrée « tableau structuré » DANS son panneau : titre + renvoi de page, puis une table compacte à
 * en-tête teinté et lignes alternées (le patron du PDF, préféré au texte courant dès que la règle est
 * chiffrée). Reste traversable horizontalement : en colonne étroite ou sur mobile, une table à cinq
 * colonnes défile plutôt que de faire déborder la page.
 */
function TableEntryRow({ entry, accent }: { entry: ReferenceTableEntry; accent: string }) {
  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, mb: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: accent }}>
          {entry.title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <SourceRef page={entry.sourcePage} term={entry.title} />
      </Box>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table
          size="small"
          sx={{
            minWidth: entry.columns.length > 2 ? 420 : 260,
            // Table de tableur : filets internes supprimés, lignes serrées, alternance discrète —
            // c'est le contraste des rangées qui guide l'œil, pas une grille.
            '& td, & th': { border: 0, py: 0.35, px: 1, lineHeight: 1.45 },
            '& tbody tr:nth-of-type(odd)': { bgcolor: 'rgba(255, 255, 255, 0.04)' },
          }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(accent, 0.18) }}>
              {entry.columns.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'text.primary' }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {entry.rows.map((row, i) => (
              <TableRow key={i}>
                {entry.columns.map((col) => (
                  <TableCell key={col.key} sx={{ verticalAlign: 'top' }}>
                    <RuleText>{row[col.key] ?? ''}</RuleText>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {entry.note && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ display: 'block', mt: 0.75 }}>
          <RuleText>{entry.note}</RuleText>
        </Typography>
      )}
    </Box>
  );
}

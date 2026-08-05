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
 * Rendu à la densité « page dédiée » du schéma : entrées `text` en accordéon (aperçu `shortEffect`
 * replié, `body` VERBATIM déplié, `test` en puce distincte) ; entrées `table` en tableau traversable.
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
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
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
import { alpha } from '@mui/material/styles';
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
  subsectionAnchorId,
  type ReferenceSectionGroup,
} from '@/lib/ui/reference';
import { usePersistedState } from '@/lib/ui/usePersistedState';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { SourceRef } from '@/components/SourceRef';
import { GlossaryText } from '@/components/sheet/FeatureRichText';
import { AppTooltip } from '@/components/AppTooltip';

/** Normalise pour une recherche insensible aux accents et à la casse (cf. accueil / bestiaire). */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
   */
  useEffect(() => {
    if (searching) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else if (!id) window.scrollTo({ top: 0 });
  }, [activeSection, searching]);

  /**
   * Bouton flottant « Haut de page » — LE MÊME que sur la fiche de personnage
   * (`<ScrollToTopButton/>`), révélé par le même genre de sentinelle : ici la barre de recherche,
   * qui coiffe la page, tient le rôle de la ligne d'identité de la fiche. Le `rootMargin` négatif
   * (≈ hauteur des deux étages de la barre collée depuis PER-239) déclenche pile quand elle
   * disparaît derrière le sous-header, et non seulement quand elle sort du viewport.
   */
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  useEffect(() => {
    const el = searchBarRef.current;
    if (el == null) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPastHeader(!entry.isIntersecting),
      { rootMargin: '-104px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
   <ReferenceVerbatimContext.Provider value={verbatim}>
    <Stack spacing={2}>
      {/* Barre de recherche plein texte (titre + mots-clés + verbatim + cellules de table),
          avec à droite la bascule « Texte d'origine ». */}
      <Box ref={searchBarRef} sx={{ ...panelSx, p: 1.5 }}>
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
      <Box sx={{ ...panelSx, px: { xs: 0.5, sm: 1 } }}>
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
                sx={{ textTransform: 'none', fontWeight: 700, minHeight: 48 }}
              />
            );
          })}
        </Tabs>
      </Box>

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
              top: { md: 96 },
              maxHeight: { md: 'calc(100vh - 120px)' },
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
              {activeGroup.subsections.map((sub) => (
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
                    borderLeft: '2px solid',
                    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
                    '&:hover': { color: 'text.primary', borderLeftColor: 'primary.main' },
                  }}
                >
                  {sub.label}
                </Box>
              ))}
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
                  <Stack spacing={searching ? 2 : 3}>
                    {group.subsections.map((sub) => (
                      // `id` = l'ancre partageable du bloc (`#maneuvers`) : cible des liens du
                      // sommaire et du saut au chargement. `scrollMarginTop` dégage l'en-tête collé.
                      <Box
                        key={sub.subsection}
                        id={subsectionAnchorId(sub.subsection)}
                        sx={{ scrollMarginTop: '112px' }}
                      >
                        <Typography
                          variant="overline"
                          sx={{
                            display: 'block',
                            mb: 1,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            color: 'text.secondary',
                          }}
                        >
                          {sub.label}
                        </Typography>
                        <Stack spacing={1.5}>
                          {sub.entries.map((entry) =>
                            entry.kind === 'text' ? (
                              <TextEntryCard
                                key={entry.id}
                                entry={entry}
                                defaultExpanded={searching}
                              />
                            ) : (
                              <TableEntryCard key={entry.id} entry={entry} />
                            ),
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
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

/** En-tête d'une carte texte : titre + renvoi de page à droite, aperçu (`shortEffect`) en dessous. */
function TextEntryHeader({ entry }: { entry: ReferenceTextEntry }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, pr: 1, width: '100%' }}>
      <Typography sx={{ fontWeight: 700 }}>{entry.title}</Typography>
      <Box sx={{ flexGrow: 1 }} />
      <SourceRef page={entry.sourcePage} term={entry.title} />
      <Typography variant="body2" color="text.secondary" component="div" sx={{ flexBasis: '100%', mt: 0.25 }}>
        <RuleText>{entry.shortEffect}</RuleText>
      </Typography>
    </Box>
  );
}

/**
 * Entrée « encadré de texte » : résumé = titre + aperçu (`shortEffect`) + renvoi de page ; détail =
 * verbatim complet (s'il apporte plus que l'aperçu) et, s'il y en a, la mécanique de résolution
 * (`test`) en puce distincte. Repliée par défaut en parcours (scan rapide), dépliée en recherche.
 *
 * Certaines entrées (les 10 états préjudiciables, adaptés du glossaire) ont un `body` identique à
 * leur `shortEffect` et pas de `test` : il n'y a alors RIEN de plus à déplier → on rend une carte
 * statique (ni chevron, ni interaction) plutôt qu'un accordéon qui dupliquerait la même ligne.
 */
function TextEntryCard({
  entry,
  defaultExpanded,
}: {
  entry: ReferenceTextEntry;
  defaultExpanded: boolean;
}) {
  const bodyAddsInfo = entry.body.trim() !== entry.shortEffect.trim();
  const hasDetail = bodyAddsInfo || Boolean(entry.test);

  if (!hasDetail) {
    return (
      <Box sx={{ ...panelSx, px: 2, py: 1.5 }}>
        <TextEntryHeader entry={entry} />
      </Box>
    );
  }

  return (
    <Accordion
      // Remonte quand on bascule parcours ⇄ recherche pour réappliquer l'état déplié par défaut,
      // sans remonter à chaque frappe (la clé ne dépend QUE du mode, pas du texte cherché).
      key={`${entry.id}:${defaultExpanded}`}
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={{
        ...panelSx,
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <TextEntryHeader entry={entry} />
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {/* Verbatim complet, uniquement s'il apporte plus que l'aperçu déjà lu dans le résumé. */}
        {bodyAddsInfo && (
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line', color: 'text.primary' }}>
            <RuleText>{entry.body}</RuleText>
          </Typography>
        )}
        {entry.test && <TestBullet>{entry.test}</TestBullet>}
      </AccordionDetails>
    </Accordion>
  );
}

/** Puce « mécanique de résolution » distincte, sous le verbatim d'une manœuvre / d'un test. */
function TestBullet({ children }: { children: string }) {
  return (
    <Box
      sx={{
        mt: 1.5,
        px: 1.25,
        py: 0.75,
        borderRadius: 1,
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
        bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.light', display: 'block' }}>
        Résolution
      </Typography>
      <Typography variant="body2" component="div" sx={{ color: 'text.primary' }}>
        <RuleText>{children}</RuleText>
      </Typography>
    </Box>
  );
}

/** Entrée « tableau structuré » : titre + renvoi de page, table traversable sur petit écran, note. */
function TableEntryCard({ entry }: { entry: ReferenceTableEntry }) {
  return (
    <Box sx={{ ...panelSx, p: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700 }}>{entry.title}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <SourceRef page={entry.sourcePage} term={entry.title} />
      </Box>
      {/* Conteneur défilable horizontalement : la table reste lisible sur mobile sans déborder la page. */}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: entry.columns.length > 2 ? 480 : 320 }}>
          <TableHead>
            <TableRow>
              {entry.columns.map((col) => (
                <TableCell key={col.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
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
        <Typography variant="caption" color="text.secondary" component="div" sx={{ display: 'block', mt: 1 }}>
          <RuleText>{entry.note}</RuleText>
        </Typography>
      )}
    </Box>
  );
}

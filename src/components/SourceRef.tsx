'use client';

import { Fragment, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { SectionIcon } from '@/components/SectionIcon';
import { CodexSubpageIcon } from '@/components/codex/CodexSubpageIcon';
import { BOOKS, DEFAULT_BOOK_ID, rulesHref, type BookId } from '@/lib/ui/books';
import { splitPageRefs } from '@/lib/ui/pageRefs';

/**
 * Résout l'icône du bouton « Voir dans le Codex » d'après la SOUS-PAGE ciblée par `codexHref`
 * (préfixe de route), pour que le bouton reflète la bonne sous-page (Équipement, Familiers…) au
 * lieu de toujours montrer l'icône « Voies » — bug repéré sur les objets d'équipement, dont le
 * bouton codex montrait l'icône des Voies alors qu'il ouvre `/codex/equipement`. Même source de
 * vérité que le sélecteur du Codex (`CodexSubpageIcon`), juste indexée par route plutôt que libellé.
 */
const CODEX_HREF_PREFIX_LABELS: readonly { prefix: string; label: string }[] = [
  { prefix: '/codex/voies', label: 'Voies' },
  { prefix: '/codex/objets-magiques', label: 'Objets magiques' },
  { prefix: '/codex/dieux', label: 'Dieux' },
  { prefix: '/codex/familiers', label: 'Familiers fantastiques' },
  { prefix: '/codex/montures', label: 'Montures & véhicules' },
  { prefix: '/codex/equipement', label: 'Équipement' },
];

function codexHrefIcon(href: string, size: number) {
  const match = CODEX_HREF_PREFIX_LABELS.find((entry) => href.startsWith(entry.prefix));
  return <CodexSubpageIcon label={match?.label ?? 'Voies'} size={size} />;
}

export interface SourceRefProps {
  /**
   * Page dans le livre (cf. `sourcePage` des données). Un nombre dans le cas courant ;
   * une chaîne pour une PLAGE de pages (ex. `'219-220'`, règle qui s'étale sur deux pages).
   */
  page?: number | string;
  /** Section ou titre de paragraphe, affiché avant la page (ex. « Touche finale »). */
  section?: string;
  /**
   * Terme à CIBLER dans le visualiseur à l'ouverture (PER-59/61) : le nom de l'entité dont ce
   * renvoi cite la page (capacité, créature, état…). Le visualiseur surligne (couleur distincte)
   * et centre sa 1re occurrence sur la page citée. Absent = simple saut de page (renvoi générique).
   * N'apparaît PAS dans le libellé du badge — c'est une aide de navigation, pas un texte affiché.
   */
  term?: string;
  /** Livre source (défaut : livre des règles). Identifie l'icône et le nom en infobulle. */
  book?: BookId;
  /**
   * URL du Codex (PER-72 suite) quand cette référence CITE un rang de voie précis (peuple, profil,
   * prestige) — ajoute un petit bouton « voir dans le Codex » à côté du badge, qui navigue vers la
   * fiche de la voie et défile jusqu'à ce rang (`featureCodexHref`, `src/lib/ui/codex.ts`). Absent =
   * pas de bouton (référence hors voie, ou renvoi générique).
   */
  codexHref?: string;
  /**
   * URL de la fiche du Bestiaire (PER-439) quand cette référence CITE une créature qui y a son
   * propre bloc de stats — ajoute un petit bouton « voir dans le Bestiaire » (tête de loup, même
   * icône que le bouton Bestiaire de l'en-tête), soudé APRÈS le bouton Codex s'il est aussi
   * présent. Même patron que `codexHref`
   * (`bestiaryCreatureHref`, `src/lib/ui/creatureLinks.ts`). Absent = pas de bouton.
   */
  bestiaryHref?: string;
  /** Style additionnel fusionné par-dessus le badge. */
  sx?: SxProps<Theme>;
}

/**
 * Citation de source standardisée sous forme de badge compact : icône du livre + « [section, ]p. N ».
 * Le nom du livre passe en infobulle native (`title`) — `SourceRef` s'affichant à l'intérieur des
 * infobulles MUI de l'app, on évite ainsi d'imbriquer un `Tooltip` MUI dans un autre. À utiliser
 * partout où l'on renvoie le joueur au livre (infobulles, texte de règle verbatim, cartes de capacité…).
 *
 * Le badge est **cliquable** : il navigue vers l'URL canonique du visualiseur (`rulesHref`,
 * PER-60), qui ouvre le livre à la page citée. Depuis une page de l'app c'est une navigation
 * DOUCE → le visualiseur s'ouvre en overlay (route interceptée `@viewer/(.)rules/...`) sans
 * quitter la page courante, et l'URL devient partageable ; un rechargement de cette URL affiche
 * la page plein écran. Comme `PageRefText` transforme tout « (p. N) » en `SourceRef`, ce seul
 * point rend cliquables tous les renvois de page. Pour une PLAGE (« 219-220 »), on saute à la
 * première page. Sans page, on ouvre le livre au début.
 */
export function SourceRef({ page, section, term, book = DEFAULT_BOOK_ID, codexHref, bestiaryHref, sx }: SourceRefProps) {
  const router = useRouter();
  const meta = BOOKS[book];
  const { Icon } = meta;
  const label = [section, page != null ? `p. ${page}` : null].filter(Boolean).join(', ');
  const targetPage = page != null ? Number.parseInt(String(page), 10) : NaN;
  // Livre DORMANT (PDF pas encore servi, ex. Bestiaire payant) : on garde le badge
  // (bon libellé + icône) mais NON cliquable — sinon le clic ouvrirait le mauvais PDF.
  const available = meta.available !== false;

  const rulesUrl = rulesHref(book, Number.isFinite(targetPage) ? targetPage : 1, term);

  // Molette (clic milieu) ou Ctrl/Cmd/Maj-clic = onglet/fenêtre séparé·e, comme sur un vrai
  // lien — sinon simple navigation douce (`router.push`) dans l'onglet courant. Utilisé par
  // `open`/`goToCodex` (clic gauche) et `openAux`/`goToCodexAux` (clic milieu, événement séparé
  // du DOM — `onClick` ne se déclenche pas pour le bouton du milieu).
  const navigate = (e: React.MouseEvent | React.KeyboardEvent, url: string, forceNewTab = false) => {
    // Empêche le clic d'activer un conteneur cliquable englobant (ligne de liste, résumé
    // d'accordéon, carte de capacité…). `SourceRef` reste un `span[role=button]` plutôt qu'un
    // `<Link>` car il s'affiche parfois DANS un élément interactif (imbriquer une ancre y serait
    // du HTML invalide) : on navigue donc par programme.
    e.stopPropagation();
    const newTab = forceNewTab || ('ctrlKey' in e && (e.ctrlKey || e.metaKey || e.shiftKey));
    if (newTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(url);
    }
  };

  // Empêche le geste d'auto-défilement (« autoscroll ») que Windows/Chrome déclenche par défaut
  // sur un clic milieu hors d'une vraie ancre `<a href>` : sans ce `preventDefault` sur le
  // `mousedown`, le navigateur avale le clic milieu pour activer le curseur de défilement au lieu
  // de laisser `onAuxClick` ouvrir le nouvel onglet.
  const preventMiddleClickAutoscroll = (e: React.MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  };

  const open = (e: React.MouseEvent | React.KeyboardEvent) => navigate(e, rulesUrl);
  const openAux = (e: React.MouseEvent) => {
    if (e.button === 1) navigate(e, rulesUrl, true);
  };

  const goToCodex = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (codexHref) navigate(e, codexHref);
  };
  const goToCodexAux = (e: React.MouseEvent) => {
    if (codexHref && e.button === 1) navigate(e, codexHref, true);
  };

  const goToBestiary = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (bestiaryHref) navigate(e, bestiaryHref);
  };
  const goToBestiaryAux = (e: React.MouseEvent) => {
    if (bestiaryHref && e.button === 1) navigate(e, bestiaryHref, true);
  };

  // Boutons SUPPLÉMENTAIRES à souder après la puce, dans l'ordre Codex PUIS Bestiaire — seul le
  // DERNIER de la chaîne a son coin droit arrondi (les autres restent carrés des deux côtés, `-1px`
  // de chevauchement pour se lire comme un seul bloc soudé, cf. commentaire plus bas).
  const extraButtons: { key: string; title: string; onClick: typeof goToCodex; onAux: typeof goToCodexAux; icon: ReactNode }[] = [];
  if (codexHref) {
    extraButtons.push({
      key: 'codex',
      title: 'Voir dans le Codex',
      onClick: goToCodex,
      onAux: goToCodexAux,
      // Icône de la SOUS-PAGE réellement ciblée par `codexHref` (Voies, Équipement…) — cohérence
      // visuelle avec l'en-tête plutôt qu'une icône figée sans rapport avec la destination.
      icon: codexHrefIcon(codexHref, 16),
    });
  }
  if (bestiaryHref) {
    extraButtons.push({
      key: 'bestiary',
      title: 'Voir dans le Bestiaire',
      onClick: goToBestiary,
      onAux: goToBestiaryAux,
      // Tête de loup — même icône que le bouton Bestiaire de l'en-tête et l'entrée « Familiers
      // fantastiques » du Codex (`CodexSubpageIcon`, `SectionIcon name="companions"`).
      icon: <SectionIcon name="companions" size={16} />,
    });
  }

  return (
    // Conteneur des DEUX boutons — la puce (ouvre le visualiseur) et, si `codexHref`, le bouton
    // codex — SIBLINGS, jamais l'un dans l'autre : deux `span[role=button]` distincts, soudés visuellement
    // (bords adjacents carrés + `-1px` de chevauchement) mais chacun sa propre zone de clic/clavier.
    <Box
      component="span"
      data-glossary-shot="SourceRef"
      sx={[
        {
          display: 'inline-flex',
          alignItems: 'stretch',
          // Aligne le milieu du bloc sur le milieu de la ligne de texte : sans ça, un
          // `inline-flex` se cale sur la LIGNE DE BASE et paraît remonté au milieu d'une phrase.
          verticalAlign: 'middle',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* `span[role=button]` plutôt qu'un vrai `<button>` : `SourceRef` s'affiche parfois À
          L'INTÉRIEUR d'éléments interactifs (résumé d'accordéon, ligne de liste) et un bouton
          imbriqué dans un bouton est du HTML invalide (erreur d'hydratation). Non interactif
          quand le livre est dormant (ni `role`, ni handlers, ni surbrillance au survol). */}
      <Box
        component="span"
        role={available ? 'button' : undefined}
        tabIndex={available ? 0 : undefined}
        title={
          available
            ? `${meta.name} — ouvrir dans le visualiseur`
            : `${meta.name} — bientôt disponible dans le visualiseur`
        }
        onClick={available ? open : undefined}
        onAuxClick={available ? openAux : undefined}
        onMouseDown={available ? preventMiddleClickAutoscroll : undefined}
        onKeyDown={
          available
            ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open(e);
                }
              }
            : undefined
        }
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.3,
          // Coin droit carré dès qu'un bouton supplémentaire suit : la puce est SOUDÉE au premier
          // d'entre eux (même patron que `StatusChipVisual`/`ClearStatusButton` de la palette
          // d'états de combat), pas un badge isolé qu'un simple filet séparerait.
          borderRadius: extraButtons.length > 0 ? '4px 0 0 4px' : 1,
          cursor: available ? 'pointer' : 'default',
          lineHeight: 1,
          fontSize: '0.85rem',
          fontVariantNumeric: 'tabular-nums',
          color: 'text.secondary',
          bgcolor: alpha(theme.palette.text.primary, 0.06),
          border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
          transition: theme.transitions.create(['background-color', 'border-color', 'color']),
          // Surbrillance au survol réservée au badge cliquable.
          ...(available && {
            '&:hover': {
              color: 'text.primary',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              borderColor: alpha(theme.palette.primary.main, 0.4),
            },
          }),
        })}
      >
        <Icon sx={{ fontSize: 17 }} />
        {label && <Box component="span">{label}</Box>}
      </Box>
      {extraButtons.map((btn, i) => {
        const isLast = i === extraButtons.length - 1;
        return (
          <Box
            key={btn.key}
            component="span"
            role="button"
            tabIndex={0}
            title={btn.title}
            onClick={btn.onClick}
            onAuxClick={btn.onAux}
            onMouseDown={preventMiddleClickAutoscroll}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.onClick(e);
              }
            }}
            sx={(theme) => ({
              display: 'inline-flex',
              alignItems: 'center',
              px: 0.7,
              // `-1px` : superpose le bord gauche de ce bouton sur le bord droit de l'élément qui le
              // précède (puce ou bouton précédent), pour qu'ils se lisent comme UN SEUL bloc soudé
              // (même trait, pas deux liserés collés) — patron `ClearStatusButton` de la palette
              // d'états de combat.
              ml: '-1px',
              // Coin gauche TOUJOURS carré (jonction avec l'élément précédent) ; coin droit arrondi
              // SEULEMENT pour le dernier bouton de la chaîne.
              borderRadius: isLast ? '0 4px 4px 0' : 0,
              cursor: 'pointer',
              color: 'text.secondary',
              bgcolor: alpha(theme.palette.text.primary, 0.06),
              border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
              transition: theme.transitions.create(['background-color', 'border-color', 'color']),
              '&:hover': {
                color: 'text.primary',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                borderColor: alpha(theme.palette.primary.main, 0.4),
              },
            })}
          >
            {btn.icon}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Rend un texte en remplaçant chaque référence de page parenthésée (« (p. 188) »)
 * par la puce de source `SourceRef` (icône du livre + « p. N ») — notion GLOBALE :
 * partout où une chaîne de règle cite sa page (avertissements, notes de calcul…),
 * on renvoie le joueur au livre d'un badge cohérent plutôt que d'un texte brut.
 * Le reste du texte est rendu tel quel. Voir `splitPageRefs`.
 */
export function PageRefText({ children, book }: { children: string; book?: BookId }) {
  return (
    <>
      {splitPageRefs(children).map((seg, i) =>
        seg.kind === 'text' ? (
          <Fragment key={i}>{seg.value}</Fragment>
        ) : (
          <SourceRef key={i} page={seg.page} book={seg.book ?? book} sx={{ mx: 0.25 }} />
        ),
      )}
    </>
  );
}

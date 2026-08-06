'use client';

/**
 * Décor et personnages du héros de la vitrine, en DEUX composants qui se posent dans le
 * même bloc et se répondent par un parallaxe **gradué en profondeur** — le décor bouge
 * peu, les figures du premier plan bougent le plus. C'est ce décalage qui donne du
 * relief ; un parallaxe uniforme ne ferait que déplacer une image plate.
 *
 * - `HeroBackdrop` : le décor. Il **couvre tout le héros, jusqu'en haut de la page**
 *   (derrière la barre de navigation), et n'occupe aucune place dans le flux.
 * - `HeroScene` : la rangée de personnages, une bande de hauteur fixe qui ferme le héros.
 *
 * Les deux sont séparés pour une raison de POSITIONNEMENT, pas de style : le décor doit
 * s'ancrer sur le bloc du héros entier, alors que les figures s'ancrent sur leur seule
 * bande. Tant que le décor vivait dans `HeroScene`, il ne pouvait pas remonter plus haut
 * que la bande sans qu'on connaisse la hauteur du texte du héros — laquelle varie avec le
 * rôle de la session et le retour à la ligne du titre.
 *
 * Pourquoi un décor propre au héros plutôt que l'illustration de couverture : celle-ci
 * est peuplée de personnages, qui entraient en concurrence avec la frise (deux groupes
 * d'aventuriers superposés). Le décor retenu (`/hero-scene.webp`, auberge au crépuscule,
 * extraite du livre de base p. 318) est un LIEU — les figures s'y posent au lieu de s'y
 * heurter. Le fond de PAGE, lui, reste les demi-images ancrées au pied de page
 * (`HomeBackground variant="footer"`) : deux rôles distincts, à ne pas confondre.
 *
 * Les découpes de `public/classes/` sont sur fond transparent mais leur cadrage n'est pas
 * homogène : `barbare` et `rodeur` sont en pied, `guerrier` est un buste sur socle,
 * `magicien` flotte. Impossible de les aligner sur une ligne de sol commune, d'où le
 * parti pris : boîte de hauteur fixe, `object-position: bottom`, et un fondu du bas qui
 * dissout socles et écarts de cadrage au lieu de les exhiber.
 *
 * Décorative de bout en bout : `aria-hidden` et `pointerEvents: none`. Aucune figure ne
 * mène quelque part — mieux vaut ne rien promettre qu'offrir un clic mort.
 *
 * Masquée sous `md`, comme tous les décors ancrés aux bords de l'app (PER-228) : sur un
 * écran étroit elle mangerait la place du texte sans rien apporter.
 */
import { useRef } from 'react';
import Box from '@mui/material/Box';
import { useMouseParallax } from '@/lib/ui/useMouseParallax';

/**
 * La distribution, réglée figure par figure :
 *  - `scale` : hauteur rendue, en fraction de la hauteur de bande. > 1 = la figure
 *    dépasse la bande vers le haut (voulu pour le chevalier, qui domine le groupe) ;
 *  - `drop` : décalage vers le BAS (px). Les figures sont alignées sur le bas de la
 *    bande, une valeur positive les enfonce un peu plus ;
 *  - `depth` : réaction au parallaxe. Les plus grandes et les plus basses ont la plus
 *    forte profondeur : elles se lisent comme étant au premier plan.
 *
 * Taille et position sont deux réglages SÉPARÉS. Une version précédente n'avait qu'un
 * `lift` qui faisait les deux à la fois (il rognait la hauteur pour remonter la figure),
 * ce qui rendait tout réglage fin impossible. Ne pas y revenir.
 *
 * `scale` porte la hauteur RENDUE, sans plafond de largeur : les valeurs ci-dessous
 * reproduisent donc directement ce qu'on voit. (L'ancien `maxWidth: 19vw` bridait en
 * douce les découpes larges — le magicien était rendu à 64 % de la bande alors que sa
 * hauteur demandée valait 94 %.)
 */
const CAST = [
  { id: 'magicien', scale: 0.63, drop: 0, depth: 0.55 },
  { id: 'rodeur', scale: 0.71, drop: 16, depth: 0.9 },
  { id: 'druide', scale: 1.05, drop: 0, depth: 0.45 },
  { id: 'barbare', scale: 0.89, drop: 0, depth: 0.85 },
  { id: 'chevalier', scale: 1.69, drop: 0, depth: 1 },
  { id: 'voleur', scale: 0.92, drop: 16, depth: 0.8 },
] as const;

/** Hauteur de la bande (px). Référence des `scale` ci-dessus. */
const HEIGHT = 420;

/**
 * Marge de dégagement AU-DESSUS de la bande (px), pour les figures dont `scale > 1`.
 * Elle existe pour une raison précise : la rangée doit être rognée HORIZONTALEMENT (le
 * groupe déborde volontairement de l'écran) mais surtout PAS verticalement. Or `overflow`
 * agit sur les deux axes à la fois. On rogne donc un cadre volontairement plus HAUT que la
 * bande : le débordement latéral est coupé net au bord de la fenêtre, tandis que les
 * figures les plus grandes ont la place de dépasser vers le haut.
 *
 * À garder ≥ à l'excédent de la plus grande figure : `(max(scale) - 1) × HEIGHT`.
 */
const HEADROOM = 340;

/** Amplitude du suivi souris (px) pour la figure la plus « proche » (depth 1). */
const MOUSE_X = 12;
const MOUSE_Y = 6;

/**
 * Profondeur du DÉCOR : très faible, c'est ce qui le situe au loin. Le décalage entre
 * cette valeur et celle des figures EST l'effet de relief.
 */
const SCENE_DEPTH = 0.16;

/** Décor : opacité et cadrage. */
const SCENE_OPACITY = 0.72;
const SCENE_POSITION = 'center 34%';

/**
 * De combien le décor remonte AU-DESSUS du bloc du héros (px), pour atteindre le haut de
 * la page. Le bloc du héros commence sous la barre de navigation (deux rangées, ~82 px)
 * et sous la marge haute du `Container` (56 px en `sm`) : la somme est dépassée
 * volontairement, si bien que le décor est pleinement visible dès le premier pixel de la
 * page au lieu d'y arriver en fondu. Le dépassement est sans effet de bord — la fenêtre
 * rogne ce qui sort par le haut.
 */
const BACKDROP_RISE = 220;

/**
 * Fondu du décor : il s'efface sur ses côtés et sur son BAS pour se poser dans la page
 * sans cadre. Pas de fondu en haut : le décor doit y être franc (demande proprio « qu'il
 * aille jusqu'en haut de la page, qu'il soit plus visible »).
 *
 * Un seul dégradé par axe est impossible en une passe — `mask-composite` vaut `add` par
 * défaut, donc deux couches se cumuleraient en opacité au lieu de s'intersecter. On
 * empile donc deux ÉLÉMENTS : le décor porte le fondu horizontal, son parent le vertical.
 */
const SCENE_SIDE_FADE =
  'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)';
const SCENE_VERTICAL_FADE = 'linear-gradient(to bottom, #000 0%, #000 62%, transparent 100%)';

// Les figures sont rendues PLEINES : ni fondu, ni opacité réduite (arbitrage proprio).
// La profondeur ne passe donc plus que par le parallaxe et par le décalage vertical
// (`lift`) — ce qui suffit, et rend les personnages nettement plus présents.
//
// Conséquence à ne pas perdre de vue : leur ligne de sol hétérogène (socle du guerrier,
// magicien qui flotte) n'est plus dissoute par un fondu. C'est acceptable parce que les
// découpes retenues sont peintes avec leur propre ombre portée, mais changer la
// distribution demande de revérifier le bas de la bande.

/**
 * Décor du héros. À poser comme enfant du bloc du héros, qui doit être `position:
 * relative` : c'est LUI que le décor recouvre, du haut de la page (via `BACKDROP_RISE`)
 * jusqu'au bas de la bande de personnages.
 *
 * Ordre d'empilement dans le héros : décor `-3` < figures `-2` < halo de lisibilité `-1`
 * < texte (dans le flux). Les valeurs négatives restent confinées au contexte
 * d'empilement du héros, donc rien ne file derrière le fond de page.
 */
export function HeroBackdrop() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useMouseParallax(
    ({ x, y }) => {
      // Écriture directe sur le DOM (aucun state React), comme les autres parallaxes de
      // l'app.
      const el = sceneRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${(x * SCENE_DEPTH).toFixed(2)}px, ${(y * SCENE_DEPTH).toFixed(2)}px, 0)`;
    },
    { mouseX: MOUSE_X, mouseY: MOUSE_Y },
  );

  return (
    // Porteur du fondu VERTICAL et du rognage ; le décor lui-même porte le fondu
    // horizontal (deux masques ne s'intersectent pas sur un même élément, cf. plus haut).
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'absolute',
        top: -BACKDROP_RISE,
        bottom: 0,
        // Pleine largeur de fenêtre : le décor traverse les gouttières du `Container`.
        left: 'calc(50% - 50vw)',
        width: '100vw',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -3,
        maskImage: SCENE_VERTICAL_FADE,
        WebkitMaskImage: SCENE_VERTICAL_FADE,
      }}
    >
      <Box
        ref={sceneRef}
        sx={{
          position: 'absolute',
          // Débord vertical : le parallaxe ne doit jamais découvrir un bord d'image.
          inset: '-4% 0',
          backgroundImage: 'url(/hero-scene.webp)',
          backgroundSize: 'cover',
          backgroundPosition: SCENE_POSITION,
          backgroundRepeat: 'no-repeat',
          maskImage: SCENE_SIDE_FADE,
          WebkitMaskImage: SCENE_SIDE_FADE,
          opacity: SCENE_OPACITY,
          willChange: 'transform',
        }}
      />
    </Box>
  );
}

export function HeroScene() {
  const rowRef = useRef<HTMLDivElement>(null);

  useMouseParallax(
    ({ x, y }) => {
      // Un transform par figure, gradué par sa profondeur (écriture directe sur le DOM).
      if (!rowRef.current) return;
      for (const child of Array.from(rowRef.current.children) as HTMLElement[]) {
        const depth = Number(child.dataset.depth ?? 1);
        child.style.transform = `translate3d(${(x * depth).toFixed(2)}px, ${(y * depth).toFixed(2)}px, 0)`;
      }
    },
    { mouseX: MOUSE_X, mouseY: MOUSE_Y },
  );

  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'relative',
        // Débordement latéral hors du `Container` : la scène touche les bords de
        // l'écran, ses extrémités étant de toute façon fondues.
        mx: 'calc(50% - 50vw)',
        width: '100vw',
        height: HEIGHT,
        // Les figures étant désormais pleines jusqu'en bas, la bande ne mord plus sur la
        // section suivante : un chevauchement ferait passer les cartes par-dessus leurs
        // jambes. Juste de quoi resserrer le blanc.
        mb: -4,
        pointerEvents: 'none',
        // Les figures qui dépassent la bande (`scale > 1`) montent jusqu'à hauteur du
        // texte du héros. Elles doivent passer DERRIÈRE lui, sinon une bannière rend un
        // appel à l'action illisible. Le négatif reste confiné au contexte d'empilement
        // créé par le bloc du héros (`zIndex: 0`), donc la scène ne descend pas non plus
        // derrière l'illustration de fond de page.
        //
        // `-2` : entre le décor (`-3`) et le halo de lisibilité (`-1`, cf.
        // `HERO_TEXT_SCRIM` dans `HomeLanding`).
        zIndex: -2,
      }}
    >
      {/* ── Figures, au premier plan ─────────────────────────────────────────
          Cadre de rognage : pleine largeur de la fenêtre, mais débordant vers le HAUT de
          `HEADROOM`. Il coupe le débordement latéral du groupe sans amputer les figures
          les plus grandes (cf. la constante). */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -HEADROOM,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
      <Box
        ref={rowRef}
        sx={{
          position: 'absolute',
          // La hauteur vient des OFFSETS (top/bottom), et surtout PAS d'un `height: 100%`
          // : une hauteur explicite l'emporterait sur `bottom` et la rangée prendrait
          // toute la hauteur du cadre de rognage (760 px au lieu de 420). Les `scale` des
          // figures étant exprimés en % de cette hauteur, ils s'en trouvaient multipliés
          // par 1,8 — piège coûteux, ne pas réintroduire de `height` ici.
          top: HEADROOM,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          // Écart resserré (arbitrage proprio) : le groupe se lit comme une compagnie,
          // pas comme six figurines alignées. Le chevauchement passe par une marge
          // NÉGATIVE sur les figures qui suivent — `gap` n'accepte pas de valeur
          // négative. Les découpes portent assez de marge transparente pour se
          // chevaucher sans se masquer.
          '& > img + img': { ml: { md: '-34px', lg: '-52px' } },
        }}
      >
        {CAST.map(({ id, scale, drop, depth }) => (
          <Box
            key={id}
            component="img"
            src={`/classes/${id}.webp`}
            alt=""
            data-depth={depth}
            loading="lazy"
            decoding="async"
            sx={{
              height: `${scale * 100}%`,
              width: 'auto',
              // Pas de compression : la largeur découle de la hauteur, et le groupe est
              // autorisé à déborder de l'écran. Sans cela, la mise en page flex
              // rétrécirait les figures pour les faire tenir et les `scale` ci-dessus ne
              // voudraient plus rien dire. Le débordement latéral est sans danger :
              // `body { overflow-x: hidden }` (cf. `providers.tsx`) le rogne au bord de
              // la fenêtre, sans jamais créer de barre de défilement.
              flexShrink: 0,
              // Décalage vers le bas (figures alignées sur le bas de la bande).
              mb: `${-drop}px`,
              objectFit: 'contain',
              objectPosition: 'bottom',
              willChange: 'transform',
            }}
          />
        ))}
      </Box>
      </Box>
    </Box>
  );
}

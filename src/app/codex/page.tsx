'use client';

/**
 * Page d'INDEX du Codex (PER-418) — bibliothèque de règles consultable en LECTURE SEULE, SANS
 * personnage, publique (accessible sans connexion, comme `/reference`). Sur le modèle de
 * `src/app/reference/page.tsx` : ossature seule ici, le comportement vit dans un composant dédié.
 *
 * Sous-pages fonctionnelles à ce jour : Voies, Objets magiques, Dieux, Familiers fantastiques,
 * Montures & véhicules, Équipement (PER-422, dernière de la milestone).
 */
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexSubpageIcon } from '@/components/codex/CodexSubpageIcon';
import { useHeaderContent } from '@/stores/headerContent';

type CodexEntry = {
  label: string;
  description: string;
  href?: string;
  image: string;
  /** photo = cutout couleur (opacité simple) ; symbol = filigrane N&B (masque CSS) ;
   * lineart = croquis sur fond blanc, fond RÉELLEMENT retiré (alpha) + traits repeints en blanc
   * par le filtre SVG `#codex-lineart-threshold`. */
  variant: 'photo' | 'symbol' | 'lineart';
  /** Décalage horizontal du filigrane (défaut -16) — plus négatif = poussé vers la droite, hors
   * du bloc, pour dégager le texte quand l'illustration déborde trop dessus. */
  right?: number;
};

const ENTRIES: CodexEntry[] = [
  {
    label: 'Voies',
    description: 'Toutes les voies de personnage et de prestige, capacités par rang.',
    href: '/codex/voies',
    image: '/classes/chevalier.webp',
    variant: 'photo',
  },
  {
    label: 'Objets magiques',
    description: 'Armes, armures, anneaux, potions et artefacts magiques du jeu.',
    href: '/codex/objets-magiques',
    image: '/equipment/haches-de-guerre.webp',
    variant: 'lineart',
  },
  {
    label: 'Dieux',
    description: 'Panthéon, domaines divins et capacités liées à chaque dieu.',
    href: '/codex/dieux',
    image: '/gods/solar nb.png',
    variant: 'symbol',
    right: -50,
  },
  {
    label: 'Familiers fantastiques',
    description: 'Créatures liées invocables comme familiers et leurs pouvoirs.',
    href: '/codex/familiers',
    image: '/bestiary/griffon.webp',
    variant: 'photo',
  },
  {
    label: 'Montures & véhicules',
    description: 'Montures, véhicules et leurs caractéristiques de déplacement.',
    href: '/codex/montures',
    image: '/bestiary/licorne.webp',
    variant: 'photo',
    right: -60,
  },
  {
    label: 'Équipement',
    description: 'Armes, armures, boucliers et matériel d’aventurier.',
    href: '/codex/equipement',
    image: '/equipment/epees-variees.webp',
    variant: 'lineart',
  },
];

export default function CodexPage() {
  useHeaderContent({ breadcrumbs: [{ label: 'Codex' }] });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Codex — Éditeur de personnage CO2</title>
      {/* Croquis crayon (traits sombres/fond blanc) → traits blancs/fond réellement transparent,
          via la recette standard SVG : luminance→alpha, alpha inversée, puis composite d'un
          aplat blanc filtré par cette alpha (plus robuste qu'un feColorMatrix maison).
          x/y/width/height à 0-100% : sans ça la marge de padding par défaut du filtre (-10%/110%)
          est traitée comme transparente donc noire, et l'inversion d'alpha la rend opaque —
          une fine bande blanche fantôme apparaît tout autour de l'image. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id="codex-lineart-threshold" x="0%" y="0%" width="100%" height="100%">
            <feColorMatrix type="luminanceToAlpha" result="lum" />
            <feComponentTransfer in="lum" result="alpha">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feFlood floodColor="#ffffff" result="white" />
            <feComposite in="white" in2="alpha" operator="in" />
          </filter>
        </defs>
      </svg>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Codex
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Le référentiel de règles CO2, consultable sans personnage.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {ENTRIES.map((entry) => {
            return (
              <Box
                key={entry.label}
                component={entry.href ? NextLink : 'div'}
                href={entry.href}
                sx={(theme) => ({
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  p: 3,
                  minHeight: 160,
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  bgcolor: 'rgba(0, 0, 0, 0.35)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  textDecoration: 'none',
                  color: entry.href ? 'text.primary' : 'text.disabled',
                  transition: 'background-color .25s ease, border-color .25s ease, transform .25s ease',
                  ...(entry.href
                    ? {
                        '&:hover': {
                          bgcolor: alpha(theme.palette.info.main, 0.08),
                          borderColor: alpha(theme.palette.info.main, 0.3),
                          transform: 'translateY(-2px)',
                        },
                        '&:hover .codex-card-bg': { transform: 'scale(1.1)' },
                      }
                    : { cursor: 'default' }),
                })}
              >
                {entry.variant === 'symbol' && (
                  <Box
                    aria-hidden
                    className="codex-card-bg"
                    sx={{
                      position: 'absolute',
                      right: entry.right ?? -16,
                      bottom: -16,
                      width: 150,
                      height: 150,
                      opacity: 0.16,
                      bgcolor: '#fff',
                      WebkitMaskImage: `url("${entry.image}")`,
                      maskImage: `url("${entry.image}")`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      transition: 'transform .4s ease',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {entry.variant === 'lineart' && (
                  <Box
                    component="img"
                    aria-hidden
                    className="codex-card-bg"
                    src={entry.image}
                    alt=""
                    sx={{
                      position: 'absolute',
                      right: entry.right ?? -16,
                      bottom: -16,
                      height: 230,
                      width: 'auto',
                      objectFit: 'contain',
                      objectPosition: 'bottom right',
                      opacity: 0.6,
                      filter: 'url(#codex-lineart-threshold)',
                      transition: 'transform .4s ease',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {entry.variant === 'photo' && (
                  <Box
                    component="img"
                    aria-hidden
                    className="codex-card-bg"
                    src={entry.image}
                    alt=""
                    sx={{
                      position: 'absolute',
                      right: entry.right ?? -16,
                      bottom: -16,
                      height: 180,
                      width: 'auto',
                      objectFit: 'contain',
                      objectPosition: 'bottom right',
                      opacity: 0.45,
                      transition: 'transform .4s ease',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CodexSubpageIcon label={entry.label} size={22} />
                  <Typography sx={{ fontWeight: 600 }}>{entry.label}</Typography>
                  {!entry.href && (
                    <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                      À venir
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ position: 'relative' }}>
                  {entry.description}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}

'use client';

/**
 * Section « À quoi ça ressemble » de la vitrine : les captures de `public/home/`,
 * présentées dans un cadre de fenêtre et commutées par onglets.
 *
 * Les images sont produites par `scripts/generate-home-shots.ts` sur un serveur de
 * développement — jamais retouchées à la main. Si l'une manque (dépôt fraîchement
 * cloné, script pas encore lancé), le cadre affiche une invite au lieu d'une image
 * cassée : `onError` fait basculer l'onglet concerné sur un repli textuel.
 *
 * Chaque capture est CLIQUABLE et mène à la page qu'elle montre : autant faire de la
 * démonstration une porte d'entrée.
 */
import { useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { DEFAULT_BOOK_ID, rulesHref } from '@/lib/ui/books';

/** Format des captures (cf. `VIEWPORT` du script) : réserve la place avant chargement. */
const SHOT_ASPECT = '1440 / 900';

interface ShowcaseTab {
  slug: string;
  label: string;
  /** Où mène le clic sur la capture. */
  href: string;
  /** Légende sous le cadre : ce que le visiteur doit remarquer sur l'image. */
  caption: string;
  /**
   * Format de l'image, quand l'écran est capturé dans un cadre plus haut que les autres
   * (cf. `GM_SHOT_VIEWPORT` du script). Défaut : `SHOT_ASPECT`.
   */
  aspect?: string;
}

const TABS: ShowcaseTab[] = [
  {
    slug: 'sheet',
    label: 'Fiche de personnage',
    href: '/characters',
    caption:
      'Caractéristiques, statistiques dérivées et attaques calculées en continu — un rôdeur de niveau 20, voies complètes.',
  },
  {
    slug: 'gm-screen',
    label: 'Écran de MJ',
    // La page est réservée au propriétaire d'une campagne : le clic mène à la liste des
    // campagnes, qui invite à se connecter plutôt que de mener à une porte fermée.
    href: '/campaigns',
    caption:
      'Une manche de combat en cours : la table du MJ, les créatures du bestiaire, les états posés sur chacun, et l’ordre d’initiative en cartes compactes le long de l’écran.',
    aspect: '1440 / 1390',
  },
  {
    slug: 'rules',
    label: 'Livre des règles',
    href: rulesHref(DEFAULT_BOOK_ID, 12),
    caption:
      'Le livre feuilletable, avec recherche plein texte et défilement continu, ouvert à la bonne page depuis n’importe quel renvoi.',
  },
  {
    slug: 'bestiary',
    label: 'Bestiaire',
    href: '/bestiary',
    caption:
      'Recherche, filtres par nature, taille et niveau de challenge, et le bloc de statistiques complet de chaque créature.',
  },
  {
    slug: 'reference',
    label: 'Aide-mémoire',
    href: '/reference',
    caption:
      'Les états préjudiciables et les manœuvres de combat, rangés par onglet et lisibles d’un coup d’œil, avec le texte exact du livre à portée de clic.',
  },
];

export function AppShowcase() {
  const [index, setIndex] = useState(0);
  // Ensemble des captures introuvables : un onglet n'est déclaré manquant qu'après un
  // vrai échec de chargement, jamais par anticipation.
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const active = TABS[index];
  const isMissing = missing.has(active.slug);
  const aspect = active.aspect ?? SHOT_ASPECT;

  return (
    <Stack spacing={1.5}>
      <Tabs
        value={index}
        onChange={(_, next: number) => setIndex(next)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Écrans de l’application"
        sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.slug} label={tab.label} />
        ))}
      </Tabs>

      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(20, 20, 23, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Barre de fenêtre : trois pastilles et le nom de l'écran. Purement
            décorative, elle suffit à faire lire l'image comme une application et non
            comme une illustration. */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            px: 1.5,
            py: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            bgcolor: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <Stack direction="row" spacing={0.5} aria-hidden>
            {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
              <Box
                key={color}
                sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, opacity: 0.55 }}
              />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {active.label}
          </Typography>
        </Stack>

        {isMissing ? (
          <Stack
            spacing={0.5}
            sx={{
              aspectRatio: aspect,
              placeContent: 'center',
              textAlign: 'center',
              p: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Capture non générée.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lancez <code>npx tsx scripts/generate-home-shots.ts</code> avec un serveur de
              développement actif.
            </Typography>
          </Stack>
        ) : (
          <Box
            component={Link}
            href={active.href}
            sx={{ display: 'block', lineHeight: 0 }}
            aria-label={`Ouvrir : ${active.label}`}
          >
            <Box
              component="img"
              // La clé force le remontage à chaque onglet : sans elle, le navigateur
              // garde l'image précédente affichée le temps de charger la nouvelle.
              key={active.slug}
              src={`/home/${active.slug}.webp`}
              alt={`Capture d’écran : ${active.label}`}
              loading="lazy"
              decoding="async"
              onError={() =>
                setMissing((prev) => new Set(prev).add(active.slug))
              }
              sx={{ display: 'block', width: '100%', height: 'auto', aspectRatio: aspect }}
            />
          </Box>
        )}
      </Paper>

      <Typography variant="caption" color="text.secondary">
        {active.caption}
      </Typography>
    </Stack>
  );
}

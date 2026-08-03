/**
 * PUCE « ARME LIÉE » sur la ligne d'inventaire (PER-74 — voie de l'arme liée, p. 147).
 *
 * La voie ne concerne QU'UNE arme, choisie par le joueur parmi celles qu'il possède
 * (`OwnedWeaponFeatureChoice`). Sans marque visible, rien ne dit laquelle : cette puce la désigne
 * là où le joueur la cherche — sur sa ligne d'inventaire, à côté des DM.
 *
 * Habillage : couleurs des voies de PRESTIGE de la catégorie du porteur (rouge pour un combattant,
 * via `prestigeCategoryColor`) + le liseré métallique dégradé commun aux cartes de rang de prestige
 * (`prestigeStaticBorderSx`), pour que la puce se rattache d'un coup d'œil à la voie qui l'accorde.
 * Badge CUSTOM (≠ `Chip` MUI), comme le reste des puces du projet.
 */
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { PrestigeCategory } from '@/data/schema';
import { prestigeCategoryColor } from '@/lib/ui/classColors';
import { prestigeStaticBorderSx } from '@/lib/ui/prestigeStyle';
import { AppTooltip } from '@/components/AppTooltip';

export function BoundWeaponBadge({
  /** Catégorie de la voie de prestige qui accorde le lien (combattant → rouge). */
  category,
  /** Nom de la voie, pour l'info-bulle (« Voie de l'arme liée »). */
  pathName,
}: {
  category: PrestigeCategory | undefined;
  pathName: string;
}) {
  const color = prestigeCategoryColor(category);
  return (
    <AppTooltip
      title={`Arme liée — ${pathName}. Les capacités de cette voie ne valent que pour cette arme.`}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.375,
          px: 0.75,
          py: 0.125,
          borderRadius: 1,
          cursor: 'help',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1.6,
          color,
          bgcolor: alpha(color, 0.12),
          // Liseré métallique des cartes de rang de prestige (statique, respecte le border-radius).
          ...prestigeStaticBorderSx(1, 4, color),
        }}
      >
        {/* Maillon de chaîne : le « lien » avec l'arme, sans dépendre d'un jeu d'icônes externe. */}
        <Box
          component="svg"
          viewBox="0 0 24 24"
          aria-hidden
          sx={{ width: 12, height: 12, fill: 'currentColor', flexShrink: 0 }}
        >
          <path d="M10.6 13.4a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 1.4l-1.4 1.4a1 1 0 0 1-1.4 0Zm-2.3 4.9-1.6 1.6a3.5 3.5 0 0 1-4.9-4.9l3.2-3.2a3.5 3.5 0 0 1 4.9 0l-1.4 1.4a1.5 1.5 0 0 0-2.1 0l-3.2 3.2a1.5 1.5 0 0 0 2.1 2.1l1.6-1.6Zm7.4-12.6 1.6-1.6a3.5 3.5 0 0 1 4.9 4.9l-3.2 3.2a3.5 3.5 0 0 1-4.9 0l1.4-1.4a1.5 1.5 0 0 0 2.1 0l3.2-3.2a1.5 1.5 0 0 0-2.1-2.1l-1.6 1.6Z" />
        </Box>
        Arme liée
      </Box>
    </AppTooltip>
  );
}

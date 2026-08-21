'use client';

/**
 * Micro-fiche récapitulative d'un personnage (portrait + identité + les 7
 * caractéristiques en badges compacts). Composant purement présentatif, partagé
 * par la modale d'import (`ImportCharacterDialog`, confirmation d'import) et par
 * l'infobulle de survol des lignes du listing (`CharacterList`) — cette dernière
 * sert notamment à révéler un nom tronqué en entier.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClassIcon } from '@/components/ClassIcon';
import { AbilityCompactGrid } from '@/components/AbilityCompactGrid';
import type { Character } from '@/lib/character/types';
import { summarize } from '@/lib/character/summary';
import {
  useCharacterPortraitSrc,
  useCharacterPortraitCropRect,
} from '@/lib/storage/useCharacterPortraitSrc';
import { useCroppedImageSrc } from '@/lib/image/useCroppedImageSrc';
import { classColor, profileAccentGradient } from '@/lib/ui/classColors';
import { PATH_COLUMN_COUNT, PATH_RANK_COUNT, pathColumns } from '@/lib/ui/pathColumns';

export interface CharacterPreviewCardProps {
  character: Character;
  /**
   * Teinte le bloc au profil du personnage : léger dégradé désaturé partant du bas
   * droite (`to top left`) + padding/arrondi, pour un « bloc résumé » cohérent au
   * survol d'une ligne, à l'import et à sa confirmation. `false` quand un conteneur
   * parent porte déjà la teinte (carte de l'écran MJ) — évite un dégradé en double.
   */
  tinted?: boolean;
}

export function CharacterPreviewCard({ character, tinted = true }: CharacterPreviewCardProps) {
  const summary = summarize(character);
  const portraitSrc = useCharacterPortraitSrc(character.id, character.portraitVariant, summary.classId);
  // Recadrage carré du portrait personnalisé (PER-394) — l'image stockée est
  // désormais toujours l'originale complète, cf. `characterPortrait.ts`.
  const portraitCropRect = useCharacterPortraitCropRect(character.id, character.portraitVariant);
  const croppedPortraitSrc = useCroppedImageSrc(portraitSrc, portraitCropRect);
  return (
    // `minWidth` : dans une infobulle qui se dimensionne au contenu (survol desktop),
    // un plancher garde les 7 badges de carac d'égale largeur. Mais réutilisée dans une
    // colonne contrainte (écran MJ sur mobile, PER-232), ce plancher faisait déborder la
    // carte de sa colonne → plancher retiré sous « sm » (xs: 0), conservé au-delà.
    // `tinted` : léger dégradé teinté au profil (bas droite → haut gauche), qui fait de
    // l'aperçu un « bloc résumé » cohérent (survol, import, succès).
    <Stack
      spacing={2}
      data-glossary-shot="CharacterPreviewCard"
      sx={{
        minWidth: { xs: 0, sm: 264 },
        ...(tinted && {
          p: 1.5,
          borderRadius: 2,
          backgroundImage: profileAccentGradient(summary.classId, 'to top left'),
        }),
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Box
          component="img"
          src={croppedPortraitSrc ?? portraitSrc}
          alt=""
          aria-hidden
          sx={{
            width: 72,
            height: 72,
            borderRadius: 2,
            objectFit: 'cover',
            objectPosition: 'top',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
          }}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {/* Largeur du nom bridée : sans plafond, un nom long élargissait toute la
              carte. On le laisse passer à la ligne pour garder un bloc compact. */}
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, maxWidth: 200 }}>
            {summary.name}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25 }}>
            <ClassIcon classId={summary.classId} firearmsAllowed={summary.firearmsAllowed} size={18} />
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: classColor(summary.classId), fontWeight: 600 }}>
                {summary.characterClass}
              </Box>{' '}
              · niveau {summary.level}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {summary.ancestry}
          </Typography>
        </Box>

        {/* Micro-grille des voies, à droite du bloc identité (délibérément séparée
            des badges de carac pour ne pas suggérer un lien avec ceux-ci). */}
        <PathsMiniGrid character={character} />
      </Stack>

      {/* Les 7 caractéristiques, dans le style COMPACT partagé par tout le roster de l'écran de
          MJ (Joueurs/Compagnons/Alliés/Adversaires) — `minmax(0, 1fr)` × 7 (PER-232) : colonnes
          égales qui rétrécissent SANS jamais déborder leur conteneur, même très étroit (colonne
          d'écran MJ mobile). Le détail au survol et l'agrandissement du chiffre restent réservés
          à la fiche (`AbilitiesGrid`). */}
      <AbilityCompactGrid abilities={character.abilities} />
    </Stack>
  );
}

/** Côté d'un carré de la micro-grille des voies, en pixels. */
const PATH_CELL_SIZE = 6;

/**
 * Aperçu visuel très simplifié des voies : une micro-grille resserrée de 7
 * colonnes (voies possibles) × 5 lignes (rangs). Un carré est plein quand le
 * rang correspondant est débloqué (rempli du bas vers le haut) et reprend alors
 * la couleur de sa voie (profil, peuple, mage, prestige) ; vide sinon. Les
 * colonnes sans voie (personnage ayant moins de 7 voies) restent entièrement
 * vides. Compacte et détachée des badges de carac : pas de lien à y voir.
 */
function PathsMiniGrid({ character }: { character: Character }) {
  const columns = pathColumns(character);
  return (
    <Box sx={{ flexShrink: 0, display: 'flex', gap: '2px' }}>
      {Array.from({ length: PATH_COLUMN_COUNT }, (_, columnIndex) => {
        const column = columns[columnIndex];
        return (
          <Box
            key={columnIndex}
            title={column?.name}
            // Rang 1 en HAUT, remplissage vers le bas — comme la vue en colonnes de
            // « Voies & Capacités » (qui commence par le rang le plus haut en tête).
            sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
          >
            {Array.from({ length: PATH_RANK_COUNT }, (_, rankIndex) => {
              const color = column?.rankColors[rankIndex];
              return (
                <Box
                  key={rankIndex}
                  sx={{
                    width: PATH_CELL_SIZE,
                    height: PATH_CELL_SIZE,
                    borderRadius: '1px',
                    // `background` (pas `bgcolor`) : la valeur peut être une couleur unie OU un dégradé
                    // (carrés de prestige, PER-74).
                    background: color ?? 'transparent',
                    border: color ? 'none' : '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                />
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}

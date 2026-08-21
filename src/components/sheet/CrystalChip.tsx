'use client';

/**
 * Puce d'un CRISTAL de la Voie des cristaux (PER-360, prestige mage p. 156), pour les détails de
 * calcul (« breakdown ») des caractéristiques et des stats dérivées.
 *
 * Dérivée de la puce de capacité de PRESTIGE (`CapabilityChip`, branche `isPrestige`) : même liseré
 * métallique tournant, même teinte de famille mage — un cristal est un bonus de voie de prestige,
 * il doit se lire comme tel. Deux différences : l'icône est une gemme (game-icons), et l'info-bulle
 * dit D'OÙ vient le bonus, ce qu'aucune puce de capacité n'a à faire — un cristal peut avoir été
 * fabriqué par n'importe quel mage de la table, et sa ligne se noyait jusqu'ici dans un
 * « Capacités / divers » muet.
 *
 * Le nom du JOUEUR qui l'a confié (`castBy`, figé à la pose de l'état, jamais le nom du personnage)
 * est la seule identité disponible côté porteur : sa fiche ne sait résoudre ni une clé de combattant
 * ni un id de joueur.
 */
import Box from '@mui/material/Box';
import { darken, lighten, type SxProps, type Theme } from '@mui/material/styles';
import { crystalById, crystalLabel } from '@/data/crystals';
import { prestigeCategoryColor } from '@/lib/ui/classColors';
import { crystalCodexHref } from '@/lib/ui/codex';
import { PRESTIGE_GRADIENT_STOPS } from '@/lib/ui/prestigeStyle';
import { AppTooltip } from '@/components/AppTooltip';
import { ItemIcon } from '@/components/ItemIcon';
import { SourceRef } from '@/components/SourceRef';

/** Page de la Voie des cristaux dans le livre de base. */
const CRYSTAL_PAGE = 156;

export function CrystalChip({
  crystalId,
  castBy,
  sx,
}: {
  crystalId: string;
  /** Joueur qui a confié le cristal. Absent = le personnage le porte de son propre chef. */
  castBy?: string;
  sx?: SxProps<Theme>;
}) {
  const crystal = crystalById.get(crystalId);
  if (!crystal) return <>{crystalId}</>;
  const tint = prestigeCategoryColor('mage');
  const title = (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box component="span" sx={{ fontWeight: 700 }}>
          Voie des cristaux
        </Box>
        <SourceRef page={CRYSTAL_PAGE} term={crystalLabel(crystal)} codexHref={crystalCodexHref(crystal.id)} />
      </Box>
      <Box>{crystal.effectText}</Box>
      <Box sx={{ mt: 0.5, fontStyle: 'italic' }}>
        {castBy ? `Cristal confié par ${castBy}.` : 'Cristal fabriqué et porté par le personnage.'}
      </Box>
    </Box>
  );
  return (
    <AppTooltip title={title}>
      <Box
        component="span"
        data-glossary-shot="CrystalChip"
        sx={[
          {
            position: 'relative',
            display: 'inline-flex',
            verticalAlign: 'baseline',
            alignItems: 'center',
            // Rayons ext./int. explicites en px : l'écart (6 − 5 = 1) donne un liseré uniforme de 1px.
            borderRadius: '6px',
            overflow: 'hidden',
            p: '1px',
            mx: 0.2,
            isolation: 'isolate',
            cursor: 'help',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '220%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              background: `conic-gradient(from 0deg, ${PRESTIGE_GRADIENT_STOPS})`,
              animation: 'crystalChipSpin 12s linear infinite',
              zIndex: 0,
            },
            '@keyframes crystalChipSpin': {
              to: { transform: 'translate(-50%, -50%) rotate(360deg)' },
            },
            '@media (prefers-reduced-motion: reduce)': { '&::before': { animation: 'none' } },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <Box
          component="span"
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.35,
            px: 0.6,
            borderRadius: '5px',
            fontWeight: 700,
            fontSize: '0.95em',
            lineHeight: 1.4,
            color: lighten(tint, 0.6),
            bgcolor: darken(tint, 0.78),
            textShadow: '0 1px 1.5px rgba(0, 0, 0, 0.45)',
            '& svg': { filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4))' },
          }}
        >
          <ItemIcon id="gems" size={14} color="currentColor" />
          {crystalLabel(crystal)}
        </Box>
      </Box>
    </AppTooltip>
  );
}

'use client';

import CheckroomIcon from '@mui/icons-material/Checkroom';
import PanToolIcon from '@mui/icons-material/PanTool';
import ShieldIcon from '@mui/icons-material/Shield';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { equipmentById } from '@/data';
import { equipConflicts } from '@/lib/character/equipment';
import type { EquipmentLine, EquipSlot, WeaponGrip, WornState } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { AppAlert } from '@/components/AppAlert';

/** Icône d'un emplacement de port (armure, bouclier, main). */
function slotIcon(slot: EquipSlot, size = 16) {
  switch (slot) {
    case 'armor':
      return <CheckroomIcon sx={{ fontSize: size }} />;
    case 'shield':
      return <ShieldIcon sx={{ fontSize: size }} />;
    case 'mainHand':
    case 'offHand':
      return <PanToolIcon sx={{ fontSize: size }} />;
  }
}

/** Libellé court d'un emplacement de port (français). */
function slotLabel(worn: WornState): string {
  switch (worn.slot) {
    case 'armor':
      return 'Armure portée';
    case 'shield':
      return 'Bouclier porté';
    case 'mainHand':
      return worn.grip === 'twoHands' ? 'En main (à deux mains)' : 'Main principale';
    case 'offHand':
      return 'Main secondaire';
  }
}

/**
 * Badge « équipé » custom (≠ Chip MUI) : petite pastille teintée montrant l'emplacement
 * de port d'un objet. Sert à distinguer visuellement le porté du rangé en LECTURE
 * (quand aucun contrôle d'équipement n'est disponible — ex. fiche d'un autre joueur).
 */
export function WornBadge({ worn }: { worn: WornState }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        height: 22,
        borderRadius: 1,
        fontSize: '0.72rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: theme.palette.success.main,
        bgcolor: alpha(theme.palette.success.main, 0.12),
        border: `1px solid ${alpha(theme.palette.success.main, 0.45)}`,
      })}
    >
      {slotIcon(worn.slot, 14)}
      {slotLabel(worn)}
    </Box>
  );
}

/**
 * Contrôles d'équipement/déséquipement d'UNE ligne du catalogue (PER-77) :
 *  - armure / bouclier : un interrupteur « Équiper » (au plus un porté — le cumul
 *    est SIGNALÉ, pas empêché, cf. `equipConflicts`) ;
 *  - arme : choix de la main (principale / secondaire, une seule pour une arme
 *    intrinsèquement à deux mains) + choix de la prise (1 / 2 mains) pour une arme
 *    « à une ou deux mains ». Un nouveau clic sur l'état actif déséquipe.
 *
 * Les objets personnalisés (hors catalogue) et le matériel (`gear`) n'ont pas de
 * contrôle : le moteur ne connaît pas leurs statistiques. Rien n'est rendu pour eux.
 */
export function WornControls({
  line,
  onWear,
}: {
  line: EquipmentLine;
  onWear: (worn: WornState | undefined) => void;
}) {
  const item = isCustomItem(line) ? null : equipmentById.get(line.itemId);
  if (!item) return null;

  if (item.category === 'armor' || item.category === 'shield') {
    const slot: EquipSlot = item.category;
    const worn = !!line.worn;
    return (
      <ToggleButton
        value="worn"
        selected={worn}
        color="success"
        size="small"
        onChange={() => onWear(worn ? undefined : { slot })}
        sx={{ py: 0.25, px: 1, textTransform: 'none', gap: 0.5 }}
      >
        {slotIcon(slot)}
        {worn ? 'Équipé' : 'Équiper'}
      </ToggleButton>
    );
  }

  if (item.category === 'weapon') {
    const intrinsicTwoHands = item.weaponCategory === 'twoHands';
    const canChooseGrip = item.weaponCategory === 'oneOrTwoHands';
    const slot = line.worn?.slot ?? null;
    const grip: WeaponGrip = line.worn?.grip === 'twoHands' ? 'twoHands' : 'oneHand';

    const setSlot = (next: EquipSlot | null) => {
      if (next === 'mainHand') onWear({ slot: 'mainHand', ...(canChooseGrip ? { grip } : {}) });
      else if (next === 'offHand') onWear({ slot: 'offHand' });
      else onWear(undefined);
    };

    return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={slot}
          color="success"
          onChange={(_, next: EquipSlot | null) => setSlot(next)}
        >
          <ToggleButton value="mainHand" sx={{ py: 0.25, px: 1, textTransform: 'none', gap: 0.5 }}>
            {slotIcon('mainHand')}
            {intrinsicTwoHands ? 'En main' : 'Main principale'}
          </ToggleButton>
          {/* Pas de main secondaire pour une arme intrinsèquement à deux mains (elle prend les deux). */}
          {!intrinsicTwoHands && (
            <ToggleButton value="offHand" sx={{ py: 0.25, px: 1, textTransform: 'none', gap: 0.5 }}>
              {slotIcon('offHand')}
              Main secondaire
            </ToggleButton>
          )}
        </ToggleButtonGroup>

        {/* Choix de la prise : uniquement pour une arme « à une ou deux mains » tenue en main principale. */}
        {canChooseGrip && slot === 'mainHand' && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={grip}
            onChange={(_, g: WeaponGrip | null) => {
              if (g) onWear({ slot: 'mainHand', grip: g });
            }}
          >
            <ToggleButton value="oneHand" sx={{ py: 0.25, px: 1, textTransform: 'none' }}>
              1 main
            </ToggleButton>
            <ToggleButton value="twoHands" sx={{ py: 0.25, px: 1, textTransform: 'none' }}>
              2 mains
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
    );
  }

  return null;
}

/**
 * Alerte non bloquante listant les conflits de port DURS d'une liste d'équipement
 * (PER-77) : bouclier + arme à deux mains, plusieurs armures ou plusieurs boucliers
 * portés. Le combat à deux armes reste légal et n'apparaît pas ici. `null` si aucun
 * conflit. Partagée par la fiche, l'étape équipement du wizard et le récapitulatif.
 */
export function EquipConflictsAlert({ equipment }: { equipment: EquipmentLine[] }) {
  const conflicts = equipConflicts(equipment);
  if (conflicts.length === 0) return null;
  return (
    <AppAlert severity="warning" title="Chargement incohérent">
      <Stack component="ul" sx={{ m: 0, pl: 2 }} spacing={0.25}>
        {conflicts.map((c) => (
          <Typography key={c.kind} component="li" variant="body2">
            {c.message}
          </Typography>
        ))}
      </Stack>
    </AppAlert>
  );
}

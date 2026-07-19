'use client';

import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import PanToolIcon from '@mui/icons-material/PanTool';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { equipmentById } from '@/data';
import type { Weapon } from '@/data/schema';
import { equipConflicts } from '@/lib/character/equipment';
import { isWeaponMastered } from '@/lib/character/mastery';
import { rulesContext } from '@/lib/character/rulesContext';
import type { EquipmentLine, EquipSlot, WeaponGrip, WornState } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import type { WeaponAffinity } from '@/lib/character/weaponAffinity';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { PageRefText } from '@/components/SourceRef';

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
            {/* Références de page (« (p. 188) ») parsées en puce de source (notion globale). */}
            <PageRefText>{c.message}</PageRefText>
          </Typography>
        ))}
      </Stack>
    </AppAlert>
  );
}

/**
 * Résout une ligne d'équipement en l'arme du catalogue TENUE EN MAIN et NON maîtrisée
 * (→ dé malus en attaque, p. 177). Retourne l'arme concernée, ou `null` si la ligne
 * n'est pas une arme du catalogue en main principale/secondaire, ou si elle est
 * maîtrisée. Base commune du badge par ligne et de l'alerte agrégée.
 */
function unmasteredWornWeapon(
  line: EquipmentLine,
  masteredIds: Set<string>,
  firearmsAllowed: boolean,
  sacredWeaponIds?: ReadonlySet<string>,
): Weapon | null {
  if (isCustomItem(line) || !line.worn) return null;
  if (line.worn.slot !== 'mainHand' && line.worn.slot !== 'offHand') return null;
  const item = equipmentById.get(line.itemId);
  if (!item || item.category !== 'weapon') return null;
  return isWeaponMastered(item, masteredIds, rulesContext, firearmsAllowed, sacredWeaponIds)
    ? null
    : item;
}

/**
 * Info-bulle commune du dé malus : verbatim de la règle + mécanique + sources. Les
 * références de page sont parsées en puce de source (`PageRefText`, notion globale).
 */
const MASTERY_TOOLTIP = (
  <>
    <strong>Arme non maîtrisée</strong> — dé malus en attaque.
    <br />
    <PageRefText>
      « Utiliser une arme sans la maîtriser impose un dé malus en attaque. » (p. 177)
    </PageRefText>
    <br />
    <PageRefText>
      « Dé malus : lancez un d20 supplémentaire et gardez le plus faible résultat. » (p. 200)
    </PageRefText>
  </>
);

/**
 * Badge consultatif (PER-79) posé sur une arme EN MAIN non maîtrisée par le
 * personnage : rappelle qu'elle impose un dé malus en attaque (p. 177). Pastille
 * custom en tonalité « warning » (≠ Chip MUI), info-bulle citant la règle verbatim et
 * ses sources. `null` pour tout ce qui n'est pas une arme en main non maîtrisée — le
 * moteur SIGNALE, il ne résout aucun jet (dés lancés à la vraie table).
 */
export function WeaponMasteryBadge({
  line,
  masteredIds,
  firearmsAllowed,
  sacredWeaponIds,
}: {
  line: EquipmentLine;
  masteredIds: Set<string>;
  firearmsAllowed: boolean;
  /** Armes maîtrisées par exception (arme sacrée du prêtre spécialiste, PER-96). */
  sacredWeaponIds?: ReadonlySet<string>;
}) {
  if (!unmasteredWornWeapon(line, masteredIds, firearmsAllowed, sacredWeaponIds)) return null;
  return (
    <Box sx={{ mt: 0.5 }}>
      <AppTooltip title={MASTERY_TOOLTIP}>
        <Box
          component="span"
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
            cursor: 'help',
            color: theme.palette.warning.main,
            bgcolor: alpha(theme.palette.warning.main, 0.12),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
          })}
        >
          <ReportProblemOutlinedIcon sx={{ fontSize: 14 }} />
          Non maîtrisée · dé malus
        </Box>
      </AppTooltip>
    </Box>
  );
}

/**
 * Badge(s) POSITIF(s) d'affinité d'arme (PER-218) : pendant du badge « Non maîtrisée ·
 * dé malus », posé sur une arme de l'inventaire qui est SPÉCIALE pour le personnage
 * (aujourd'hui : arme sacrée d'un prêtre spécialiste, cf. `weaponAffinities`). Un
 * bloc custom en teinte « success » par affinité, info-bulle citant la règle verbatim
 * + puce de source. `null` si aucune affinité (cas le plus courant).
 */
export function WeaponAffinityBadge({ affinities }: { affinities: WeaponAffinity[] }) {
  if (affinities.length === 0) return null;
  return (
    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
      {affinities.map((affinity) => (
        <AppTooltip key={affinity.kind} title={<PageRefText>{affinity.tooltip}</PageRefText>}>
          <Box
            component="span"
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
              cursor: 'help',
              color: theme.palette.success.main,
              bgcolor: alpha(theme.palette.success.main, 0.12),
              border: `1px solid ${alpha(theme.palette.success.main, 0.45)}`,
            })}
          >
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />
            {affinity.label}
          </Box>
        </AppTooltip>
      ))}
    </Stack>
  );
}

/**
 * Alerte non bloquante agrégée (PER-79) listant les armes EN MAIN non maîtrisées d'une
 * liste d'équipement (→ dé malus en attaque, p. 177). Utilisée sur le récapitulatif du
 * wizard. `null` si aucune. `masteredIds` = profils maîtrisés (`masteredClassIds`),
 * `firearmsAllowed` = autorisation EFFECTIVE des armes à feu.
 */
export function WeaponMasteryAlert({
  equipment,
  masteredIds,
  firearmsAllowed,
  sacredWeaponIds,
}: {
  equipment: EquipmentLine[];
  masteredIds: Set<string>;
  firearmsAllowed: boolean;
  /** Armes maîtrisées par exception (arme sacrée du prêtre spécialiste, PER-96). */
  sacredWeaponIds?: ReadonlySet<string>;
}) {
  const unmastered = equipment
    .map((line) => unmasteredWornWeapon(line, masteredIds, firearmsAllowed, sacredWeaponIds))
    .filter((w): w is Weapon => w !== null);
  if (unmastered.length === 0) return null;
  return (
    <AppAlert severity="warning" title="Arme non maîtrisée">
      <Stack component="ul" sx={{ m: 0, pl: 2 }} spacing={0.25}>
        {unmastered.map((w) => (
          <Typography key={w.id} component="li" variant="body2">
            <PageRefText>{`« ${w.name} » : arme non maîtrisée → dé malus en attaque (p. 177).`}</PageRefText>
          </Typography>
        ))}
      </Stack>
    </AppAlert>
  );
}

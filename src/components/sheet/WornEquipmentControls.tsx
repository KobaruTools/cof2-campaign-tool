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
import type { TwoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { rulesContext } from '@/lib/character/rulesContext';
import type { EquipmentLine, EquipSlot, WornState } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import type { WeaponAffinity } from '@/lib/character/weaponAffinity';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { PageRefText } from '@/components/SourceRef';

/**
 * Position d'UNE arme dans les mains (PER-219), telle qu'exposée par les boutons :
 * main principale (à une main), main secondaire, ou les deux mains. Encode à la fois
 * l'emplacement et la prise, pour n'avoir qu'un seul groupe de boutons.
 */
type WeaponPosition = 'mainHand' | 'offHand' | 'twoHands';

/** Icône d'un emplacement de port (armure, bouclier, main, accessoire). */
function slotIcon(slot: EquipSlot, size = 16) {
  switch (slot) {
    case 'armor':
      return <CheckroomIcon sx={{ fontSize: size }} />;
    case 'shield':
      return <ShieldIcon sx={{ fontSize: size }} />;
    case 'mainHand':
    case 'offHand':
      return <PanToolIcon sx={{ fontSize: size }} />;
    case 'accessory':
      return <AutoAwesomeOutlinedIcon sx={{ fontSize: size }} />;
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
    case 'accessory':
      return 'Accessoire équipé';
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
 * statistiques mondaines connues du moteur, mais peuvent être équipés comme ACCESSOIRE
 * (bottes, cape, anneau…) : un simple bouton « Équiper » (slot `accessory`, non
 * exclusif) sert de support à un éventuel bonus de DEF magique (`magicDef`, PER-85).
 */
export function WornControls({
  line,
  onWear,
}: {
  line: EquipmentLine;
  onWear: (worn: WornState | undefined) => void;
}) {
  const custom = isCustomItem(line);
  const item = custom ? null : equipmentById.get(line.itemId);
  // Ligne de catalogue introuvable (id inconnu) : aucun contrôle fiable.
  if (!custom && !item) return null;

  if (item && (item.category === 'armor' || item.category === 'shield')) {
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

  if (item && item.category === 'weapon') {
    const intrinsicTwoHands = item.weaponCategory === 'twoHands';
    const canChooseGrip = item.weaponCategory === 'oneOrTwoHands';

    // Position combinée de l'arme (PER-219) : « main principale » et « deux mains » sont
    // désormais deux boutons frères (pour une arme « à une ou deux mains »), au lieu d'un
    // choix de prise séparé. Une arme intrinsèquement à deux mains n'expose QUE « Deux mains ».
    const position: WeaponPosition | null = !line.worn
      ? null
      : line.worn.slot === 'offHand'
        ? 'offHand'
        : line.worn.slot === 'mainHand'
          ? intrinsicTwoHands || line.worn.grip === 'twoHands'
            ? 'twoHands'
            : 'mainHand'
          : null;

    // Un objet « à une ou deux mains » porte une prise explicite ; les autres armes
    // (une main / légère / intrinsèquement deux mains) n'en ont pas besoin.
    const mainHandWorn = (): WornState =>
      canChooseGrip ? { slot: 'mainHand', grip: 'oneHand' } : { slot: 'mainHand' };
    const twoHandsWorn = (): WornState =>
      canChooseGrip ? { slot: 'mainHand', grip: 'twoHands' } : { slot: 'mainHand' };

    const setPosition = (next: WeaponPosition | null) => {
      if (next === 'mainHand') onWear(mainHandWorn());
      else if (next === 'offHand') onWear({ slot: 'offHand' });
      else if (next === 'twoHands') onWear(twoHandsWorn());
      else onWear(undefined);
    };

    return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={position}
          color="success"
          onChange={(_, next: WeaponPosition | null) => setPosition(next)}
        >
          {/* Une arme intrinsèquement à deux mains n'a ni main principale ni secondaire. */}
          {!intrinsicTwoHands && (
            <ToggleButton value="mainHand" sx={{ py: 0.25, px: 1, textTransform: 'none', gap: 0.5 }}>
              {slotIcon('mainHand')}
              Main principale
            </ToggleButton>
          )}
          {!intrinsicTwoHands && (
            <ToggleButton value="offHand" sx={{ py: 0.25, px: 1, textTransform: 'none', gap: 0.5 }}>
              {slotIcon('offHand')}
              Main secondaire
            </ToggleButton>
          )}
          {/* « Deux mains » : proposé pour une arme à deux mains (intrinsèque ou « une ou deux
              mains »). L'équiper libère d'office la main secondaire et le bouclier (cf. setWornAt). */}
          {(intrinsicTwoHands || canChooseGrip) && (
            <ToggleButton value="twoHands" sx={{ py: 0.25, px: 1, textTransform: 'none', gap: 0.5 }}>
              {slotIcon('mainHand')}
              Deux mains
            </ToggleButton>
          )}
        </ToggleButtonGroup>
      </Stack>
    );
  }

  // Tout autre objet (matériel du catalogue OU objet libre) : équipable comme ACCESSOIRE
  // (slot non exclusif). Sert de support à un bonus de DEF magique ; n'occupe aucune main.
  const accessoryWorn = line.worn?.slot === 'accessory';
  return (
    <ToggleButton
      value="worn"
      selected={accessoryWorn}
      color="success"
      size="small"
      onChange={() => onWear(accessoryWorn ? undefined : { slot: 'accessory' })}
      sx={{ py: 0.25, px: 1, textTransform: 'none', gap: 0.5 }}
    >
      {slotIcon('accessory')}
      {accessoryWorn ? 'Équipé' : 'Équiper'}
    </ToggleButton>
  );
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

/**
 * Alerte non bloquante (PER-116) du combat à deux armes : tenir une arme dans CHAQUE
 * main impose un dé malus sur chacune des deux attaques (p. 215), sauf exemption
 * Combattant héroïque (option FOR + même arme dans la main secondaire, p. 73). Prend le
 * statut PRÉCALCULÉ (`twoWeaponCombatStatus`, qui a besoin du personnage pour lire le
 * choix FOR) pour rester présentationnelle, à l'image des résolveurs passés à la liste
 * d'équipement. `null` hors combat à deux armes. Le moteur SIGNALE, il ne résout aucun
 * jet (dés lancés à la vraie table). Utilisée sur le RÉCAPITULATIF du wizard (qui ne
 * détaille pas les armes ligne par ligne) ; la fiche pose plutôt le badge par arme
 * (`TwoWeaponPenaltyBadge`), comme l'indicateur de maîtrise (PER-79).
 */
export function TwoWeaponPenaltyAlert({ status }: { status: TwoWeaponCombatStatus }) {
  if (!status.dualWielding) return null;
  if (status.penaltyDie) {
    return (
      <AppAlert severity="warning" title="Combat à deux armes">
        <Typography variant="body2">
          <PageRefText>
            Une arme dans chaque main : chacune des deux attaques subit un dé malus au test
            d’attaque (p. 215).
          </PageRefText>
        </Typography>
      </AppAlert>
    );
  }
  // Exemption Combattant héroïque (option FOR) : même arme dans la main secondaire.
  return (
    <AppAlert severity="info" title="Combat à deux armes — sans dé malus">
      <Typography variant="body2">
        <PageRefText>
          Combattant héroïque (option FOR) : attaquer avec la même arme dans la main secondaire
          ne subit pas de dé malus (p. 73).
        </PageRefText>
      </Typography>
    </AppAlert>
  );
}

/** Info-bulle du dé malus de combat à deux armes : verbatim de la règle + mécanique. */
const TWO_WEAPON_PENALTY_TOOLTIP = (
  <>
    <strong>Combat à deux armes</strong> — dé malus en attaque.
    <br />
    <PageRefText>
      « Chacune des deux attaques subit un dé malus au test d’attaque. » (p. 215)
    </PageRefText>
    <br />
    <PageRefText>
      « Dé malus : lancez un d20 supplémentaire et gardez le plus faible résultat. » (p. 200)
    </PageRefText>
  </>
);

/** Info-bulle de l'exemption Combattant héroïque (option FOR). */
const TWO_WEAPON_EXEMPT_TOOLTIP = (
  <>
    <strong>Combattant héroïque</strong> (option FOR) — pas de dé malus.
    <br />
    <PageRefText>
      « …peut désormais attaquer avec la même arme dans la main secondaire sans subir de dé
      malus. » (p. 73)
    </PageRefText>
  </>
);

/**
 * Badge par arme (PER-116) posé sur une arme du catalogue TENUE EN MAIN (principale ou
 * secondaire) quand le personnage est en combat à deux armes : tonalité « warning »
 * « Deux armes · dé malus » (p. 215), ou « success » « Deux armes · sans dé malus »
 * quand l'exemption Combattant héroïque joue (p. 73). Prend le statut PRÉCALCULÉ
 * (`twoWeaponCombatStatus`, qui a besoin du personnage). `null` hors combat à deux
 * armes ou pour une ligne qui n'est pas une arme du catalogue en main. Pendant, sur
 * l'arme, de l'alerte agrégée `TwoWeaponPenaltyAlert` du wizard.
 */
export function TwoWeaponPenaltyBadge({
  line,
  status,
}: {
  line: EquipmentLine;
  status: TwoWeaponCombatStatus;
}) {
  if (!status.dualWielding || isCustomItem(line) || !line.worn) return null;
  if (line.worn.slot !== 'mainHand' && line.worn.slot !== 'offHand') return null;
  if (equipmentById.get(line.itemId)?.category !== 'weapon') return null;

  const exempt = !status.penaltyDie;
  const color = exempt ? 'success' : 'warning';
  return (
    <Box sx={{ mt: 0.5 }}>
      <AppTooltip title={exempt ? TWO_WEAPON_EXEMPT_TOOLTIP : TWO_WEAPON_PENALTY_TOOLTIP}>
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
            color: theme.palette[color].main,
            bgcolor: alpha(theme.palette[color].main, 0.12),
            border: `1px solid ${alpha(theme.palette[color].main, 0.45)}`,
          })}
        >
          {exempt ? (
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />
          ) : (
            <ReportProblemOutlinedIcon sx={{ fontSize: 14 }} />
          )}
          {exempt ? 'Deux armes · sans dé malus' : 'Deux armes · dé malus'}
        </Box>
      </AppTooltip>
    </Box>
  );
}

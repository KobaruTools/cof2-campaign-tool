import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { SvgIconComponent } from '@mui/icons-material';

import type { AbilityId } from '@/data/schema';

/**
 * Libellés français complets des caractéristiques, indexés par id court.
 * Source unique réutilisée par l'UI (badges, libellés, tooltips).
 */
export const ABILITY_NAMES: Record<AbilityId, string> = {
  AGI: 'Agilité',
  CON: 'Constitution',
  FOR: 'Force',
  PER: 'Perception',
  CHA: 'Charisme',
  INT: 'Intelligence',
  VOL: 'Volonté',
};

/**
 * Icône MUI illustrant chaque caractéristique — préoccupation purement UI,
 * centralisée ici avec les libellés pour rester sous la main partout (étape
 * Caractéristiques, récapitulatif, fiche…).
 */
export const ABILITY_ICONS: Record<AbilityId, SvgIconComponent> = {
  AGI: DirectionsRunIcon, // pied / course
  CON: AccessibilityNewIcon, // corps
  FOR: FitnessCenterIcon, // bras
  PER: VisibilityIcon, // œil
  CHA: RecordVoiceOverIcon, // bouche
  INT: PsychologyIcon, // cerveau
  VOL: SelfImprovementIcon, // maîtrise de soi
};

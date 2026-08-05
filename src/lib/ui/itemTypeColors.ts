import { alpha } from '@mui/material/styles';
import type { ItemType } from '@/lib/character/types';
import { desaturateColor } from '@/lib/ui/classColors';

/**
 * Couleurs d'accentuation par TYPE D'OBJET d'inventaire — préoccupation purement UI (aucune
 * règle CO2), sur le patron de `CLASS_COLORS`. Les catégories de l'inventaire groupé se
 * distinguaient uniquement par leur libellé (tout en `text.secondary`, même filet gris), ce qui
 * rendait la liste difficile à balayer : chaque section porte désormais sa teinte, sur son
 * en-tête ET en fond dégradé.
 *
 * Sept teintes franchement séparées en TON (rouge / bleu / turquoise / violet / vert / or / gris)
 * pour rester distinguables même très transparentes, et choisies lisibles sur fond sombre
 * (thème par défaut). Le sens guide le choix : chaud = ce qui blesse, froid = ce qui protège,
 * violet = les fioles, or = le butin, gris = le fourre-tout (volontairement discret).
 */
export const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  weapon: '#d05a4e', // rouge grenat — le combat
  armor: '#5c8ec4', // bleu acier — le métal froid
  shield: '#2f9e94', // turquoise sombre — protection, mais loin du bleu des armures
  consumable: '#a56ad0', // violet potion — fioles, élixirs, parchemins
  gear: '#86a34a', // vert olive — cordage, cuir, matériel de camp
  treasure: '#e0b12a', // or — or et gemmes
  misc: '#8b98a5', // gris ardoise — fourre-tout neutre
};

/** Teinte d'un type d'objet, avec repli neutre si le type est inconnu. */
export function itemTypeColor(type: ItemType): string {
  return ITEM_TYPE_COLORS[type] ?? ITEM_TYPE_COLORS.misc;
}

/**
 * Teinte de SECTION, un peu désaturée — même recette que `profileAccentGradient` (« moins
 * flashy », retour propriétaire) pour que l'inventaire reste dans la tonalité du reste de la
 * fiche. Source unique du filet d'en-tête et du fond dégradé.
 */
function sectionTint(type: ItemType): string {
  return desaturateColor(itemTypeColor(type), 0.3);
}

/** Filet sous l'en-tête d'une section d'inventaire, dans la teinte du type. */
export function itemTypeHeaderBorder(type: ItemType): string {
  return `2px solid ${alpha(sectionTint(type), 0.55)}`;
}

/**
 * Fond d'une SECTION d'inventaire : dégradé qui part de la teinte de l'en-tête (en haut) vers la
 * transparence (en bas), posé en `backgroundImage` par-dessus le fond du bloc. L'extinction suit
 * la HAUTEUR de la section (aucune distance fixe, retour propriétaire) : une section d'un objet
 * et une section de quinze objets se lisent pareil, le dégradé s'étirant avec le contenu.
 *
 * Reste assez transparent pour ne pas concurrencer les dégradés de profil déjà posés SUR les
 * lignes (`profileAccentGradient`) ni les états de port.
 */
export function itemTypeSectionGradient(type: ItemType): string {
  const tint = sectionTint(type);
  return `linear-gradient(to bottom, ${alpha(tint, 0.16)}, ${alpha(tint, 0)})`;
}

import type {
  AbilityId,
  CreatureCategory,
  CreatureNature,
  CreatureProfile,
  CreatureSize,
} from "@/data/schema";
import { ABILITY_IDS } from "@/data/schema";

/**
 * Libellés français d'affichage des énumérations de créatures (catégorie, taille,
 * nature). Clés = slugs de code (anglais/neutres), valeurs = texte montré au joueur.
 * Source unique réutilisée par le bestiaire (filtres + bloc de stats).
 */
export const CREATURE_CATEGORY_LABELS: Record<CreatureCategory, string> = {
  humanoides: "Humanoïdes",
  animaux: "Animaux",
  "creatures-fantastiques": "Créatures fantastiques",
};

/** Libellés des tailles (table p. 260). */
export const CREATURE_SIZE_LABELS: Record<CreatureSize, string> = {
  minuscule: "Minuscule",
  "tres-petite": "Très petite",
  petite: "Petite",
  moyenne: "Moyenne",
  grande: "Grande",
  enorme: "Énorme",
  colossale: "Colossale",
};

/** Libellés des natures/types de créature (p. 259-261). */
export const CREATURE_NATURE_LABELS: Record<CreatureNature, string> = {
  vivant: "Vivant",
  humanoide: "Humanoïde",
  vegetatif: "Végétatif",
  "non-vivant": "Non-vivant",
};

/**
 * Caractéristiques EFFECTIVES d'une créature (PER-175) pour l'affichage : fusionne les valeurs
 * FIXES (`abilities`) et celles DÉRIVÉES DU MAÎTRE (`abilitiesFromMaster` : delta sur la carac
 * homonyme du maître, ex. Minimoï p. 135). `undefined` si le profil n'a aucun bloc de
 * caractéristiques (écuyer, serviteur invisible). Sans caractéristiques de maître (aperçu du
 * wizard), une valeur dérivée retombe sur son seul delta (maître supposé à 0).
 */
export function resolveCreatureAbilities(
  profile: Pick<CreatureProfile, "abilities" | "abilitiesFromMaster">,
  masterAbilities?: Partial<Record<AbilityId, number>>,
): Record<AbilityId, number> | undefined {
  const { abilities, abilitiesFromMaster } = profile;
  if (!abilities && !abilitiesFromMaster) return undefined;
  const out = {} as Record<AbilityId, number>;
  for (const id of ABILITY_IDS) {
    if (abilitiesFromMaster && id in abilitiesFromMaster) {
      out[id] = (masterAbilities?.[id] ?? 0) + (abilitiesFromMaster[id] ?? 0);
    } else if (abilities && id in abilities) {
      out[id] = abilities[id]!;
    }
  }
  return out;
}

/**
 * Formate une valeur numérique de NC pour l'affichage : le demi se montre avec le
 * symbole « ½ » (U+00BD), les autres valeurs telles quelles. La donnée reste numérique
 * (`nc: 0.5`) pour permettre le tri ; seul l'affichage utilise le symbole.
 */
export function formatNc(nc: number): string {
  return nc === 0.5 ? "½" : String(nc);
}

/**
 * NC affichable d'une créature : la forme verbatim (`ncNote`, ex. « 1/2 », « 2 (3) »,
 * « +1 Niveau ») prime ; sinon la valeur numérique. Le « 1/2 » verbatim est rendu avec
 * le symbole « ½ ». `null` pour une entrée GABARIT que le livre imprime sans NC
 * (ex. « Zombie », p. 301).
 */
export function creatureNcLabel(creature: {
  nc?: number;
  ncNote?: string;
}): string | null {
  if (creature.ncNote) return creature.ncNote.replace("1/2", "½");
  if (creature.nc != null) return formatNc(creature.nc);
  return null;
}

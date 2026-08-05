/**
 * Notes d'affichage de la voie de l'écorcheur (PER-74, p. 150-151), pures et testables. Les DM/
 * pénalités décrits (saignement, riposte d'armure, guérison ralentie, DM sur attaque ratée) sont
 * subis par un TIERS (adversaire) ou portent sur SON état — hors périmètre du moteur (patron
 * « Riposte », cf. `flayerPath.recette.test.ts`). Ces notes sont donc purement informatives : un
 * rappel visuel (badge) sur la fiche, jamais un modificateur chiffré.
 */
import type { FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';

const R4 = 'prestige-ecorcheur-r4';
const R5 = 'prestige-ecorcheur-r5';
const R6 = 'prestige-ecorcheur-r6';
const R7 = 'prestige-ecorcheur-r7';
const R8 = 'prestige-ecorcheur-r8';

/**
 * Notes affichées sur la carte « Attaque au contact ». R4 (Armes dentelées) ne vaut que pour l'arme
 * (`weaponOnly`, p. 150 : « les armes et les lames du personnage ») ; R6 (Blessures affreuses) et R8
 * (Impitoyable) valent pour les DEUX modes (arme et mains nues, aucune restriction dans leur texte).
 */
export function flayerMeleeAttackNotes(featureIds: string[]): FeatureEffectNote[] {
  const notes: FeatureEffectNote[] = [];
  if (featureIds.includes(R4)) {
    notes.push({
      featureId: R4,
      icon: 'bleeding',
      label: 'Saignement',
      weaponOnly: true,
      reminder:
        "Une attaque réussie provoque un saignement : 1 DM par round (2 dès le rang 8), jusqu'à des soins ou un test d'AGI difficulté 10. Ne se cumule pas.",
    });
  }
  if (featureIds.includes(R6)) {
    notes.push({
      featureId: R6,
      icon: 'grievous-wounds',
      label: 'Blessures affreuses',
      reminder:
        'Les soins et la régénération guérissent deux fois moins vite les DM infligés en contact par ce personnage.',
    });
  }
  if (featureIds.includes(R8)) {
    notes.push({
      featureId: R8,
      icon: 'merciless',
      label: 'Impitoyable',
      reminder: "Une attaque ratée inflige quand même {1d4°} DM à la cible.",
    });
  }
  return notes;
}

/** Puce « Armure à pointes » (R5) pour la carte Défense — `null` si non acquise. */
export interface FlayerRetaliationBadge {
  /** Dé affiché : fixe avant le rang 7 de la voie, évolutif (° ) à partir de ce rang. */
  die: '1d4' | '1d4°';
}

export function flayerRetaliationBadge(featureIds: string[]): FlayerRetaliationBadge | null {
  if (!featureIds.includes(R5)) return null;
  return { die: featureIds.includes(R7) ? '1d4°' : '1d4' };
}

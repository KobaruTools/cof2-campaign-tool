---
status: accepted
---

# DM d'arme : modèle structuré (`WeaponDamage`), armes seules, chaîne conservée pour l'affichage et les autres porteurs

## Contexte

Les dégâts (DM) étaient partout des **chaînes de texte libre** (`"1d6"`, `"1d8/1d12"`, `"1d8+2"`). Quatre porteurs distincts en dépendaient, avec des grammaires différentes : le **catalogue d'armes** (`Weapon.damage`/`twoHandedDamage`), les **variantes persistées** créées par le joueur (`EquipmentOverrides.damage`/`twoHandedDamage`, PER-211/214), les **créatures/familiers** (`CreatureProfile.attack.damage`) et les **sorts/capacités**. Seules les armes/variantes sont saisies à la main (via `ItemDialog`) ; leur grammaire est fermée et régulière (nombre de dés × dé, `+N` plat des armes magiques, marqueur non létal `(…)`). Les créatures et sorts sont écrits en dur dans `src/data/` et emploient une grammaire irrégulière (`°` évolutif, `+ carac`, crochets de résolution `[…]`).

## Décision

Introduire un modèle structuré **pour les armes/équipement uniquement** :

```ts
export type DamageDie = Die | 'd3';           // Die = d4…d20 (jeu d'icônes) + d3 sans icône
export interface WeaponDamage {
  count: number;        // nombre de dés (≥ 1)
  die: DamageDie;
  modifier?: number;    // + N plat (armes magiques : 1d8+2) ; jamais une carac
  nonLethal?: boolean;  // DM temporaires/non létaux, affichés « (…) » (gourdin, mains nues)
}
```

- `Weapon.damage`/`twoHandedDamage` et `EquipmentOverrides.damage`/`twoHandedDamage` passent de `string` à `WeaponDamage`. La variation une-main/deux-mains reste **deux champs** aiguillés par `WornState.grip` (pas de modélisation dans `WeaponDamage`).
- **`d3` fait partie du modèle** (`DamageDie`), rendu sans icône (label texte) — pas d'échappatoire chaîne.
- **`°` évolutif exclu** (aucune arme n'en porte) ; extension additive possible plus tard.
- **Créatures et sorts restent en chaîne**, non touchés.
- **`DamageValue` reste inchangé** (prend une chaîne) : c'est la surface d'affichage commune. Les armes formatent `WeaponDamage → string` via `formatWeaponDamage()` au point d'affichage. Les bénéfices du modèle portent sur la donnée (saisie guidée, raisonnement sur les dés), pas sur le rendu.
- **Migration v17 → v18** : parser de migration (usage unique, gelé, testé) convertissant `EquipmentOverrides.damage`/`twoHandedDamage`. Le catalogue `equipment.ts` (code source) est réécrit à la main en littéraux structurés — pas de migration.

## Conséquences

- La saisie dans `ItemDialog` devient guidée (champ nombre + sélecteur de dé + bonus + case « non létal »), sans formule tapée à la main.
- Chaîne non parsable en migration → **on retire la surcharge** (`delete`), la ligne retombe sur le DM structuré de l'arme de base ; le nom et les autres surcharges de la variante survivent. `console.warn` en dev. Cas jugé vide en données réelles (app privée, seul le proprio crée des variantes).
- Asymétrie assumée : armes structurées, créatures/sorts en chaîne. `DamageValue` masque la couture à l'affichage.

## Alternatives rejetées

- **Tout basculer (sorts + créatures compris)** : aucune ergonomie de saisie gagnée (données figées), grammaire irrégulière à absorber (`°`, carac, crochets), coût et risque de migration bien supérieurs pour zéro bénéfice immédiat.
- **Filet texte permanent** (`WeaponDamage | { raw: string }`) pour les valeurs non parsables : pollue durablement le type pour un cas vide ; on préfère écraser vers la base.
- **`DamageValue` en union `string | WeaponDamage`** : touche le composant partagé par les créatures/sorts sans gain réel ; le formatage au point d'appel garde la surface d'affichage intacte.

# J2 — Extraction exhaustive : dossier de relecture

**À valider par le propriétaire avant de construire le moteur (J3) et l'UI.**
Source unique : `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf` (livre de base CO2).
Méthode : lecture page à page (images rendues en PNG), textes en verbatim,
chaque entité porte sa `sourcePage`. Le Compagnon n'a jamais été ouvert.

## Ce qui a été produit

| Domaine | Fichier | Contenu |
|---|---|---|
| Schéma | `src/data/schema.ts` | Types des entités (J1, ajusté) |
| Familles | `src/data/familles.ts` | 4 familles (PV, dé de récup., bonus) |
| Séries de valeurs | `src/data/series.ts` | 3 séries (Polyvalent/Expert/Spécialiste) |
| Progression | `src/data/progression.ts` | Coûts, niveaux requis, dés évolutifs, sac |
| Idéaux/Travers | `src/data/ideaux-travers.ts` | Table d20 (p. 33) |
| Peuples | `src/data/peuples.ts` | 8 peuples + modificateurs + repères |
| Voies de peuple | `src/data/voies-peuples.ts` | 7 voies + voie du mage + 40 capacités |
| Aventuriers | `src/data/profils/aventuriers.ts` | 4 profils, 20 voies, 100 capacités |
| Combattants | `src/data/profils/combattants.ts` | 3 profils, 15 voies, 75 capacités |
| Mages | `src/data/profils/mages.ts` | 4 profils, 20 voies, 100 capacités |
| Mystiques | `src/data/profils/mystiques.ts` | 3 profils, 15 voies, 75 capacités |
| Prestige 1/2 | `src/data/voies-prestige/partie1.ts` | Génériques + aventurier (17 voies) |
| Prestige 2/2 | `src/data/voies-prestige/partie2.ts` | Combattant/mage/mystique (37 voies) |
| Équipement | `src/data/equipement.ts` | 35 armes, 7 armures, 2 boucliers, 48 matériel |
| Agrégat | `src/data/index.ts` | Collections plates + index par id |

**Totaux (rapportés par `scripts/validate-data.ts`)** : 8 peuples · 14 profils ·
132 voies (70 profil + 7 peuple + voie du mage + 54 prestige) · 660 capacités
(dont 198 sorts) · 92 objets d'équipement.

**Notes de règles pour le moteur (J3)**, dans `docs/extraction/` :
`creation-progression.md`, `peuples-notes.md`, `hybrides.md`, `magie.md`,
`voies-prestige-regles.md`, `sorts-index.md` (croisement index des sorts).

## Validation automatique

- `npx tsc --noEmit` : **OK** (tout compile contre le schéma).
- `npx tsx scripts/validate-data.ts` : **0 erreur bloquante**. Intégrité
  référentielle vérifiée (voies↔capacités, profils→voies, peuples→voies,
  capacités→équipement). 2 avertissements, tous deux = anomalies réelles du
  livre (voir ci-dessous).

## Points qui demandent ton œil (par ordre d'importance)

1. ~~Niveau maximum jouable~~ **→ TRANCHÉ (2026-06-12).** `niveauMax: 20` est
   conservé comme **plafond souple** ; CO2 n'impose pas de niveau max strict.
   Le moteur traitera cette valeur comme une borne d'UI, pas comme une règle.

2. **Anomalies du livre conservées telles quelles** (signalées en avertissement) :
   - *Voie de prestige du familier fantastique* : sa 1re capacité est au **rang 3**
     (p. 132), alors que l'intro annonce des rangs 4-8. Conservé verbatim.
   - *Voie de prestige de l'enchanteur* (p. 157) : **une seule** capacité
     « Rangs 4 à 8 » au lieu de 5. Conservée telle quelle (titre forgé
     « Enchantement », le livre n'en donnant pas).
   - Détails des **12 familiers fantastiques** (statblocs p. 133-136) : non
     extraits comme entités (réservés à une itération si besoin).

3. ~~`caracsConseillees` vide~~ **→ RÉSOLU.** Les caractéristiques conseillées
   sont listées entre crochets dans le résumé des profils p. 24-25 (et non sur
   les pages de profil). Les 14 profils sont renseignés. Cas du druide : 3e
   place « CON ou AGI » → encodé `['PER','VOL','CON','AGI']` (le « ou » sera
   géré par le wizard).

4. **Objets de départ hors catalogue de prix** (`itemId: null`, libellé conservé) :
   grimoire de sorts (magicien/sorcier), instrument de musique (barde). Le bâton
   noueux du druide a été relié au `baton-ferre` (le livre dit « équivalent »).

5. **Restrictions d'armure (`armureMaxId`) déduites du texte** « peut porter
   jusqu'à… » : à confirmer profil par profil (notamment chevalier =
   `armure-de-plaques`, la plaque complète exigeant une capacité).

6. ~~Système prêtre / religions d'Osgild~~ **→ TRANCHÉ (2026-06-12) : HORS SCOPE
   phase 1.** Tables p. 126-127 (armes sacrées, capacités divines par dieu) non
   modélisées ; le prêtre reste jouable via ses voies normales. Reporté et
   consigné dans le PRD (§4, encadré « à ne pas oublier ») pour ne pas l'oublier.

7. **Coquilles du livre** rencontrées et conservées verbatim (ex. « DM se sa
   cible », « +1 en attaque lorsqu'il l'utilise une arme »). Marquées localement.

## Comment relire efficacement

- Les fichiers `src/data/profils/*.ts` et `voies-prestige/*.ts` sont ordonnés
  comme le livre ; chaque capacité a sa `sourcePage` → ouvrir la page en regard.
- Pour douter d'un sort : `docs/extraction/sorts-index.md` croise l'index p. 343.
- Signale-moi toute correction ; je peux régénérer un fichier ciblé sans toucher
  aux autres.

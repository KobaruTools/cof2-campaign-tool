# Repos & récupération (CO2 — livre de base)

Extraction pour PER-151. Toutes les règles proviennent de `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf` avec la page imprimée en source.

## Dés de récupération (DR) — p. 30

- Au niveau 1 : **`2 + CON` DR**, type selon la famille :
  - Aventuriers : **d8** · Combattants : **d10** · Mages : **d6** · Mystiques : **d8**
  - Les **mystiques** reçoivent **+1 DR** à la création (`3 + CON`).
- `CON ≤ -2` → 0 DR : ne peut régénérer ses PV que par récupération **complète** (pas de rapide).
- Deux modes de récupération : **rapide** (dépense de DR) et **complète** (repos long).

## Dégâts temporaires — p. 219-220

- Verbatim (p. 220) : « Une créature élimine 1 DM temporaire subi par minute. »
- Comptabilisés à part des PV (p. 219). → Après quelques minutes de repos, **tous les DM temporaires sont récupérés** (donc pleins dès une récupération rapide de 30 min).

## Récupération rapide = « repos court » — p. 221

- Pause de **30 min**.
- Verbatim : « le personnage peut utiliser un dé de récupération (DR) pour restaurer ses PV. Il jette le dé et récupère **`[1 DR + ½ Niveau]` PV** ; en contrepartie, son nombre de DR est réduit de 1. » (répétable tant qu'il reste des DR)
- Un PJ sans DR ne peut restaurer ses PV que par récupération complète.
- **Ne rend pas** les DR dépensés, **ni** le mana.
- Réinitialise les capacités de fréquence « **une fois par combat** ».

## Récupération complète = « repos long » — p. 221-222

- Période de **8 h** sans activité, conditions optimales (sinon test de CON difficulté 10-20).
- **Une seule par jour.**
- Verbatim (p. 222) : « À la fin d'une récupération complète, un personnage gagne **1 DR**, sans pouvoir dépasser son maximum (`2 + CON`). S'il le souhaite, il peut immédiatement choisir d'utiliser ce DR pour restaurer des PV. Dans ce cas, le nombre de PV récupérés est automatiquement égal à la **valeur maximale du dé**. »
  - ⚠️ **Système d'attrition** : le repos long ne rend PAS tous les PV ni tous les DR — seulement **+1 DR** (utilisable aussitôt au max du dé).
- Réinitialise les capacités de fréquence « **une fois par jour** ».

## Récupérer les points de mana — p. 229

- Verbatim : « Une fois par jour, le personnage regagne **l'ensemble des PM dépensés** lorsqu'il termine une récupération complète (8 h). » (le MJ peut n'en rendre qu'une partie en cas de stress ; prêtre/druide : conditionné au respect du dogme.)
- → Mana **entièrement restauré** au repos long ; **pas** au repos court.

## Synthèse : ce que restaure chaque repos

| Jauge | Repos court (30 min) | Repos long (8 h) |
|---|---|---|
| Dégâts temporaires | pleins (régén 1/min) | pleins |
| PV (létaux) | via dépense de DR (`1d + ½ niv`), au choix | via le +1 DR gagné (max du dé), au choix |
| DR | — (non rendus) | **+1** (plafond `2 + CON`) |
| Mana | — | plein |
| Compteurs d'usages | « par combat » | « par jour » |

## Points à trancher pour l'implémentation (hors-livre / choix produit)

1. **PV au repos long** : suivre l'attrition du livre (+1 DR seulement) ou proposer un raccourci « repos long = PV pleins » plus confortable pour la table ?
2. **Dés de récupération** : PER-151 doit « suivre les DR ». Introduire le suivi des DR ici (`depletion.recoveryDice`) recoupe PER-156 (jauge DR). Faire le suivi maintenant ou attendre PER-156 ?
3. **Fréquence des compteurs d'usages** : les `usageCounter` n'ont pas de champ « par combat / par jour ». Sans cette métadonnée, on ne peut pas distinguer ce que réinitialise un repos court vs long. Options : ajouter une métadonnée de fréquence, ou réinitialiser tous les compteurs au repos long uniquement.

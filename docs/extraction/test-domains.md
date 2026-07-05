# Domaines de compétence — catalogue & suivi (PER-89)

Suivi de l'extraction des **domaines de compétence** (`src/data/test-domains.ts`) et des
effets `test-bonus` posés par famille. CO2 n'a **pas** de liste fermée : le livre donne des
exemples (p. 202) et autorise le MJ à inventer (`humain-r1`, p. 57). Ce catalogue est donc
**ouvert et vivant**, enrichi famille par famille.

## Règle du livre (p. 202-203)

Test = `d20 + caractéristique gouvernante + bonus de compétence`.

Le **bonus de compétence** ne s'additionne pas entre sources de **même type**. On retient
**un seul bonus par catégorie**, puis on **additionne** les catégories, plafonné à **+15** :

| Catégorie | Valeur | Cumul |
|---|---|---|
| Voie de profil / prestige (évolutif) | `2 + rang` (≤ +7, plafonné rang 5) | max d'une seule |
| Voie de peuple | +3 | max d'une seule |
| Voie de prestige (fixe) | +5 | max d'une seule |
| Objet magique | ~+5 | cumulable (hors périmètre PER-89) |

Catégorie **déduite de la voie hôte** (`Path.type` ; `mage` → peuple).

## Carac gouvernante — VALIDÉ propriétaire (2026-07-05)

Le livre ne classe pas les métiers/gagne-pain. Les cas ambigus ont été tranchés par le
propriétaire (note « VALIDÉ propriétaire » sur l'entrée du catalogue) :

| Domaine | Carac retenue | Alternative écartée | Source |
|---|---|---|---|
| `hunting` (chasser) | **PER** | AGI | humain-r1 p. 57 |
| `orientation` | **PER** | INT | humain-r1 p. 57 |
| `meteorology` (météorologie) | **PER** | INT | humain-r1 p. 57 |
| `navigation` | **INT** | PER | humain-r1 p. 57 |
| `commerce` | **CHA** | INT | humain-r1 p. 57 |
| `smithing` (forge) | **INT** | ~~FOR~~ | forgesort p. 99 |
| `goldsmithing` (orfèvrerie) | **INT** | FOR | forgesort p. 99 |
| `masonry` (maçonnerie) | **INT** | PER | nain-r1 p. 59 |
| `mining` (mines) | **INT** | PER | nain-r1 p. 59 |
| `disguise` (déguisement) | **CHA** | AGI | assassin-r1 p. 74 |
| `animal-training` (dressage) | **CHA** | PER | cavalier-r1 p. 83 |
| `concealment` (dissimulation d'objet) | **AGI**, domaine distinct | fondre dans discrétion | assassin-r1 p. 74 |

> `smithing` a basculé **FOR → INT** pour aligner les deux domaines de la paire
> « orfèvrerie ou forge » sur la même carac (savoir-faire du forgesort).

Domaines à carac **assurée** : tous les exemples p. 202 (regroupés par carac dans le livre),
les résistances physiques (CON), et les domaines INT explicites des mages (`tinkering`,
`science`, `alchemy`, `chemistry`, `occult-lore` — texte « test d'INT »).

**Carac MULTIPLE** (au choix selon la situation → meilleure retenue) : `riding` (équitation)
= **CON ou CHA** (CON pour l'endurance, CHA pour mener la monture — Marche forcée, p. 233).
C'est le seul cas relevé à ce stade ; d'autres domaines pourraient s'y ajouter.

## Récolte par famille

### Peuples — voie de l'humain (graine)
`humain-r1` « Diversité » (p. 57) — voie de peuple, +3 fixe. Domaines portés par les 6
origines (`FeatureChoiceOption.testBonusDomains`), 2 par origine :

| Origine | Domaines |
|---|---|
| Montagnard | `climbing`, `cold-resistance` |
| Citadin | `commerce`, `disease-resistance` |
| Campagnard | `meteorology`, `riding` |
| Riverain | `swimming`, `navigation` |
| Sauvage | `hunting`, `tracking` |
| Nomade | `orientation`, `heat-resistance` (ou `cold-resistance`) |

### Mages (graine — solde la dette PER-69)
Bonus à domaine nommé, **inconditionnels**, profil (`2 + rang`) :

| Capacité | Page | Domaines | Note |
|---|---|---|---|
| Ensorceleur — Injonction | 94 | `persuasion`, `seduction` | |
| Ensorceleur — Illusion | 95 | `deception` | queue floue « ou tout test pour mentir » → verbatim |
| Forgesort — Potion | 98 | `alchemy`, `chemistry` | queue « identifier une potion » → verbatim |
| Forgesort — Arme enflammée | 99 | `goldsmithing`, `smithing` | |
| Forgesort — Réflexion | 99 | `tinkering`, `science` | |
| Sorcier — Ténèbres | 110 | `occult-lore` | |

**Hors périmètre (verbatim, mages)** : « +5 à tous les tests physiques (FOR/AGI/CON) »
(sorcier, transformation — conditionnel) ; « +10 à tous les tests de PER » (vision —
conditionnel) ; tous les « dé bonus aux tests de [CARAC] » (→ `ability-bonus-die`).

### Reste à faire (mandaté dans les tickets aval)
- [x] `navigation` (riverain) : ajouté au catalogue, carac INT (VALIDÉ propriétaire 2026-07-05).
- [ ] Combattants → PER-72 · Mystiques → PER-70 · Aventuriers → PER-71 ·
      Voies de peuple (hors humain) → PER-73 · Voies de prestige → PER-74.
- [ ] PER-62 : tenir l'inventaire des capacités à domaine de test.

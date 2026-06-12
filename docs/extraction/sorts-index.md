# Croisement avec l'« Index des sorts par rang » (p. 343-347)

## Portée de l'index (encadré p. 343, verbatim)

> Cette liste a pour but de vous aider à créer les PNJ magiciens ou à retrouver
> rapidement un sort. Elle comprend tous les sorts de magie profane (famille des
> mages) plus les sorts de barde et certains sorts issus des voies de prestige de
> mystique qui peuvent convenir à des magiciens à haut niveau.

**Conséquence** : l'index est un sous-ensemble *curaté*. Il **exclut** les sorts
divins (prêtre, druide hors prestige) et ne reprend que *certains* sorts mystiques
de prestige. Il ne peut donc pas servir de compte total de tous les sorts du livre.

Le « rang » de l'index = **rang du sort** (niveau / coût en PM), à ne pas confondre
avec le rang de la capacité dans sa voie.

## Comptes déclarés par l'index

| Rang du sort | Sorts déclarés |
|---|---|
| 1 | 17 |
| 2 | 19 |
| 3 | 17 |
| 4 | 38 |
| 5 | 29 |
| 6 | 13 |
| 7 | 12 |
| 8 | 14 |
| **Total** | **159** |

## Comparaison avec les données extraites

- Capacités marquées `estSort: true` dans `src/data/` : **198**.
- Écart 198 vs 159 attendu et cohérent : nos 198 incluent **tous** les sorts
  (dont prêtre et druide, exclus de l'index), et comptent chaque occurrence
  par voie. L'index ne liste chaque sort profane/barde/mystique-prestige
  qu'une fois.

> Un croisement nom-par-nom exhaustif des 159 entrées reste à faire en relecture
> si le propriétaire le souhaite ; il n'a pas été mené intégralement ici.

## Sondages effectués (tous concluants)

| Sort (index) | Page idx | Voie / source (index) | Trouvé dans |
|---|---|---|---|
| Attaque sonore (A)* | 67 | Voie du musicien (Barde) | `profils/aventuriers.ts` |
| Arme élémentaire (A) ou (L)* | 104 | Voie de la magie élémentaire (Magicien) | `profils/mages.ts` |
| Sort illusoire (A)* | 95 | Voie des illusions (Ensorceleur) | `profils/mages.ts` |
| Premiers soins (A)* | 171 | Prestige guérisseur (Mystique) | `voies-prestige/partie2.ts` |
| Souhait (L)* | 163 | Prestige magie des mots (Mage) | `voies-prestige/partie2.ts` |
| Tour de magie (G)* | 60 | Voie du mage (peuple) | `voies-peuples.ts` |

Les attributions de voie et les pages de l'index concordent avec les données
extraites pour chacun de ces sondages.

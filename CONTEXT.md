# cof2-character-editor — Contexte de domaine

Éditeur/simulateur de personnage COF2 devenu service cloud multi-tenant (Supabase).
Glossaire des termes propres au domaine « Campagnes, joueurs et règles de table ».

## Language

**Campagne** :
Regroupement **optionnel** de personnages sous un MJ (`owner_id`). Porte des notes et des règles de table.
_Avoid_: partie, table (au sens technique)

**MJ (propriétaire)** :
Le compte propriétaire d'une campagne (`campaigns.owner_id`). Un compte est MJ **par campagne**, pas globalement.
_Avoid_: admin, maître

**Joueur** :
Identité légère persistante rattachée à une campagne, sans compte (accès par lien magique). Attribuée à un personnage via `player_id` (nullable).
_Avoid_: utilisateur, membre

**Statut de personnage** (`Character.status`) :
Position d'un personnage dans son cycle de vie. Trois valeurs fermées :
- **`active`** — en cours de jeu.
- **`dead`** — mort en jeu (événement narratif, appelle souvent une recréation pour le même joueur).
- **`retired`** — retiré volontairement (rangé sans être mort).
Passer à `dead`/`retired` demande une **confirmation** (acte narratif volontaire), mais reste **réversible** : un personnage archivé peut repasser `active` (résurrection, erreur de clic) — la fiche permissive n'enferme jamais la donnée. Modifiable par le **MJ et le joueur** (RLS 0002 autorise le joueur à écrire le statut de sa fiche).
_Avoid_: archivé (voir ci-dessous), supprimé, définitif/irréversible

**Archivé** :
Terme d'**UI seulement** désignant l'union `dead ∪ retired` (tout personnage non `active`). N'est **pas** une valeur de `status`.
_Avoid_: en tant que valeur de statut

**Règles de table** (`CampaignRules`) :
Objet **typé** (un champ par règle, pas de registre générique), persisté dans `campaigns.rules` (jsonb). Décisions d'univers qui découlent sur les personnages de la campagne (ex. `firearmsAllowed`).
_Avoid_: options, paramètres, config

## Relationships

- Un **MJ** possède zéro ou plusieurs **Campagnes**.
- Une **Campagne** regroupe zéro ou plusieurs **Personnages** (FK `campaignId` nullable) et déclare un jeu de **Règles de table**.
- Un **Personnage** a exactement un **Statut** et référence zéro ou un **Joueur** (`player_id` nullable).
- La vue campagne présente les personnages **actifs** vs **archivés** (`dead ∪ retired`).

## Example dialogue

> **Dev:** « Quand un PJ meurt, on le supprime de la campagne ? »
> **MJ:** « Non — on passe son **Statut** à `dead`. Il reste dans la campagne, dans les **archivés**, pour l'historique. Ensuite je recrée un personnage pour le même **Joueur**. »
> **Dev:** « Et `retired` ? »
> **MJ:** « Un perso rangé volontairement, pas mort. Les deux tombent dans les **archivés** côté UI, mais restent deux statuts distincts. »

## Flagged ambiguities

- « archivé » n'est **pas** une valeur de `status` — c'est un regroupement d'UI (`dead ∪ retired`). Résolu : garder les 3 valeurs `active`/`dead`/`retired` en base, ne parler d'« archivé » qu'à l'écran.

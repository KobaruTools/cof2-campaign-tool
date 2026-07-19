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
- **`active`** — en cours de jeu (affiché « Vivant »).
- **`dead`** — mort en jeu (affiché « Mort » ; événement narratif, appelle souvent une recréation pour le même joueur).
- **`retired`** — retiré volontairement (rangé sans être mort ; affiché « Retraité » — on évite « Retiré », anglicisme).
Les valeurs de code restent `active`/`dead`/`retired` (clés persistées) ; « Vivant »/« Mort »/« Retraité » ne sont que les libellés d'UI. Passer à `dead`/`retired` demande une **confirmation** (acte narratif volontaire), mais reste **réversible** : un personnage archivé peut repasser `active` (résurrection, erreur de clic) — la fiche permissive n'enferme jamais la donnée. Modifiable par le **MJ et le joueur** (RLS 0002 autorise le joueur à écrire le statut de sa fiche).
_Avoid_: archivé (voir ci-dessous), supprimé, définitif/irréversible

**Archivé** :
Terme d'**UI seulement** désignant l'union `dead ∪ retired` (tout personnage non `active`). N'est **pas** une valeur de `status`.
_Avoid_: en tant que valeur de statut

**Règles de table** (`CampaignRules`) :
Objet **typé** (un champ par règle, pas de registre générique), persisté dans `campaigns.rules` (jsonb). Décisions d'univers qui découlent sur les personnages de la campagne (ex. `firearmsAllowed`).
_Avoid_: options, paramètres, config

**Règle « armes à feu »** (`campaign.rules.firearmsAllowed`) :
Décision d'univers : les armes à feu **existent-elles** dans cette campagne ? C'est une **disponibilité d'option**, pas un interrupteur imposé à chaque personnage. La règle reste **éditable** par le MJ après création de la campagne.
_Avoid_: interrupteur global, forçage par personnage

**Choix d'armes à feu du personnage** (`Character.firearmsAllowed`, dit *snapshot*) :
Le choix du **joueur** à la création — dans une campagne où la poudre existe, il peut jouer un Arquebusier (poudre) ou un Arbalétrier (arbalète, par goût). **Verrouillé après la création** (pas d'interrupteur sur la fiche). Un personnage « Non attribué » (sans campagne) retombe sur le comportement historique (poudre disponible).
_Avoid_: réglage modifiable en jeu, réglage de campagne

**Armes à feu effectives** (dérivé) :
`firearmsEffectif = Character.firearmsAllowed ∧ campaign.rules.firearmsAllowed` (campagne absente ⇒ `true`). **Valeur unique lue partout** où comptait `Character.firearmsAllowed` : nom affiché du profil (Arquebusier ↔ Arbalétrier), voies effectives (explosifs ↔ maître des arbalètes), légalité/level-up, conformité. La campagne **filtre** (gate) le choix du joueur : si le MJ interdit la poudre après coup, l'effectif d'un Arquebusier bascule à `false` — il s'affiche « Arbalétrier », le level-up lui propose l'arbalète, et un **avertissement de conformité** (voie explosifs orpheline, arme à feu équipée) invite le MJ à régulariser à la main. Aucune donnée du personnage n'est jamais mutée en silence ; rebasculer la campagne à `true` restaure l'Arquebusier.
_Avoid_: mutation du personnage, transformation destructive

## Équipement et dégâts

**DM (dégâts)** :
Dés de dommages d'une source. Quatre **porteurs** distincts, à ne pas confondre : le **catalogue d'armes**, les **variantes** (surcharges d'instance persistées, PER-211/214), les **créatures/familiers**, et les **sorts/capacités**. Seuls les deux premiers (armes/équipement) portent le modèle **structuré** (`WeaponDamage`) ; créatures et sorts restent en **chaîne** (ADR 0002).
_Avoid_: « dégâts » et « DM » employés indifféremment pour tous les porteurs sans préciser lequel

**DM structuré** (`WeaponDamage`) :
Représentation typée d'un DM d'arme : `count` (nombre de dés) × `die` (dé) `+ modifier` plat optionnel, avec un marqueur `nonLethal`. Ne modélise **que** ce qui est saisi à la main (armes/variantes). La variation une-main/deux-mains n'y vit **pas** : ce sont deux champs (`damage`/`twoHandedDamage`) aiguillés par la **prise** (`grip`).
_Avoid_: y mettre le `°` évolutif ou une carac (voir ci-dessous)

**Modificateur plat** (`modifier`) :
Le `+ N` **numérique** d'une arme magique (`1d8+2`). Distinct d'un **bonus de caractéristique** (`+ FOR`, `+ INT`) : la carac est ajoutée par la **formule d'attaque**, jamais gravée dans le DM de l'arme.
_Avoid_: `+ FOR`/`+ INT` dans un `WeaponDamage`

**DM non létaux (temporaires)** (`nonLethal`) :
DM qui n'infligent pas de blessure durable (gourdin, mains nues), notés `(…)` au livre. Marqueur booléen sur le DM structuré ; l'affichage en dérive les parenthèses.
_Avoid_: conserver les parenthèses comme texte dans la donnée

**Dé évolutif** (`°`) :
Dé qui monte d'une catégorie selon le niveau/rang (p. 43, durium p. 195). Vit **exclusivement** dans les données figées (créatures, sorts), **hors** du modèle structuré des armes.
_Avoid_: le représenter dans `WeaponDamage`

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

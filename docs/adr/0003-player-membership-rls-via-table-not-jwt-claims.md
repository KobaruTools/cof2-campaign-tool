# RLS d'appartenance joueur via table, pas via claims JWT

PER-498 : une Identité joueur peut désormais porter plusieurs Joueurs (une campagne
chacun). Deux options pour autoriser l'accès : élargir `app_metadata` en tableau de
claims (`memberships: [{player_id, campaign_id}]`), ou faire de
`player_auth_sessions` la source d'autorité elle-même (clé composite
`(auth_user_id, player_id)`, policies RLS en `EXISTS (...)` dessus).

On retient la **table** : la « révocation forte » (retirer l'accès d'une Identité à
UNE campagne sans toucher les autres) est un objectif déjà assumé du design 0002.
Avec des claims JWT, un jeton déjà émis reste valide jusqu'à expiration même après
retrait du membership — régression sur cette garantie. Avec la table, la
révocation est une suppression de ligne, effective à la requête suivante.

`app_metadata.player_id`/`campaign_id` reste posé au redeem, mais devient un simple
indice de dernière campagne active, plus une frontière d'autorisation.

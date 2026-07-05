import 'server-only';

/**
 * Résultat de la tentative d'échange d'un secret de lien magique joueur (PER-189).
 * - `ok` : secret valide → session joueur scopée ouverte, `characterId` = fiche
 *   du joueur dans la campagne ciblée (destination de la redirection) ;
 * - `invalid` : secret inconnu ou révoqué (message générique, aucune fuite) ;
 * - `not-implemented` : la mécanique d'échange (PER-191) n'est pas encore livrée.
 */
export type JoinRedemption =
  | { status: 'ok'; characterId: string }
  | { status: 'invalid' }
  | { status: 'not-implemented' };

/**
 * Point de **délégation** (PER-189) vers la mécanique « secret → session joueur
 * scopée » livrée en PER-191 (JWT scopé + RLS joueur : lecture du roster,
 * écriture de sa seule fiche). La landing `/join/[secret]` appelle cette fonction
 * et se contente de mapper le résultat vers une redirection ou un message ; toute
 * la logique de validation/ouverture de session vivra ici.
 *
 * Tant que PER-191 n'est pas livré, on renvoie `not-implemented` : le seam existe
 * et la route est branchée dessus, sans faire de promesse de sécurité prématurée.
 */
export async function redeemJoinSecret(secret: string): Promise<JoinRedemption> {
  // TODO(PER-191): valider le secret (table `players` / lien magique), ouvrir une
  // session joueur scopée (JWT + RLS joueur), puis renvoyer `{ status: 'ok',
  // characterId }`. Secret inconnu/révoqué → `{ status: 'invalid' }`.
  void secret;
  return { status: 'not-implemented' };
}

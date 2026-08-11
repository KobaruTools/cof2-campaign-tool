/**
 * Repo « Amis » (PER-402) : recherche de compte, demandes, amis, lien d'invitation.
 * Toute mutation sensible passe par une RPC `security definer` (migration 0024/0025) —
 * ce module ne fait qu'appeler ces fonctions et reformer des lignes typées.
 *
 * `friend_requests.from_user_id`/`to_user_id` référencent `auth.users`, pas
 * `public.profiles` : PostgREST n'a donc AUCUNE relation déclarée entre les deux
 * tables (impossible d'embed `profiles` dans une requête `friend_requests`). Chaque
 * fonction qui a besoin des deux fait donc 2 requêtes : les lignes de relation, puis
 * les profils correspondants via `.in('id', ids)`.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { FriendProfile, FriendRequest, FriendRequestStatus } from './types';

function toProfile(row: {
  id: string;
  handle: string | null;
  display_name: string | null;
  last_seen_at: string | null;
}): FriendProfile {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    lastSeenAt: row.last_seen_at,
  };
}

/** Rafraîchit `last_seen_at` de l'utilisateur courant. Best-effort (jamais critique). */
export async function touchMyPresence(): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  await supabase.rpc('touch_my_presence');
}

/** Choisit/renomme le handle public de l'utilisateur courant. Lève sur format/collision. */
export async function setMyHandle(handle: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.rpc('set_my_handle', { p_handle: handle });
  if (error) throw error;
}

/** Profil (handle) de l'utilisateur courant, `null` si jamais vu par le heartbeat. */
export async function fetchMyProfile(): Promise<FriendProfile | null> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name, last_seen_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : { id: user.id, handle: null, displayName: null, lastSeenAt: null };
}

/**
 * Résultat de recherche : ni les RPC `find_profile_by_*` ni `sendFriendRequest`
 * (avant toute relation) n'ont accès à `last_seen_at` (RLS `profiles`, 0025) —
 * seul un ami confirmé expose sa présence.
 */
function toSearchResult(row: { id: string; handle: string | null; display_name: string | null }): FriendProfile {
  return { id: row.id, handle: row.handle, displayName: row.display_name, lastSeenAt: null };
}

/** Recherche exact-match par handle. `null` si aucun compte ne correspond. */
export async function findProfileByHandle(handle: string): Promise<FriendProfile | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc('find_profile_by_handle', { p_handle: handle });
  if (error) throw error;
  const row = data?.[0];
  return row ? toSearchResult(row) : null;
}

/** Recherche exact-match par email. `null` si aucun compte ne correspond. */
export async function findProfileByEmail(email: string): Promise<FriendProfile | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc('find_profile_by_email', { p_email: email });
  if (error) throw error;
  const row = data?.[0];
  return row ? toSearchResult(row) : null;
}

/**
 * Envoie une demande d'ami. Si une ligne pending existe déjà DANS L'AUTRE SENS
 * (l'autre m'a déjà demandé), l'index unique de paire non ordonnée (0024) fait
 * échouer l'insert — on bascule alors sur une acceptation directe de cette ligne.
 */
export async function sendFriendRequest(toUserId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Aucune session.');

  const { error } = await supabase
    .from('friend_requests')
    .insert({ from_user_id: user.id, to_user_id: toUserId, status: 'pending' });
  if (!error) return;

  // Violation d'unicité de paire : une demande existe déjà (dans un sens ou l'autre).
  if (error.code !== '23505') throw error;

  const { data: existing, error: fetchError } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, status')
    .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw error;

  // La ligne existante venait de l'autre partie et est encore en attente : l'accepter.
  if (existing.from_user_id === toUserId && existing.status === 'pending') {
    const { error: acceptError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', existing.id);
    if (acceptError) throw acceptError;
    return;
  }
  // Sinon (déjà amis, ou déjà émise par moi) : rien à faire, pas une erreur pour l'appelant.
}

/** Accepte ou refuse une demande reçue (le destinataire seul, cf. trigger 0024). */
export async function respondToFriendRequest(
  requestId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from('friend_requests').update({ status }).eq('id', requestId);
  if (error) throw error;
}

/** Annule une demande émise (encore pending) ou rompt une amitié acceptée. */
export async function deleteFriendRequest(requestId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
  if (error) throw error;
}

/**
 * Toutes les relations (pending + accepted, dans les deux sens) impliquant
 * l'utilisateur courant, enrichies du profil de l'AUTRE partie. Filtrer par statut
 * côté appelant (`status === 'pending' && isOutgoing` etc.) plutôt que multiplier les
 * fonctions.
 */
export async function listFriendRequests(): Promise<FriendRequest[]> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from('friend_requests')
    .select('id, from_user_id, to_user_id, status, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const otherIds = Array.from(
    new Set(rows.map((r) => (r.from_user_id === user.id ? r.to_user_id : r.from_user_id))),
  );
  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, handle, display_name, last_seen_at')
    .in('id', otherIds);
  if (profileError) throw profileError;

  const profileById = new Map((profileRows ?? []).map((p) => [p.id, toProfile(p)]));
  const emptyProfile = (id: string): FriendProfile => ({
    id,
    handle: null,
    displayName: null,
    lastSeenAt: null,
  });

  return rows.map((r) => {
    const isOutgoing = r.from_user_id === user.id;
    const otherId = isOutgoing ? r.to_user_id : r.from_user_id;
    return {
      id: r.id,
      status: r.status as FriendRequestStatus,
      createdAt: r.created_at,
      isOutgoing,
      other: profileById.get(otherId) ?? emptyProfile(otherId),
    };
  });
}

export interface FriendInviteLink {
  id: string;
  token: string;
  createdAt: string;
  usedAt: string | null;
}

/** Liens d'invitation créés par l'utilisateur courant (pour en réutiliser un non consommé). */
export async function listMyInviteLinks(): Promise<FriendInviteLink[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('friend_invite_links')
    .select('id, token, created_at, used_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    token: r.token,
    createdAt: r.created_at,
    usedAt: r.used_at,
  }));
}

/** Crée un nouveau lien d'invitation à usage unique. */
export async function createFriendInviteLink(): Promise<FriendInviteLink> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Aucune session.');
  const { data, error } = await supabase
    .from('friend_invite_links')
    .insert({ owner_id: user.id })
    .select('id, token, created_at, used_at')
    .single();
  if (error) throw error;
  return { id: data.id, token: data.token, createdAt: data.created_at, usedAt: data.used_at };
}

/** Consomme le lien d'invitation d'un tiers : crée une amitié acceptée d'office. */
export async function redeemFriendInvite(token: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.rpc('redeem_friend_invite', { p_token: token });
  if (error) throw error;
}

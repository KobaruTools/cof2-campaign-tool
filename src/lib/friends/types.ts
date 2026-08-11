/** Profil public minimal d'un compte (PER-402) — jamais l'email, sauf pour soi-même. */
export interface FriendProfile {
  id: string;
  handle: string | null;
  displayName: string | null;
  lastSeenAt: string | null;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

/** Une ligne `friend_requests`, enrichie du profil de l'AUTRE partie (jamais soi-même). */
export interface FriendRequest {
  id: string;
  status: FriendRequestStatus;
  createdAt: string;
  /** `true` si l'utilisateur courant est l'émetteur (`from_user_id`). */
  isOutgoing: boolean;
  other: FriendProfile;
}

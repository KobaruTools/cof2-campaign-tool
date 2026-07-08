-- Migration 0005 — Présence des joueurs côté MJ (PER-195)
--
-- Contexte : quand le MJ partage un lien magique, il n'a aucun retour dans l'UI —
-- impossible de savoir si le joueur a ouvert son lien ni s'il est actif. La ligne
-- posée dans `player_auth_sessions` au redeem (0002) sert à la révocation forte et
-- n'est lisible que par le client admin (RLS verrouillée) ; elle n'expose donc pas
-- de statut au MJ. On matérialise la présence directement sur `players`, déjà
-- lisible par le MJ (RLS propriétaire 0001).
--
-- Deux colonnes :
--   * `first_joined_at` — posée à la PREMIÈRE activation du lien (redeem), sert de
--     « a rejoint au moins une fois » ; null = jamais connecté.
--   * `last_seen_at`    — rafraîchie par l'activité du joueur (heartbeat), sert de
--     « dernière activité » / « en ligne ».
--
-- Écriture sous session joueur : un joueur n'a AUCUN droit d'écrire `players`
-- (RLS 0002 = lecture roster seule). Le rafraîchissement passe donc par une
-- fonction `security definer` qui ne touche QUE la ligne du joueur courant
-- (`current_player_id()` issu du JWT) — jamais une écriture directe côté joueur.
--
-- Régénération du lien : le reset de `first_joined_at`/`last_seen_at` à null est
-- porté côté application (`regeneratePlayerLink`, action admin) pour que le nouveau
-- lien réaffiche « jamais connecté » — cohérent avec la coupure des sessions.

-- ────────────────────────────────────────────────────────────────────────────
-- Colonnes de présence sur `players` (lisibles par le MJ via la RLS 0001)
-- ────────────────────────────────────────────────────────────────────────────

alter table public.players
  add column if not exists first_joined_at timestamptz,
  add column if not exists last_seen_at    timestamptz;

-- ────────────────────────────────────────────────────────────────────────────
-- Fonction : rafraîchit la présence du JOUEUR courant (heartbeat)
-- ────────────────────────────────────────────────────────────────────────────
-- `security definer` : s'exécute avec les droits du propriétaire pour contourner
-- l'absence de policy d'écriture joueur sur `players`. Le périmètre reste sûr : la
-- mise à jour est bornée à `id = current_player_id()` (claim du JWT, non
-- falsifiable), donc un joueur ne peut toucher que SA propre présence. No-op pour
-- un appelant non-joueur (MJ) — `current_player_id()` est alors null.
-- `set search_path = ''` + qualification complète : durcissement (cf. 0002).

create or replace function public.touch_player_presence()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := public.current_player_id();
begin
  if pid is null then
    return;
  end if;
  update public.players
     set last_seen_at    = now(),
         first_joined_at = coalesce(first_joined_at, now())
   where id = pid;
end;
$$;

-- Appelable en RPC par une session authentifiée (le joueur est un utilisateur
-- anonyme `authenticated`). Le corps se charge du confinement au joueur courant.
grant execute on function public.touch_player_presence() to authenticated;

-- Migration 0014 — Écriture du journal de présence de session (PER-265)
--
-- Troisième maillon de la milestone PER-259. Le canal Realtime + la présence
-- (Realtime Presence) affichent EN DIRECT qui est connecté ; en parallèle, chaque
-- client alimente le JOURNAL horodaté `game_session_participants` (posé par 0012,
-- consommé plus tard par PER-270) avec son entrée/sortie.
--
-- Or la RLS de 0012 réserve la LECTURE de `game_session_participants` aux membres et
-- n'autorise AUCUNE écriture directe par `authenticated`. On expose donc, comme pour
-- le cycle de vie (0013), deux fonctions `security definer` gatées `is_campaign_member`
-- qui posent puis ferment une entrée de présence, avec l'identité (`player_id`) dérivée
-- côté serveur du JWT — jamais du client :
--
--   * `session_participant_join(cid)`   : insère une entrée pour la session active de la
--                                         campagne (`player_id = current_player_id()`,
--                                         null = MJ), renvoie son id. `null` s'il n'y a
--                                         pas de session active (course entre la
--                                         résolution du gate et l'entrée).
--   * `session_participant_leave(pid)`  : ferme l'entrée (`left_at = now()`), idempotent.
--
-- Granularité : UNE entrée par ouverture de canal (par onglet / reconnexion). Simple et
-- robuste au multi-onglets ; PER-270 regroupera à l'affichage. La fermeture est
-- best-effort (une fermeture brutale de l'onglet laisse `left_at` nul — borné par la fin
-- de session). La FENÊTRE PROJETÉE (PER-268) n'appellera PAS ces RPC : c'est un écran,
-- pas une personne (exclue du journal comme de la présence).
--
-- Idempotente (`create or replace`).

-- ────────────────────────────────────────────────────────────────────────────
-- `session_participant_join(cid)` — pose une entrée de présence
-- ────────────────────────────────────────────────────────────────────────────
-- L'identité est dérivée du JWT (`current_player_id()` → null pour le MJ), jamais
-- fournie par l'appelant : un joueur ne peut donc pas se journaliser en tant que MJ
-- ni sous l'identité d'un autre joueur. `security definer` + gate membre car la RLS
-- 0012 n'accorde aucune écriture directe sur la table.

create or replace function public.session_participant_join(cid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sid    uuid;
  new_id uuid;
begin
  if not public.is_campaign_member(cid) then
    raise exception 'session_participant_join: appelant non membre de la campagne'
      using errcode = '42501';
  end if;

  -- Session active de la campagne (au plus une, index partiel unique 0012).
  select id into sid
  from public.game_sessions
  where campaign_id = cid and ended_at is null
  limit 1;

  if sid is null then
    return null; -- pas de session active : rien à journaliser
  end if;

  insert into public.game_session_participants (session_id, player_id)
    values (sid, public.current_player_id())
    returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.session_participant_join(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- `session_participant_leave(pid)` — ferme une entrée de présence
-- ────────────────────────────────────────────────────────────────────────────
-- Pose `left_at = now()` sur l'entrée si elle est encore ouverte ET appartient à une
-- session d'une campagne dont l'appelant est membre. Idempotent (une entrée déjà
-- fermée, inexistante, ou d'une autre table est un no-op silencieux). `security
-- definer` + gate membre pour la même raison que ci-dessus.

create or replace function public.session_participant_leave(participant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_session_participants p
    set left_at = now()
    where p.id = participant_id
      and p.left_at is null
      and exists (
        select 1 from public.game_sessions s
        where s.id = p.session_id
          and public.is_campaign_member(s.campaign_id)
      );
end;
$$;

grant execute on function public.session_participant_leave(uuid) to authenticated;

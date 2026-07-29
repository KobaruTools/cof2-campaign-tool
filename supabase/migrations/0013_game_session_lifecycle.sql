-- Migration 0013 — Cycle de vie de la session synchronisée (PER-264)
--
-- Deuxième maillon de la milestone PER-259. Le socle DB (0012) a posé la table
-- `game_sessions` (active = `ended_at IS NULL`, au plus une par campagne) avec une
-- RLS d'écriture RÉSERVÉE AU MJ propriétaire. Ce ticket construit la NOTION de
-- cycle de vie au-dessus : démarrer/terminer (côté MJ, en écriture directe — la
-- RLS suffit), le gate « session active ? », et surtout la FERMETURE PARESSEUSE
-- (3 filets : explicite MJ / vide 5 min / plafond 12 h) SANS cron.
--
-- Pourquoi des RPC `security definer` ici : les deux mécanismes de cycle de vie
-- ci-dessous doivent être déclenchables par N'IMPORTE QUEL membre de la campagne
-- (joueur inclus) — le prochain client qui charge clôt une session périmée, et
-- tout présent rafraîchit le battement. Or la RLS de 0012 réserve l'écriture de
-- `game_sessions` au MJ propriétaire. On expose donc deux fonctions `security
-- definer`, gatées par `is_campaign_member(cid)`, qui VALIDENT la condition côté
-- serveur : un membre ne peut PAS clore une session vivante ni écrire autre chose
-- que le battement — seulement déclencher un filet légitime.
--
-- Le démarrage/l'arrêt EXPLICITES du MJ restent en écriture directe (RLS MJ), pas
-- de RPC : voir `src/lib/session/repo.ts`.
--
-- Idempotente (`create or replace`).

-- ────────────────────────────────────────────────────────────────────────────
-- `resolve_active_session(cid)` — LE GATE + la fermeture paresseuse
-- ────────────────────────────────────────────────────────────────────────────
-- Renvoie la session ACTIVE de la campagne (0 ou 1 ligne), MAIS applique d'abord
-- les filets de fin « passifs » : si la session active dépasse le plafond dur
-- (12 h depuis `started_at`) elle est close en `expired` ; sinon si son battement
-- `last_active_at` est périmé (> 5 min) elle est close en `empty`. Dans ces deux
-- cas la fonction ne renvoie AUCUNE ligne (plus de session active). C'est le
-- « prochain client qui charge et clôt lui-même » de la conception — aucun cron.
--
-- `setof game_sessions` (et non un scalaire) pour que PostgREST renvoie un tableau
-- vide quand il n'y a pas de session active (l'appelant fait `[0] ?? null`).
--
-- Le membre ne peut pas clore une session vivante : les UPDATE ne portent que sur
-- une session dont la condition de péremption est vérifiée ICI, côté serveur.

create or replace function public.resolve_active_session(cid uuid)
returns setof public.game_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.game_sessions%rowtype;
begin
  if not public.is_campaign_member(cid) then
    raise exception 'resolve_active_session: appelant non membre de la campagne'
      using errcode = '42501';
  end if;

  select * into s
  from public.game_sessions
  where campaign_id = cid and ended_at is null
  limit 1;

  if not found then
    return; -- aucune session active
  end if;

  -- Filet 3 — plafond dur : 12 h depuis le démarrage → 'expired'.
  if s.started_at < now() - interval '12 hours' then
    update public.game_sessions
      set ended_at = now(), ended_reason = 'expired'
      where id = s.id and ended_at is null;
    return;
  end if;

  -- Filet 2 — vide : plus aucun battement depuis > 5 min → 'empty'. (Le battement
  -- est rafraîchi par tout présent ~2-3 min ; 5 min > l'intervalle de battement.)
  if s.last_active_at < now() - interval '5 minutes' then
    update public.game_sessions
      set ended_at = now(), ended_reason = 'empty'
      where id = s.id and ended_at is null;
    return;
  end if;

  return next s; -- session active et vivante
end;
$$;

grant execute on function public.resolve_active_session(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- `touch_game_session(cid)` — le battement basse fréquence
-- ────────────────────────────────────────────────────────────────────────────
-- Rafraîchit `last_active_at` de la session active de la campagne. Appelé ~2-3 min
-- par n'importe quel présent (le mécanisme de PRÉSENCE fin vient à PER-265 ; ici on
-- pose juste l'écriture périodique). Alimente le filet « vide » ci-dessus. No-op si
-- aucune session active. `security definer` + gate membre pour la même raison que
-- ci-dessus (la RLS réserve l'écriture au MJ).

create or replace function public.touch_game_session(cid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_campaign_member(cid) then
    raise exception 'touch_game_session: appelant non membre de la campagne'
      using errcode = '42501';
  end if;

  update public.game_sessions
    set last_active_at = now()
    where campaign_id = cid and ended_at is null;
end;
$$;

grant execute on function public.touch_game_session(uuid) to authenticated;

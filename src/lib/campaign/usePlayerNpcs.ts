'use client';

/**
 * Charge les PNJ visibles par le JOUEUR courant (`fetchNpcsForPlayer`, RPC
 * `fetch_campaign_npcs_for_player`, migration 0037) — extrait de
 * `CharacterNpcTab.tsx` pour que `page.tsx` connaisse le nombre de PNJ SANS
 * dupliquer l'appel réseau : l'onglet « PNJ » de la fiche ne doit s'afficher
 * QUE s'il y a au moins un PNJ à montrer (retour propriétaire).
 */
import { useEffect, useState } from 'react';
import { fetchNpcsForPlayer } from '@/lib/campaign/repo';
import type { PlayerNpc } from '@/lib/campaign/types';

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

export function usePlayerNpcs(campaignId: string | null): {
  npcs: PlayerNpc[];
  loading: boolean;
  error: string | null;
} {
  const [npcs, setNpcs] = useState<PlayerNpc[]>([]);
  const [loading, setLoading] = useState(Boolean(campaignId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setNpcs([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNpcsForPlayer(campaignId)
      .then((fetched) => {
        if (!cancelled) setNpcs(fetched);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return { npcs, loading, error };
}

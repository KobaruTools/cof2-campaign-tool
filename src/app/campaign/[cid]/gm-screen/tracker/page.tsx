'use client';

/**
 * Fenêtre « présentation » du tracker d'initiative (PER-248) — route dédiée
 * `/campaign/[cid]/gm-screen/tracker`, **owner-only** (gating proxy `/campaign/*`
 * hérité : même origine, même session que la fenêtre principale). Ouverte via
 * `window.open` depuis l'écran de MJ pour être affichée sur un SECOND écran pendant
 * une partie.
 *
 * Le rendu est porté par `ProjectionTrackerView` (composant PARTAGÉ, source unique) —
 * strictement le même affichage que le lien de projection cross-machine `/project`
 * (PER-271). Ici le `cid` vient de l'URL (session owner) ; là-bas il vient du claim de la
 * session d'observateur. Vue dépouillée, lecture seule, client de session (voir le composant).
 */
import { use, useEffect } from 'react';
import { ProjectionTrackerView } from '@/components/campaign/ProjectionTrackerView';
import { useCampaignsStore } from '@/stores/campaigns';
import { useResolvedCampaign } from '@/lib/routing/slug';

export default function GmTrackerWindowPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid: cidParam } = use(params);
  // Fenêtre popup autonome (`window.open`) : charge elle-même les campagnes pour résoudre le slug
  // avant de transmettre le VRAI id au canal temps réel (cf. `slug.ts`).
  const { cid } = useResolvedCampaign(cidParam);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);
  return <ProjectionTrackerView cid={cid} />;
}

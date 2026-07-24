'use client';

/**
 * Charge à la demande le BLOB complet d'une créature (store `bestiary`, disque puis
 * réseau, cache PER-244) et le rend via `BestiaryStatBlock` — squelette pendant le
 * chargement, alerte en cas d'échec. Point de réutilisation partagé entre l'aperçu de
 * la modale d'ajout au combat et la carte de créature de l'écran de MJ (PER-247), pour
 * n'écrire qu'une seule fois l'orchestration async blob → bloc de stats.
 */
import { useEffect } from 'react';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useBestiaryStore } from '@/stores/bestiary';
import { AppAlert } from '@/components/AppAlert';
import { BestiaryStatBlock } from './BestiaryStatBlock';

export function CreatureBlobView({
  slug,
  hideNotes = false,
}: {
  slug: string;
  /** Masque le pavé de notes/description du bloc (transmis à `BestiaryStatBlock`). */
  hideNotes?: boolean;
}) {
  const blob = useBestiaryStore((s) => (slug ? s.blobs[slug] : undefined));
  const blobStatus = useBestiaryStore((s) => (slug ? s.blobStatus[slug] : undefined));
  const loadBlob = useBestiaryStore((s) => s.loadBlob);

  useEffect(() => {
    if (slug) void loadBlob(slug);
  }, [slug, loadBlob]);

  if (blob) return <BestiaryStatBlock creature={blob} hideNotes={hideNotes} />;
  if (blobStatus === 'error') {
    return (
      <AppAlert severity="error">Impossible de charger le détail de cette créature.</AppAlert>
    );
  }
  return (
    <Stack spacing={1.5} sx={{ p: 1 }}>
      <Skeleton variant="text" width="45%" height={40} />
      <Skeleton variant="rounded" height={72} />
      <Skeleton variant="rounded" height={180} />
      <Skeleton variant="rounded" height={120} />
    </Stack>
  );
}

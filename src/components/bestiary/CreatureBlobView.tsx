'use client';

/**
 * Charge à la demande le BLOB complet d'une créature (store `bestiary`, disque puis
 * réseau, cache PER-244) et le rend via `BestiaryStatBlock` — squelette pendant le
 * chargement, alerte en cas d'échec. Point de réutilisation partagé entre l'aperçu de
 * la modale d'ajout au combat, la carte de créature de l'écran de MJ (PER-247) ET le
 * détail du bestiaire — pour n'écrire qu'UNE SEULE FOIS l'orchestration async
 * blob → bloc de stats, y compris la résolution de l'héritage des capacités.
 *
 * HÉRITAGE : une variante qui porte un `sharedAbilitiesNote` (« possède les capacités
 * de X plus… ») ne réimprime pas les capacités de sa base ; on charge donc AUSSI le
 * blob de la base (`baseCreatureId`) pour AFFICHER réellement ces capacités (marquées
 * « hérité de X ») au lieu d'une simple note. Conditionné à `sharedAbilitiesNote` pour
 * ne jamais dupliquer sur une variante qui réimprime tout.
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
  dense = false,
  collapsibleAbilities = false,
  paidSource = false,
  wideColumns = false,
}: {
  slug: string;
  /** Masque le pavé de notes/description du bloc (transmis à `BestiaryStatBlock`). */
  hideNotes?: boolean;
  /** Rend le bloc en version compacte (transmis à `BestiaryStatBlock`). */
  dense?: boolean;
  /** Rend la section « Capacités » repliable/repliée (transmis à `BestiaryStatBlock`). */
  collapsibleAbilities?: boolean;
  /** La créature provient d'un supplément payant → marqueur « patte » à côté du NC. */
  paidSource?: boolean;
  /** Force les sections voies/capacités sur 2 colonnes malgré `dense` (carte MJ large). */
  wideColumns?: boolean;
}) {
  const blob = useBestiaryStore((s) => (slug ? s.blobs[slug] : undefined));
  const blobStatus = useBestiaryStore((s) => (slug ? s.blobStatus[slug] : undefined));
  const loadBlob = useBestiaryStore((s) => s.loadBlob);

  // Base dont hériter les capacités : seulement si la variante y renvoie explicitement.
  const baseId = blob?.sharedAbilitiesNote ? blob.baseCreatureId : undefined;
  const baseBlob = useBestiaryStore((s) => (baseId ? s.blobs[baseId] : undefined));

  useEffect(() => {
    if (slug) void loadBlob(slug);
  }, [slug, loadBlob]);
  useEffect(() => {
    if (baseId) void loadBlob(baseId);
  }, [baseId, loadBlob]);

  if (blob)
    return (
      <BestiaryStatBlock
        creature={blob}
        hideNotes={hideNotes}
        dense={dense}
        collapsibleAbilities={collapsibleAbilities}
        paidSource={paidSource}
        wideColumns={wideColumns}
        inheritedAbilities={baseBlob?.specialAbilities}
        inheritedFromName={baseBlob?.name}
      />
    );
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

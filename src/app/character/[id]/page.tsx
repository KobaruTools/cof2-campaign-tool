'use client';

/**
 * Ancienne route de fiche (pré-PER-180). La fiche vit désormais sous
 * `/campaign/[cid]/character/[id]`. On résout la campagne du personnage via sa FK
 * (`campaignId`) et on redirige vers la nouvelle URL imbriquée — ou vers la liste
 * des campagnes si le personnage est introuvable. Préserve les anciens favoris.
 */
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useCharactersStore } from '@/stores/characters';

export default function LegacyCharacterRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const character = useCharactersStore((s) => s.characters.find((c) => c.id === id));

  useEffect(() => {
    if (!hasHydrated) return;
    if (character) router.replace(`/campaign/${character.campaignId}/character/${id}`);
    else router.replace('/');
  }, [hasHydrated, character, id, router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

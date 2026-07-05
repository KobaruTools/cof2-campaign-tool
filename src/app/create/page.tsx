'use client';

/**
 * Ancienne route de création (pré-PER-180). Le wizard vit désormais sous
 * `/campaign/[cid]/create` (un brouillon appartient à une campagne). Cette URL
 * héritée ne porte aucun contexte campagne : on redirige vers la liste des
 * campagnes plutôt que de laisser une impasse.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function LegacyCreateRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

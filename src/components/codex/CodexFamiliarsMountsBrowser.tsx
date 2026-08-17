'use client';

/**
 * Sous-page « Familiers & montures » du Codex (PER-421) — deux onglets, les formes de données
 * étant trop différentes pour une grille unique (cadrage propriétaire) : 12 familiers riches
 * (`CodexFamiliarsBrowser`, grille de blocs) contre une petite table de 6 montures/véhicules
 * (`CodexMountsBrowser`, liste). État de l'onglet actif LOCAL, pas de persistance ni de `?tab=`
 * (consultation ponctuelle, pas de lien profond nécessaire — contrairement à `/codex/voies`).
 *
 * Onglets + contenu enveloppés dans un cadre à fond noir léger (retour propriétaire : les onglets
 * « dans le vide » sur `HomeBackground` seul) — même langage visuel que les cartes de contenu
 * (bordure claire discrète + fond noir translucide + flou), en plus léger (0.2 contre 0.35).
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { CodexFamiliarsBrowser } from './CodexFamiliarsBrowser';
import { CodexMountsBrowser } from './CodexMountsBrowser';

type CodexTab = 'familiers' | 'montures';

export function CodexFamiliarsMountsBrowser() {
  const [tab, setTab] = useState<CodexTab>('familiers');

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(255, 255, 255, 0.10)',
        bgcolor: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        p: { xs: 2, md: 3 },
      }}
    >
      <Tabs value={tab} onChange={(_, value: CodexTab) => setTab(value)} sx={{ mb: 3 }}>
        <Tab value="familiers" label="Familiers fantastiques" />
        <Tab value="montures" label="Montures & véhicules" />
      </Tabs>
      {tab === 'familiers' ? <CodexFamiliarsBrowser /> : <CodexMountsBrowser />}
    </Box>
  );
}

'use client';

/**
 * Sous-page « Familiers & montures » du Codex (PER-421) — deux onglets, les formes de données
 * étant trop différentes pour une grille unique (cadrage propriétaire) : 12 familiers riches
 * (`CodexFamiliarsBrowser`, grille de blocs) contre une petite table de 6 montures/véhicules
 * (`CodexMountsBrowser`, liste). État de l'onglet actif LOCAL, pas de persistance ni de `?tab=`
 * (consultation ponctuelle, pas de lien profond nécessaire — contrairement à `/codex/voies`).
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
    <Box>
      <Tabs value={tab} onChange={(_, value: CodexTab) => setTab(value)} sx={{ mb: 3 }}>
        <Tab value="familiers" label="Familiers fantastiques" />
        <Tab value="montures" label="Montures & véhicules" />
      </Tabs>
      {tab === 'familiers' ? <CodexFamiliarsBrowser /> : <CodexMountsBrowser />}
    </Box>
  );
}

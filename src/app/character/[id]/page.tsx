'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { families, ancestryById, classById } from '@/data';
import { deriveStats } from '@/lib/engine';
import { useCharactersStore } from '@/stores/characters';

const familyById = new Map(families.map((f) => [f.id, f]));

export default function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const character = useCharactersStore((s) => s.characters.find((c) => c.id === id));
  const upsert = useCharactersStore((s) => s.upsert);

  if (!hasHydrated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!character) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Personnage introuvable
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/')}>
          Retour à l’accueil
        </Button>
      </Container>
    );
  }

  const characterClass = classById.get(character.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;
  const ancestry = ancestryById.get(character.ancestryId);

  const stats = family
    ? deriveStats({
        abilities: character.abilities,
        level: character.level,
        family,
        defenseEquipment: { defBonus: 0, maxAgi: null },
        spellCount: 0,
      })
    : null;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            {character.name || 'Sans nom'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Fiche provisoire (jalon J4). Le wizard de création et la fiche éditable complète
          arrivent aux jalons suivants. Les valeurs ci-dessous sont déjà calculées par le moteur.
        </Alert>

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Nom"
              value={character.name}
              onChange={(e) => upsert({ ...character, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Niveau"
              type="number"
              value={character.level}
              onChange={(e) =>
                upsert({ ...character, level: Math.max(1, Number(e.target.value) || 1) })
              }
              sx={{ width: 160 }}
            />
            <Typography variant="body2" color="text.secondary">
              Peuple : {ancestry?.name ?? 'à définir'} · Profil : {characterClass?.name ?? 'à définir'}
            </Typography>
          </Stack>
        </Paper>

        <Typography variant="h6" gutterBottom>
          Statistiques dérivées
        </Typography>
        {stats ? (
          <Grid container spacing={2}>
            {(
              [
                ['Points de vigueur', stats.maxHp],
                ['Défense', stats.defense],
                ['Initiative', stats.initiative],
                ['Points de chance', stats.luckPoints],
                ['Dés de récupération', `${stats.recoveryDiceCount} ${stats.recoveryDie}`],
                ['Points de mana', stats.manaPoints ?? '—'],
                ['Attaque au contact', stats.meleeAttack],
                ['Attaque à distance', stats.rangedAttack],
                ['Attaque magique', stats.magicAttack],
              ] as const
            ).map(([label, value]) => (
              <Grid key={label} size={{ xs: 6, sm: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {label}
                  </Typography>
                  <Typography variant="h6">{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="warning">
            Choisissez un profil (à venir dans le wizard) pour calculer les statistiques dérivées.
          </Alert>
        )}
      </Container>
    </>
  );
}

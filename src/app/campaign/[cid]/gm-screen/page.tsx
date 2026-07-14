'use client';

/**
 * Écran de MJ (première itération) — route dédiée `/campaign/[cid]/gm-screen`,
 * **owner-only** (gating proxy : `/campaign/*` exige une session MJ). Accessible
 * uniquement depuis la vue campagne.
 *
 * Pour l'instant, l'écran se limite aux **aperçus** (`CharacterPreviewCard`) des
 * personnages de la campagne **réclamés par un joueur** (attribués : `playerId`
 * non nul). C'est la vue « coup d'œil » du MJ sur sa table : portrait, identité,
 * caractéristiques et micro-grille des voies, chapeautés du nom du joueur qui
 * incarne le personnage. Les cartes sont cliquables et ouvrent la fiche complète.
 *
 * Vocation à grandir (jets rapides, PV/mana en direct, notes de session…), d'où
 * une page dédiée plutôt qu'une modale.
 */
import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AccountMenu } from '@/components/AccountMenu';
import { AppHeader } from '@/components/AppHeader';
import { CharacterPreviewCard } from '@/components/CharacterPreviewCard';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import { HomeBackground } from '@/components/HomeBackground';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';

export default function GmScreenPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const router = useRouter();
  const charactersHydrated = useCharactersStore((s) => s.hasHydrated);
  const characters = useCharactersStore((s) => s.characters);
  const loadCharacters = useCharactersStore((s) => s.load);
  const campaignsStatus = useCampaignsStore((s) => s.status);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  const campaign = useCampaignsStore((s) => s.campaigns.find((c) => c.id === cid));
  const players = usePlayersStore((s) => s.players);
  const loadPlayers = usePlayersStore((s) => s.load);

  // Rafraîchit depuis le cloud (persos + campagnes + roster) comme les autres
  // pages MJ : la vue campagne s'appuyant sur l'hydratation localStorage, on
  // (re)charge ici pour éviter d'afficher un état périmé en accès direct.
  useEffect(() => {
    void loadCharacters();
    void loadCampaigns();
    void loadPlayers(cid);
  }, [loadCharacters, loadCampaigns, loadPlayers, cid]);

  const playerNameById = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  );

  // Personnages de CETTE campagne réclamés par un joueur (`playerId` non nul).
  const claimed = useMemo(
    () =>
      characters
        .filter((c) => c.campaignId === cid && c.playerId !== null)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [characters, cid],
  );

  const campaignsLoading = campaignsStatus === 'idle' || campaignsStatus === 'loading';
  if (!charactersHydrated || campaignsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <title>Campagne introuvable — Éditeur de personnage CO2</title>
        <Typography variant="h6" gutterBottom>
          Campagne introuvable
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/campaigns')}>
          Retour aux campagnes
        </Button>
      </Container>
    );
  }

  return (
    <>
      <title>{`Écran de MJ — ${campaign.name} — Éditeur de personnage CO2`}</title>
      <HomeBackground />
      <AppHeader
        title={`Écran de MJ — ${campaign.name}`}
        onBack={() => router.push(`/campaign/${cid}`)}
        backLabel={`Retour à ${campaign.name}`}
        action={<AccountMenu />}
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {claimed.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(30, 30, 34, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Aucun personnage réclamé
            </Typography>
            <Typography color="text.secondary">
              Les aperçus des personnages que vos joueurs auront réclamés apparaîtront ici.
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 2,
              alignItems: 'start',
            }}
          >
            {claimed.map((character) => {
              const playerName = character.playerId
                ? playerNameById.get(character.playerId) ?? null
                : null;
              return (
                <Paper
                  key={character.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/character/${character.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/character/${character.id}`);
                    }
                  }}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    bgcolor: 'rgba(20, 20, 23, 0.72)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 3,
                    transition: 'border-color 0.15s, transform 0.15s',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.22)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Stack spacing={1.5}>
                    <PlayerBadge name={playerName} />
                    <CharacterPreviewCard character={character} />
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Container>
    </>
  );
}

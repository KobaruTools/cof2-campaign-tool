'use client';

/**
 * Écran de MJ (première itération) — route dédiée `/campaign/[cid]/gm-screen`,
 * **owner-only** (gating proxy : `/campaign/*` exige une session MJ). Accessible
 * uniquement depuis la vue campagne.
 *
 * Pour l'instant, l'écran se limite aux **aperçus** (`CharacterPreviewCard`) des
 * personnages de la campagne **réclamés par un joueur** (attribués : `playerId`
 * non nul). C'est la vue « coup d'œil » du MJ sur sa table : chaque carte est une
 * fiche de personnage SIMPLIFIÉE (portrait, identité, caractéristiques, micro-grille
 * des voies et statistiques dérivées compactes), chapeautée du nom du joueur qui
 * incarne le personnage. Un petit bouton dédié (ligne du joueur) ouvre la fiche
 * complète — la carte elle-même n'est pas cliquable.
 *
 * Vocation à grandir (jets rapides, PV/mana en direct, notes de session…), d'où
 * une page dédiée plutôt qu'une modale.
 */
import { use, useState } from 'react';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppHeader } from '@/components/AppHeader';
import { CharacterPreviewCardSkeleton } from '@/components/CharacterPreviewCardSkeleton';
import { GmScreenCard } from '@/components/campaign/GmScreenCard';
import { GmScreenCreatureCard } from '@/components/campaign/GmScreenCreatureCard';
import { AddCreatureDialog } from '@/components/campaign/AddCreatureDialog';
import { InitiativeTracker } from '@/components/campaign/InitiativeTracker';
import { OpenTrackerWindowButton } from '@/components/campaign/OpenTrackerWindowButton';
import { HomeBackground } from '@/components/HomeBackground';
import { useGmScreenCombat } from './useGmScreenCombat';

export default function GmScreenPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);

  // Combat en cours — logique partagée avec la fenêtre « présentation » (PER-248) :
  // état persisté par campagne (roster de créatures + PV + tour courant) et dérivation
  // des lignes du tracker. Le bouton « + Ajouter une créature » est laissé sur TOUTES
  // les campagnes (temporaire, cf. PER-236) : par défaut aucune créature.
  const {
    charactersHydrated,
    campaignsLoading,
    campaign,
    claimed,
    playerNameById,
    labeledCreatures,
    initiativeRows,
    currentTurnKey,
    setCurrentTurnKey,
    addCreature,
    removeCreature,
    setCreatureVisibility,
  } = useGmScreenCombat(cid);
  const [addOpen, setAddOpen] = useState(false);

  if (!charactersHydrated || campaignsLoading) {
    // Nom de campagne pas encore résolu (donc pas d'en-tête) : on préfigure la
    // grille d'aperçus dans la même zone de contenu via des cartes fantômes.
    return (
      <>
        <HomeBackground />
        {/* Pleine largeur (hors container) avec padding symétrique — voir le rendu final. */}
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
              alignItems: 'start',
            }}
            aria-hidden
          >
            {Array.from({ length: 3 }, (_, i) => (
              <Paper
                key={i}
                sx={{
                  p: 2,
                  bgcolor: 'rgba(20, 20, 23, 0.72)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 3,
                }}
              >
                <Stack spacing={1.5}>
                  {/* Badge joueur (pastille). */}
                  <Skeleton animation="wave" variant="rounded" width={96} height={24} />
                  <CharacterPreviewCardSkeleton />
                </Stack>
              </Paper>
            ))}
          </Box>
        </Box>
      </>
    );
  }

  if (!campaign) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <title>Campagne introuvable — Éditeur de personnage CO2</title>
        <Typography variant="h6" gutterBottom>
          Campagne introuvable
        </Typography>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/campaigns">
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
        breadcrumbs={[
          { label: campaign.name, href: `/campaign/${cid}` },
          { label: 'Écran de MJ' },
        ]}
      />

      {/* Volontairement HORS du `Container` habituel du site : l'écran de MJ occupe
          toute la largeur pour afficher un maximum de cartes de front. Padding
          symétrique (gauche/droite = haut/bas) pour laisser respirer les bords. */}
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        {/* Combat tracker (PER-236, PER-247) : barre d'ajout de créatures, laissée sur toutes les campagnes. */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Combat en cours
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            Ajouter une créature
          </Button>
        </Stack>
        {claimed.length === 0 && labeledCreatures.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 6 },
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
              // Grille de 3 colonnes (les fiches de personnage), avec un palier
              // INTERMÉDIAIRE à 2 colonnes (tablette) avant le repli à 1 colonne
              // sur mobile où 3 de front seraient illisibles.
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
              alignItems: 'start',
            }}
          >
            {claimed.map((character) => (
              <GmScreenCard
                key={character.id}
                character={character}
                playerName={
                  character.playerId ? playerNameById.get(character.playerId) ?? null : null
                }
                href={`/character/${character.id}`}
              />
            ))}
            {/* Cartes des créatures (adversaires du combat), à la suite des joueurs. */}
            {labeledCreatures.map((inst) => (
              <GmScreenCreatureCard
                key={inst.id}
                slug={inst.slug}
                label={inst.label}
                visible={inst.visible !== false}
                onToggleVisible={() => setCreatureVisibility(inst.id, inst.visible === false)}
                onRemove={() => removeCreature(inst.id)}
              />
            ))}
          </Box>
        )}

        {/* Séparateur horizontal, puis tracker d'initiative (PER-236) : personnages
            reliés à un joueur + bandits, en colonnes classées par initiative. */}
        <Divider sx={{ my: { xs: 3, sm: 4 } }} />
        <InitiativeTracker
          rows={initiativeRows}
          currentTurnKey={currentTurnKey}
          onCurrentTurnKeyChange={setCurrentTurnKey}
          headerAction={<OpenTrackerWindowButton cid={cid} />}
        />
      </Box>

      {/* Modale d'ajout d'une créature du bestiaire au combat (sélecteur + aperçu). */}
      <AddCreatureDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(slug) => addCreature(slug)}
      />
    </>
  );
}

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
import { use, useEffect, useMemo, useState } from 'react';
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
import { InitiativeTracker, type InitiativeRow } from '@/components/campaign/InitiativeTracker';
import { HomeBackground } from '@/components/HomeBackground';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { deriveStats } from '@/lib/engine';
import { applyDamage, healHp, resetHp } from '@/lib/character/gauges';
import { summarize } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { creatureNcLabel } from '@/lib/ui/creature';
import type { DamageKind } from '@/components/sheet/HpGauge';
import { useGmCombatState } from './useGmCombatState';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';
import { useBestiaryStore } from '@/stores/bestiary';

/** Couleur d'accent des cartes/lignes de créatures adverses (PNJ). */
const CREATURE_ACCENT = '#e57373';

export default function GmScreenPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);

  // Combat en cours — état persisté dans un `localStorage` DÉDIÉ (par campagne) : le
  // roster des créatures (instances stables { id + slug } + PV) et la position dans
  // l'ordre d'initiative. Les PV joueurs vivent sur la fiche (store des personnages),
  // donc hors de ce stockage. Le bouton « + Ajouter une créature » est laissé sur
  // TOUTES les campagnes (temporaire, cf. PER-236) : par défaut aucune créature.
  const {
    creatures,
    depletions,
    currentTurnKey,
    addCreature,
    removeCreature,
    setCreatureDepletion,
    setCurrentTurnKey,
  } = useGmCombatState(cid);
  const [addOpen, setAddOpen] = useState(false);
  const charactersHydrated = useCharactersStore((s) => s.hasHydrated);
  const characters = useCharactersStore((s) => s.characters);
  const loadCharacters = useCharactersStore((s) => s.load);
  const upsert = useCharactersStore((s) => s.upsert);
  const campaignsStatus = useCampaignsStore((s) => s.status);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  const campaign = useCampaignsStore((s) => s.campaigns.find((c) => c.id === cid));
  const players = usePlayersStore((s) => s.players);
  const loadPlayers = usePlayersStore((s) => s.load);
  // Bestiaire : liste légère (nom des créatures ajoutées, pour l'étiquette) + blobs
  // (Init./PV lus à la demande, cache PER-244). Aucune source codée en dur.
  const bestiaryList = useBestiaryStore((s) => s.list);
  const loadBestiaryList = useBestiaryStore((s) => s.loadList);
  const blobs = useBestiaryStore((s) => s.blobs);
  const loadBlob = useBestiaryStore((s) => s.loadBlob);

  // Rafraîchit depuis le cloud (persos + campagnes + roster) comme les autres
  // pages MJ : la vue campagne s'appuyant sur l'hydratation localStorage, on
  // (re)charge ici pour éviter d'afficher un état périmé en accès direct.
  useEffect(() => {
    void loadCharacters();
    void loadCampaigns();
    void loadPlayers(cid);
    void loadBestiaryList();
  }, [loadCharacters, loadCampaigns, loadPlayers, loadBestiaryList, cid]);

  // Charge le blob de chaque créature du roster (Init./PV lus depuis le bloc) ;
  // idempotent côté store (blob déjà chargé/en cours = no-op).
  useEffect(() => {
    for (const inst of creatures) void loadBlob(inst.slug);
  }, [creatures, loadBlob]);

  const playerNameById = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  );

  // Nom de chaque créature (liste légère) pour l'étiquette, avant même le blob.
  const creatureNameBySlug = useMemo(
    () => new Map((bestiaryList ?? []).map((c) => [c.id, c.name])),
    [bestiaryList],
  );

  // Instances numérotées PAR CRÉATURE (« Gobelin 1 / 2 », comme « Bandit 1 / 2 »
  // autrefois), dans l'ordre d'ajout.
  const labeledCreatures = useMemo(() => {
    const counts = new Map<string, number>();
    return creatures.map((inst) => {
      const n = (counts.get(inst.slug) ?? 0) + 1;
      counts.set(inst.slug, n);
      const name = creatureNameBySlug.get(inst.slug) ?? inst.slug;
      return { ...inst, label: `${name} ${n}` };
    });
  }, [creatures, creatureNameBySlug]);

  // Personnages de CETTE campagne réclamés par un joueur (`playerId` non nul).
  const claimed = useMemo(
    () =>
      characters
        .filter((c) => c.campaignId === cid && c.playerId !== null)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [characters, cid],
  );

  // Lignes du tracker d'initiative : uniquement les personnages RÉCLAMÉS par un joueur
  // (`playerId` non nul) de cette campagne — les PNJ du combat sont les bandits ajoutés.
  // Initiative + PV max = stats dérivées (surcharge manuelle prioritaire, comme la fiche) ;
  // la barre de vie édite le VRAI personnage via `upsert` (même état de PV que la fiche,
  // propagé au cloud).
  const characterRows = useMemo<InitiativeRow[]>(
    () =>
      characters
        .filter((c) => c.campaignId === cid && c.playerId !== null)
        .map((character) => {
          const view = buildCharacterDerivedView(character);
          const derived = view.derivedInput ? deriveStats(view.derivedInput) : null;
          const summary = summarize(character);
          const maxHp = character.overrides.maxHp ?? derived?.maxHp ?? 0;
          const initiative = character.overrides.initiative ?? derived?.initiative ?? 0;
          return {
            key: character.id,
            name: summary.name,
            playerName: character.playerId ? playerNameById.get(character.playerId) ?? null : null,
            profileLabel: summary.characterClass,
            profileColor: classColor(summary.classId),
            portraitSrc: `/classes/${summary.classId}${character.portraitVariant === 'alt' ? '-2' : ''}.webp`,
            initiative,
            maxHp,
            depletion: character.depletion,
            onDamage: (amount: number, kind: DamageKind) =>
              upsert({ ...character, depletion: applyDamage(character.depletion, amount, kind, maxHp) }),
            onHeal: (amount: number) => upsert({ ...character, depletion: healHp(character.depletion, amount) }),
            onReset: () => upsert({ ...character, depletion: resetHp(character.depletion) }),
            persistKey: `gm-init:${character.id}`,
          };
        }),
    [characters, cid, upsert, playerNameById],
  );

  // Lignes des créatures ajoutées (PV suivis en local, non persistés). Init./PV lus
  // depuis le blob du bestiaire ; tant que le blob n'est pas chargé, l'instance n'a pas
  // encore de ligne d'initiative (la carte affiche un squelette en attendant).
  const creatureRows: InitiativeRow[] = labeledCreatures.flatMap((inst) => {
    const blob = blobs[inst.slug];
    if (!blob) return [];
    const maxHp = blob.hitPoints ?? 0;
    const initiative = blob.initiative ?? 0;
    const depletion = depletions[inst.id] ?? {};
    const nc = creatureNcLabel(blob);
    return [
      {
        key: inst.id,
        name: inst.label,
        profileLabel: nc ? `NC ${nc}` : 'PNJ',
        profileColor: CREATURE_ACCENT,
        initiative,
        maxHp,
        depletion,
        onDamage: (amount: number, kind: DamageKind) =>
          setCreatureDepletion(inst.id, applyDamage(depletion, amount, kind, maxHp)),
        onHeal: (amount: number) => setCreatureDepletion(inst.id, healHp(depletion, amount)),
        onReset: () => setCreatureDepletion(inst.id, resetHp(depletion)),
        persistKey: `gm-init:${inst.id}`,
      },
    ];
  });

  // Ordre d'initiative décroissant (tri stable : à égalité, l'ordre d'entrée est conservé).
  const initiativeRows = [...characterRows, ...creatureRows].sort((a, b) => b.initiative - a.initiative);

  const campaignsLoading = campaignsStatus === 'idle' || campaignsStatus === 'loading';
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
        {claimed.length === 0 && creatures.length === 0 ? (
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

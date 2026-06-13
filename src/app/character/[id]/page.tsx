'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ancestryById, classById, families, featureById } from '@/data';
import type { DerivedInput } from '@/lib/engine';
import type { AbilityId } from '@/data/schema';
import type { Character, EquipmentLine, Identity } from '@/lib/character/types';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { ClassIcon } from '@/components/ClassIcon';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import { classColor } from '@/lib/ui/classColors';
import { SheetSection } from '@/components/sheet/SheetSection';
import { AbilitiesGrid } from '@/components/sheet/AbilitiesGrid';
import { FeaturesByPath } from '@/components/sheet/FeaturesByPath';
import { EquipmentList } from '@/components/sheet/EquipmentList';
import { IdentityFields } from '@/components/sheet/IdentityFields';
import { IdentityEditor } from '@/components/sheet/IdentityEditor';
import { useCharactersStore } from '@/stores/characters';

const familyById = new Map(families.map((f) => [f.id, f]));

export default function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const character = useCharactersStore((s) => s.characters.find((c) => c.id === id));
  const upsert = useCharactersStore((s) => s.upsert);
  const [editing, setEditing] = useState(false);

  // Parallax léger sur les illustrations de l'en-tête. Pour rester fluide, on
  // écrit le transform directement sur le DOM (pas de state React → pas de
  // re-render à chaque pixel) et on throttle via requestAnimationFrame.
  const ancestryImgRef = useRef<HTMLImageElement>(null);
  const classImgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      // On conserve les transforms de base (centrage) et on y ajoute le décalage.
      if (ancestryImgRef.current) {
        ancestryImgRef.current.style.transform = `translateY(calc(-50% + ${y * 0.5}px))`;
      }
      if (classImgRef.current) {
        classImgRef.current.style.transform = `translateX(-50%) translateY(${y * 0.5}px)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update(); // position initiale
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

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

  // Sauvegarde permissive : chaque modification persiste immédiatement (le store
  // applique `updatedAt`). La fiche n'empêche aucun écart aux règles (PER-45).
  const update = (patch: Partial<Character>) => upsert({ ...character, ...patch });
  const setAbility = (abilityId: AbilityId, value: number) =>
    update({ abilities: { ...character.abilities, [abilityId]: value } });
  const setIdentity = (identityPatch: Partial<Identity>) =>
    update({ identity: { ...character.identity, ...identityPatch } });
  const setEquipment = (equipment: EquipmentLine[]) => update({ equipment });
  const setFeatureIds = (featureIds: string[]) => update({ featureIds });

  const derivedInput: DerivedInput | null = family
    ? {
        abilities: character.abilities,
        level: character.level,
        family,
        defenseEquipment: defenseFromEquipment(character.equipment),
        spellCount: character.featureIds.filter((fid) => featureById.get(fid)?.isSpell).length,
      }
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
          <Button
            color="inherit"
            startIcon={editing ? <DoneIcon /> : <EditIcon />}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Terminer' : 'Modifier'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* En-tête : nom + peuple · profil · niveau, encadré par les illustrations
              du peuple (gauche) et du profil (droite), en filigrane semi-transparent */}
          <Box sx={{ position: 'relative' }}>
            {ancestry && (
              <Box
                component="img"
                ref={ancestryImgRef}
                src={`/ancestries/${ancestry.id}-vitruve.webp`}
                alt=""
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: '75%',
                  right: '100%',
                  mr: -4,
                  transform: 'translateY(-50%)',
                  willChange: 'transform',
                  height: '300%',
                  width: 'auto',
                  opacity: 0.4,
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />
            )}
            {characterClass && (
              <Box
                component="img"
                ref={classImgRef}
                src={`/classes/${characterClass.id}${
                  character.portraitVariant === 'alt' ? '-2' : ''
                }.webp`}
                alt=""
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: '100%',
                  transform: 'translateX(-50%)',
                  willChange: 'transform',
                  height: 600,
                  width: 'auto',
                  opacity: 0.4,
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />
            )}
            <Typography
              variant="h4"
              component="h2"
              sx={{ fontWeight: 'bold', position: 'relative', zIndex: 1 }}
            >
              {character.name || 'Sans nom'}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                color: 'text.secondary',
                flexWrap: 'wrap',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Typography variant="body1" component="span">
                {ancestry?.name ?? 'Peuple à définir'} ·
              </Typography>
              {characterClass && <ClassIcon classId={characterClass.id} size={20} />}
              <Typography
                variant="body1"
                component="span"
                sx={{
                  color: characterClass ? classColor(characterClass.id) : 'text.secondary',
                  fontWeight: 600,
                }}
              >
                {characterClass?.name ?? 'Profil à définir'}
              </Typography>
              <Typography variant="body1" component="span">
                · niveau {character.level}
              </Typography>
            </Stack>

            {/* Bascule entre l'illustration de profil standard et son alternative
                (-2), uniquement en mode édition. */}
            {editing && characterClass && (
              <Tooltip title="Changer l’illustration du profil">
                <IconButton
                  size="small"
                  onClick={() =>
                    update({
                      portraitVariant:
                        character.portraitVariant === 'alt' ? 'default' : 'alt',
                    })
                  }
                  sx={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}
                >
                  <SwapHorizIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <SheetSection
            title="Caractéristiques"
            sx={(theme) => ({ bgcolor: alpha(theme.palette.background.default, 0.75) })}
          >
            <AbilitiesGrid
              abilities={character.abilities}
              onChange={editing ? setAbility : undefined}
            />
          </SheetSection>

          <SheetSection title="Statistiques dérivées">
            {derivedInput ? (
              <DerivedStatsGrid input={derivedInput} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Profil incomplet : statistiques dérivées indisponibles.
              </Typography>
            )}
          </SheetSection>

          <SheetSection title="Voies & capacités">
            <FeaturesByPath
              featureIds={character.featureIds}
              classId={character.classId}
              onChange={editing ? setFeatureIds : undefined}
            />
          </SheetSection>

          <SheetSection title="Équipement">
            <EquipmentList
              equipment={character.equipment}
              onChange={editing ? setEquipment : undefined}
            />
          </SheetSection>

          <SheetSection title="Identité">
            {editing ? (
              <IdentityEditor
                name={character.name}
                level={character.level}
                identity={character.identity}
                onName={(name) => update({ name })}
                onLevel={(level) => update({ level })}
                onIdentity={setIdentity}
              />
            ) : (
              <IdentityFields identity={character.identity} />
            )}
          </SheetSection>

          {(editing || character.notes) && (
            <SheetSection title="Notes">
              {editing ? (
                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  placeholder="Notes libres du joueur…"
                  value={character.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {character.notes}
                </Typography>
              )}
            </SheetSection>
          )}
        </Stack>
      </Container>
    </>
  );
}

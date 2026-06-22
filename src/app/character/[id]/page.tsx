'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ancestryById, classById, families, featureById, progression } from '@/data';
import type { DerivedInput } from '@/lib/engine';
import { checkCompliance, deriveStats } from '@/lib/engine';
import type { AbilityId } from '@/data/schema';
import type { Character, DerivedStatId, EquipmentLine, Identity } from '@/lib/character/types';
import { modifierDeltas } from '@/lib/character/ancestry';
import { familyHpGains, hpLevelGains, level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { canUndoLastLevelUp, manualFeatureIds, undoLastLevelUp } from '@/lib/character/levelUp';
import {
  abilityBonusDiceFromFeatures,
  abilityModSources,
  abilityModsFromFeatures,
  effectContext,
  modsFromFeatures,
  pruneEffectInputs,
  pruneEffectToggles,
  pruneUsageCounters,
  setEffectToggle,
  testBonusSources,
} from '@/lib/character/effects';
import { effectiveFeatureIdsForMods, pruneFeatureChoices, setFeatureChoice } from '@/lib/character/choices';
import type { FeatureChoiceSelection } from '@/lib/character/types';
import { rulesContext } from '@/lib/character/rulesContext';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { ClassIcon } from '@/components/ClassIcon';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import { classColor } from '@/lib/ui/classColors';
import { SheetSection } from '@/components/sheet/SheetSection';
import { AbilitiesGrid } from '@/components/sheet/AbilitiesGrid';
import { TestDomainsPanel } from '@/components/sheet/TestDomainsPanel';
import {
  ConcentrationToggle,
  FeaturesByPath,
  FeaturesLayoutToggle,
} from '@/components/sheet/FeaturesByPath';
import type { FeaturesLayout } from '@/components/sheet/FeaturesByPath';
import { EquipmentList } from '@/components/sheet/EquipmentList';
import { IdentityFields } from '@/components/sheet/IdentityFields';
import { IdentityEditor } from '@/components/sheet/IdentityEditor';
import { ComplianceWarnings } from '@/components/sheet/ComplianceWarnings';
import { LevelUpDialog } from '@/components/sheet/LevelUpDialog';
import { LevelHistory } from '@/components/sheet/LevelHistory';
import { useCharactersStore } from '@/stores/characters';

const familyById = new Map(families.map((f) => [f.id, f]));

export default function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const character = useCharactersStore((s) => s.characters.find((c) => c.id === id));
  const upsert = useCharactersStore((s) => s.upsert);
  const [editing, setEditing] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [voiesLayout, setVoiesLayout] = useState<FeaturesLayout>('columns');
  // Concentration accrue (p. 228) : état de jeu transitoire (non persisté), comme
  // l'affichage des voies. Quand actif, les sorts en (A) montrent leur coût réduit.
  const [concentration, setConcentration] = useState(false);
  const [createdToast, setCreatedToast] = useState(false);

  // Confirmation « fin de wizard » : le wizard redirige avec `?created=1`. On
  // affiche un retour clair puis on nettoie l'URL pour ne pas le rejouer au
  // rechargement. Lecture directe de l'URL (pas de useSearchParams) pour éviter
  // d'imposer une frontière Suspense au prerendu.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('created') === '1') {
      // Lecture unique d'un paramètre d'URL côté client (impossible en
      // initialiseur d'état sans décalage d'hydratation SSR) : synchronisation
      // ponctuelle d'un système externe, pas une boucle de rendu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreatedToast(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

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
        <title>Personnage introuvable — Éditeur de personnage CO2</title>
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
  // Édition d'une caractéristique finale : on réajuste la valeur de base pour
  // conserver l'invariant « base + modificateurs de peuple = total » (le détail
  // affiché reste exact). Le modificateur de peuple, lui, ne bouge pas.
  const setAbility = (abilityId: AbilityId, value: number) => {
    const delta = ancestry ? modifierDeltas(ancestry, character.ancestryChoices)[abilityId] : 0;
    update({
      abilities: { ...character.abilities, [abilityId]: value },
      baseAbilities: { ...character.baseAbilities, [abilityId]: value - delta },
    });
  };
  const setIdentity = (identityPatch: Partial<Identity>) =>
    update({ identity: { ...character.identity, ...identityPatch } });
  const setEquipment = (equipment: EquipmentLine[]) => update({ equipment });
  // L'édition des capacités élague les choix orphelins (capacité retirée → ses
  // choix persistés sont supprimés), pour ne pas conserver de choix fantôme.
  const setFeatureIds = (featureIds: string[]) =>
    update({
      featureIds,
      featureChoices: pruneFeatureChoices(character.featureChoices, featureIds),
      effectToggles: pruneEffectToggles(character.effectToggles, featureIds),
      effectInputs: pruneEffectInputs(character.effectInputs, featureIds),
      usageCounters: pruneUsageCounters(character.usageCounters, featureIds),
    });
  // Résolution rétroactive d'un choix porté par une capacité (PER-66/68). La
  // fiche est permissive : on persiste sans bloquer (recalcul en direct).
  const setChoice = (featureId: string, index: number, value: FeatureChoiceSelection) =>
    update({ featureChoices: setFeatureChoice(character, featureId, index, value) });
  // Bascule d'un interrupteur d'effet conditionnel/temporaire (PER-67). Recalcul
  // en direct : le moteur n'inclut l'effet que lorsqu'il est actif.
  const setEffectToggleValue = (featureId: string, index: number, active: boolean) =>
    update({ effectToggles: setEffectToggle(character, featureId, index, active) });
  // Saisie libre d'état de jeu corrélée à une capacité (PER-70, ex. animal de Forme
  // animale). Une chaîne vide supprime la clé (pas de note fantôme).
  const setEffectInputValue = (featureId: string, value: string) => {
    const next = { ...character.effectInputs };
    if (value.trim() === '') delete next[featureId];
    else next[featureId] = value;
    update({ effectInputs: next });
  };
  // Décompte d'une capacité à usages limités (PER-70, ex. Les sept vies du chat).
  // Borné à [0, max] ; au maximum, on supprime la clé (= compteur plein par défaut).
  const setUsageCounterValue = (featureId: string, value: number) => {
    const max = featureById.get(featureId)?.usageCounter?.max ?? 0;
    const clamped = Math.max(0, Math.min(max, value));
    const next = { ...character.usageCounters };
    if (clamped >= max) delete next[featureId];
    else next[featureId] = clamped;
    update({ usageCounters: next });
  };
  // Surcharge d'une stat dérivée (PER-48) : une valeur force le calcul, `null`
  // supprime la clé et rétablit le calcul automatique.
  const setOverride = (key: DerivedStatId, value: number | null) => {
    const next = { ...character.overrides };
    if (value === null) delete next[key];
    else next[key] = value;
    update({ overrides: next });
  };

  // Conformité aux règles : recalculée à chaque rendu (donc en direct pendant
  // l'édition). Non bloquante — simple aide affichée (PER-47).
  const warnings = checkCompliance(character, rulesContext);

  // Capacités acquises + capacités empruntées par choix : base de l'agrégation
  // des bonus plats et du détail des stats dérivées (PER-66).
  const modFeatureIds = effectiveFeatureIdsForMods(character);
  // Contexte d'effets (PER-67) : résout les valeurs scalantes et n'inclut que les
  // effets conditionnels dont l'interrupteur est actif.
  const effectCtx = effectContext(character);
  // Modificateurs permanents de caractéristiques et dés bonus apportés par les
  // capacités (mécanique core) — appliqués PAR-DESSUS la valeur saisie des caracs.
  const abilityMods = abilityModsFromFeatures(modFeatureIds, character.featureChoices);
  const abilityModSrc = abilityModSources(modFeatureIds, character.featureChoices);
  const bonusDieSrc = abilityBonusDiceFromFeatures(modFeatureIds);
  // Bonus de compétence par domaine de test (PER-89) — règle de cumul du livre (p. 203).
  const testBonuses = testBonusSources(modFeatureIds, effectCtx);

  const derivedInput: DerivedInput | null = family
    ? {
        // Caractéristiques EFFECTIVES (saisie + modificateurs permanents de
        // capacités, ex. Endurer +1 CON) — c'est la vraie carac qui alimente les
        // stats dérivées (PV, dés de récup., DEF, attaques…). Cf. `effectiveAbilities`.
        abilities: effectCtx.abilities,
        level: character.level,
        family,
        defenseEquipment: defenseFromEquipment(character.equipment),
        spellCount: character.featureIds.filter((fid) => featureById.get(fid)?.isSpell).length,
        // Bonus des capacités acquises (PER-63) ET des capacités empruntées par un
        // choix « capacité d'une autre voie » (PER-66). Le contexte (PER-67) résout
        // les valeurs scalantes et n'ajoute les effets conditionnels que s'ils sont
        // activés.
        mods: modsFromFeatures(modFeatureIds, effectCtx),
        // PV des niveaux mixtes d'un profil hybride (p. 177) ; identique à la
        // formule mono-famille pour un profil classique.
        hpFamilyGains: familyHpGains(character, rulesContext),
        // PV de base d'un profil hybride créé au niveau 1 (somme des deux
        // familles, p. 180) ; identique à 2 × baseHp pour un profil classique.
        hpLevel1Family: level1FamilyHp(character, rulesContext),
        // Détail par famille pour l'infobulle (vide hors hybridation).
        hpLevel1Families: level1HybridFamilies(character, rulesContext),
        // Détail du gain de PV niveau par niveau, pour l'infobulle.
        hpLevelGains: hpLevelGains(character, rulesContext),
      }
    : null;

  // Stats dérivées finales du MAÎTRE (mods inclus), avec surcharges manuelles pour les
  // stats recopiées par les profils de créature (Init., attaque). Sert aux mini-fiches
  // de compagnons (golem, familier, démon…), dont l'Init/attaque = celle du maître.
  const masterDerived = derivedInput
    ? (() => {
        const s = deriveStats(derivedInput);
        const ov = character.overrides;
        return { ...s, initiative: ov.initiative ?? s.initiative, magicAttack: ov.magicAttack ?? s.magicAttack };
      })()
    : undefined;

  return (
    <>
      {/* Titre de l'onglet = nom du personnage. Rendu déclaratif (React 19 le
          hisse dans le <head>) plutôt que document.title dans un effet : sinon
          la métadonnée en streaming de Next réécrase le titre après hydratation
          (clignotement nom → titre de base). Réactif : suit l'édition du nom. */}
      <title>{`${character.name || 'Sans nom'} — Éditeur de personnage CO2`}</title>
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
            {editing ? (
              <TextField
                value={character.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Sans nom"
                variant="standard"
                fullWidth
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  '& .MuiInputBase-input': {
                    fontSize: (theme) => theme.typography.h4.fontSize,
                    fontWeight: 'bold',
                  },
                }}
              />
            ) : (
              <Typography
                variant="h4"
                component="h2"
                sx={{ fontWeight: 'bold', position: 'relative', zIndex: 1 }}
              >
                {character.name || 'Sans nom'}
              </Typography>
            )}
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

            {/* Montée de niveau (PER-49) : toujours accessible. Le niveau max (20)
                est une borne d'UI souple — on désactive simplement le bouton. */}
            <Box sx={{ mt: 1.5, position: 'relative', zIndex: 1 }}>
              <Tooltip
                title={
                  character.level >= progression.maxLevel
                    ? `Niveau maximum (${progression.maxLevel}) atteint`
                    : ''
                }
              >
                <span>
                  <Button
                    variant="contained"
                    startIcon={<UpgradeIcon />}
                    disabled={character.level >= progression.maxLevel}
                    onClick={() => setLevelUpOpen(true)}
                  >
                    Monter au niveau suivant
                  </Button>
                </span>
              </Tooltip>
            </Box>

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

          <ComplianceWarnings warnings={warnings} />

          <SheetSection
            title="Caractéristiques"
            sx={(theme) => ({ bgcolor: alpha(theme.palette.background.default, 0.75) })}
          >
            <AbilitiesGrid
              abilities={character.abilities}
              onChange={editing ? setAbility : undefined}
              baseAbilities={character.baseAbilities}
              ancestry={ancestry}
              ancestryChoices={character.ancestryChoices}
              abilityMods={abilityMods}
              abilityModSources={abilityModSrc}
              bonusDieSources={bonusDieSrc}
            />
          </SheetSection>

          <SheetSection title="Statistiques dérivées">
            {derivedInput ? (
              <DerivedStatsGrid
                input={derivedInput}
                featureIds={modFeatureIds}
                effectContext={effectCtx}
                overrides={character.overrides}
                onOverride={editing ? setOverride : undefined}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Profil incomplet : statistiques dérivées indisponibles.
              </Typography>
            )}
          </SheetSection>

          <TestDomainsPanel bonuses={testBonuses} abilities={effectCtx.abilities} />

          <SheetSection
            title="Voies & capacités"
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ConcentrationToggle value={concentration} onChange={setConcentration} />
                <FeaturesLayoutToggle value={voiesLayout} onChange={setVoiesLayout} />
              </Stack>
            }
          >
            <FeaturesByPath
              featureIds={character.featureIds}
              classId={character.classId}
              layout={voiesLayout}
              concentration={concentration}
              abilities={character.abilities}
              level={character.level}
              onChange={editing ? setFeatureIds : undefined}
              manualFeatureIds={manualFeatureIds(character)}
              character={character}
              onChoiceChange={editing ? setChoice : undefined}
              // Les interrupteurs d'effets conditionnels sont des ÉTATS DE JEU
              // transitoires : activables à tout moment, y compris hors édition.
              onToggleEffect={setEffectToggleValue}
              // Saisie libre corrélée (animal de Forme animale) : état de jeu, comme
              // les interrupteurs, donc modifiable hors édition.
              onSetEffectInput={setEffectInputValue}
              // Compteur d'usages limités (Les sept vies du chat) : état de jeu.
              onSetUsageCounter={setUsageCounterValue}
              // Stats du maître : Init./attaque des compagnons recopient ce total.
              masterDerived={masterDerived}
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

          <SheetSection title="Historique des niveaux">
            <LevelHistory
              history={character.levelUpHistory}
              canUndo={canUndoLastLevelUp(character)}
              onUndo={() => upsert(undoLastLevelUp(character))}
            />
          </SheetSection>
        </Stack>
      </Container>

      <LevelUpDialog
        open={levelUpOpen}
        character={character}
        family={family}
        onClose={() => setLevelUpOpen(false)}
        onConfirm={(updated) => {
          upsert(updated);
          setLevelUpOpen(false);
        }}
      />

      <Snackbar
        open={createdToast}
        autoHideDuration={5000}
        onClose={() => setCreatedToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setCreatedToast(false)}
          sx={{ width: '100%' }}
        >
          Personnage créé.
        </Alert>
      </Snackbar>
    </>
  );
}

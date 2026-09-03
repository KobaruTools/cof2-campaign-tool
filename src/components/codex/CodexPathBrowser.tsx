'use client';

/**
 * Navigateur « Voies » du Codex (PER-418) — consultation en LECTURE SEULE de TOUTES les voies
 * (peuple, mage, profil, prestige), SANS personnage. Réutilise `PathFeatureCard` (PER-417) pour
 * le corps de chaque rang : sans `abilities`/`level`, le composant retombe naturellement sur son
 * rendu non-enrichi existant (rien à coder pour ce cas).
 *
 * GATING : `paths`/`ancestries`/`classes` (`@/data`) sont des registres FUSIONNÉS EN PLACE par le
 * contenu payant (`src/data/contentRegistry.ts`) — une voie du Compagnon non entitlée n'y est
 * JAMAIS chargée, donc jamais listée ici (aucun filtre à écrire, cf. incident PER-396). Seule la
 * RÉACTIVITÉ doit être gérée : `useContentVersion()` force le re-rendu quand un lot payant arrive
 * après le premier rendu (même patron que `FeaturesByPath.tsx`).
 *
 * URL PARTAGEABLE : `?id=<pathId>` sur `/codex/voies`, en VRAIES ancres (`NextLink`), jamais un
 * `router.push` manuel — patron de `ReferenceBrowser.tsx`/`referenceSectionHref`.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ancestries, classes, families, featureById, isPaidPathId, pathById, paths } from '@/data';
import { PRESTIGE_CATEGORIES, type Path, type PrestigeCategory } from '@/data/schema';
import { useContentVersion } from '@/lib/content/useContentVersion';
import { codexPathHref } from '@/lib/ui/codex';
import {
  ANCESTRY_COLOR,
  ANCESTRY_MARKER_COLOR,
  MAGE_PATH_COLOR,
  classColor,
  prestigeCategoryColor,
} from '@/lib/ui/classColors';
import { prestigeStaticBorderSx } from '@/lib/ui/prestigeStyle';
import { AncestryIcon } from '@/components/AncestryIcon';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { ClassIcon } from '@/components/ClassIcon';
import { RankBadge } from '@/components/RankBadge';
import { SourceRef } from '@/components/SourceRef';
import { ActionMarkerHex } from '@/components/FeatureMarkerHex';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { PathFeatureCard } from '@/components/sheet/PathFeatureCard';
import { useFeatureNameDecliner } from '@/components/sheet/FeatureDeclension';
import { CodexFeatureChoices } from '@/components/codex/CodexChoiceSummary';
import { CollapsibleFeatureBody } from '@/components/codex/CollapsibleFeatureBody';

type CodexTab = 'ancestry' | 'class' | 'prestige';

/** Exporté : réutilisé par `CodexAbilityBrowser` (grille exhaustive, PER-445) pour grouper le
 * sélecteur de voies par famille de prestige — même libellé, une seule source de vérité. */
export const PRESTIGE_CATEGORY_LABELS: Record<PrestigeCategory, string> = {
  generic: 'Génériques',
  adventurer: 'Aventuriers',
  fighter: 'Combattants',
  mage: 'Mages',
  mystic: 'Mystiques',
};

interface PathGroup {
  key: string;
  label: string;
  color: string;
  /** Fonction plutôt qu'élément figé : permet de redemander l'icône à une AUTRE taille (en-tête
   * de la voie sélectionnée, doublée par rapport au sélecteur) sans dupliquer sa construction. */
  icon: (size: number) => ReactNode;
  items: Path[];
}

function tabOfPathType(type: Path['type']): CodexTab {
  if (type === 'class') return 'class';
  if (type === 'prestige') return 'prestige';
  return 'ancestry'; // 'ancestry' | 'mage'
}

const panelSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
} as const;

function SelectorGroup({
  group,
  selectedPathId,
  onNavigate,
}: {
  group: PathGroup;
  selectedPathId: string | undefined;
  /** Appelé au clic sur une voie (ferme le tiroir mobile) ; sans effet sur le sélecteur desktop. */
  onNavigate?: () => void;
}) {
  if (group.items.length === 0) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5, color: group.color }}>
        {group.icon(18)}
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {group.label}
        </Typography>
      </Stack>
      <Stack spacing={0.25}>
        {group.items.map((path) => {
          const active = path.id === selectedPathId;
          return (
            <Box
              key={path.id}
              component={NextLink}
              href={codexPathHref(path.id)}
              onClick={onNavigate}
              sx={{
                display: 'block',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                textDecoration: 'none',
                color: active ? 'text.primary' : 'text.secondary',
                bgcolor: active ? alpha(group.color, 0.18) : 'transparent',
                borderLeft: `3px solid ${active ? group.color : 'transparent'}`,
                '&:hover': { bgcolor: alpha(group.color, 0.1) },
              }}
            >
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: active ? 700 : 400, flexGrow: 1, minWidth: 0 }}>
                  {path.name}
                </Typography>
                {isPaidPathId(path.id) && (
                  <AppTooltip title="Voie du Compagnon">
                    <AutoStoriesOutlinedIcon sx={{ fontSize: 15, flexShrink: 0, opacity: 0.8 }} />
                  </AppTooltip>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

/** Groupes de la voie du peuple : un par `Ancestry` + la voie du mage à part. `contentVersion` en
 * dépendance (PER-419 retours) : `ancestryPathLinks` payant (PER-324, ex. voie du demi-elfe du
 * Compagnon) MUTE `ancestryPathIds` EN PLACE sur l'instance déjà lue ici — sans cette dépendance,
 * le memo reste figé sur le premier rendu et ignore la voie rattachée après coup. */
function useAncestryGroups(contentVersion: number): PathGroup[] {
  return useMemo(() => {
    const groups: PathGroup[] = ancestries.map((a) => ({
      key: a.id,
      label: a.name,
      color: ANCESTRY_COLOR,
      icon: (size: number) => <AncestryIcon ancestryId={a.id} size={size} color={ANCESTRY_COLOR} />,
      // `a.id` en plus de `ancestryPathIds` (dédoublonné) : certaines voies payantes de
      // REMPLACEMENT (PER-324, voie du demi-elfe du Compagnon) portent le MÊME id que le
      // peuple lui-même plutôt qu'un rattachement `ancestryPathLinks` — absentes sinon.
      items: [...new Set([...a.ancestryPathIds, a.id])]
        .map((id) => pathById.get(id))
        .filter((p): p is Path => !!p),
    }));
    const mage = paths.filter((p) => p.type === 'mage');
    if (mage.length > 0) {
      groups.push({
        key: 'mage',
        label: 'Voie du mage',
        color: MAGE_PATH_COLOR,
        icon: (size: number) => <AncestryIcon ancestryId="mage" size={size} color={MAGE_PATH_COLOR} />,
        items: mage,
      });
    }
    return groups;
  }, [contentVersion]);
}

/** Groupes de la voie de profil : un par `CharacterClass`, familles dans l'ordre du livre.
 * `contentVersion` en dépendance : mêmes raisons que `useAncestryGroups` (registres payants
 * fusionnés en place après le premier rendu). */
function useClassGroups(contentVersion: number): PathGroup[] {
  return useMemo(() => {
    const groups: PathGroup[] = [];
    for (const family of families) {
      const familyClasses = classes.filter((c) => c.familyId === family.id);
      for (const cls of familyClasses) {
        const items = paths.filter((p) => p.type === 'class' && p.classIds.includes(cls.id));
        groups.push({
          key: cls.id,
          label: cls.name,
          color: classColor(cls.id),
          icon: (size: number) => <ClassIcon classId={cls.id} size={size} color={classColor(cls.id)} />,
          items,
        });
      }
    }
    return groups;
  }, [contentVersion]);
}

/** Groupes de la voie de prestige : une par famille (table récapitulative p. 128).
 * `contentVersion` en dépendance : mêmes raisons que `useAncestryGroups`. */
function usePrestigeGroups(contentVersion: number): PathGroup[] {
  return useMemo(() => {
    return PRESTIGE_CATEGORIES.map((category) => {
      const color = prestigeCategoryColor(category);
      return {
        key: category,
        label: PRESTIGE_CATEGORY_LABELS[category],
        color,
        icon: (size: number) => (
          <Box sx={{ width: size, height: size, borderRadius: '50%', ...prestigeStaticBorderSx(1.5, '50%', color) }}>
            <AncestryIcon ancestryId="prestige" size={size} color={color} />
          </Box>
        ),
        items: paths.filter((p) => p.type === 'prestige' && p.category === category),
      };
    });
  }, [contentVersion]);
}

export function CodexPathBrowser() {
  // Nom décliné des capacités (PER-454) : chevalier dragon (p. 147) et élémentaliste portent des
  // tokens de déclinaison dans `feature.name` lui-même (ex. « Résistance %toThe% »). Aucun
  // personnage dans le Codex → repli automatique sur le texte imprimé (rouge/feu).
  const declineFeatureName = useFeatureNameDecliner();
  // Réactivité au contenu payant : une voie du Compagnon qui arrive APRÈS le premier rendu
  // (fetch réseau, cf. PER-321) doit apparaître sans rechargement manuel — passé aux groupes
  // ci-dessous en dépendance de memo (PER-419 retours, sinon ignoré, cf. commentaires des hooks).
  const contentVersion = useContentVersion();
  // Tiroir du sélecteur mobile (PER-419 retours) : fermé par défaut, ouvert au clic sur le
  // bouton compact, refermé après le choix d'une voie (`SelectorGroup.onNavigate`).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const requestedPath = requestedId ? pathById.get(requestedId) : undefined;
  // Défilement direct sur un RANG précis (PER-72 suite : bouton codex de la puce `SourceRef`,
  // `?rank=<featureId>`, cf. `featureCodexHref`) — l'ancre est posée sur chaque carte de rang
  // ci-dessous (`codex-rank-<featureId>`).
  const requestedRankFeatureId = searchParams.get('rank');

  const ancestryGroups = useAncestryGroups(contentVersion);
  const classGroups = useClassGroups(contentVersion);
  const prestigeGroups = usePrestigeGroups(contentVersion);

  const firstAncestryPath = ancestryGroups.flatMap((g) => g.items)[0];
  const selectedPath = requestedPath ?? firstAncestryPath;

  const [tab, setTab] = useState<CodexTab>(() =>
    selectedPath ? tabOfPathType(selectedPath.type) : 'ancestry',
  );
  // Onglet suivi mais pas forcé : il ne se resynchronise sur la voie sélectionnée que quand
  // celle-ci CHANGE (clic sur un lien de voie) — pas à chaque rendu, sinon cliquer un onglet
  // qui ne contient pas la voie affichée y ramènerait aussitôt (onglet inerte). Ajusté PENDANT
  // le rendu (patron React officiel « adjusting state when a prop changes »), pas dans un effet.
  const [lastRequestedId, setLastRequestedId] = useState(requestedId);
  if (requestedId !== lastRequestedId) {
    setLastRequestedId(requestedId);
    if (requestedPath) setTab(tabOfPathType(requestedPath.type));
  }

  const groups = tab === 'ancestry' ? ancestryGroups : tab === 'class' ? classGroups : prestigeGroups;

  // Groupe (couleur + icône) de la voie sélectionnée — même groupe que sa ligne dans le
  // sélecteur, cherché plutôt que recalculé pour rester identique en tout point. Le groupe DÉDIÉ
  // (`key` = id de la voie, ex. « elfe-haut ») est prioritaire sur un simple match par `items` :
  // certains peuples sans voie propre (demi-elfe, encadré p. 46) LISTENT les voies d'un autre
  // peuple parmi leurs choix (`ancestryPathIds: ['humain', 'elfe-sylvain', 'elfe-haut']`) — sans
  // cette priorité, une voie partagée retombait sur le premier groupe qui la liste (« Demi-elfe »,
  // sans icône) au lieu de son groupe dédié.
  const selectedGroup =
    groups.find((g) => g.key === selectedPath?.id) ??
    groups.find((g) => g.items.some((p) => p.id === selectedPath?.id));
  const pathColor = selectedGroup?.color ?? ANCESTRY_MARKER_COLOR;

  const rankFeatures = selectedPath
    ? selectedPath.featureIds
        .map((id) => featureById.get(id))
        .filter((f): f is NonNullable<typeof f> => !!f)
        .sort((a, b) => a.rank - b.rank)
    : [];

  // Défile jusqu'au rang ciblé une fois ses capacités rendues (dépend de `rankFeatures`,
  // recalculées via `selectedPath` : attendre son id en dépendance suffit, l'effet re-tourne
  // dès que la bonne voie est affichée). `scrollIntoView({ block: 'start' })` seul cale le rang
  // SOUS le bord haut du viewport, pas sous l'`AppBar` collée (`position: sticky`) qui le
  // recouvrirait — on mesure sa hauteur réelle et on vise nous-mêmes le bon `scrollTop`, même
  // patron que `scrollToSection` de la page personnage (`src/app/character/[id]/page.tsx`).
  useEffect(() => {
    if (!requestedRankFeatureId) return;
    const el = document.getElementById(`codex-rank-${requestedRankFeatureId}`);
    if (!el) return;
    const headerHeight = document.getElementById('app-header')?.getBoundingClientRect().height ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [requestedRankFeatureId, selectedPath?.id]);

  const tabsNode = (
    <Tabs
      value={tab}
      onChange={(_, value: CodexTab) => setTab(value)}
      variant="fullWidth"
      sx={{ minHeight: 36 }}
    >
      <Tab value="ancestry" label="Peuple" sx={{ minHeight: 36 }} />
      <Tab value="class" label="Profil" sx={{ minHeight: 36 }} />
      <Tab value="prestige" label="Prestige" sx={{ minHeight: 36 }} />
    </Tabs>
  );

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
      {/* Desktop : sélecteur toujours visible. Mobile (retour PER-419, table des matières trop
          longue) : remplacé par un bouton compact ouvrant le même sélecteur en tiroir. */}
      <Box sx={{ ...panelSx, p: 2, width: 320, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ mb: 1.5 }}>{tabsNode}</Box>
        {groups.map((group) => (
          <SelectorGroup key={group.key} group={group} selectedPathId={selectedPath?.id} />
        ))}
      </Box>

      <Button
        onClick={() => setMobileNavOpen(true)}
        variant="outlined"
        color="inherit"
        fullWidth
        endIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{
          display: { xs: 'flex', md: 'none' },
          justifyContent: 'space-between',
          textTransform: 'none',
          px: 2,
          py: 1,
        }}
      >
        {selectedPath ? `Voie : ${selectedPath.name}` : 'Choisir une voie'}
      </Button>
      <Drawer
        anchor="bottom"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        {/* Bloc séparé de la liste (retour PER-419) : collé en haut du tiroir, pleine largeur —
            impossible avec les onglets dans le conteneur repoussé par le padding de la liste.
            `maxHeight` sur l'ENVELOPPE (pas la seule liste) pour que tiroir + onglets ne dépassent
            jamais 80 % de la fenêtre. */}
        <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
          <Box sx={{ bgcolor: 'grey.800', flexShrink: 0 }}>{tabsNode}</Box>
          <Box sx={{ px: 2, pt: 1.5, pb: 2, overflowY: 'auto' }}>
            {groups.map((group) => (
              <SelectorGroup
                key={group.key}
                group={group}
                selectedPathId={selectedPath?.id}
                onNavigate={() => setMobileNavOpen(false)}
              />
            ))}
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ ...panelSx, p: 3, flexGrow: 1, minWidth: 0 }}>
        {!selectedPath ? (
          <Typography color="text.secondary">Sélectionnez une voie dans la colonne de gauche.</Typography>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedGroup?.icon(36)}
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                {selectedPath.name}
              </Typography>
              <SourceRef page={selectedPath.sourcePage} term={selectedPath.name} />
              {isPaidPathId(selectedPath.id) && (
                <AppTooltip title="Voie du Compagnon">
                  <AutoStoriesOutlinedIcon sx={{ fontSize: 20, opacity: 0.8 }} />
                </AppTooltip>
              )}
            </Stack>
            {selectedPath.type === 'prestige' && selectedPath.prerequisites ? (
              <AppAlert severity="warning" icon={<FactCheckOutlinedIcon fontSize="inherit" />} sx={{ mt: 2 }}>
                <Typography variant="body2" component="div">
                  <strong>Prérequis :</strong> <GlossaryRichText>{selectedPath.prerequisites}</GlossaryRichText>
                </Typography>
              </AppAlert>
            ) : null}
            {selectedPath.note ? (
              <AppAlert severity="info" icon={<HistoryEduOutlinedIcon />} sx={{ mt: 2 }}>
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line', lineHeight: 1.55, fontStyle: 'italic' }}>
                  <GlossaryRichText>{selectedPath.note}</GlossaryRichText>
                </Typography>
              </AppAlert>
            ) : null}

            <Stack spacing={2} sx={{ mt: 3 }}>
              {rankFeatures.map((feature) => (
                <Box
                  key={feature.id}
                  id={`codex-rank-${feature.id}`}
                  sx={{ pb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <CollapsibleFeatureBody
                    header={({ overflows, expanded, onToggle }) => (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <RankBadge rank={feature.rank} color={pathColor} prestige={selectedPath.type === 'prestige'} />
                        <Typography variant="h6" component="h3">
                          {declineFeatureName(feature)}
                        </Typography>
                        {feature.isSpell && <ActionMarkerHex marker="spell" />}
                        {feature.actionTypes.map((a) => (
                          <ActionMarkerHex key={a} marker={a} />
                        ))}
                        {overflows && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={onToggle}
                            aria-expanded={expanded}
                            startIcon={
                              <ExpandMoreIcon
                                fontSize="small"
                                sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                              />
                            }
                          >
                            {expanded ? 'Replier' : 'Afficher plus'}
                          </Button>
                        )}
                      </Stack>
                    )}
                    extra={<CodexFeatureChoices feature={feature} />}
                  >
                    <Box sx={{ mt: 1 }}>
                      <PathFeatureCard feature={feature} hideSourcePage />
                    </Box>
                  </CollapsibleFeatureBody>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Box>
    </Stack>
  );
}

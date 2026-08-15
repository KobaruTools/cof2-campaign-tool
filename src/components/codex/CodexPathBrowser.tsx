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
import { useMemo, useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ancestries, classes, families, featureById, pathById, paths } from '@/data';
import { PRESTIGE_CATEGORIES, type Path, type PrestigeCategory } from '@/data/schema';
import { useContentVersion } from '@/lib/content/useContentVersion';
import { codexPathHref } from '@/lib/ui/codex';
import {
  ANCESTRY_COLOR,
  MAGE_PATH_COLOR,
  classColor,
  prestigeCategoryColor,
} from '@/lib/ui/classColors';
import { prestigeStaticBorderSx } from '@/lib/ui/prestigeStyle';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { PageRefText, SourceRef } from '@/components/SourceRef';
import { ActionMarkerHex } from '@/components/FeatureMarkerHex';
import { PathFeatureCard } from '@/components/sheet/PathFeatureCard';
import { CodexFeatureChoices } from '@/components/codex/CodexChoiceSummary';

type CodexTab = 'ancestry' | 'class' | 'prestige';

const PRESTIGE_CATEGORY_LABELS: Record<PrestigeCategory, string> = {
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
  icon: ReactNode;
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
}: {
  group: PathGroup;
  selectedPathId: string | undefined;
}) {
  if (group.items.length === 0) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5, color: group.color }}>
        {group.icon}
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
              <Typography variant="body2" sx={{ fontWeight: active ? 700 : 400 }}>
                {path.name}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

/** Groupes de la voie du peuple : un par `Ancestry` + la voie du mage à part. */
function useAncestryGroups(): PathGroup[] {
  return useMemo(() => {
    const groups: PathGroup[] = ancestries.map((a) => ({
      key: a.id,
      label: a.name,
      color: ANCESTRY_COLOR,
      icon: <AncestryIcon ancestryId={a.id} size={18} color={ANCESTRY_COLOR} />,
      items: a.ancestryPathIds.map((id) => pathById.get(id)).filter((p): p is Path => !!p),
    }));
    const mage = paths.filter((p) => p.type === 'mage');
    if (mage.length > 0) {
      groups.push({
        key: 'mage',
        label: 'Voie du mage',
        color: MAGE_PATH_COLOR,
        icon: <AncestryIcon ancestryId="mage" size={18} color={MAGE_PATH_COLOR} />,
        items: mage,
      });
    }
    return groups;
  }, []);
}

/** Groupes de la voie de profil : un par `CharacterClass`, familles dans l'ordre du livre. */
function useClassGroups(): PathGroup[] {
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
          icon: <ClassIcon classId={cls.id} size={18} color={classColor(cls.id)} />,
          items,
        });
      }
    }
    return groups;
  }, []);
}

/** Groupes de la voie de prestige : une par famille (table récapitulative p. 128). */
function usePrestigeGroups(): PathGroup[] {
  return useMemo(() => {
    return PRESTIGE_CATEGORIES.map((category) => {
      const color = prestigeCategoryColor(category);
      return {
        key: category,
        label: PRESTIGE_CATEGORY_LABELS[category],
        color,
        icon: (
          <Box sx={{ width: 18, height: 18, borderRadius: '50%', ...prestigeStaticBorderSx(1.5, '50%', color) }}>
            <AncestryIcon ancestryId="prestige" size={18} color={color} />
          </Box>
        ),
        items: paths.filter((p) => p.type === 'prestige' && p.category === category),
      };
    });
  }, []);
}

export function CodexPathBrowser() {
  // Réactivité au contenu payant : une voie du Compagnon qui arrive APRÈS le premier rendu
  // (fetch réseau, cf. PER-321) doit apparaître sans rechargement manuel.
  useContentVersion();

  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const requestedPath = requestedId ? pathById.get(requestedId) : undefined;

  const ancestryGroups = useAncestryGroups();
  const classGroups = useClassGroups();
  const prestigeGroups = usePrestigeGroups();

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

  const rankFeatures = selectedPath
    ? selectedPath.featureIds
        .map((id) => featureById.get(id))
        .filter((f): f is NonNullable<typeof f> => !!f)
        .sort((a, b) => a.rank - b.rank)
    : [];

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ ...panelSx, p: 2, width: { xs: '100%', md: 320 }, flexShrink: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, value: CodexTab) => setTab(value)}
          variant="fullWidth"
          sx={{ mb: 1.5, minHeight: 36 }}
        >
          <Tab value="ancestry" label="Peuple" sx={{ minHeight: 36 }} />
          <Tab value="class" label="Profil" sx={{ minHeight: 36 }} />
          <Tab value="prestige" label="Prestige" sx={{ minHeight: 36 }} />
        </Tabs>
        {groups.map((group) => (
          <SelectorGroup key={group.key} group={group} selectedPathId={selectedPath?.id} />
        ))}
      </Box>

      <Box sx={{ ...panelSx, p: 3, flexGrow: 1, minWidth: 0 }}>
        {!selectedPath ? (
          <Typography color="text.secondary">Sélectionnez une voie dans la colonne de gauche.</Typography>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                {selectedPath.name}
              </Typography>
              <SourceRef page={selectedPath.sourcePage} term={selectedPath.name} />
              {selectedPath.type === 'prestige' && (
                <Chip
                  size="small"
                  label={PRESTIGE_CATEGORY_LABELS[selectedPath.category]}
                  sx={{
                    borderColor: prestigeCategoryColor(selectedPath.category),
                    color: prestigeCategoryColor(selectedPath.category),
                  }}
                  variant="outlined"
                />
              )}
            </Stack>
            {selectedPath.type === 'prestige' && selectedPath.prerequisites ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <strong>Prérequis :</strong> <PageRefText>{selectedPath.prerequisites}</PageRefText>
              </Typography>
            ) : null}
            {selectedPath.note ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <PageRefText>{selectedPath.note}</PageRefText>
              </Typography>
            ) : null}

            <Stack spacing={2} sx={{ mt: 3 }}>
              {rankFeatures.map((feature) => (
                <Box
                  key={feature.id}
                  sx={{ pb: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Rang {feature.rank}
                    </Typography>
                    <Typography variant="h6" component="h3">
                      {feature.name}
                    </Typography>
                    {feature.isSpell && <ActionMarkerHex marker="spell" />}
                    {feature.actionTypes.map((a) => (
                      <ActionMarkerHex key={a} marker={a} />
                    ))}
                  </Stack>
                  <Box sx={{ mt: 1 }}>
                    <PathFeatureCard feature={feature} />
                  </Box>
                  <CodexFeatureChoices feature={feature} />
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Box>
    </Stack>
  );
}

'use client';

/**
 * Navigateur « Dieux » du Codex (PER-420) — consultation en LECTURE SEULE du panthéon
 * d'Osgild (`priest-gods.ts`, p. 126-127), SANS personnage. Grille de blocs (retour propriétaire :
 * un sélecteur maître-détail façon Voies était superflu ici — 32 dieux avec peu de champs chacun,
 * pas de progression par rang, une grille scannable en 3-4 colonnes suffit), sur le modèle de
 * `CodexMagicItemsBrowser` (pas de sélection, tout affiché d'un coup).
 *
 * Pas de gating payant à prévoir : `priestGods` est un tableau statique du livre de base,
 * jamais fusionné par `contentRegistry.ts` (contrairement à `paths`/`ancestries`/`classes`).
 *
 * Rythme visuel (retours propriétaire) : le nom du dieu ET l'icône reprennent la couleur/icône de
 * la VOIE d'origine de sa capacité divine (plutôt qu'un texte neutre + `holy-symbol` répété 32
 * fois). Plusieurs dieux partagent le même PROFIL (`classColor()` identique même si leurs voies
 * diffèrent, ex. Orbis/artefacts et Tyriolth/elixirs sont tous deux forgesort) — `shadeForIndex`
 * dédie une teinte par dieu du même groupe (`Origin.colorKey`, cf. `divineFeatureOrigin`) pour
 * rester distinguables sans changer de famille de couleur. UNIQUEMENT plus clair (jamais plus
 * sombre, retour propriétaire) : sur le fond noir des cartes, une teinte assombrie perd trop de
 * contraste.
 */
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { lighten } from '@mui/material/styles';
import { equipmentById, featureById, pathById } from '@/data';
import { priestGods } from '@/data/priest-gods';
import type { PriestGod } from '@/data/schema';
import { MAGE_PATH_COLOR, classColor } from '@/lib/ui/classColors';
import { GOD_DOMAIN_ICON_PATHS } from '@/lib/ui/godDomainIcons';
import type { ItemIconId } from '@/data/item-icons';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { DieIcon } from '@/components/DieIcon';
import { GodDomainIcon } from '@/components/GodDomainIcon';
import { ItemIcon } from '@/components/ItemIcon';
import { PathCard } from '@/components/PathCard';
import { RankBadge } from '@/components/RankBadge';
import { SourceRef } from '@/components/SourceRef';

const cardSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  p: 2.5,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
} as const;

/** Nombre max de lignes avant troncature (`domain`, texte libre du livre de longueur variable) —
 * borne la hauteur du bloc replié pour que la grille reste homogène (retour propriétaire). */
const domainClampSx = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

/**
 * Icône de DOMAINE (pas de voie) pour les dieux déjà couverts par notre bibliothèque
 * d'équipement LOCALE (`item-icons.ts`, aucun nouvel asset) — prioritaire sur l'icône de voie
 * pour casser la répétition. Le reste (thèmes non couverts par `item-icons.ts`, ex. lune,
 * couronne, sablier…) vient de `GOD_DOMAIN_ICON_PATHS` (`godDomainIcons.ts`, dédié, importé
 * directement de game-icons.net — voir `scripts/game-icons/god-domains/`). Volontairement
 * PARTIEL malgré tout : Périnde (fertilité/mères) n'a aucun thème correspondant sur le site
 * source, retombe sur l'icône de voie (`origin.renderIcon`) comme convenu avec le propriétaire.
 */
const DOMAIN_ICON_BY_GOD_ID: Partial<Record<string, ItemIconId>> = {
  arwendee: 'bow', // déesse de la chasse et des archers
  basile: 'ration', // dieu de la gourmandise et de la nourriture
  gaeln: 'instrument', // dieu des arts et des artistes
  guardal: 'shield', // dieu de la loyauté et des gardiens
  hellion: 'lockpicks', // dieu des voleurs et du pillage
  jeweln: 'pick', // dieu des souterrains et des mineurs
  linnarre: 'octopus', // déesse de la mer et des marins
  mondovael: 'backpack', // dieu des nomades et du voyage
  morn: 'scythe', // dieu de la mort et du passage dans l'au-delà
  orbis: 'coins', // dieu du commerce et des marchands
};

/** Nom(s) d'arme(s) sacrée(s), résolus depuis `equipment.ts` — jointure « ou » quand plusieurs
 * ids notent un choix du joueur (ex. arc long ou court, cf. notes de `priest-gods.ts`). */
function sacredWeaponNames(ids: readonly string[]): string {
  return ids.map((id) => equipmentById.get(id)?.name ?? id).join(' ou ');
}

interface Origin {
  pathId: string;
  /** Clé de regroupement pour la teinte (`shadeForIndex`) — le CLASSE/profil, pas la voie :
   * `classColor()` est identique pour toutes les voies d'un même profil (ex. `artefacts` et
   * `elixirs` sont deux voies DIFFÉRENTES du forgesort mais rendent la MÊME couleur), donc deux
   * dieux dont les capacités divines viennent d'un profil partagé doivent être teintés comme un
   * seul groupe même si leurs voies d'origine diffèrent (retour propriétaire : Orbis/Tyriolth,
   * tous deux forgesort, rendus identiques avant ce correctif). */
  colorKey: string;
  name: string;
  baseColor: string;
  renderIcon: (color: string, size: number) => ReactNode;
}

/** Voie/profil d'origine d'une capacité divine : id + nom + couleur de base + icône, pour
 * signaler qu'elle vient d'un AUTRE profil que le prêtre (même logique que
 * `divineSlotReplacement` de `FeaturesByPath.tsx`, sans le contexte personnage/voie d'accueil qui
 * n'existe pas ici). `'mage'` est un `type` de `Path` À PART de `'class'` (voie du peuple humain,
 * p. 60) — traité séparément pour retomber sur `MAGE_PATH_COLOR` (bleu-violet) plutôt que le repli
 * neutre. La couleur RETENUE (`shadeForIndex`) est appliquée par l'appelant, pas ici. */
function divineFeatureOrigin(featurePathId: string): Origin {
  const path = pathById.get(featurePathId);
  if (path?.type === 'class') {
    const classId = path.classIds[0];
    const baseColor = classColor(classId);
    return {
      pathId: featurePathId,
      colorKey: classId,
      name: path.name,
      baseColor,
      renderIcon: (color, size) => <ClassIcon classId={classId} size={size} color={color} />,
    };
  }
  if (path?.type === 'mage') {
    return {
      pathId: featurePathId,
      colorKey: 'mage',
      name: path.name,
      baseColor: MAGE_PATH_COLOR,
      renderIcon: (color, size) => <AncestryIcon ancestryId="mage" size={size} color={color} />,
    };
  }
  // Toutes les capacités divines de `priest-gods.ts` proviennent d'une voie de profil ou de la
  // voie du mage — repli défensif seulement, aucun dieu du panthéon n'exerce cette branche.
  return {
    pathId: featurePathId,
    colorKey: featurePathId,
    name: path?.name ?? featurePathId,
    baseColor: '#9e9e9e',
    renderIcon: () => null,
  };
}

/** Teinte distincte par dieu quand plusieurs partagent le même profil d'origine (ex. forgesort :
 * Arshran/Orbis/Tyriolth) — sinon même couleur répétée sans les distinguer. Index 0 : couleur de
 * base inchangée (le premier du groupe reste la teinte « officielle » du profil). Les suivants
 * s'éclaircissent progressivement — UNIQUEMENT plus clair (retour propriétaire : sur le fond noir
 * des cartes, une variante assombrie perd trop de contraste, contrairement à un léger éclaircissement). */
function shadeForIndex(base: string, index: number, count: number): string {
  if (count <= 1 || index === 0) return base;
  const maxShift = 0.5;
  return lighten(base, (index / (count - 1)) * maxShift);
}

/**
 * Icône affichée en tête de carte : priorité au thème du DOMAINE du dieu plutôt qu'à sa voie,
 * pour casser la répétition — trois sources dans l'ordre (`item-icons.ts` local, puis
 * `godDomainIcons.ts` dédié game-icons.net, puis le cas spécial Aurilla/dé), repli final sur
 * l'icône de la voie d'origine de la capacité divine.
 */
function GodIcon({ god, color, origin }: { god: PriestGod; color: string; origin: Origin | undefined }) {
  const localIconId = DOMAIN_ICON_BY_GOD_ID[god.id];
  if (localIconId) return <ItemIcon id={localIconId} size={26} color={color} />;
  if (GOD_DOMAIN_ICON_PATHS[god.id]) return <GodDomainIcon godId={god.id} size={26} color={color} />;
  // Aurilla, déesse de la chance et des aventuriers : aucun thème « dé » assez littéral dans
  // item-icons.ts/game-icons.net à ce jour — on réutilise directement notre propre jeu d'icônes
  // de dés (`DieIcon`, déjà vendored) plutôt que d'en aller chercher un nouveau pour un seul cas.
  if (god.id === 'aurilla') return <DieIcon die="d20" size={26} color={color} noTooltip />;
  return <>{origin?.renderIcon(color, 26)}</>;
}

function GodCard({ god, color, origin }: { god: PriestGod; color: string; origin: Origin | undefined }) {
  const divineFeature = featureById.get(god.divineFeatureId);

  return (
    <Box sx={cardSx}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <GodIcon god={god} color={color} origin={origin} />
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color }}>
          {god.name}
        </Typography>
        <SourceRef page={god.sourcePage} term={god.name} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic', ...domainClampSx }}>
        {god.domain}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1.5 }}>
        <strong>Symbole sacré :</strong> {god.symbol}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        <strong>Arme sacrée :</strong> {sacredWeaponNames(god.sacredWeaponIds)}
      </Typography>

      {/* `mt: 'auto'` (retour propriétaire) : ancre ce bloc + son séparateur en BAS de la carte,
          quelle que soit la longueur du domaine/de l'arme sacrée au-dessus — les cartes de la
          même ligne de grille (hauteur stretchée) alignent alors toutes leur « CAPACITÉ DIVINE »
          à la même hauteur au lieu de suivre la fin naturelle, variable, du texte. `pt` sur ce
          conteneur (PAS sur la ligne elle-même, qui vit sur l'enfant `borderTop`) : espace garanti
          AU-DESSUS du séparateur — `mt: 'auto'` seul ne le garantit pas quand une carte tassée
          laisse peu d'espace disponible à répartir. */}
      {divineFeature && origin && (
        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Box sx={{ pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}
            >
              Capacité divine
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5, mb: 0.75, color }}>
              <RankBadge rank={divineFeature.rank} color={color} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {origin.name}
              </Typography>
            </Stack>
            {/* Carte de capacité repliée par défaut (retour propriétaire) : même patron que
                « Capacités sélectionnées » du wizard de level up (`PathCard`), sans case à
                cocher (`selectable={false}`) — la capacité divine n'est pas un choix ici, juste
                une consultation. `repeatFeatureName={false}` : `name` porte déjà le nom de la
                capacité (pas celui de la voie), pas de répétition à faire dans le détail. */}
            <PathCard
              name={divineFeature.name}
              color={color}
              checked
              selectable={false}
              repeatFeatureName={false}
              rankLabel=""
              borderWidth={1}
              feature={divineFeature}
              sx={{ height: 'auto' }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function CodexGodsBrowser() {
  const sortedGods = useMemo(() => [...priestGods].sort((a, b) => a.name.localeCompare(b.name, 'fr')), []);

  const { origins, colors } = useMemo(() => {
    const originByGodId = new Map<string, Origin | undefined>();
    const groupByColorKey = new Map<string, string[]>();

    for (const god of sortedGods) {
      const feature = featureById.get(god.divineFeatureId);
      const origin = feature ? divineFeatureOrigin(feature.pathId) : undefined;
      originByGodId.set(god.id, origin);
      if (origin) {
        const group = groupByColorKey.get(origin.colorKey) ?? [];
        group.push(god.id);
        groupByColorKey.set(origin.colorKey, group);
      }
    }

    const colorByGodId = new Map<string, string>();
    for (const group of groupByColorKey.values()) {
      group.forEach((godId, index) => {
        const origin = originByGodId.get(godId);
        if (origin) colorByGodId.set(godId, shadeForIndex(origin.baseColor, index, group.length));
      });
    }

    return { origins: originByGodId, colors: colorByGodId };
  }, [sortedGods]);

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        alignItems: 'stretch',
      }}
    >
      {sortedGods.map((god) => (
        <GodCard
          key={god.id}
          god={god}
          color={colors.get(god.id) ?? 'text.primary'}
          origin={origins.get(god.id)}
        />
      ))}
    </Box>
  );
}

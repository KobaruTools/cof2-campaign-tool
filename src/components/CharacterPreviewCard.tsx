'use client';

/**
 * Micro-fiche récapitulative d'un personnage (portrait + identité + les 7
 * caractéristiques en badges compacts). Composant purement présentatif, partagé
 * par la modale d'import (`ImportCharacterDialog`, confirmation d'import) et par
 * l'infobulle de survol des lignes du listing (`CharacterList`) — cette dernière
 * sert notamment à révéler un nom tronqué en entier.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClassIcon } from '@/components/ClassIcon';
import { AbilityIcon } from '@/components/AbilityIcon';
import { featureById, pathById } from '@/data';
import { ABILITY_IDS } from '@/data/schema';
import type { Feature, Path } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { summarize } from '@/lib/character/summary';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { abilityTotalColor } from '@/lib/ui/abilityColors';
import {
  ANCESTRY_COLOR,
  MAGE_PATH_COLOR,
  PRESTIGE_PATH_COLOR,
  classColor,
} from '@/lib/ui/classColors';

export interface CharacterPreviewCardProps {
  character: Character;
  /**
   * Colore les 7 caractéristiques (chiffre ET icône) selon l'échelle fort/faible
   * (`abilityTotalColor`) au lieu du gris neutre. Utilisé par l'écran de MJ pour
   * un résumé plus parlant ; les autres usages (import, infobulle de liste) gardent
   * le rendu neutre par défaut.
   */
  colorAbilities?: boolean;
}

/**
 * Ordre d'affichage des colonnes de voies dans la mini-carte de progression :
 * voie de peuple (ou du mage, qui la remplace) à gauche, voies de profil au
 * milieu, voie de prestige à droite — cohérent avec la fiche (`FeaturesByPath`).
 */
const PATH_TYPE_ORDER: Record<Path['type'], number> = {
  ancestry: 0,
  mage: 0,
  class: 1,
  prestige: 2,
};

/**
 * Nombre de colonnes de la grille des voies : 7 voies possibles au maximum pour
 * un personnage (1 peuple/mage + 5 voies libres + 1 prestige — cf. règles CO2).
 */
const PATH_COLUMN_COUNT = 7;

/** Nombre de rangs (lignes) par voie. */
const PATH_RANK_COUNT = 5;

interface PathColumn {
  name: string | undefined;
  /**
   * Couleur de chaque rang débloqué (index 0 = premier rang débloqué, en haut).
   * Un carré est plein ssi son index est < `rankColors.length`. Normalement la
   * couleur de la voie, sauf pour un rang qui a EMPRUNTÉ une capacité (PER-120) :
   * il prend alors la couleur du profil de la capacité empruntée.
   */
  rankColors: string[];
}

/**
 * Couleur d'une voie selon son type : profil (teinte du profil ; celle du
 * personnage pour ses voies natives, du profil source en hybride), peuple, mage
 * ou prestige. Repli neutre si la voie est inconnue.
 */
function pathColor(path: Path | undefined, classId: string): string {
  if (!path) return '#90a4ae';
  switch (path.type) {
    case 'ancestry':
      return ANCESTRY_COLOR;
    case 'mage':
      return MAGE_PATH_COLOR;
    case 'prestige':
      return PRESTIGE_PATH_COLOR;
    case 'class':
      return classColor(path.classIds.includes(classId) ? classId : path.classIds[0]);
  }
}

/**
 * Couleur du profil de la capacité EMPRUNTÉE par une capacité (choix
 * `feature-from-path` résolu — PER-120, ex. Combattant aguerri prenant une
 * capacité de rang 1 d'une autre voie), ou `undefined` si la capacité n'emprunte
 * rien ou si le choix n'est pas encore fait.
 */
function borrowedColorOf(character: Character, feature: Feature): string | undefined {
  const defs = feature.choices;
  const sels = character.featureChoices?.[feature.id];
  if (!defs || !sels) return undefined;
  for (let i = 0; i < defs.length; i += 1) {
    if (defs[i].kind !== 'feature-from-path') continue;
    const sel = sels[i];
    if (typeof sel !== 'string') continue;
    const borrowed = featureById.get(sel);
    if (borrowed) return pathColor(pathById.get(borrowed.pathId), character.classId);
  }
  return undefined;
}

/**
 * Résume les voies d'un personnage en colonnes de progression : une par voie
 * entamée (dans l'ordre peuple → profils → prestige, puis ordre d'acquisition),
 * chaque rang débloqué portant sa couleur (celle de la voie, ou du profil emprunté
 * pour un rang à capacité empruntée). Les ids inconnus sont ignorés (comme sur la
 * fiche).
 */
function pathColumns(character: Character): PathColumn[] {
  const byPath = new Map<string, { path: Path | undefined; features: Map<number, Feature>; order: number }>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const entry = byPath.get(feature.pathId);
    if (entry) {
      entry.features.set(feature.rank, feature);
    } else {
      byPath.set(feature.pathId, {
        path: pathById.get(feature.pathId),
        features: new Map([[feature.rank, feature]]),
        order: byPath.size,
      });
    }
  }
  // La voie du mage REMPLACE la voie de peuple (p. 60) : elles occupent le même
  // « emplacement de peuple ». Un mage garde toutefois sa capacité de peuple de
  // rang 1 (« Capacité de peuple + occultisme »), qui vit dans une voie de peuple
  // distincte — d'où deux entrées ici. On les fusionne en une seule colonne (rangs
  // réunis) sous la voie du mage, pour ne pas afficher deux colonnes là où il n'y a
  // qu'un emplacement.
  const magePath = [...byPath.values()].find((e) => e.path?.type === 'mage');
  if (magePath) {
    for (const [pathId, entry] of byPath) {
      if (entry.path?.type !== 'ancestry') continue;
      for (const [rank, feature] of entry.features) {
        if (!magePath.features.has(rank)) magePath.features.set(rank, feature);
      }
      byPath.delete(pathId);
    }
  }
  return [...byPath.values()]
    .sort((a, b) => {
      const ta = a.path ? PATH_TYPE_ORDER[a.path.type] : 99;
      const tb = b.path ? PATH_TYPE_ORDER[b.path.type] : 99;
      return ta - tb || a.order - b.order;
    })
    .map((entry) => {
      const baseColor = pathColor(entry.path, character.classId);
      const rankColors = [...entry.features.entries()]
        .sort((a, b) => a[0] - b[0])
        .slice(0, PATH_RANK_COUNT)
        // Un rang qui a emprunté une capacité prend la couleur du profil emprunté.
        .map(([, feature]) => borrowedColorOf(character, feature) ?? baseColor);
      return { name: entry.path?.name, rankColors };
    });
}

export function CharacterPreviewCard({ character, colorAbilities = false }: CharacterPreviewCardProps) {
  const summary = summarize(character);
  return (
    // `minWidth` : sans largeur définie (ex. dans une infobulle qui se dimensionne
    // au contenu), les colonnes `1fr` de la grille des caractéristiques retombent
    // sur la largeur de leur contenu et ne sont plus égales. Une largeur plancher
    // donne aux 7 badges une largeur définie à se répartir → strictement égaux.
    <Stack spacing={2} sx={{ minWidth: 264 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Box
          component="img"
          src={`/classes/${summary.classId}${character.portraitVariant === 'alt' ? '-2' : ''}.webp`}
          alt=""
          aria-hidden
          sx={{
            width: 72,
            height: 72,
            borderRadius: 2,
            objectFit: 'cover',
            objectPosition: 'top',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
          }}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {/* Largeur du nom bridée : sans plafond, un nom long élargissait toute la
              carte. On le laisse passer à la ligne pour garder un bloc compact. */}
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, maxWidth: 200 }}>
            {summary.name}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25 }}>
            <ClassIcon classId={summary.classId} firearmsAllowed={summary.firearmsAllowed} size={18} />
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: classColor(summary.classId), fontWeight: 600 }}>
                {summary.characterClass}
              </Box>{' '}
              · niveau {summary.level}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {summary.ancestry}
          </Typography>
        </Box>

        {/* Micro-grille des voies, à droite du bloc identité (délibérément séparée
            des badges de carac pour ne pas suggérer un lien avec ceux-ci). */}
        <PathsMiniGrid character={character} />
      </Stack>

      {/* Les 7 caractéristiques, en badges compacts (pas de Chip MUI). */}
      <Box
        sx={{
          display: 'grid',
          width: '100%',
          // Largeur MINIMALE des colonnes = ~hauteur d'un badge → chaque badge est
          // (au moins) carré ; `1fr` les garde de largeur égale s'il reste de la place.
          gridTemplateColumns: 'repeat(7, minmax(44px, 1fr))',
          // `start` (et non le `stretch` par défaut) : sinon la grille étire chaque
          // badge à la hauteur de la piste, ce qui ANNULE son `aspect-ratio`. En
          // désactivant l'étirement, l'aspect-ratio impose une vraie hauteur = largeur
          // (carré), et le `justifyContent: center` du badge centre alors son contenu.
          alignItems: 'start',
          gap: 0.75,
        }}
      >
        {ABILITY_IDS.map((id) => {
          const value = character.abilities[id] ?? 0;
          // Teinte fort/faible optionnelle (chiffre + icône), sinon gris neutre.
          const abilityColor = colorAbilities ? abilityTotalColor(value) : undefined;
          return (
            <Box
              key={id}
              title={ABILITY_NAMES[id]}
              sx={{
                borderRadius: 1,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                aspectRatio: '1',
                minHeight: 44,
                // Grille + `place-items: center` : centrage garanti (deux axes) de
                // l'unique enfant, quel que soit le surplus de hauteur du carré.
                display: 'grid',
                placeItems: 'center',
                // Léger padding-top : le line-box du chiffre laisse de l'espace SOUS le
                // glyphe (descente de la police), ce qui tire le contenu vers le haut ;
                // 2px compensent visuellement pour un rendu bien centré.
                pt: '2px',
              }}
            >
              {/* Icône + chiffre regroupés dans une boîte unique, centrée comme un bloc. */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                {/* Icône de la caractéristique (même jeu d'icônes que la fiche), à la
                    place du code court FOR/CON/… */}
                <AbilityIcon
                  ability={id}
                  size={18}
                  color={abilityColor ?? 'rgba(255, 255, 255, 0.7)'}
                  title={ABILITY_NAMES[id]}
                />
                {/* `lineHeight: 1` : supprime l'espace bas du line-box qui décentrait le chiffre. */}
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1, color: abilityColor }}>
                  {value >= 0 ? `+${value}` : value}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}

/** Côté d'un carré de la micro-grille des voies, en pixels. */
const PATH_CELL_SIZE = 6;

/**
 * Aperçu visuel très simplifié des voies : une micro-grille resserrée de 7
 * colonnes (voies possibles) × 5 lignes (rangs). Un carré est plein quand le
 * rang correspondant est débloqué (rempli du bas vers le haut) et reprend alors
 * la couleur de sa voie (profil, peuple, mage, prestige) ; vide sinon. Les
 * colonnes sans voie (personnage ayant moins de 7 voies) restent entièrement
 * vides. Compacte et détachée des badges de carac : pas de lien à y voir.
 */
function PathsMiniGrid({ character }: { character: Character }) {
  const columns = pathColumns(character);
  return (
    <Box sx={{ flexShrink: 0, display: 'flex', gap: '2px' }}>
      {Array.from({ length: PATH_COLUMN_COUNT }, (_, columnIndex) => {
        const column = columns[columnIndex];
        return (
          <Box
            key={columnIndex}
            title={column?.name}
            // Rang 1 en HAUT, remplissage vers le bas — comme la vue en colonnes de
            // « Voies & Capacités » (qui commence par le rang le plus haut en tête).
            sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
          >
            {Array.from({ length: PATH_RANK_COUNT }, (_, rankIndex) => {
              const color = column?.rankColors[rankIndex];
              return (
                <Box
                  key={rankIndex}
                  sx={{
                    width: PATH_CELL_SIZE,
                    height: PATH_CELL_SIZE,
                    borderRadius: '1px',
                    bgcolor: color ?? 'transparent',
                    border: color ? 'none' : '1px solid rgba(255, 255, 255, 0.14)',
                  }}
                />
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}

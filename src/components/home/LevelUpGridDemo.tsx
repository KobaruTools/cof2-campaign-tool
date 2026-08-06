'use client';

/**
 * Démo « Montée de niveau » de la vitrine : la **grille de progression** des voies et de
 * leurs capacités, en miniature. Une colonne par voie, un rang par ligne, **rang 1 en
 * haut** et remplissage vers le bas — même convention que `PathsMiniGrid` de
 * `CharacterPreviewCard`, dont cette démo reprend le langage visuel (carrés pleins, voie
 * de prestige au dégradé « métal précieux »). « Niveau +1 » allume une case de plus.
 *
 * Le personnage est **tiré au sort** dans les vraies données — peuple, profil (parfois
 * deux, l'hybridation existe dans le jeu), et une voie de prestige **de sa famille**,
 * pour que la teinte de prestige varie (combattant, aventurier, mage, mystique) au lieu
 * de retomber toujours sur l'or des voies génériques.
 *
 * La progression suit les **vraies règles de dépense** du livre, prises dans
 * `data/progression.ts` (extraction p. 29 et p. 38-40) plutôt que réinventées :
 *  - **niveau 1** (création, p. 29) : rang 1 de la voie de peuple + rang 1 de DEUX voies
 *    de profil — trois cases, d'emblée ;
 *  - **famille des mages** (p. 29, détail p. 60) : une QUATRIÈME case dès le niveau 1, un
 *    rang 2 gratuit — au choix dans l'une des deux voies de profil ouvertes, ou dans la
 *    voie du mage lorsque celle-ci remplace la voie de peuple ;
 *  - **chaque montée** (p. 38-39) : 2 points de capacité, un rang 1-2 coûte 1 point et un
 *    rang 3+ en coûte 2 → soit UNE capacité de rang 3+, soit DEUX de rang 1-2 ;
 *  - un rang n'est ouvert qu'au niveau requis (`minLevelPerRank`, p. 39 : rang 2 au
 *    niveau 2, rang 3 au niveau 3, rang 4 au niveau 5, rang 5 au niveau 7…), ce qui suffit
 *    à interdire la voie de prestige avant le niveau 5 sans règle supplémentaire.
 *
 * Le choix entre les deux dépenses, et la voie visée, sont tirés au sort — mais le plan
 * entier est calculé UNE FOIS avec le personnage, si bien que monter et redescendre les
 * niveaux réaffiche exactement la même progression.
 *
 * **Module à part, chargé sans rendu serveur** (`ssr: false` côté appelant), et c'est la
 * raison d'être de ce fichier : un tirage au sort pendant le rendu tomberait différemment
 * sur le serveur et sur le client, et React signalerait une divergence d'hydratation. Le
 * faire dans un effet serait l'autre solution, mais le projet interdit `setState` dans un
 * effet (`react-hooks/set-state-in-effect`). En n'étant jamais rendue côté serveur, la
 * démo peut tirer son personnage dans un initialiseur de `useState`.
 *
 * Ce que la grille NE prétend pas : être le moteur de montée de niveau. Elle ignore
 * volontairement ce qui ne se voit pas sur six carrés — la contrainte maison « une seule
 * famille par montée » du dé de vie (PER-87) ; du point de capacité orphelin (p. 40) elle
 * ne retient que l'achat isolé qu'il autorise, pas la compensation qu'on reçoit en
 * échange. Pour la vraie chose, voir `lib/character/levelUp.ts`.
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import {
  ancestries,
  ancestryPaths,
  classById,
  classes,
  classPaths,
  featureById,
  magePath,
  prestigePaths,
  progression,
} from '@/data';
import type {
  Feature,
  FamilyId,
  OptionFeatureChoice,
  PrestigeCategory,
} from '@/data/schema';
import {
  ANCESTRY_COLOR,
  classColor,
  MAGE_PATH_COLOR,
  prestigeCategoryColor,
} from '@/lib/ui/classColors';
import { prestigeMetalGradient } from '@/lib/ui/prestigeStyle';

/** Nombre de rangs d'une voie. Toutes les voies du jeu en comptent cinq. */
const RANK_COUNT = 5;
/** Niveau maximum simulé — celui du jeu. */
const MAX_LEVEL = 20;
/**
 * Niveau affiché à l'arrivée sur la page. Choix d'AFFICHAGE, pas de règle : la grille
 * compte 30 cases, et un niveau bas n'en allumait qu'une poignée — la démo montrait alors
 * quatre colonnes entièrement vides, d'une seule couleur, sans voie de prestige. À
 * mi-parcours, on voit ce que la grille est censée donner à voir : plusieurs voies
 * entamées, des teintes différentes, et souvent le dégradé du prestige.
 */
const START_LEVEL = 12;
/**
 * Colonnes de la grille, TOUJOURS remplies : une voie de peuple, `CLASS_COLUMNS` voies de
 * profil, une voie de prestige. (La vraie mini-grille de `CharacterPreviewCard` en réserve
 * 7, dont certaines restent vides ; ici on montre un personnage complet, donc aucune
 * colonne vide.)
 */
const MAX_COLUMNS = 6;
/** Voies de profil affichées — le reste des emplacements va au peuple et au prestige. */
const CLASS_COLUMNS = MAX_COLUMNS - 2;
/** Rang du PREMIER palier d'une voie de prestige (elles portent les rangs 4 à 8). */
const PRESTIGE_FIRST_RANK = 4;
/**
 * Chance d'obtenir un personnage hybride (deux profils, p. 179-180). Volontairement basse
 * (décision proprio) : l'hybridation existe dans le jeu mais y reste l'exception, et un
 * hybride sur trois tirages donnait à la démo un air de cas particulier permanent.
 */
const HYBRID_CHANCE = 0.1;
/** Chance de tirer une voie de prestige GÉNÉRIQUE plutôt qu'une voie de sa famille. */
const GENERIC_PRESTIGE_CHANCE = 0.2;

/** Famille de profil qui bénéficie de la voie du mage et du rang 2 gratuit (p. 29, 60). */
const MAGE_FAMILY: FamilyId = 'mages';
/**
 * Chance, pour un personnage de la famille des mages, de troquer sa voie de peuple contre
 * la **voie du mage** (p. 60) : « Cette voie remplace la voie de peuple du personnage, elle
 * occupe le même emplacement sur la fiche de personnage et son premier rang est gratuit
 * comme n'importe quelle voie de peuple. » C'est un vrai choix de joueur, ni rare ni
 * systématique — d'où une chance sur deux, pour que la démo montre les deux visages.
 */
const MAGE_PATH_CHANCE = 0.5;

/**
 * Emplacement de la voie de PEUPLE dans `columns` : la première colonne, par
 * construction (cf. `randomBuild`). Le plan de progression a besoin de la désigner
 * nommément, la création accordant son rang 1 d'office.
 */
const ANCESTRY_COLUMN = 0;
/** Voies de profil ouvertes à la création, rang 1 compris (p. 29). */
const CREATION_CLASS_PATHS = 2;
/** Points de capacité disponibles à chaque montée (p. 38-39). */
const POINTS_PER_LEVEL = progression.featurePointsPerLevel;

/**
 * Probabilité de préférer une capacité de rang 3+ quand les deux dépenses sont possibles.
 * Réglage d'AFFICHAGE seulement : il change l'ORDRE dans lequel la grille se remplit, pas
 * le total.
 *
 * Car le total, lui, est imposé par l'économie de points : **25 cases sur 30** au niveau 20,
 * 26 pour un mage (son rang 2 gratuit) — vérifié sur 4000 tirages. Le compte : 10 cases de
 * rang 1-2 (2 par voie ordinaire) à 1 point, 20 cases de rang 3+ à 2 points, soit 50 points
 * pour tout remplir ; or la création n'en offre que 3 gratuitement (4 pour un mage) et les
 * 19 montées n'apportent que 38 points. **La grille ne peut donc pas être complète au
 * niveau 20, et c'est juste** : un personnage de CO2 n'épuise pas six voies. Ne pas
 * « corriger » ces cases vides.
 */
const RANK3_PREFERENCE = 0.6;

/**
 * Côté MAXIMAL d'une case (px). Les cases sont carrées — c'est la représentation voulue —
 * mais leur côté est DÉDUIT de la largeur disponible (`aspectRatio: 1`), pas fixé : une
 * taille en dur finissait par déborder de l'encart, qui rétrécit avec la fenêtre. Ce
 * plafond n'existe donc que pour l'inverse — sur une carte large (deux colonnes en `sm`),
 * six cases étirées donneraient une grille absurdement haute.
 */
const CELL_MAX = 38;
/** Écart entre les cases (px). */
const CELL_GAP = 3;
/** Largeur au-delà de laquelle la grille ne s'étire plus (cf. `CELL_MAX`). */
const GRID_MAX_WIDTH = MAX_COLUMNS * CELL_MAX + (MAX_COLUMNS - 1) * CELL_GAP;

/** Nombre maximal de pastilles d'usage affichées dans une case (place limitée). */
const MAX_USAGE_PIPS = 4;

/** Déclencheurs de recharge qui valent « se récupère au repos ». */
const REST_TRIGGERS = new Set(['day', 'short-rest']);

/** Famille de profil → famille de voies de prestige correspondante. */
const PRESTIGE_CATEGORY_BY_FAMILY: Record<FamilyId, PrestigeCategory> = {
  adventurers: 'adventurer',
  fighters: 'fighter',
  mages: 'mage',
  mystics: 'mystic',
};

/** Une colonne de la grille : une voie et ses capacités, rang par rang. */
interface PathColumn {
  id: string;
  name: string;
  /** Fond des cases acquises : couleur plate, ou dégradé « précieux » pour le prestige. */
  fill: string;
  /** Teinte de référence (bordures, liseré de pied). */
  color: string;
  /** Rang du premier palier : 1 partout, 4 pour une voie de prestige. */
  firstRank: number;
  /** Voie de prestige. Ses rangs 4-8 portent déjà leur propre niveau requis (p. 39). */
  prestige: boolean;
  /** Capacités de la voie, dans l'ordre des rangs (5 entrées). */
  features: (Feature | undefined)[];
}

/** Une case du parcours de progression : quelle voie, quel palier. */
interface Step {
  column: number;
  /** Index de ligne (0 = première ligne, en haut). */
  row: number;
}

/** Le personnage tiré au sort : son libellé, ses voies, sa progression. */
interface DemoBuild {
  label: string;
  columns: PathColumn[];
  /**
   * Cases acquises NIVEAU PAR NIVEAU : `plan[0]` est la création (niveau 1), `plan[n]` le
   * niveau n+1. Un niveau allume 1 ou 2 cases selon la dépense (cf. `buildPlan`) — d'où
   * un plan par niveau, et non une simple file de cases : « acquis au niveau N » n'est
   * plus « la Nᵉ case ».
   */
  plan: Step[][];
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** Copie mélangée d'une liste (Fisher-Yates). Sert à varier les voies retenues. */
function shuffled<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Niveau requis pour acquérir une capacité de ce rang (`minLevelPerRank`, p. 39). */
const minLevelForRank = (rank: number): number =>
  progression.minLevelPerRank[rank as keyof typeof progression.minLevelPerRank] ?? 1;

/** Coût en points de capacité d'un rang : 1 pour les rangs 1-2, 2 au-delà (p. 39). */
const costForRank = (rank: number): number =>
  progression.costPerRank[rank as keyof typeof progression.costPerRank] ?? 1;

/**
 * Construit la progression niveau par niveau, en dépensant les points de capacité comme
 * le livre le prescrit (p. 29 pour la création, p. 38-40 pour les montées).
 *
 * Les voies se remplissant de haut en bas, la seule case ouvrable d'une colonne est
 * toujours la suivante — d'où un simple curseur `nextRow` par colonne. Une case est
 * légale si le niveau atteint le niveau requis de son rang ; **le niveau d'accès au
 * prestige n'a donc pas à être traité à part** : ses rangs 4 à 8 exigent déjà les
 * niveaux 5, 7, 9, 11 et 13.
 *
 * (Deux versions précédentes à ne pas refaire : les voies de prestige reléguées en fin de
 * parcours ne s'allumaient jamais ; puis un parcours « par séries » où la case acquise au
 * niveau N était la Nᵉ — ce qui donnait une seule case au niveau 1, là où la création en
 * accorde trois.)
 *
 * `mageFamily` / `magePathSlot` portent l'exception de la famille des mages (cf. l'appel).
 */
function buildPlan(
  columns: PathColumn[],
  { mageFamily, magePathSlot }: { mageFamily: boolean; magePathSlot: boolean },
): Step[][] {
  const nextRow = columns.map(() => 0);
  const plan: Step[][] = [];

  const take = (column: number): Step => {
    const step = { column, row: nextRow[column] };
    nextRow[column] += 1;
    return step;
  };

  /** Colonnes dont la prochaine case coûte `cost` point(s) et est ouverte à ce niveau. */
  const affordable = (level: number, cost: number): number[] =>
    columns
      .map((_, index) => index)
      .filter((index) => {
        if (nextRow[index] >= RANK_COUNT) return false;
        const rank = columns[index].firstRank + nextRow[index];
        return level >= minLevelForRank(rank) && costForRank(rank) === cost;
      });

  // ─ Niveau 1, création (p. 29) : rang 1 de la voie de peuple, plus rang 1 de DEUX voies
  //   de profil choisies parmi les cinq du profil.
  const classColumns = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) => !column.prestige && index !== ANCESTRY_COLUMN)
    .map(({ index }) => index);
  const opened = shuffled(classColumns).slice(0, CREATION_CLASS_PATHS);
  const creation = [take(ANCESTRY_COLUMN), ...opened.map(take)];

  // ─ Exception de la famille des mages (p. 29) : une capacité de rang 2 EN PLUS, gratuite,
  //   dès la création. Le livre laisse le choix entre « une capacité de rang 2 de leur choix
  //   dans l'une des deux voies de profil qu'ils ont choisie » et « le rang 2 de la voie du
  //   mage » — cette seconde branche n'existant, comme dans le wizard (`PathsStep`), que si
  //   la voie du mage occupe bien l'emplacement de peuple. Les deux voies de profil et la
  //   voie du mage ont déjà leur rang 1 ci-dessus : le curseur de colonne pointe donc
  //   exactement sur le rang 2, il n'y a rien à calculer.
  if (mageFamily) {
    creation.push(take(pick(magePathSlot ? [...opened, ANCESTRY_COLUMN] : opened)));
  }

  plan.push(creation);

  // ─ Montées : 2 points, soit UNE capacité de rang 3+, soit DEUX de rang 1-2.
  for (let level = 2; level <= MAX_LEVEL; level += 1) {
    const gained: Step[] = [];
    const heavy = affordable(level, POINTS_PER_LEVEL);
    // Un rang 3+ quand le tirage le veut — ou faute de rang 1-2 encore disponible.
    if (heavy.length > 0 && (Math.random() < RANK3_PREFERENCE || affordable(level, 1).length === 0)) {
      gained.push(take(pick(heavy)));
    } else {
      // Deux capacités légères, la seconde évaluée APRÈS la première : ouvrir le rang 1
      // d'une voie rend son rang 2 achetable dans la même montée (exemple 2, p. 40).
      //
      // Une seule suffit s'il n'en reste qu'une : c'est le cas du « point de capacité
      // orphelin » (p. 40), que le livre autorise explicitement (le point restant
      // s'échange alors contre un point de chance, un dé de récupération, etc.). Sans
      // cela, la DERNIÈRE case de rang 1-2 devenait inachetable à jamais et sa colonne
      // restait figée sur un unique carré — ce qui se lisait comme un bug.
      for (let spent = 0; spent < POINTS_PER_LEVEL; spent += 1) {
        const light = affordable(level, 1);
        if (light.length === 0) break;
        gained.push(take(pick(light)));
      }
    }
    plan.push(gained);
  }
  return plan;
}

/**
 * Tire un personnage au hasard dans les vraies données. Le nombre de voies réellement
 * disponibles dépasse largement la place de l'encart : on garde la voie de peuple, la
 * voie de prestige, et on complète avec des voies de profil jusqu'à `MAX_COLUMNS`.
 */
function randomBuild(): DemoBuild {
  const ancestry = pick(ancestries);
  const ancestryPath = pick(ancestryPaths.filter((p) => p.ancestryIds.includes(ancestry.id)));

  const primary = pick(classes);
  const secondary =
    Math.random() < HYBRID_CHANCE ? pick(classes.filter((c) => c.id !== primary.id)) : undefined;
  const classIds = secondary ? [primary.id, secondary.id] : [primary.id];

  // La famille se lit sur le profil PRINCIPAL, et sur lui seul — c'est aussi ce que fait la
  // validation du wizard (`pathsStepComplete` : `classById.get(draft.classId).familyId`). Un
  // hybride dont seule la voie secondaire vient d'un mage n'y a donc pas droit.
  const mageFamily = primary.familyId === MAGE_FAMILY;
  const magePathSlot = mageFamily && Math.random() < MAGE_PATH_CHANCE;

  // Voie de prestige de la FAMILLE du profil principal : c'est ce qui fait varier la
  // teinte du prestige d'un chargement à l'autre. Les génériques (or) restent possibles,
  // mais minoritaires.
  const wantedCategory = PRESTIGE_CATEGORY_BY_FAMILY[primary.familyId];
  const family = prestigePaths.filter((p) => p.category === wantedCategory);
  const prestige =
    family.length > 0 && Math.random() > GENERIC_PRESTIGE_CHANCE
      ? pick(family)
      : pick(prestigePaths.filter((p) => p.category === 'generic'));

  const featuresOf = (featureIds: readonly string[]) =>
    Array.from({ length: RANK_COUNT }, (_, i) => featureById.get(featureIds[i] ?? ''));

  /**
   * Voies de profil, servies en TOUR DE RÔLE entre les profils du personnage jusqu'à
   * remplir les `CLASS_COLUMNS` emplacements. Le tour de rôle fait deux choses à la fois :
   * il partage équitablement les emplacements entre les deux profils d'un hybride, et il
   * complète avec l'autre profil si l'un manque de voies.
   *
   * (Version précédente : une part calculée par profil, puis `slice`. Un hybride n'obtenait
   * qu'une voie par profil, soit 4 colonnes au total au lieu de 6, et la grille était
   * visiblement plus étroite qu'avec un profil unique. Ne pas y revenir.)
   */
  const pools = classIds.map((id) => shuffled(classPaths.filter((p) => p.classIds.includes(id))));
  const taken = classIds.map(() => 0);
  const classColumns: PathColumn[] = [];
  while (classColumns.length < CLASS_COLUMNS && pools.some((pool, i) => taken[i] < pool.length)) {
    for (const [i, pool] of pools.entries()) {
      if (classColumns.length >= CLASS_COLUMNS) break;
      const path = pool[taken[i]];
      taken[i] += 1;
      if (!path) continue;
      classColumns.push({
        id: path.id,
        name: path.name,
        fill: classColor(classIds[i]),
        color: classColor(classIds[i]),
        firstRank: 1,
        prestige: false,
        features: featuresOf(path.featureIds),
      });
    }
  }

  // Emplacement de peuple : la voie du peuple, ou la VOIE DU MAGE quand le mage l'a prise à
  // sa place (p. 60 — « elle occupe le même emplacement sur la fiche de personnage »). Une
  // seule colonne dans les deux cas, comme la mini-grille de `CharacterPreviewCard`, qui
  // range elle aussi la capacité de peuple conservée sous la voie du mage plutôt que
  // d'ouvrir une seconde colonne pour un unique rang 1 sans suite.
  const ancestrySlot = magePathSlot ? magePath : ancestryPath;

  const prestigeColor = prestigeCategoryColor(prestige.category);
  const columns: PathColumn[] = [
    {
      id: ancestrySlot.id,
      name: ancestrySlot.name,
      // Indigo arcane pour la voie du mage : la même teinte dédiée que la fiche, pour qu'un
      // coup d'œil suffise à voir que l'emplacement de peuple a changé de nature.
      fill: magePathSlot ? MAGE_PATH_COLOR : ANCESTRY_COLOR,
      color: magePathSlot ? MAGE_PATH_COLOR : ANCESTRY_COLOR,
      firstRank: 1,
      prestige: false,
      features: featuresOf(ancestrySlot.featureIds),
    },
    ...classColumns,
    {
      id: prestige.id,
      name: prestige.name,
      // Dégradé « métal précieux » teinté par famille — même traitement que la mini-grille
      // de la carte de personnage. L'or nu reste réservé aux voies génériques.
      fill: prestigeMetalGradient(
        prestige.category !== 'generic' ? prestigeColor : undefined,
      ),
      color: prestigeColor,
      firstRank: PRESTIGE_FIRST_RANK,
      prestige: true,
      features: featuresOf(prestige.featureIds),
    },
  ];

  const profiles = classIds.map((id) => classById.get(id)?.name ?? id).join(' · ');
  // Le libellé ne nomme PAS la voie du mage, à dessein : la réserve ne tient qu'une
  // quarantaine de caractères sur une ligne, et « Voie du mage · » y tronquait le nom de la
  // voie de prestige (« Elfe haut Forgesort · Moine — Voie du ma… »). L'emplacement de peuple
  // passé en indigo se voit d'un coup d'œil, et son info-bulle le nomme rang par rang.
  return {
    label: `${ancestry.name} ${profiles} — ${prestige.name}`,
    columns,
    plan: buildPlan(columns, { mageFamily, magePathSlot }),
  };
}

/**
 * Nombre d'usages d'une capacité qui se rechargent au repos, ou 0 si elle n'en a pas.
 * Approximation assumée pour la démo : le maximum réel peut scaler avec le rang atteint
 * (`maxByPathRank`) ou le niveau, ce que seul le moteur sait résoudre à partir d'un vrai
 * personnage. Ici, à défaut de `max`, on prend le rang.
 */
function restUsageCount(feature: Feature | undefined, rank: number): number {
  const counter = feature?.usageCounter;
  if (!counter || !counter.resetOn || !REST_TRIGGERS.has(counter.resetOn)) return 0;
  return Math.min(MAX_USAGE_PIPS, counter.max ?? rank);
}

/** Coupe un texte de règle à une longueur lisible en info-bulle. */
function excerpt(text: string, max = 210): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/**
 * Info-bulle d'une case : la capacité qu'elle représente. Nom, voie et rang, extrait du
 * texte de règle, et — s'il y en a — **un choix tiré au hasard** parmi ceux que la
 * capacité propose, pour montrer que l'outil les gère.
 */
function cellTooltip(column: PathColumn, rank: number, feature: Feature | undefined) {
  if (!feature) {
    return (
      <Box sx={{ maxWidth: 280 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {column.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Rang {rank}
        </Typography>
      </Box>
    );
  }
  // Un choix au hasard parmi ceux proposés : tiré au rendu de l'info-bulle, donc il
  // change d'un survol à l'autre — c'est voulu, cela donne à voir l'étendue des options.
  //
  // `FeatureChoice` est une UNION : seule la variante `option` énumère ses possibilités.
  // Les autres (caractéristique à augmenter, voie à emprunter, domaine de test…) tirent
  // leur liste d'ailleurs et n'ont rien à afficher tel quel ici.
  const enumerated = feature.choices?.filter(
    (c): c is OptionFeatureChoice => c.kind === 'option' && c.options.length > 0,
  );
  const option = enumerated?.length ? pick(pick(enumerated).options) : undefined;
  const uses = restUsageCount(feature, rank);

  return (
    <Box sx={{ maxWidth: 300 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {feature.name}
        {feature.isSpell && ' *'}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {column.name} · rang {rank}
        {feature.actionTypes.length > 0 && ` · (${feature.actionTypes.join(') (')})`}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
        « {excerpt(feature.text)} »
      </Typography>
      {option && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          Choix possible : <strong>{option.label}</strong>
        </Typography>
      )}
      {uses > 0 && (
        <Typography variant="caption" color="success.light" sx={{ display: 'block', mt: 0.5 }}>
          {uses} usage{uses > 1 ? 's' : ''}, rechargé{uses > 1 ? 's' : ''} au repos
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        p. {String(feature.sourcePage)}
      </Typography>
    </Box>
  );
}

export function LevelUpGridDemo() {
  const [level, setLevel] = useState(START_LEVEL);
  // Tirage au montage : légitime ici parce que ce composant n'est jamais rendu côté
  // serveur (cf. l'en-tête de fichier). Le personnage est aussi RETIRÉ au sort quand on
  // recommence après le niveau 20 (demande proprio) — d'où un setter.
  const [build, setBuild] = useState(randomBuild);

  const { columns, label, plan } = build;
  // Cases acquises = tout ce que les `level` premiers niveaux ont apporté (le niveau 1
  // étant la création). Les niveaux requis par rang sont déjà encodés dans le plan, il n'y
  // a rien à filtrer ici.
  const acquired = new Set(
    plan
      .slice(0, level)
      .flat()
      .map((s) => `${s.column}:${s.row}`),
  );

  return (
    <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
      {/* La grille ne porte AUCUNE hauteur : elle découle des cases, qui sont carrées
          (`aspectRatio`) sur une largeur partagée en parts égales. Une hauteur en dur (ou
          un côté de case en dur) débordait de la réserve de la carte dès que celle-ci
          rétrécissait, et la dernière ligne se faisait rogner. */}
      <Box
        sx={{
          display: 'flex',
          gap: `${CELL_GAP}px`,
          width: '100%',
          maxWidth: GRID_MAX_WIDTH,
        }}
      >
        {columns.map((column, columnIndex) => (
          <Box
            key={column.id}
            sx={{
              // Parts égales, base 0 : les colonnes se partagent la largeur quel que soit
              // leur nombre, sans qu'aucun contenu ne vienne l'élargir.
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: `${CELL_GAP}px`,
            }}
          >
            {Array.from({ length: RANK_COUNT }, (_, row) => {
              const rank = column.firstRank + row;
              const feature = column.features[row];
              const filled = acquired.has(`${columnIndex}:${row}`);
              const pips = filled ? restUsageCount(feature, rank) : 0;
              return (
                <AppTooltip key={row} title={cellTooltip(column, rank, feature)}>
                  <Box
                    sx={{
                      width: '100%',
                      // Carré déduit de la largeur : c'est ce qui garantit à la fois la
                      // forme voulue et une grille qui tient toujours dans l'encart.
                      aspectRatio: '1 / 1',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      pb: '3px',
                      // `background` (pas `bgcolor`) : la valeur peut être une couleur
                      // unie OU un dégradé (cases de prestige).
                      background: filled ? column.fill : 'rgba(255, 255, 255, 0.05)',
                      border: filled
                        ? `1px solid ${alpha(column.color, 0.9)}`
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      transition: 'background 220ms, border-color 220ms',
                      cursor: 'help',
                    }}
                  >
                    {/* Pastilles d'usage : capacité à emplois limités qui se rechargent
                        au repos. Une pastille par usage disponible. */}
                    {pips > 0 && (
                      <Stack direction="row" spacing="2px">
                        {Array.from({ length: pips }, (_, i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              bgcolor: 'success.light',
                              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.55)',
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </AppTooltip>
              );
            })}
            {/* PAS de pied de colonne. Un liseré à la couleur de la voie s'y trouvait :
                aligné sous la 5ᵉ case et rempli, il se lisait comme un 6ᵉ rang acquis —
                alors qu'une voie n'en compte que cinq. Il débordait en plus de la hauteur
                de la grille, d'où une dernière ligne tronquée. */}
          </Box>
        ))}
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          alignSelf: 'stretch',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', alignSelf: 'stretch' }}>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
          Niveau {level}
        </Typography>
        <Button
          size="small"
          variant="text"
          onClick={() => {
            // Au bout des 20 niveaux, « Recommencer » repart d'un AUTRE personnage :
            // rejouer la même progression deux fois n'apprend rien de plus, tandis qu'un
            // nouveau tirage montre d'autres voies, d'autres couleurs, un autre prestige.
            if (level >= MAX_LEVEL) {
              setBuild(randomBuild());
              setLevel(1);
              return;
            }
            setLevel((l) => l + 1);
          }}
        >
          {level >= MAX_LEVEL ? 'Recommencer' : 'Niveau +1'}
        </Button>
      </Stack>
    </Stack>
  );
}

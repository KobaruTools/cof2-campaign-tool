/**
 * Génère les personnages de RECETTE de PER-73 — un par voie de peuple, avec la
 * voie de peuple poussée à 5/5 (les capacités nouvellement structurées de
 * `src/data/ancestry-paths.ts`).
 *
 * Lance : `npx tsx scripts/generate-per73-characters.ts`
 *
 * Méthode (identique aux autres persos de test, cf. `rebuild-character-history.ts`) :
 * on part d'un personnage de niveau 1 avec ses capacités gratuites de création
 * (2 voies de profil au rang 1 + rang 1 de la voie de peuple), puis on dépense
 * 2 points par niveau via `packLevelUpHistory` (qui pilote `applyLevelUp` +
 * `canAcquireFeature` comme le wizard) jusqu'au niveau 20.
 *
 * Cible (niveau 20, budget = 38 points, 0 orphelin) :
 *   voie de peuple r1-5 (7 pts) + 4 voies de profil r1-5 + 1 voie de profil r1.
 * Les profils sont choisis pour que les capacités « emprunt » de la voie de peuple
 * (demi-orc-r2, elfe-haut-r3, gnome-r1, elfe-sylvain-r2…) aient une cible éligible
 * (la voie empruntée appartient à un AUTRE profil que celui du personnage).
 *
 * Les choix portés par les capacités de la VOIE DE PEUPLE sont auto-remplis (premier
 * éligible / option par défaut) ; les interrupteurs des effets conditionnels de la
 * voie de peuple sont activés pour que la recette montre l'effet. Les choix des voies
 * de PROFIL sont laissés tels quels (hors périmètre PER-73).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ancestryById,
  classById,
  pathById,
  featureById,
} from '@/data';
import type { AbilityId } from '@/data/schema';
import { rulesContext as ctx } from '@/lib/character/rulesContext';
import { packLevelUpHistory } from '@/lib/character/historyBuilder';
import { eligibleFeaturesForChoice } from '@/lib/character/choices';
import { checkCompliance, featurePointBudget } from '@/lib/engine';
import { createBlankCharacter } from '@/lib/character/factory';
import type { Character } from '@/lib/character/types';

interface PeupleConfig {
  file: string;
  name: string;
  description: string;
  ancestryId: string;
  ancestryPathId: string;
  classId: string;
  /** Valeurs de base (avant modificateurs de peuple). */
  baseAbilities: Record<AbilityId, number>;
  /** Résolution des modificateurs de peuple (une carac par modificateur, dans l'ordre). */
  ancestryChoices: AbilityId[];
  /** Interrupteurs d'effets conditionnels de la voie de peuple à activer pour la recette. */
  activeToggles?: Record<string, boolean[]>;
  /**
   * Voies de PROFIL ciblées (voie + rang max), en remplacement de la sélection par défaut
   * (les 4 premières voies du profil au rang 5 + la 5e au rang 1). Permet un HYBRIDE (voie
   * d'un autre profil, p. 180) ou une composition sur mesure. Défaut = comportement d'origine.
   */
  profilePaths?: { pathId: string; maxRank: number }[];
  /**
   * Deux voies du PROFIL PRINCIPAL acquises gratuitement à la création (rang 1). Défaut = les
   * deux premières voies du profil. À préciser quand `profilePaths` inclut des voies hybrides
   * (la création ne donne que des voies du profil principal ; l'hybridation vient aux montées).
   */
  freePathIds?: [string, string];
  /**
   * Sélections de choix FORCÉES (par id de capacité), appliquées APRÈS l'auto-remplissage.
   * Ex. forcer l'emprunt d'Enfant de la forêt (elfe-sylvain-r2) sur `animaux-r1` plutôt que sur
   * le premier éligible, pour recetter le choix propre de la capacité empruntée.
   */
  forcedFeatureChoices?: Record<string, (string | null)[]>;
  /**
   * VOIE DU MAGE (p. 60) : la voie de peuple est remplacée par la voie du mage, mais la capacité de
   * rang 1 de la voie de peuple est CONSERVÉE (gratuite, acquise à la création). Son id est posé ici ;
   * il s'ajoute aux capacités gratuites de niveau 1 et reste affiché au rang 1 de la voie du mage.
   */
  keptAncestryFeatureId?: string;
}

const b = (
  AGI: number, CON: number, FOR: number, PER: number, CHA: number, INT: number, VOL: number,
): Record<AbilityId, number> => ({ AGI, CON, FOR, PER, CHA, INT, VOL });

const CONFIGS: PeupleConfig[] = [
  {
    file: 'recette-per73-demi-orc-barbare.json',
    name: 'Recette PER-73 — Demi-orc (barbare)',
    description:
      'Voie du demi-orc 5/5. À vérifier : Impressionnant (intimidation +3, vision verbatim), Talent pour la violence (CHOIX capacité barbare/guerrier r1), Critique brutal (plage de critique +1 au contact + {1d4°} crit), Attaque sanglante ({1d4°} saignement), Colosse (+1 FOR / +1 CON déterministes).',
    ancestryId: 'demi-orc',
    ancestryPathId: 'demi-orc',
    classId: 'barbare',
    baseAbilities: b(1, 2, 3, 0, -1, 0, 1),
    ancestryChoices: ['FOR', 'INT'],
  },
  {
    file: 'recette-per73-elfe-haut-ensorceleur.json',
    name: 'Recette PER-73 — Elfe haut (ensorceleur)',
    description:
      'Voie de l’elfe haut 5/5. À vérifier : Lumière intérieure (érudition + art +3), Force d’âme (immunités Peur + Sommeil magique ; bonus = [#rang] situationnel verbatim), Talent pour la magie (CHOIX capacité magicien/ensorceleur r1-2), Immortel (immunité poison/maladie), Supériorité elfique (+1 VOL + CHOIX +1 INT/CHA).',
    ancestryId: 'elfe-haut',
    ancestryPathId: 'elfe-haut',
    classId: 'ensorceleur',
    baseAbilities: b(1, 1, -1, 0, 3, 2, 1),
    ancestryChoices: ['CHA', 'FOR'],
  },
  {
    file: 'recette-per73-elfe-sylvain-rodeur.json',
    name: 'Recette PER-73 — Elfe sylvain (rôdeur)',
    description:
      'Voie de l’elfe sylvain 5/5. À vérifier : Lumière des étoiles (escalade/discrétion/chasse +3), Enfant de la forêt (CHOIX capacité druide/rôdeur r1), Archer émérite (plage de critique +1 à distance — INTERRUPTEUR « arc en main » ACTIF ; WIP ; {1d4°} crit), Flèche sanglante ({1d4°} saignement), Supériorité elfique (+1 AGI / +1 PER).',
    ancestryId: 'elfe-sylvain',
    ancestryPathId: 'elfe-sylvain',
    classId: 'rodeur',
    baseAbilities: b(3, 1, -1, 2, 0, 0, 1),
    ancestryChoices: ['AGI', 'FOR'],
    activeToggles: { 'elfe-sylvain-r3': [true] },
  },
  {
    file: 'recette-per73-elfe-sylvain-rodeur-druide.json',
    name: 'Recette PER-73 — Elfe sylvain (hybride rôdeur/druide) — emprunt animaux-r1',
    description:
      'Hybride rôdeur/druide (voie de druide « Nature » au rang 5, la voie « Animaux » N’est PAS possédée). Enfant de la forêt (elfe-sylvain-r2) emprunte « Langage des animaux » (animaux-r1, druide). À VÉRIFIER : la capacité empruntée porte SON PROPRE choix « catégorie d’animaux », débloqué par le rang 4 de la voie de druide — il apparaît (affichage + éditeur) dans la carte ✦ Capacité empruntée, à « Choix à faire » tant qu’aucune catégorie n’est retenue.',
    ancestryId: 'elfe-sylvain',
    ancestryPathId: 'elfe-sylvain',
    classId: 'rodeur',
    baseAbilities: b(3, 1, -1, 2, 0, 0, 1),
    ancestryChoices: ['AGI', 'FOR'],
    activeToggles: { 'elfe-sylvain-r3': [true] },
    // 3 voies de rôdeur au rang 5 + la voie de druide « Nature » au rang 5 (hybride → rang 4 atteint)
    // + une 5e voie de rôdeur au rang 1. « Combat à deux armes » reste vierge (rend l’hybride légal).
    profilePaths: [
      { pathId: 'archer', maxRank: 5 },
      { pathId: 'survie', maxRank: 5 },
      { pathId: 'traqueur', maxRank: 5 },
      { pathId: 'nature', maxRank: 5 },
      { pathId: 'compagnon-animal', maxRank: 1 },
    ],
    freePathIds: ['archer', 'survie'],
    forcedFeatureChoices: { 'elfe-sylvain-r2': ['animaux-r1'] },
  },
  {
    file: 'recette-per73-gnome-magicien.json',
    name: 'Recette PER-73 — Gnome (magicien)',
    description:
      'Voie du gnome 5/5. À vérifier : Don étrange (science +3 + CHOIX capacité ensorceleur r1 ; limitation armure verbatim), Petit pote (domaines sociaux +3 — intimidation exclue ; +1 PC), Insignifiant (+2→+3 DEF vs grandes créatures — INTERRUPTEUR ACTIF), Merveille technologique (armes/AGI aux DM verbatim), Bonne nature (+1 CON / +1 CHA).',
    ancestryId: 'gnome',
    ancestryPathId: 'gnome',
    classId: 'magicien',
    baseAbilities: b(1, 1, -1, 1, 0, 3, 2),
    ancestryChoices: ['INT', 'FOR'],
    activeToggles: { 'gnome-r3': [true] },
  },
  {
    file: 'recette-per73-halfelin-voleur.json',
    name: 'Recette PER-73 — Halfelin (voleur)',
    description:
      'Voie du halfelin 5/5. À vérifier : Petite taille (+1 DEF + discrétion/vol à la tire +3 ; restrictions d’armes verbatim), Résistance légendaire (bonus = [#rang] situationnel verbatim), Bon pour le moral ({1d4°} PV), Petit veinard (+1 PC ; esquive verbatim), Vif et bien nourri (+1 AGI / +1 CON).',
    ancestryId: 'halfelin',
    ancestryPathId: 'halfelin',
    classId: 'voleur',
    baseAbilities: b(3, 2, -1, 1, 0, 1, 0),
    ancestryChoices: ['AGI', 'FOR'],
  },
  {
    file: 'recette-per73-humain-guerrier.json',
    name: 'Recette PER-73 — Humain (guerrier)',
    description:
      'Voie de l’humain 5/5. À vérifier : Diversité (origine CHOISIE → 2 domaines +3 + 1 PC), Instinct de survie (+2 DEF temporaire — INTERRUPTEUR ACTIF ; division des DM verbatim), Touche-à-tout (CHOIX capacité r1-2 tout profil), Loup parmi les loups ({1d4°} DM verbatim), Polyvalence (+1 VOL + CHOIX +1 carac la plus faible).',
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    classId: 'guerrier',
    baseAbilities: b(1, 2, 3, 0, 0, -1, 1),
    ancestryChoices: ['FOR'],
    activeToggles: { 'humain-r2': [true] },
  },
  {
    file: 'recette-per73-nain-guerrier.json',
    name: 'Recette PER-73 — Nain (guerrier)',
    description:
      'Voie du nain 5/5. À vérifier : Habitant des tunnels (maçonnerie/mines/passages-pièges-pierre +3 ; vision verbatim), Haches et marteaux (armes verbatim), Résistance à la magie (verbatim), Fils du roc (RD 2→3 au niveau 10, tous DM), Ténacité (+1 CON / +1 VOL).',
    ancestryId: 'nain',
    ancestryPathId: 'nain',
    classId: 'guerrier',
    baseAbilities: b(0, 3, 3, 0, -1, 0, 1),
    ancestryChoices: ['CON', 'AGI'],
  },
  {
    file: 'recette-per73-voie-du-mage-elfe-haut-magicien.json',
    name: 'Recette PER-73 — Voie du mage (elfe haut, magicien)',
    description:
      'Voie du mage 5/5 (remplace la voie de peuple ; capacité de peuple de rang 1 CONSERVÉE = Lumière intérieure, elfe-haut-r1). À vérifier : Capacité de peuple + occultisme (mage-r1 : occultisme « rang + 2 » → [rang + 2] sur érudition occulte, + capacité de peuple conservée affichée au rang 1), Maîtrise de la magie (mage-r2, sort), Tour de magie (mage-r3 : +1 DEF, +2 PM, sort), Esprit supérieur (mage-r4 : +1 INT/VOL + dé bonus INT), Tempête de mana (mage-r5 : {1d4°}).',
    ancestryId: 'elfe-haut',
    ancestryPathId: 'mage',
    keptAncestryFeatureId: 'elfe-haut-r1',
    classId: 'magicien',
    baseAbilities: b(1, 1, -1, 0, 1, 3, 2),
    ancestryChoices: ['INT', 'FOR'],
  },
];

const dir = join(process.cwd(), 'examples', 'characters');
const isoNow = '2026-06-29T00:00:00.000Z';

/** Id de la capacité de rang `rank` exact d'une voie. */
function featureAtRank(pathId: string, rank: number): string {
  const id = pathById.get(pathId)!.featureIds.find((fid) => featureById.get(fid)!.rank === rank);
  if (!id) throw new Error(`Voie ${pathId} : pas de capacité de rang ${rank}.`);
  return id;
}
/** Ids des rangs 1..maxRank d'une voie. */
function featuresUpToRank(pathId: string, maxRank: number): string[] {
  return pathById
    .get(pathId)!
    .featureIds.filter((fid) => featureById.get(fid)!.rank <= maxRank);
}

for (const cfg of CONFIGS) {
  const ancestry = ancestryById.get(cfg.ancestryId);
  const cls = classById.get(cfg.classId);
  if (!ancestry) throw new Error(`Peuple inconnu : ${cfg.ancestryId}`);
  if (!cls) throw new Error(`Profil inconnu : ${cfg.classId}`);
  const classPaths = cls.pathIds;
  if (classPaths.length < 5) throw new Error(`${cfg.classId} : moins de 5 voies.`);

  // Caractéristiques finales = base + modificateurs de peuple résolus.
  const abilities = { ...cfg.baseAbilities };
  ancestry.abilityModifiers.forEach((mod, i) => {
    const chosen = cfg.ancestryChoices[i];
    if (!chosen || !mod.abilities.includes(chosen)) {
      throw new Error(`${cfg.file} : choix de modificateur ${i} invalide (${chosen}).`);
    }
    abilities[chosen] += mod.value;
  });

  // Voies de profil ciblées : sur mesure (`profilePaths`, ex. hybride) ou par défaut
  // (4 premières voies du profil au rang 5 + la 5e au rang 1).
  const profilePaths = cfg.profilePaths ?? [
    { pathId: classPaths[0], maxRank: 5 },
    { pathId: classPaths[1], maxRank: 5 },
    { pathId: classPaths[2], maxRank: 5 },
    { pathId: classPaths[3], maxRank: 5 },
    { pathId: classPaths[4], maxRank: 1 },
  ];
  const freePathIds = cfg.freePathIds ?? [classPaths[0], classPaths[1]];

  // Capacités gratuites de création : 2 voies du profil PRINCIPAL au rang 1 + rang 1 de la voie
  // de peuple (ou du mage) + éventuellement le rang 1 de peuple CONSERVÉ (voie du mage, p. 60).
  const freeIds = [
    featureAtRank(freePathIds[0], 1),
    featureAtRank(freePathIds[1], 1),
    featureAtRank(cfg.ancestryPathId, 1),
    ...(cfg.keptAncestryFeatureId ? [cfg.keptAncestryFeatureId] : []),
  ];

  // Cible : voie de peuple (ou du mage) 5/5 (+ rang 1 de peuple conservé pour la voie du mage)
  // + les voies de profil ciblées (hybride possible).
  const targetFeatureIds = [
    ...featuresUpToRank(cfg.ancestryPathId, 5),
    ...(cfg.keptAncestryFeatureId ? [cfg.keptAncestryFeatureId] : []),
    ...profilePaths.flatMap((p) => featuresUpToRank(p.pathId, p.maxRank)),
  ];

  const base: Character = {
    ...createBlankCharacter({ name: cfg.name, now: isoNow }),
    id: cfg.file.replace(/\.json$/, ''),
    identity: { sex: 'male', description: cfg.description },
    ancestryId: cfg.ancestryId,
    classId: cfg.classId,
    ancestryPathId: cfg.ancestryPathId,
    level: 1,
    abilities,
    baseAbilities: cfg.baseAbilities,
    ancestryChoices: cfg.ancestryChoices,
    featureIds: [...freeIds],
    levelUpHistory: [{ level: 1, chosenFeatureIds: [...freeIds] }],
  };

  const { character: built, unspentByLevel } = packLevelUpHistory(base, targetFeatureIds, 20, ctx);

  // Garde-fou : ensemble final identique.
  const after = new Set(built.featureIds);
  for (const id of targetFeatureIds) {
    if (!after.has(id)) throw new Error(`${cfg.file} : capacité ${id} non acquise.`);
  }

  // Auto-remplissage des CHOIX portés par les capacités de la voie de peuple.
  const ancestryFeatureIds = featuresUpToRank(cfg.ancestryPathId, 5);
  const featureChoices: Character['featureChoices'] = {};
  for (const fid of ancestryFeatureIds) {
    const feature = featureById.get(fid)!;
    if (!feature.choices?.length) continue;
    const sel = feature.choices.map((choice) => {
      if (choice.kind === 'feature-from-path') {
        const eligible = eligibleFeaturesForChoice(built, fid, choice);
        return eligible[0]?.id ?? null;
      }
      if (choice.kind === 'ability') {
        if (choice.lowestHint) {
          // La caractéristique la plus faible (déterministe : 1re en cas d'égalité).
          return (Object.keys(abilities) as AbilityId[]).reduce((lo, k) =>
            abilities[k] < abilities[lo] ? k : lo,
          );
        }
        return choice.allowed?.[0] ?? 'FOR';
      }
      // option : première option (les choix de peuple ici ne sont pas répétables).
      return choice.options[0]?.id ?? null;
    });
    featureChoices[fid] = sel;
  }

  // Choix forcés (priment sur l'auto-remplissage) : ex. emprunt d'Enfant de la forêt → animaux-r1.
  for (const [fid, sel] of Object.entries(cfg.forcedFeatureChoices ?? {})) {
    featureChoices[fid] = sel;
  }

  const output: Character = {
    ...built,
    featureChoices,
    effectToggles: { ...cfg.activeToggles },
    notes: `PER-73 — perso de recette, voie de peuple « ${pathById.get(cfg.ancestryPathId)!.name} » poussée à 5/5. Profil ${cls.name} (4 voies au rang 5, 1 au rang 1). Choix des capacités de peuple auto-remplis ; choix des voies de profil laissés tels quels (hors périmètre).`,
    createdAt: isoNow,
    updatedAt: isoNow,
  };

  writeFileSync(join(dir, cfg.file), `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  // Conformité : aucune sur-dépense ni voie à trous.
  const warnings = checkCompliance(output, ctx);
  const blocking = warnings.filter(
    (w) => w.code === 'FEATURE_POINTS_OVERSPENT' || w.code === 'MISSING_RANK' || w.code === 'UNKNOWN_FEATURE',
  );
  if (blocking.length > 0) {
    throw new Error(`${cfg.file} : conformité KO → ${blocking.map((w) => w.message).join(' | ')}`);
  }
  const budget = featurePointBudget(output, ctx);
  const orphan = budget.available - budget.spent;
  const unspent = Object.entries(unspentByLevel).map(([l, p]) => `niv ${l}: ${p}`).join(', ');
  console.log(
    `✓ ${cfg.file} — niveau ${output.level}, ${output.levelUpHistory.length} entrées, ` +
      `${orphan} point(s) orphelin(s)${unspent ? ` (${unspent})` : ''}.`,
  );
}

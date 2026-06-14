/**
 * Validation de l'intégrité référentielle des données de règles CO2 (J2).
 *
 * Lance : `npx tsx scripts/validate-data.ts`
 *
 * Vérifie, sans jamais deviner de règle :
 *  - unicité des ids (peuples, profils, voies, capacités, équipement) ;
 *  - cohérence voie ↔ capacités (capaciteIds ⇄ capacite.voieId) ;
 *  - rangs : 1-5 (profil/peuple/mage), 4-8 (prestige) — anomalies signalées ;
 *  - références profil → voieIds, peuple → voieDePeupleIds existantes ;
 *  - références équipement (armureMaxId, equipementDepart.itemId) — en
 *    AVERTISSEMENT (les slugs ont été supposés par les agents, à raccorder) ;
 *  - comptages globaux pour la relecture.
 *
 * Sortie : rapport lisible + code de sortie 1 si une ERREUR bloquante existe
 * (les avertissements n'échouent pas le script).
 */
import {
  ancestries,
  classes,
  paths,
  classPaths,
  ancestryPaths,
  prestigePaths,
  magePath,
  features,
  equipment,
  equipmentById,
  featureById,
  pathById,
  FEATURE_CLASSIFICATIONS,
  FEATURE_NATURE_TAGS,
  CONDITIONAL_KINDS,
} from '../src/data/index';
import { ABILITY_IDS, DERIVED_STAT_IDS } from '../src/data/schema';

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

// --- Unicité des ids ---------------------------------------------------------
function checkUnique(label: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) err(`[${label}] id dupliqué : ${id}`);
    seen.add(id);
  }
}
checkUnique('peuples', ancestries.map((p) => p.id));
checkUnique('profils', classes.map((p) => p.id));
checkUnique('voies', paths.map((v) => v.id));
checkUnique('capacites', features.map((c) => c.id));
checkUnique('equipement', equipment.map((e) => e.id));

// --- Voie ↔ capacités --------------------------------------------------------
for (const v of paths) {
  for (const cid of v.featureIds) {
    const c = featureById.get(cid);
    if (!c) err(`[voie ${v.id}] capaciteId inexistante : ${cid}`);
    else if (c.pathId !== v.id) err(`[voie ${v.id}] capacité ${cid} pointe vers voieId=${c.pathId}`);
  }
}
for (const c of features) {
  const v = pathById.get(c.pathId);
  if (!v) err(`[capacite ${c.id}] voieId inexistante : ${c.pathId}`);
  else if (!v.featureIds.includes(c.id)) err(`[capacite ${c.id}] absente des capaciteIds de ${v.id}`);
}

// --- Rangs -------------------------------------------------------------------
const prestigeIds = new Set(prestigePaths.map((v) => v.id));
for (const c of features) {
  const isPrestige = prestigeIds.has(c.pathId);
  const lo = isPrestige ? 4 : 1;
  const hi = isPrestige ? 8 : 5;
  if (c.rank < lo || c.rank > hi)
    warn(`[capacite ${c.id}] rang ${c.rank} hors plage attendue ${lo}-${hi} (${isPrestige ? 'prestige' : 'normale'})`);
}

// --- Nb de capacités par voie ------------------------------------------------
for (const v of paths) {
  const n = v.featureIds.length;
  if (n !== 5) warn(`[voie ${v.id}] ${n} capacité(s) (5 attendues)`);
}

// --- profil → voieIds --------------------------------------------------------
const classPathIds = new Set(classPaths.map((v) => v.id));
for (const p of classes) {
  if (p.pathIds.length !== 5) warn(`[profil ${p.id}] ${p.pathIds.length} voie(s) (5 attendues)`);
  for (const vid of p.pathIds)
    if (!classPathIds.has(vid)) err(`[profil ${p.id}] voieId inexistante : ${vid}`);
}

// --- peuple → voieDePeupleIds ------------------------------------------------
const ancestryPathIds = new Set(ancestryPaths.map((v) => v.id));
for (const p of ancestries)
  for (const vid of p.ancestryPathIds)
    if (!ancestryPathIds.has(vid)) err(`[peuple ${p.id}] voieDePeupleId inexistante : ${vid}`);

// --- Cohérence inverse voiesDePeuple.peupleIds -------------------------------
const ancestryIds = new Set(ancestries.map((p) => p.id));
for (const v of ancestryPaths)
  for (const pid of v.ancestryIds)
    if (!ancestryIds.has(pid)) err(`[voie de peuple ${v.id}] peupleId inexistant : ${pid}`);

// --- Références équipement (AVERTISSEMENTS) ----------------------------------
const itemMiss = new Set<string>();
for (const p of classes) {
  if (p.maxArmorId && !equipmentById.has(p.maxArmorId)) itemMiss.add(p.maxArmorId);
  for (const e of p.startingEquipment)
    if (e.itemId && !equipmentById.has(e.itemId)) itemMiss.add(e.itemId);
  for (const wid of p.allowedWeaponIds)
    if (!equipmentById.has(wid)) itemMiss.add(wid);
  for (const wid of p.excludedWeaponIds ?? [])
    if (!equipmentById.has(wid)) itemMiss.add(wid);
}
if (itemMiss.size)
  warn(`[équipement] ${itemMiss.size} slug(s) référencés par les profils absents du catalogue : ${[...itemMiss].sort().join(', ')}`);

// --- Classification des capacités (PER-62) -----------------------------------
// Couverture : exactement une classification par capacité, ids existants,
// tags valides, 'pure-text' exclusif.
const validTags = new Set<string>(FEATURE_NATURE_TAGS);
const validKinds = new Set<string>(CONDITIONAL_KINDS);
checkUnique('classifications', FEATURE_CLASSIFICATIONS.map((c) => c.id));
const classifiedIds = new Set(FEATURE_CLASSIFICATIONS.map((c) => c.id));
for (const c of features)
  if (!classifiedIds.has(c.id)) err(`[classification] capacité non classée : ${c.id}`);
let classifTodos = 0;
for (const cl of FEATURE_CLASSIFICATIONS) {
  if (!featureById.has(cl.id)) err(`[classification ${cl.id}] capacité inexistante`);
  if (cl.tags.length === 0) err(`[classification ${cl.id}] aucun tag`);
  for (const t of cl.tags)
    if (!validTags.has(t)) err(`[classification ${cl.id}] tag inconnu : ${t}`);
  if (cl.tags.includes('pure-text') && cl.tags.length > 1)
    err(`[classification ${cl.id}] 'pure-text' doit être seul (tags: ${cl.tags.join(', ')})`);
  if (cl.conditionalKinds) {
    if (!cl.tags.includes('conditional'))
      err(`[classification ${cl.id}] conditionalKinds sans tag 'conditional'`);
    for (const k of cl.conditionalKinds)
      if (!validKinds.has(k)) err(`[classification ${cl.id}] sous-type conditionnel inconnu : ${k}`);
    if (cl.conditionalKinds.length === 0)
      err(`[classification ${cl.id}] conditionalKinds vide (omettre le champ)`);
  }
  if (cl.note) classifTodos++;
}

// --- Effets structurés des capacités (PER-63, étendu PER-67) -----------------
// Couche sémantique lue par le moteur : bonus (constants, scalants, conditionnels
// ou temporaires) vers une stat dérivée connue. On vérifie le genre, la stat
// ciblée, la forme de la valeur et l'activation ; le `text` verbatim reste la
// source et n'est pas contrôlé ici.
const validStats = new Set<string>(DERIVED_STAT_IDS);
const validAbilities = new Set<string>(ABILITY_IDS);
const validActivationKinds = new Set(['condition', 'temporary']);

/** Valide une `EffectValue` (constante ou scalante) ; renvoie un message ou null. */
function effectValueError(value: unknown): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? null : 'valeur non finie';
  if (typeof value !== 'object' || value === null) return 'valeur de forme inconnue';
  const v = value as Record<string, unknown>;
  if (v.scale === 'ability') {
    if (!validAbilities.has(v.ability as string)) return `caractéristique inconnue : ${v.ability}`;
    if (v.factor !== undefined && !Number.isFinite(v.factor)) return 'facteur non fini';
    return null;
  }
  if (v.scale === 'stepped') {
    if (v.by !== 'level' && v.by !== 'path-rank') return `échelle inconnue : ${v.by}`;
    if (!Array.isArray(v.steps) || v.steps.length === 0) return 'paliers (steps) vides';
    for (const s of v.steps as Array<Record<string, unknown>>) {
      if (!Number.isFinite(s.min) || !Number.isFinite(s.value)) return 'palier { min, value } invalide';
    }
    return null;
  }
  return `échelle scalante inconnue : ${v.scale}`;
}

let featuresWithEffects = 0;
for (const c of features) {
  if (!c.effects) continue;
  featuresWithEffects++;
  for (const e of c.effects) {
    if (e.kind === 'stat-bonus' || e.kind === 'conditional-stat-bonus') {
      if (!validStats.has(e.stat)) err(`[capacite ${c.id}] effect: stat inconnue : ${e.stat}`);
      const valueError = effectValueError(e.value);
      if (valueError) err(`[capacite ${c.id}] effect: ${valueError} (${e.stat})`);
    }
    if (e.kind === 'conditional-stat-bonus') {
      const a = e.activation;
      if (!a || !validActivationKinds.has(a.kind))
        err(`[capacite ${c.id}] effect: activation.kind invalide pour ${e.stat}`);
      if (!a?.label) err(`[capacite ${c.id}] effect: activation.label manquant pour ${e.stat}`);
    } else if (e.kind !== 'stat-bonus') {
      err(`[capacite ${c.id}] effect: genre inconnu : ${(e as { kind: string }).kind}`);
    }
  }
}

// --- Coût de base en mana (PER-65) -------------------------------------------
// Dérogation explicite au coût standard (= rang du sort, p. 228). On vérifie
// que le champ ne porte que des entiers >= 0 et n'apparaît que sur des sorts.
let spellsWithManaCost = 0;
for (const c of features) {
  if (c.manaCost === undefined) continue;
  spellsWithManaCost++;
  if (!c.isSpell) err(`[capacite ${c.id}] manaCost défini sur une capacité qui n'est pas un sort`);
  if (!Number.isInteger(c.manaCost) || c.manaCost < 0)
    err(`[capacite ${c.id}] manaCost invalide : ${c.manaCost} (entier >= 0 attendu)`);
}

// --- Rapport -----------------------------------------------------------------
const spells = features.filter((c) => c.isSpell).length;
console.log('=== Comptages ===');
console.log(`peuples            : ${ancestries.length}`);
console.log(`profils            : ${classes.length}`);
console.log(`voies (total)      : ${paths.length}`);
console.log(`  · de profil      : ${classPaths.length}`);
console.log(`  · de peuple      : ${ancestryPaths.length} (+ voie du mage : ${magePath.id})`);
console.log(`  · de prestige    : ${prestigePaths.length}`);
console.log(`capacités (total)  : ${features.length}  (dont sorts * : ${spells})`);
console.log(`  · classées       : ${FEATURE_CLASSIFICATIONS.length}  (dont TODO(extraction) : ${classifTodos})`);
console.log(`  · avec effects   : ${featuresWithEffects}`);
console.log(`  · coût mana dérogé : ${spellsWithManaCost} (sinon = rang, p. 228)`);
console.log(`équipement (total) : ${equipment.length}`);
console.log('');
console.log(`=== Avertissements (${warnings.length}) ===`);
warnings.forEach((w) => console.log('  ⚠ ' + w));
console.log('');
console.log(`=== Erreurs bloquantes (${errors.length}) ===`);
errors.forEach((e) => console.log('  ✗ ' + e));

if (errors.length) {
  console.log('\n❌ Validation échouée.');
  process.exit(1);
} else {
  console.log('\n✅ Intégrité référentielle OK (voir avertissements pour la relecture).');
}

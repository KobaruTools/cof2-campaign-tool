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
} from '../src/data/index';

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

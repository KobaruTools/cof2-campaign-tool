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
  peuples,
  profils,
  voies,
  voiesDeProfil,
  voiesDePeuple,
  voiesDePrestige,
  voieDuMage,
  capacites,
  equipement,
  equipementParId,
  capaciteParId,
  voieParId,
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
checkUnique('peuples', peuples.map((p) => p.id));
checkUnique('profils', profils.map((p) => p.id));
checkUnique('voies', voies.map((v) => v.id));
checkUnique('capacites', capacites.map((c) => c.id));
checkUnique('equipement', equipement.map((e) => e.id));

// --- Voie ↔ capacités --------------------------------------------------------
for (const v of voies) {
  for (const cid of v.capaciteIds) {
    const c = capaciteParId.get(cid);
    if (!c) err(`[voie ${v.id}] capaciteId inexistante : ${cid}`);
    else if (c.voieId !== v.id) err(`[voie ${v.id}] capacité ${cid} pointe vers voieId=${c.voieId}`);
  }
}
for (const c of capacites) {
  const v = voieParId.get(c.voieId);
  if (!v) err(`[capacite ${c.id}] voieId inexistante : ${c.voieId}`);
  else if (!v.capaciteIds.includes(c.id)) err(`[capacite ${c.id}] absente des capaciteIds de ${v.id}`);
}

// --- Rangs -------------------------------------------------------------------
const prestigeIds = new Set(voiesDePrestige.map((v) => v.id));
for (const c of capacites) {
  const isPrestige = prestigeIds.has(c.voieId);
  const lo = isPrestige ? 4 : 1;
  const hi = isPrestige ? 8 : 5;
  if (c.rang < lo || c.rang > hi)
    warn(`[capacite ${c.id}] rang ${c.rang} hors plage attendue ${lo}-${hi} (${isPrestige ? 'prestige' : 'normale'})`);
}

// --- Nb de capacités par voie ------------------------------------------------
for (const v of voies) {
  const n = v.capaciteIds.length;
  if (n !== 5) warn(`[voie ${v.id}] ${n} capacité(s) (5 attendues)`);
}

// --- profil → voieIds --------------------------------------------------------
const voieProfilIds = new Set(voiesDeProfil.map((v) => v.id));
for (const p of profils) {
  if (p.voieIds.length !== 5) warn(`[profil ${p.id}] ${p.voieIds.length} voie(s) (5 attendues)`);
  for (const vid of p.voieIds)
    if (!voieProfilIds.has(vid)) err(`[profil ${p.id}] voieId inexistante : ${vid}`);
}

// --- peuple → voieDePeupleIds ------------------------------------------------
const voiePeupleIds = new Set(voiesDePeuple.map((v) => v.id));
for (const p of peuples)
  for (const vid of p.voieDePeupleIds)
    if (!voiePeupleIds.has(vid)) err(`[peuple ${p.id}] voieDePeupleId inexistante : ${vid}`);

// --- Cohérence inverse voiesDePeuple.peupleIds -------------------------------
const peupleIds = new Set(peuples.map((p) => p.id));
for (const v of voiesDePeuple)
  for (const pid of v.peupleIds)
    if (!peupleIds.has(pid)) err(`[voie de peuple ${v.id}] peupleId inexistant : ${pid}`);

// --- Références équipement (AVERTISSEMENTS) ----------------------------------
const itemMiss = new Set<string>();
for (const p of profils) {
  if (p.armureMaxId && !equipementParId.has(p.armureMaxId)) itemMiss.add(p.armureMaxId);
  for (const e of p.equipementDepart)
    if (e.itemId && !equipementParId.has(e.itemId)) itemMiss.add(e.itemId);
}
if (itemMiss.size)
  warn(`[équipement] ${itemMiss.size} slug(s) référencés par les profils absents du catalogue : ${[...itemMiss].sort().join(', ')}`);

// --- Rapport -----------------------------------------------------------------
const sorts = capacites.filter((c) => c.estSort).length;
console.log('=== Comptages ===');
console.log(`peuples            : ${peuples.length}`);
console.log(`profils            : ${profils.length}`);
console.log(`voies (total)      : ${voies.length}`);
console.log(`  · de profil      : ${voiesDeProfil.length}`);
console.log(`  · de peuple      : ${voiesDePeuple.length} (+ voie du mage : ${voieDuMage.id})`);
console.log(`  · de prestige    : ${voiesDePrestige.length}`);
console.log(`capacités (total)  : ${capacites.length}  (dont sorts * : ${sorts})`);
console.log(`équipement (total) : ${equipement.length}`);
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

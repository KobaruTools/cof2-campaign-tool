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
  priestGods,
  pathById,
  testDomains,
  testDomainById,
  FEATURE_CLASSIFICATIONS,
  FEATURE_NATURE_TAGS,
  CONDITIONAL_KINDS,
} from '../src/data/index';
import { ABILITY_IDS, DERIVED_STAT_IDS, RESISTIBLE_DAMAGE_TYPES } from '../src/data/schema';

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
  if (v.scale === 'level') {
    if (v.factor !== undefined && !Number.isFinite(v.factor)) return 'level : facteur non fini';
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
  if (v.scale === 'milestone-count') {
    if (!Number.isFinite(v.per)) return 'milestone-count : per non fini';
    if (!Number.isFinite(v.rank)) return 'milestone-count : rank non fini';
    if (!Array.isArray(v.classIds) || v.classIds.some((c) => typeof c !== 'string'))
      return 'milestone-count : classIds invalide';
    return null;
  }
  if (v.scale === 'sum') {
    if (!Array.isArray(v.parts) || v.parts.length === 0) return 'sum : parts vide';
    for (const part of v.parts) {
      const e = effectValueError(part);
      if (e) return `sum : ${e}`;
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
    if (e.kind === 'stat-bonus') {
      if (!validStats.has(e.stat)) err(`[capacite ${c.id}] effect: stat inconnue : ${e.stat}`);
      const valueError = effectValueError(e.value);
      if (valueError) err(`[capacite ${c.id}] effect: ${valueError} (${e.stat})`);
    } else if (e.kind === 'conditional-stat-bonus') {
      // Un effet conditionnel porte une LISTE de bonus (un seul interrupteur les pilote).
      // Liste VIDE admise : marqueur d'état on/off sans contribution chiffrée (ex.
      // Invocation d'un démon, demon-r5). On exige seulement un tableau et une activation.
      if (!Array.isArray(e.bonuses)) err(`[capacite ${c.id}] effect: bonuses doit être un tableau`);
      for (const b of e.bonuses ?? []) {
        if (!validStats.has(b.stat)) err(`[capacite ${c.id}] effect: stat inconnue : ${b.stat}`);
        const valueError = effectValueError(b.value);
        if (valueError) err(`[capacite ${c.id}] effect: ${valueError} (${b.stat})`);
      }
      // Bonus optionnel à TOUS les tests de carac, sous le même interrupteur (PER-89).
      if (e.abilityTestBonus !== undefined) {
        const valueError = effectValueError(e.abilityTestBonus);
        if (valueError) err(`[capacite ${c.id}] effect: abilityTestBonus ${valueError}`);
      }
      const a = e.activation;
      if (!a || !validActivationKinds.has(a.kind))
        err(`[capacite ${c.id}] effect: activation.kind invalide (${c.id})`);
      if (!a?.label) err(`[capacite ${c.id}] effect: activation.label manquant (${c.id})`);
      // Exclusion mutuelle : les cibles désactivées doivent exister et ne pas être soi.
      for (const target of e.disablesFeatures ?? []) {
        if (!featureById.has(target))
          err(`[capacite ${c.id}] effect: disablesFeatures cible inexistante : ${target}`);
        if (target === c.id) err(`[capacite ${c.id}] effect: disablesFeatures s'auto-référence`);
      }
    } else if (e.kind === 'ability-bonus') {
      // Modificateur permanent d'une caractéristique (« +1 en CON »).
      if (!validAbilities.has(e.ability)) err(`[capacite ${c.id}] effect: caractéristique inconnue : ${e.ability}`);
      if (!Number.isFinite(e.value)) err(`[capacite ${c.id}] effect: ability-bonus value non finie (${e.ability})`);
    } else if (e.kind === 'ability-bonus-die') {
      // Dé bonus permanent aux tests d'une caractéristique (drapeau, sans valeur).
      if (!validAbilities.has(e.ability)) err(`[capacite ${c.id}] effect: caractéristique inconnue : ${e.ability}`);
    } else if (e.kind === 'ability-bonus-from-choice') {
      // Carac déterminée par un choix `ability` de la capacité (meditation-r5, vent-r5).
      const choice = c.choices?.[e.choiceIndex];
      if (!choice || choice.kind !== 'ability')
        err(`[capacite ${c.id}] effect: ability-bonus-from-choice → choiceIndex ${e.choiceIndex} ne pointe pas vers un choix 'ability'`);
      if (!Number.isFinite(e.value)) err(`[capacite ${c.id}] effect: ability-bonus-from-choice value non finie`);
    } else if (e.kind === 'test-bonus') {
      // Bonus de compétence à un/des domaine(s) nommé(s) (PER-89). `domains` non vide,
      // chaque id présent dans le catalogue ; `value` optionnelle (sinon déduite).
      if (!Array.isArray(e.domains) || e.domains.length === 0)
        err(`[capacite ${c.id}] effect: test-bonus domains vide`);
      for (const d of e.domains ?? [])
        if (!testDomainById.has(d)) err(`[capacite ${c.id}] effect: domaine inconnu : ${d}`);
      if (e.value !== undefined) {
        const valueError = effectValueError(e.value);
        if (valueError) err(`[capacite ${c.id}] effect: test-bonus ${valueError}`);
      }
    } else {
      err(`[capacite ${c.id}] effect: genre inconnu : ${(e as { kind: string }).kind}`);
    }
  }
}

// --- Catalogue des domaines de compétence (PER-89) ---------------------------
// Ids uniques ; au moins une caractéristique gouvernante, toutes valides.
checkUnique('domaines', testDomains.map((d) => d.id));
for (const d of testDomains) {
  if (!Array.isArray(d.abilities) || d.abilities.length === 0)
    err(`[domaine ${d.id}] aucune caractéristique gouvernante`);
  for (const a of d.abilities ?? [])
    if (!validAbilities.has(a)) err(`[domaine ${d.id}] caractéristique inconnue : ${a}`);
}

// --- Domaines de compétence pilotés par une option (PER-89) ------------------
// Les domaines octroyés par une option retenue (`testBonusDomains`, ex. humain-r1)
// doivent référencer des ids existants du catalogue, comme les effets `test-bonus`.
for (const c of features) {
  for (const choice of c.choices ?? []) {
    if (choice.kind !== 'option') continue;
    for (const opt of choice.options)
      for (const d of opt.testBonusDomains ?? [])
        if (!testDomainById.has(d)) err(`[capacite ${c.id}] option ${opt.id}: domaine inconnu : ${d}`);
  }
}

// --- Réduction de dégâts (préparation « stats avancées ») --------------------
// Donnée posée mais pas encore lue par le moteur : on vérifie la forme (mode,
// value selon le mode, types de dégâts connus, plafond résoluble).
const validDamageScopes = new Set<string>(RESISTIBLE_DAMAGE_TYPES);
let featuresWithDamageReduction = 0;
for (const c of features) {
  const dr = c.damageReduction;
  if (!dr) continue;
  featuresWithDamageReduction++;
  if (dr.kind !== 'flat' && dr.kind !== 'divide' && dr.kind !== 'immunity')
    err(`[capacite ${c.id}] damageReduction.kind inconnu : ${dr.kind}`);
  if (dr.kind === 'immunity') {
    if (dr.value !== undefined) err(`[capacite ${c.id}] damageReduction: 'immunity' ne porte pas de value`);
  } else {
    if (dr.value === undefined) err(`[capacite ${c.id}] damageReduction: '${dr.kind}' exige une value`);
    else {
      const ve = effectValueError(dr.value);
      if (ve) err(`[capacite ${c.id}] damageReduction value: ${ve}`);
    }
  }
  for (const s of dr.scopes ?? [])
    if (!validDamageScopes.has(s)) err(`[capacite ${c.id}] damageReduction scope inconnu : ${s}`);
  if (dr.absorptionCap !== undefined) {
    const ce = effectValueError(dr.absorptionCap);
    if (ce) err(`[capacite ${c.id}] damageReduction absorptionCap: ${ce}`);
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

// --- Panthéon d'Osgild — dieux du prêtre (p. 126-127) ------------------------
// Intégrité référentielle : arme(s) sacrée(s) = armes existantes, capacité
// divine = feature existante d'une AUTRE voie que celles du prêtre.
const godIds = new Set<string>();
const PRIEST_CLASS_ID = 'pretre';
for (const g of priestGods) {
  if (godIds.has(g.id)) err(`[dieu ${g.id}] id en double`);
  godIds.add(g.id);
  if (g.sacredWeaponIds.length === 0) err(`[dieu ${g.id}] aucune arme sacrée`);
  for (const wid of g.sacredWeaponIds) {
    const item = equipmentById.get(wid);
    if (!item) err(`[dieu ${g.id}] arme sacrée inconnue : ${wid}`);
    else if (item.category !== 'weapon') err(`[dieu ${g.id}] arme sacrée n'est pas une arme : ${wid}`);
  }
  const feature = featureById.get(g.divineFeatureId);
  if (!feature) err(`[dieu ${g.id}] capacité divine inconnue : ${g.divineFeatureId}`);
  else {
    // La capacité divine vient d'un AUTRE profil : sa voie ne doit pas être une voie de prêtre.
    const path = pathById.get(feature.pathId);
    if (path?.type === 'class' && path.classIds.includes(PRIEST_CLASS_ID))
      err(`[dieu ${g.id}] capacité divine ${g.divineFeatureId} appartient à une voie de prêtre (doit venir d'un autre profil)`);
  }
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
console.log(`  · avec RD        : ${featuresWithDamageReduction} (réduction de dégâts, non lue par le moteur)`);
console.log(`  · coût mana dérogé : ${spellsWithManaCost} (sinon = rang, p. 228)`);
console.log(`équipement (total) : ${equipment.length}`);
console.log(`dieux du prêtre    : ${priestGods.length}`);
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

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
  classById,
  testDomains,
  testDomainById,
  fantasticFamiliars,
  FEATURE_CLASSIFICATIONS,
  FEATURE_NATURE_TAGS,
  CONDITIONAL_KINDS,
} from '../src/data/index';
import { ABILITY_IDS, DERIVED_STAT_IDS, IMMUNITY_IDS, RESISTIBLE_DAMAGE_TYPES, STATUS_EFFECT_IDS } from '../src/data/schema';

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
  // Reskins d'objet (PER-181) : la cible doit exister au catalogue (sinon le reskin
  // n'a rien à renommer).
  for (const r of p.equipmentReskins ?? [])
    if (!equipmentById.has(r.itemId)) itemMiss.add(r.itemId);
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
const validImmunities = new Set<string>(IMMUNITY_IDS);

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
      // Bonus conditionnel à UNE carac précise (PER-137, ex. Prescience +10 PER).
      if (e.abilityTestBonusFor !== undefined) {
        if (!validAbilities.has(e.abilityTestBonusFor.ability))
          err(`[capacite ${c.id}] effect: abilityTestBonusFor carac inconnue : ${e.abilityTestBonusFor.ability}`);
        const valueError = effectValueError(e.abilityTestBonusFor.value);
        if (valueError) err(`[capacite ${c.id}] effect: abilityTestBonusFor ${valueError}`);
      }
      // Dé bonus conditionnel sur des domaines de test nommés (PER-108) — ids du catalogue.
      for (const d of e.testDieDomains ?? [])
        if (!testDomainById.has(d)) err(`[capacite ${c.id}] effect: domaine inconnu (testDieDomains) : ${d}`);
      // Bonus de compétence conditionnel sur des domaines (PER-117) — ids du catalogue.
      for (const d of e.testBonusDomains ?? [])
        if (!testDomainById.has(d)) err(`[capacite ${c.id}] effect: domaine inconnu (testBonusDomains) : ${d}`);
      // Dépendance intra-capacité (PER-109) : l'index référencé doit exister et différer de soi.
      if (e.deactivatesWithEffectIndex !== undefined) {
        const target = c.effects?.[e.deactivatesWithEffectIndex];
        if (!target) err(`[capacite ${c.id}] effect: deactivatesWithEffectIndex pointe un effet inexistant`);
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
    } else if (e.kind === 'ability-bonus-die-from-choice') {
      // Dé bonus dont la carac vient d'un choix `ability`, éventuellement restreint (PER-110).
      const choice = c.choices?.[e.choiceIndex];
      if (!choice || choice.kind !== 'ability')
        err(`[capacite ${c.id}] effect: ability-bonus-die-from-choice → choiceIndex ${e.choiceIndex} ne pointe pas vers un choix 'ability'`);
      for (const ab of e.onlyIfAbility ?? [])
        if (!validAbilities.has(ab)) err(`[capacite ${c.id}] effect: ability-bonus-die-from-choice carac inconnue : ${ab}`);
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
    } else if (e.kind === 'mana-ability-override') {
      // Substitution de la carac de calcul des PM (« CHA au lieu de VOL »).
      if (!validAbilities.has(e.ability)) err(`[capacite ${c.id}] effect: caractéristique inconnue : ${e.ability}`);
    } else if (e.kind === 'universal-test-bonus') {
      // Bonus de compétence universel (Éclectique) : profil et rang seuil valides.
      const s = e.scaleByPathsAtRank;
      if (!s || typeof s.classId !== 'string' || !Number.isInteger(s.rank))
        err(`[capacite ${c.id}] effect: universal-test-bonus scaleByPathsAtRank invalide`);
    } else if (e.kind === 'immunity') {
      // Immunités : liste non vide, chaque id reconnu (IMMUNITY_IDS).
      if (!Array.isArray(e.immunities) || e.immunities.length === 0)
        err(`[capacite ${c.id}] effect: immunity vide`);
      for (const imm of e.immunities ?? [])
        if (!validImmunities.has(imm)) err(`[capacite ${c.id}] effect: immunité inconnue : ${imm}`);
    } else if (e.kind === 'armor-access') {
      // Accès armure amélioré (PER-81) : l'armure débloquée doit exister au catalogue.
      const armor = e.maxArmorId ? equipmentById.get(e.maxArmorId) : undefined;
      if (!armor) err(`[capacite ${c.id}] effect: armor-access maxArmorId inconnu : ${e.maxArmorId}`);
      else if (armor.category !== 'armor')
        err(`[capacite ${c.id}] effect: armor-access maxArmorId n'est pas une armure : ${e.maxArmorId}`);
      // Relèvements croisés d'usage pour hybride de combattant (PER-86) : profil et armure valides.
      for (const hr of e.hybridClassRaises ?? []) {
        if (!classById.has(hr.classId))
          err(`[capacite ${c.id}] effect: armor-access hybridClassRaises classId inconnu : ${hr.classId}`);
        const raiseArmor = hr.maxArmorId ? equipmentById.get(hr.maxArmorId) : undefined;
        if (!raiseArmor)
          err(`[capacite ${c.id}] effect: armor-access hybridClassRaises maxArmorId inconnu : ${hr.maxArmorId}`);
        else if (raiseArmor.category !== 'armor')
          err(`[capacite ${c.id}] effect: armor-access hybridClassRaises maxArmorId n'est pas une armure : ${hr.maxArmorId}`);
      }
    } else if (e.kind === 'armor-def-bonus') {
      // Bonus de DEF selon l'armure portée (PER-132) : deux branches (avec / sans armure),
      // chacune constante ou scalante.
      const unarmoredError = effectValueError(e.whenUnarmored);
      if (unarmoredError) err(`[capacite ${c.id}] effect: armor-def-bonus whenUnarmored ${unarmoredError}`);
      const armoredError = effectValueError(e.whenArmored);
      if (armoredError) err(`[capacite ${c.id}] effect: armor-def-bonus whenArmored ${armoredError}`);
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
    for (const opt of choice.options) {
      for (const d of opt.testBonusDomains ?? [])
        if (!testDomainById.has(d)) err(`[capacite ${c.id}] option ${opt.id}: domaine inconnu : ${d}`);
      // Bonus de stats dérivées portés par une option (PER-111, ex. Éclaireur : +1 DR / −1 PC).
      for (const b of opt.statBonuses ?? []) {
        if (!validStats.has(b.stat)) err(`[capacite ${c.id}] option ${opt.id}: stat inconnue : ${b.stat}`);
        const valueError = effectValueError(b.value);
        if (valueError) err(`[capacite ${c.id}] option ${opt.id}: statBonuses ${valueError}`);
      }
      // Caractéristique de DEF substituée par une option (PER-131, ex. Peau de pierre : CON).
      if (opt.defAbility !== undefined && !validAbilities.has(opt.defAbility))
        err(`[capacite ${c.id}] option ${opt.id}: defAbility carac inconnue : ${opt.defAbility}`);
    }
  }
}

// --- Réduction de dégâts (préparation « stats avancées ») --------------------
// Donnée posée mais pas encore lue par le moteur : on vérifie la forme (mode,
// value selon le mode, types de dégâts connus, plafond résoluble).
const validDamageScopes = new Set<string>(RESISTIBLE_DAMAGE_TYPES);
let featuresWithDamageReduction = 0;
for (const c of features) {
  if (!c.damageReduction) continue;
  featuresWithDamageReduction++;
  // Une capacité peut porter une seule RD ou un TABLEAU d'entrées (PER-137).
  const drs = Array.isArray(c.damageReduction) ? c.damageReduction : [c.damageReduction];
  for (const dr of drs) {
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
    // Scope CHOISI à la table (PER-137) : types valides, et exclusif avec `scopes` figés.
    for (const s of dr.scopeChoice ?? [])
      if (!validDamageScopes.has(s)) err(`[capacite ${c.id}] damageReduction scopeChoice inconnu : ${s}`);
    if (dr.scopeChoice && dr.scopes)
      err(`[capacite ${c.id}] damageReduction: 'scopes' et 'scopeChoice' sont exclusifs`);
    // Scope dérivé d'un CHOIX PERMANENT (PER-138) : index d'un choix `option` de la même capacité dont
    // TOUS les ids d'options sont des types de dégât valides ; exclusif avec `scopes`/`scopeChoice`.
    if (dr.scopeFromChoice !== undefined) {
      if (dr.scopes || dr.scopeChoice)
        err(`[capacite ${c.id}] damageReduction: 'scopeFromChoice' exclusif avec 'scopes'/'scopeChoice'`);
      const choice = c.choices?.[dr.scopeFromChoice];
      if (!choice || choice.kind !== 'option')
        err(`[capacite ${c.id}] damageReduction scopeFromChoice ${dr.scopeFromChoice} ne pointe pas un choix 'option'`);
      else
        for (const o of choice.options)
          if (!validDamageScopes.has(o.id))
            err(`[capacite ${c.id}] damageReduction scopeFromChoice : option '${o.id}' n'est pas un type de dégât valide`);
    }
    if (dr.absorptionCap !== undefined) {
      const ce = effectValueError(dr.absorptionCap);
      if (ce) err(`[capacite ${c.id}] damageReduction absorptionCap: ${ce}`);
    }
    for (const k of ['minPathRank', 'maxPathRank'] as const)
      if (dr[k] !== undefined && (typeof dr[k] !== 'number' || dr[k]! < 1 || dr[k]! > 8))
        err(`[capacite ${c.id}] damageReduction ${k} hors plage 1-8 : ${dr[k]}`);
  }
}

// --- Plage de critique élargie (PER-133) -------------------------------------
// Donnée d'affichage informatif (non lue par le moteur) : on vérifie la portée (melee/ranged)
// et la résolubilité de la valeur (constante ou scalante). Une plage conditionnée à l'arme doit
// s'appuyer sur un effet conditionnel (marqueur d'état) pour que son interrupteur existe.
let featuresWithCriticalRange = 0;
for (const c of features) {
  const cr = c.criticalRange;
  if (!cr) continue;
  featuresWithCriticalRange++;
  if (cr.scope !== 'melee' && cr.scope !== 'ranged')
    err(`[capacite ${c.id}] criticalRange.scope inconnu : ${cr.scope}`);
  const ve = effectValueError(cr.value);
  if (ve) err(`[capacite ${c.id}] criticalRange value: ${ve}`);
}

// --- Remplacement inconditionnel de capacité (PER-70) ------------------------
// `replacesFeatures` (Grand félin → Panthère) : les cibles doivent exister, ne pas
// être soi, et appartenir à la même voie (un remplacement ne traverse pas les voies).
for (const c of features) {
  for (const target of c.replacesFeatures ?? []) {
    const t = featureById.get(target);
    if (!t) err(`[capacite ${c.id}] replacesFeatures cible inexistante : ${target}`);
    else if (t.pathId !== c.pathId)
      err(`[capacite ${c.id}] replacesFeatures cible hors voie : ${target} (${t.pathId} ≠ ${c.pathId})`);
    if (target === c.id) err(`[capacite ${c.id}] replacesFeatures s'auto-référence`);
  }
}

// --- Sorts cités à titre indicatif (Élixirs mineurs/majeurs, p. 98) ----------
// `referencedFeatures` : les cibles doivent exister et ne pas être soi. Volontairement
// cross-voie (une recette reproduit un sort d'une AUTRE voie) → aucune contrainte de voie.
for (const c of features) {
  for (const target of c.referencedFeatures ?? []) {
    if (!featureById.get(target))
      err(`[capacite ${c.id}] referencedFeatures cible inexistante : ${target}`);
    if (target === c.id) err(`[capacite ${c.id}] referencedFeatures s'auto-référence`);
  }
}

// --- Pouvoirs empruntés cassables (Artefact étrange, p. 97, PER-163) ----------
// `borrowedPowers` : mêmes contraintes que `referencedFeatures` (cibles existantes, pas soi ;
// volontairement cross-voie — l'artefact reproduit des sorts d'AUTRES voies).
for (const c of features) {
  for (const target of c.borrowedPowers ?? []) {
    if (!featureById.get(target))
      err(`[capacite ${c.id}] borrowedPowers cible inexistante : ${target}`);
    if (target === c.id) err(`[capacite ${c.id}] borrowedPowers s'auto-référence`);
  }
}

// --- États préjudiciables infligeables (Botte secrète, p. 77, PER-206) --------
// `inflictableStates.stateIds` : liste non vide, sans doublon, chaque id reconnu (STATUS_EFFECT_IDS).
const validStates = new Set<string>(STATUS_EFFECT_IDS);
for (const c of features) {
  const states = c.inflictableStates;
  if (!states) continue;
  if (!Array.isArray(states.stateIds) || states.stateIds.length === 0)
    err(`[capacite ${c.id}] inflictableStates: stateIds vide`);
  const seen = new Set<string>();
  for (const s of states.stateIds ?? []) {
    if (!validStates.has(s)) err(`[capacite ${c.id}] inflictableStates: état inconnu : ${s}`);
    if (seen.has(s)) err(`[capacite ${c.id}] inflictableStates: état en double : ${s}`);
    seen.add(s);
  }
}

// --- Substitutions de caractéristique des sorts reproduits (Artefact/Élixirs, PER-163) ----------
// `reproducedAbilitySubstitutions` : une substitution `from → to` doit porter sur deux carac DISTINCTES
// (une substitution vers elle-même n'a aucun sens) ; les carac sont déjà typées `AbilityId`.
for (const c of features) {
  for (const sub of c.reproducedAbilitySubstitutions ?? []) {
    if (sub.from === sub.to)
      err(`[capacite ${c.id}] reproducedAbilitySubstitutions : substitution vers elle-même (${sub.from})`);
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

// --- Familiers fantastiques (p. 133-136, PER-84) -----------------------------
// Intégrité : id unique, voie hôte existante, profils cités (spellProfile + grants)
// = profils existants, caractéristique du +1 valide.
const familiarIds = new Set<string>();
const FAMILIAR_PATH_ID = 'prestige-familier-fantastique';
const isKnownProfile = (id: string) => classById.has(id);
for (const f of fantasticFamiliars) {
  if (familiarIds.has(f.id)) err(`[familier ${f.id}] id en double`);
  familiarIds.add(f.id);
  if (f.pathId !== FAMILIAR_PATH_ID) err(`[familier ${f.id}] pathId inattendu : ${f.pathId}`);
  if (!pathById.has(f.pathId)) err(`[familier ${f.id}] voie hôte inconnue : ${f.pathId}`);
  // R5 : profil de magie associé — id de profil OU la valeur spéciale 'main-profile'.
  if (f.spellProfile !== 'main-profile' && !isKnownProfile(f.spellProfile))
    err(`[familier ${f.id}] spellProfile inconnu : ${f.spellProfile}`);
  // R7 : caractéristique recevant le +1.
  if (!ABILITY_IDS.includes(f.superiorPower.abilityBonus))
    err(`[familier ${f.id}] abilityBonus invalide : ${f.superiorPower.abilityBonus}`);
  // Capacités conférées (R4/R7) : le profil cité doit exister. featureId non résolu = normal (différé).
  for (const [rank, power] of [['R4', f.minorPower] as const, ['R7', f.superiorPower] as const]) {
    const g = power.grants;
    if (g && !isKnownProfile(g.profile))
      err(`[familier ${f.id} ${rank}] profil de la capacité conférée inconnu : ${g.profile}`);
  }
  // Écarts de caractéristiques : clés valides.
  for (const k of Object.keys(f.abilityOverrides ?? {}))
    if (!ABILITY_IDS.includes(k as (typeof ABILITY_IDS)[number]))
      err(`[familier ${f.id}] abilityOverride invalide : ${k}`);
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
console.log(`  · avec plage crit. : ${featuresWithCriticalRange} (plage de critique élargie, non lue par le moteur)`);
console.log(`  · coût mana dérogé : ${spellsWithManaCost} (sinon = rang, p. 228)`);
console.log(`équipement (total) : ${equipment.length}`);
console.log(`dieux du prêtre    : ${priestGods.length}`);
console.log(`familiers fantast. : ${fantasticFamiliars.length}`);
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

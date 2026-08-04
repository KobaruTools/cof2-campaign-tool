/**
 * Compagnons du personnage (PER-233) — énumération et résolution des mini-fiches de
 * créature octroyées par les rangs de voie (monture, familier, écuyer, golem, loup,
 * invocation…). Module PUR (aucune dépendance UI) : source de vérité de « quels
 * compagnons ce personnage possède-t-il ? », consommée par la section « Compagnons »
 * de la fiche.
 *
 * Un compagnon est débloqué dès qu'un rang ACQUIS porte un `CreatureProfile` effectif
 * (directement, ou via l'option retenue — cf. `effectiveCreatureProfile`). La section
 * est ENTIÈREMENT dérivée des rangs de voie : aucun ajout/retrait manuel. Le seul état
 * persisté par compagnon est le manque de PV (`Character.companionDepletion`), suivi de
 * jeu au même titre que la barre de vie du personnage.
 */
import { featureById, pathById, progression } from '@/data';
import type {
  AbilityId,
  CompanionType,
  CreatureProfile,
  CreatureSpecialAbility,
  CreatureUpgrade,
  DamageReduction,
  Feature,
} from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import { getSelection } from './choices';
import {
  creatureBonusDiceForPath,
  disabledFeatureIds,
  effectContext,
  isEffectActive,
  pathRanksFromFeatures,
  resolveValue,
} from './effects';
import { declineText, resolveFeatureElement } from './dragonElement';
import { enSelleLink } from './mounts';
import { pruneDepletion } from './gauges';
import { parseRichText, resolveExpr } from '@/lib/ui/featureRichText';
import { buildDefenseBreakdown, type CreatureDefenseUpgrade, type StatBreakdown } from './statBreakdown';
import type { Character, Depletion } from './types';

/**
 * Profil de créature EFFECTIF d'une capacité (PER-140) : si la capacité porte un choix
 * `option` dont l'option retenue déclare son propre `creatureProfile` (ex. Monture
 * fantastique → la monture choisie), celui-ci PRIME ; sinon on retombe sur le
 * `creatureProfile` de la capacité. `undefined` = aucune créature à afficher (ex. choix
 * de monture pas encore fait, ou capacité sans profil).
 */
export function effectiveCreatureProfile(
  feature: Feature,
  character: Character | undefined,
): CreatureProfile | undefined {
  const found = (() => {
    if (character) {
      const defs = feature.choices ?? [];
      for (let i = 0; i < defs.length; i += 1) {
        const def = defs[i];
        if (def.kind !== 'option') continue;
        const raw = getSelection(character, feature.id, i);
        const id = Array.isArray(raw) ? raw[0] : raw;
        const opt = id ? def.options.find((o) => o.id === id) : undefined;
        if (opt?.creatureProfile) return opt.creatureProfile;
      }
    }
    return feature.creatureProfile;
  })();
  // PER-74 — ÉPITHÈTE DE COULEUR du drake (« Drake bleu ») : le nom du profil porte `%colorSuffix%`,
  // résolu ici, seul point qui voie à la fois le profil retenu et le personnage. Token à repli VIDE →
  // « Drake » tout court tant que la couleur n'est pas choisie (cf. `declineText`). Un profil sans
  // token (toutes les autres montures) traverse inchangé, référence d'origine comprise.
  if (!found || !character || !feature.elementFromChoice || !found.name.includes('%')) return found;
  return { ...found, name: declineText(found.name, resolveFeatureElement(character, feature)) };
}

/**
 * Amélioration de créature dont le champ `def` scalant a déjà été RÉSOLU en nombre (les autres
 * champs sont inchangés). La résolution se fait AU GATHER, contre la voie de la capacité SOURCE
 * (`resolveValue`), car le rang pertinent est celui du maître dans SA voie (ex. rang `runes`), pas
 * celui de la créature. Le pliage aval (`applyCreatureUpgrades`) reste ainsi purement numérique.
 */
type ResolvedCreatureUpgrade = Omit<CreatureUpgrade, 'def'> & {
  def?: number;
  /** Capacité qui octroie l'amélioration (PER-256) — voie hôte pour une option retenue. Puce de source. */
  sourceFeatureId: string;
  /** Nom affiché de la source : nom de la capacité, ou libellé de l'option retenue (repli texte). */
  sourceName: string;
};

/** Sources du bonus de DÉFENSE d'un profil AFFICHÉ (PER-256), pour ventiler la valeur en info-bulle. */
interface CreatureDefenseSources {
  /** Expression de DEF de BASE (avant injection des bonus), pour décomposer « Base + Rang ». */
  baseDefense?: string;
  /** Bonus de DEF propagés par le maître, déjà résolus, avec leur capacité source. */
  upgrades: CreatureDefenseUpgrade[];
}

/**
 * Rattache au profil AFFICHÉ (l'objet retourné par `applyCreatureUpgrades`) les sources de son bonus
 * de DEF, pour en exposer la ventilation à l'affichage (PER-256) SANS repasser `character` aux
 * composants de rendu ni ajouter un champ calculé au type de données `CreatureProfile`. WeakMap (clé =
 * le profil affiché) → l'entrée est collectée avec le profil. Peuplé UNIQUEMENT quand au moins un
 * bonus du maître touche la DEF (créature « nue » → aucune entrée, rendu numérique inchangé).
 */
const defenseSourcesByProfile = new WeakMap<CreatureProfile, CreatureDefenseSources>();

/**
 * DÉCLINE une amélioration de créature selon l'ÉLÉMENT DRACONIQUE de la capacité source (PER-74) :
 *  - une RD marquée `scopeFromElement` reçoit la portée de l'élément retenu, ou DISPARAÎT si aucune
 *    couleur n'est choisie (mécanique inerte, pas de repli sur le feu) ;
 *  - les capacités spéciales voient leurs tokens résolus dans `name`/`richText` (le `text` reste le
 *    verbatim imprimé du livre, comme partout ailleurs).
 * Amélioration sans élément ni token → renvoyée TELLE QUELLE (même référence).
 */
function declineUpgradeForElement(
  character: Character,
  sourceFeatureId: string,
  upgrade: CreatureUpgrade,
): CreatureUpgrade {
  const feature = featureById.get(sourceFeatureId);
  if (!feature?.elementFromChoice) return upgrade;
  const element = resolveFeatureElement(character, feature);
  const next: CreatureUpgrade = { ...upgrade };
  if (upgrade.damageReduction) {
    const list = Array.isArray(upgrade.damageReduction) ? upgrade.damageReduction : [upgrade.damageReduction];
    const resolved = list.flatMap((dr) => {
      if (!dr.scopeFromElement) return [dr];
      if (!element) return [];
      // `scopeFromElement` est CONSOMMÉ ici : le profil de créature ne porte plus qu'une portée figée
      // (le champ y serait de toute façon inerte, cf. `CreatureProfile.damageReduction`).
      const resolvedDr: DamageReduction = { ...dr, scopes: [element.id] };
      delete resolvedDr.scopeFromElement;
      return [resolvedDr];
    });
    if (resolved.length === 0) delete next.damageReduction;
    else next.damageReduction = resolved.length === 1 ? resolved[0] : resolved;
  }
  if (upgrade.specialAbilities) {
    next.specialAbilities = upgrade.specialAbilities.map((sa) => ({
      ...sa,
      name: declineText(sa.name, element),
      ...(sa.richText ? { richText: declineText(sa.richText, element) } : {}),
    }));
  }
  return next;
}

/**
 * Améliorations propagées à la créature de la voie `creaturePathId` (PER-94). Balaye TOUTES les
 * capacités acquises — améliorations portées directement par une capacité (`Feature.creatureUpgrade`,
 * ex. Runes de défense → golem, cross-voie) ET par les options retenues d'un choix `option`
 * (`FeatureChoiceOption.creatureUpgrade`, ex. Golem supérieur, golem-r5) — et retient celles dont la
 * cible (`targetPaths ?? [voie source]`) inclut `creaturePathId`. Le `def` scalant est résolu ici même
 * contre la voie SOURCE (rang du maître), pour que Runes de défense donne +2/+3/+4 selon le rang runes.
 */
function gatherCreatureUpgrades(character: Character, creaturePathId: string): ResolvedCreatureUpgrade[] {
  const out: ResolvedCreatureUpgrade[] = [];
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);
  const consider = (upgrade: CreatureUpgrade, sourcePathId: string, sourceFeatureId: string, sourceName: string) => {
    const targets = upgrade.targetPaths ?? [sourcePathId];
    if (!targets.includes(creaturePathId)) return;
    const def = upgrade.def == null ? undefined : resolveValue(upgrade.def, sourcePathId, pathRanks, ctx) ?? undefined;
    // PER-74 — DÉCLINAISON PAR ÉLÉMENT de l'amélioration, résolue ICI : c'est le seul point où une
    // donnée destinée à une créature voit encore le PERSONNAGE (et donc son choix de couleur). En aval,
    // `applyCreatureUpgrades` et le rendu du bloc de stats sont purement numériques/textuels.
    const declined = declineUpgradeForElement(character, sourceFeatureId, upgrade);
    out.push({ ...declined, def, sourceFeatureId, sourceName });
  };
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    // Amélioration portée DIRECTEMENT par la capacité (cross-voie via `targetPaths`).
    if (feature.creatureUpgrade) consider(feature.creatureUpgrade, feature.pathId, feature.id, feature.name);
    // Améliorations portées par les OPTIONS retenues (même balayage que `creatureBonusDiceForPath`).
    // Source affichée = libellé de l'OPTION (ex. « Armure »), plus parlant que le nom de la capacité hôte.
    if (feature.choices) {
      const selections = character.featureChoices[id] ?? [];
      feature.choices.forEach((choice, i) => {
        if (choice.kind !== 'option') return;
        const sel = selections[i];
        const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
        for (const opt of choice.options) {
          if (opt.creatureUpgrade && chosenIds.includes(opt.id)) consider(opt.creatureUpgrade, feature.pathId, feature.id, opt.label);
        }
      });
    }
  }
  return out;
}

/**
 * Injecte des termes additionnels dans une expression richText à UN SEUL bloc `[...]` (les stats
 * de créature concernées : `[10 + rang]`, `[=niveau × 5]`, `[1d4° + 1]`), avant le `]` final —
 * réutilise ainsi tout le rendu/résolution existant (chip DEF, barre de PV via `resolveCreatureMaxHp`,
 * DM). Format inattendu (pas un unique `[...]`) → chaîne inchangée (sécurité). Tous les termes ajoutés
 * sont positifs (bonus d'amélioration), d'où le `+`.
 */
function injectExprTerms(rich: string, additions: string[]): string {
  if (additions.length === 0) return rich;
  const trimmed = rich.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return rich;
  return `${trimmed.slice(0, -1)} + ${additions.join(' + ')}]`;
}

/** DM baké d'une attaque supplémentaire : dé + carac de la CRÉATURE résolue en nombre (pas de token). */
function bakeExtraAttackDamage(
  ea: NonNullable<CreatureUpgrade['extraAttack']>,
  abilities: Partial<Record<AbilityId, number>> | undefined,
): string {
  const v = ea.damageAbility && abilities ? abilities[ea.damageAbility] ?? 0 : 0;
  if (v === 0) return `[${ea.damageDice}]`;
  return `[${ea.damageDice} ${v > 0 ? '+' : '-'} ${Math.abs(v)}]`;
}

/**
 * Applique les améliorations de créature d'une voie (PER-94) PAR-DESSUS un profil de base et renvoie
 * le profil EFFECTIF affiché (caracs, DEF, PV, DM, attaques supplémentaires, notes). Cumule toutes les
 * options `creatureUpgrade` retenues dans la voie (ex. Golem supérieur : une amélioration par voie de
 * forgesort au rang 5). Sans amélioration, renvoie le profil inchangé (référence d'origine). Les deltas
 * de caractéristiques sont pliés numériquement ; DEF/PV/DM sont injectés dans le richText (rendu/PV
 * réutilisés tels quels) ; la Baliste devient une attaque supplémentaire au DM baké sur l'AGI du golem.
 */
export function applyCreatureUpgrades(
  base: CreatureProfile,
  character: Character,
  pathId: string,
): CreatureProfile {
  const upgrades = gatherCreatureUpgrades(character, pathId);
  if (upgrades.length === 0) return base;
  const abilityDelta: Partial<Record<AbilityId, number>> = {};
  let defBonus = 0;
  let hpPerLevel = 0;
  let dmgFlat = 0;
  const dmgDice: string[] = [];
  const notes: string[] = [];
  const extraAttackSpecs: NonNullable<CreatureUpgrade['extraAttack']>[] = [];
  // PER-74 — RD et capacités spéciales accordées à la créature par une capacité du MAÎTRE (chevalier
  // dragon : RD feu 10 du drake au r4, Souffle enflammé au r8). Cumulées / ajoutées, jamais substituées.
  const reductions: DamageReduction[] = [];
  const specials: CreatureSpecialAbility[] = [];
  for (const u of upgrades) {
    if (u.abilities) {
      for (const [k, v] of Object.entries(u.abilities) as [AbilityId, number][]) {
        abilityDelta[k] = (abilityDelta[k] ?? 0) + v;
      }
    }
    if (u.def) defBonus += u.def;
    if (u.hitPointsPerLevel) hpPerLevel += u.hitPointsPerLevel;
    if (u.meleeDamageFlat) dmgFlat += u.meleeDamageFlat;
    if (u.meleeDamageDice) dmgDice.push(u.meleeDamageDice);
    if (u.note) notes.push(u.note);
    if (u.extraAttack) extraAttackSpecs.push(u.extraAttack);
    if (u.damageReduction) reductions.push(...(Array.isArray(u.damageReduction) ? u.damageReduction : [u.damageReduction]));
    if (u.specialAbilities) specials.push(...u.specialAbilities);
  }
  const next: CreatureProfile = { ...base };
  if (base.abilities && Object.keys(abilityDelta).length > 0) {
    const ab = { ...base.abilities };
    for (const [k, v] of Object.entries(abilityDelta) as [AbilityId, number][]) ab[k] = (ab[k] ?? 0) + v;
    next.abilities = ab;
  }
  if (defBonus !== 0 && base.defense) next.defense = injectExprTerms(base.defense, [String(defBonus)]);
  if (hpPerLevel !== 0 && base.hitPoints) next.hitPoints = injectExprTerms(base.hitPoints, [`niveau × ${hpPerLevel}`]);
  if ((dmgFlat !== 0 || dmgDice.length > 0) && base.attack?.damage) {
    const adds = [...dmgDice];
    if (dmgFlat !== 0) adds.push(String(dmgFlat));
    next.attack = { ...base.attack, damage: injectExprTerms(base.attack.damage, adds) };
  }
  if (extraAttackSpecs.length > 0) {
    const eff = next.abilities ?? base.abilities;
    next.extraAttacks = [
      ...(base.extraAttacks ?? []),
      ...extraAttackSpecs.map((ea) => ({ label: ea.label, ranged: ea.ranged, damage: bakeExtraAttackDamage(ea, eff) })),
    ];
  }
  if (reductions.length > 0) {
    const own = base.damageReduction;
    next.damageReduction = [...(own ? (Array.isArray(own) ? own : [own]) : []), ...reductions];
  }
  if (specials.length > 0) next.specialAbilities = [...(base.specialAbilities ?? []), ...specials];
  if (notes.length > 0) next.note = [base.note, ...notes].filter(Boolean).join(' ');
  // PER-256 : mémorise les sources du bonus de DEF (capacité + montant) pour ventiler la valeur en
  // info-bulle. Rattaché au profil AFFICHÉ (`next`), consommé par `creatureDefenseBreakdown`. On ne le
  // pose que si un bonus touche RÉELLEMENT la DEF (sinon rien à expliquer → rendu numérique habituel).
  const defUpgrades: CreatureDefenseUpgrade[] = upgrades
    .filter((u): u is ResolvedCreatureUpgrade & { def: number } => !!u.def)
    .map((u) => ({ featureId: u.sourceFeatureId, name: u.sourceName, value: u.def }));
  if (defUpgrades.length > 0 && base.defense) {
    defenseSourcesByProfile.set(next, { baseDefense: base.defense, upgrades: defUpgrades });
  }
  return next;
}

/**
 * Ventilation de la DÉFENSE d'une créature par SOURCE (PER-256), pour l'info-bulle de sa mini-fiche :
 * « Base 10 + Rang 2 + Runes de défense 3 = 15 ». `undefined` si le profil ne porte aucun bonus de DEF
 * propagé (créature « nue » → le rendu numérique habituel suffit) ou si sa DEF n'est pas décomposable
 * en un total (dé). `abilities`/`level`/`rank` = même contexte que le rendu de la valeur (caractéristiques
 * du maître, niveau, rang atteint dans la voie hôte). À appeler avec le profil AFFICHÉ (issu de
 * `displayCreatureProfile`/`listCompanions`), seul porteur de l'entrée WeakMap.
 */
export function creatureDefenseBreakdown(
  profile: CreatureProfile,
  abilities: Abilities,
  level: number,
  rank: number,
): StatBreakdown | undefined {
  const sources = defenseSourcesByProfile.get(profile);
  if (!sources) return undefined;
  return buildDefenseBreakdown(sources.baseDefense, sources.upgrades, abilities, level, rank) ?? undefined;
}

/**
 * Profil de créature EFFECTIF pour l'AFFICHAGE (PER-94) : profil de base (option retenue > rang) via
 * `effectiveCreatureProfile`, AUGMENTÉ des améliorations de la voie (`applyCreatureUpgrades`, ex. Golem
 * supérieur). `undefined` si aucune créature. Utilisé partout où on REND la créature (section
 * « Compagnons » et mini-fiche « Voies & capacités »), pour que les deux reflètent les améliorations.
 */
export function displayCreatureProfile(feature: Feature, character: Character | undefined): CreatureProfile | undefined {
  const base = effectiveCreatureProfile(feature, character);
  if (!base || !character) return base;
  return applyCreatureUpgrades(base, character, feature.pathId);
}

/**
 * La DÉFENSE ALTERNATIVE (`profile.defenseAlt`, ex. cavalier « en selle ») est-elle
 * active ? Résolu en amont par le maître : capacité source acquise ET interrupteur de
 * condition (index 0) actif. `false` sinon (DEF de base affichée).
 */
export function creatureDefenseAltActive(
  profile: CreatureProfile,
  character: Character | undefined,
): boolean {
  const alt = profile.defenseAlt;
  if (!alt || !character) return false;
  return character.featureIds.includes(alt.sourceFeatureId) && isEffectActive(character, alt.sourceFeatureId, 0);
}

/**
 * État « en selle » d'un compagnon MONTURE de voie (PER-216) : si le personnage possède une capacité
 * « en selle » (`enSelleLink`, ex. Cavalier émérite `cavalier-r2`) ET que ce compagnon est une monture
 * de la MÊME voie (Fidèle monture `cavalier-r1`, Monture fantastique `cavalier-r5`), renvoie l'état
 * courant de cet interrupteur (partagé avec la carte de voie et les montures possédées) → la carte
 * compagnon affiche alors un toggle « En selle ». Renvoie `null` si le compagnon n'est pas une monture
 * dotée d'un tel état (aucun toggle). Le malus d'Init. d'une barde ne concerne PAS ces montures : leur
 * DEF tient déjà compte d'une barde (livre p. 267), elles ne portent donc pas d'équipement de barde.
 */
export function companionMountEnSelle(character: Character, entry: CompanionEntry): boolean | null {
  const link = enSelleLink(character);
  if (!link || entry.companionType !== 'mount') return null;
  if (featureById.get(link.featureId)?.pathId !== entry.feature.pathId) return null;
  // « En selle » = cette monture de voie est CELLE actuellement chevauchée (`mountedKey`), exclusif.
  return character.mountedKey === entry.key;
}

/**
 * Un compagnon est-il PRÉSENT (donc à afficher) ? Un compagnon d'INVOCATION — un sort que
 * le joueur lance à la table (démon, arbre animé…) — se reconnaît à un effet d'activation
 * TEMPORAIRE (`conditional-stat-bonus` dont `activation.kind === 'temporary'`, ex.
 * « Démon invoqué ») : il ne doit apparaître que quand cette invocation est ACTIVE. À
 * DISTINGUER des compagnons PERMANENTS (loup, golem, monture, écuyer, familier du druide/
 * magicien) : ceux-ci existent en continu — leur éventuel interrupteur est une simple
 * CONDITION (« familier en vue », « en selle ») qui module un bonus, pas leur présence.
 *
 * Renvoie `true` si le compagnon est visible : soit ce n'est pas une invocation (aucun
 * interrupteur temporaire), soit au moins une invocation est active. `isSpell` ne suffit
 * pas à trancher (le familier du magicien est un sort mais permanent) ; c'est bien la
 * nature TEMPORAIRE de l'activation qui marque une invocation.
 */
function companionPresent(feature: Feature, character: Character): boolean {
  const effects = feature.effects ?? [];
  let isSummon = false;
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    if (effect.kind === 'conditional-stat-bonus' && effect.activation?.kind === 'temporary') {
      isSummon = true;
      if (isEffectActive(character, feature.id, i)) return true;
    }
  }
  return !isSummon;
}

/** Séparateur de la clé composite d'une instance de compagnon (`<featureId>#<instanceId>`). */
export const COMPANION_INSTANCE_SEP = '#';

/** Clé de PV (barre de vie / `companionDepletion`) d'une instance de compagnon multi-instances. */
export function companionInstanceKey(featureId: string, instanceId: string): string {
  return `${featureId}${COMPANION_INSTANCE_SEP}${instanceId}`;
}

/**
 * Décompose une clé de compagnon : `{ featureId, instanceId }` pour une instance
 * (`outre-tombe-r3#<id>`), `{ featureId, instanceId: undefined }` pour un compagnon à instance
 * unique (`golem-r2`). Utilisé par les setters de PV (page personnage) pour router vers
 * `companionInstances` (zombies) ou `companionDepletion` (compagnons classiques).
 */
export function parseCompanionKey(key: string): { featureId: string; instanceId?: string } {
  const i = key.indexOf(COMPANION_INSTANCE_SEP);
  return i < 0 ? { featureId: key } : { featureId: key.slice(0, i), instanceId: key.slice(i + 1) };
}

/** Un compagnon débloqué, prêt à afficher. */
export interface CompanionEntry {
  /**
   * Clé de persistance de l'état de PV. Compagnon à instance unique = `id` du rang de voie qui
   * l'octroie (ex. `golem-r2`, `cavalier-r5`, `compagnon-animal-r4`). Compagnon multi-instances
   * (zombie) = clé composite `<featureId>#<instanceId>` (cf. `companionInstanceKey`).
   */
  key: string;
  /** Rang de voie porteur du compagnon (celui retenu quand une voie en a plusieurs). */
  feature: Feature;
  /** Profil effectif (option retenue > profil de rang). */
  profile: CreatureProfile;
  /**
   * Type de compagnon (PER-175), recopié de `profile.companionType` : familier / monture /
   * allié PNJ / invocation / animal. `undefined` si le profil n'est pas encore classé.
   */
  companionType?: CompanionType;
  /** Rang ATTEINT dans la voie hôte — résout le terme `rang` des stats de la créature. */
  pathRank: number;
  /** Caractéristiques bénéficiant d'un dé bonus (innés + octroyés par une option retenue). */
  bonusDieAbilities: Set<AbilityId>;
  /** La DEF alternative (« en selle ») est-elle active ? */
  defenseAltActive: boolean;
  /**
   * Id d'instance, UNIQUEMENT pour un compagnon multi-instances (zombie) — absent pour les
   * compagnons classiques. Sa présence signale que ce bloc est une instance supprimable.
   */
  instanceId?: string;
  /** Position (0-based) de l'instance dans la liste, pour la numéroter (« Zombie 1, 2… »). */
  instanceIndex?: number;
}

/**
 * Liste les compagnons débloqués du personnage, prêts pour la section « Compagnons ».
 *
 * Règles :
 *  - candidats = rangs ACQUIS, non désactivés (`disabledFeatureIds` couvre les
 *    remplacements `replacesFeatures` comme loup → Mâle alpha, et les exclusions par
 *    interrupteur), porteurs d'un `CreatureProfile` effectif ;
 *  - UN SEUL compagnon par VOIE : on retient le rang le plus élevé porteur d'un profil.
 *    Une voie de compagnon décrit une seule créature qui « monte en gamme » avec les
 *    rangs — ex. chevalier : Monture fantastique (cavalier-r5) supplante la Fidèle
 *    monture (cavalier-r1) ; forgesort : Golem (golem-r2), amélioré par golem-r5 qui ne
 *    porte pas de profil séparé. (Aucune voie du livre n'octroie deux créatures
 *    simultanées ; ce repli d'affichage évite d'empiler la version de base et sa
 *    version améliorée sans toucher aux données ni au rendu de « Voies & capacités ».)
 *
 * Ordre = ordre d'acquisition (premier rang porteur rencontré par voie).
 */
export function listCompanions(character: Character): CompanionEntry[] {
  const disabled = disabledFeatureIds(character);
  // Rang ATTEINT par voie (le plus haut rang acquis), pour résoudre le terme `rang`.
  const maxRankByPath = new Map<string, number>();
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (!f) continue;
    maxRankByPath.set(f.pathId, Math.max(maxRankByPath.get(f.pathId) ?? 0, f.rank));
  }
  // Un compagnon par voie : on garde le rang porteur de profil le plus élevé, dans
  // l'ordre d'acquisition (Map = ordre de première insertion par voie).
  const byPath = new Map<string, { feature: Feature; profile: CreatureProfile }>();
  for (const id of character.featureIds) {
    if (disabled.has(id)) continue;
    const feature = featureById.get(id);
    if (!feature) continue;
    const profile = effectiveCreatureProfile(feature, character);
    if (!profile) continue;
    // FORME du personnage lui-même (PER-74, ex. Transformation en loup) : rendue en stat-block INLINE
    // sur la carte de la capacité, mais ce n'est PAS un compagnon → jamais dans la section « Compagnons ».
    if (profile.transformation) continue;
    // Invocation à instance UNIQUE (démon, arbre animé, familier/serviteur invoqués…) : masquée
    // tant que son marqueur d'invocation n'est pas actif. Les compagnons multi-instances (zombie)
    // ont leur propre gating (présence = au moins une instance créée) — le marqueur ne s'applique
    // pas. Les compagnons permanents (loup, golem, monture, écuyer) passent toujours.
    if (!profile.instances && !companionPresent(feature, character)) continue;
    const prev = byPath.get(feature.pathId);
    if (prev && prev.feature.rank >= feature.rank) continue;
    byPath.set(feature.pathId, { feature, profile });
  }
  // PER-74 — REMPLACEMENT cross-voie d'un compagnon (chevalier dragon r7 : le drake « atteint sa
  // pleine maturité », son bloc adulte se substitue à celui du drake juvénile de Monture fantastique).
  // On échange le PROFIL en conservant la capacité PORTEUSE d'origine — donc la clé de PV et l'état
  // « en selle » survivent au franchissement du rang — puis on retire l'entrée du rang remplaçant,
  // sans quoi la même créature figurerait deux fois dans la section « Compagnons ». Le remplacement
  // n'a lieu que si la voie ciblée octroie effectivement un compagnon (sinon le rang reste tel quel,
  // et son profil s'affiche comme un compagnon ordinaire).
  for (const [pathId, entry] of [...byPath]) {
    const targets = entry.profile.replacesCreatureFromPaths;
    if (!targets?.length) continue;
    for (const target of targets) {
      const victim = byPath.get(target);
      if (!victim || target === pathId) continue;
      byPath.set(target, { feature: victim.feature, profile: entry.profile });
    }
    // Le rang remplaçant ne produit JAMAIS de compagnon à lui : c'est une AMÉLIORATION de la créature
    // existante, pas un ajout. On retire donc son entrée même quand aucune voie cible n'a de compagnon
    // à améliorer (données incomplètes — ex. Monture fantastique acquise sans monture choisie) : mieux
    // vaut aucune carte qu'une seconde créature surgie de nulle part à côté de la monture du joueur.
    byPath.delete(pathId);
  }
  // Développe chaque voie retenue en entrées d'affichage : une seule pour un compagnon classique,
  // N pour un compagnon multi-instances (une par instance vivante de `companionInstances`).
  const out: CompanionEntry[] = [];
  for (const { feature, profile: baseProfile } of byPath.values()) {
    // Profil AFFICHÉ = base + améliorations de la voie (PER-94, ex. options de Golem supérieur).
    const profile = applyCreatureUpgrades(baseProfile, character, feature.pathId);
    const pathRank = maxRankByPath.get(feature.pathId) ?? feature.rank;
    const bonusDieAbilities = creatureBonusDiceForPath(feature.pathId, character);
    // DEF alternative « en selle » (Fidèle monture) : active seulement quand CETTE monture est celle
    // actuellement chevauchée (`mountedKey`), pas dès qu'une monture quelconque l'est (PER-216) — le
    // +DM générique de Cavalier émérite, lui, reste piloté par l'interrupteur pour toute monture.
    const defenseAltActive = creatureDefenseAltActive(profile, character) && character.mountedKey === feature.id;
    if (profile.instances) {
      const ids = character.companionInstances?.[feature.id] ?? [];
      ids.forEach((instanceId, instanceIndex) => {
        out.push({
          key: companionInstanceKey(feature.id, instanceId),
          feature,
          profile,
          companionType: profile.companionType,
          pathRank,
          bonusDieAbilities,
          defenseAltActive,
          instanceId,
          instanceIndex,
        });
      });
    } else {
      out.push({
        key: feature.id,
        feature,
        profile,
        companionType: profile.companionType,
        pathRank,
        bonusDieAbilities,
        defenseAltActive,
      });
    }
  }
  return out;
}

/**
 * Limite d'instances simultanées d'un compagnon multi-instances (PER-235). Pour le zombie
 * (outre-tombe-r3, p. 109) : 1 + une par voie de sorcier au rang 5 — comptage cross-voie
 * identique à `MilestoneCountScalingValue` (la voie hôte comptée incluse, cf. « chaque fois qu'il
 * atteint le rang 5 dans une voie de sorcier »). `0` si le profil n'est pas multi-instances.
 */
export function resolveCompanionInstanceLimit(profile: CreatureProfile, character: Character): number {
  const spec = profile.instances?.limit;
  if (!spec) return 0;
  const maxRankByPath = new Map<string, number>();
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (!f) continue;
    maxRankByPath.set(f.pathId, Math.max(maxRankByPath.get(f.pathId) ?? 0, f.rank));
  }
  let count = 0;
  for (const [pid, maxRank] of maxRankByPath) {
    if (maxRank < spec.rank) continue;
    const path = pathById.get(pid);
    if (path?.type === 'class' && path.classIds.some((c) => spec.classIds.includes(c))) count += 1;
  }
  return spec.base + count;
}

/**
 * Résout les PV MAXIMUM d'une créature depuis la chaîne richText `CreatureProfile.hitPoints`
 * (ex. `[=niveau × 5]`, `[=10 + niveau × 4]`) contre les caractéristiques du maître, son
 * niveau et le rang de voie atteint — comme `CreatureStatBlock` le fait pour l'affichage.
 * Somme les segments déterministes (formule/quantité). `null` si non résoluble en nombre
 * (segment contenant un dé, ou aucune expression) → la barre retombe alors sur l'affichage
 * textuel du profil.
 */
export function resolveCreatureMaxHp(
  profile: CreatureProfile,
  abilities: Abilities,
  level: number,
  rank: number,
): number | null {
  // Créature SANS PV (Serviteur invisible, p. 96 — « ne peut pas être combattu ») : aucune barre.
  if (profile.hitPoints == null) return null;
  const segments = parseRichText(profile.hitPoints);
  let total = 0;
  let found = false;
  for (const segment of segments) {
    if (segment.kind === 'quantity' || segment.kind === 'expr' || segment.kind === 'term') {
      const resolved = resolveExpr(segment.terms, abilities, level, progression, rank);
      if (resolved.total == null) return null; // dé présent → pas de max numérique
      total += resolved.total;
      found = true;
    }
  }
  return found ? Math.max(0, total) : null;
}

/**
 * Élague la dépletion de PV des compagnons : retire les entrées dont le compagnon n'est
 * plus débloqué (respec / baisse de niveau / changement de rang qui change la clé), et
 * normalise chaque manque restant (`pruneDepletion`). À appeler comme les autres `prune`
 * d'état transitoire lors des mutations structurelles (édition des capacités). Fonction pure.
 */
export function pruneCompanionDepletion(
  companionDepletion: Record<string, Depletion>,
  character: Character,
): Record<string, Depletion> {
  const liveKeys = new Set(listCompanions(character).map((c) => c.key));
  const next: Record<string, Depletion> = {};
  for (const [key, dep] of Object.entries(companionDepletion)) {
    if (!liveKeys.has(key)) continue;
    const pruned = pruneDepletion(dep);
    if (Object.keys(pruned).length > 0) next[key] = pruned;
  }
  return next;
}

/**
 * Élague les instances de compagnons multi-instances (`companionInstances`, PER-235) : retire les
 * listes dont la capacité n'est plus acquise ou n'octroie plus un profil multi-instances (respec /
 * baisse de niveau), et normalise chaque liste (ids vides / doublons retirés, ordre préservé). À
 * appeler AVANT `pruneCompanionDepletion` lors des mutations structurelles : les PV d'instance
 * (clés composites) sont ensuite purgés en cohérence, car `listCompanions` ne produit plus les
 * clés des instances disparues. Fonction pure.
 */
export function pruneCompanionInstances(
  companionInstances: Record<string, string[]>,
  character: Character,
): Record<string, string[]> {
  const owned = new Set(character.featureIds);
  const next: Record<string, string[]> = {};
  for (const [featureId, ids] of Object.entries(companionInstances)) {
    if (!owned.has(featureId)) continue;
    const feature = featureById.get(featureId);
    const profile = feature ? effectiveCreatureProfile(feature, character) : undefined;
    if (!profile?.instances) continue;
    const clean = ids.filter((id, i) => !!id && ids.indexOf(id) === i);
    if (clean.length > 0) next[featureId] = clean;
  }
  return next;
}

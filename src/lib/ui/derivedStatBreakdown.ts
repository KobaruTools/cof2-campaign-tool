/**
 * Détail (« breakdown ») de chaque statistique dérivée pour l'affichage : liste
 * des termes additifs avec leur valeur signée, afin de montrer au joueur d'où
 * vient chaque total. Pur UI, mais les formules reflètent fidèlement le moteur
 * (`src/lib/engine/derived.ts`) — toute évolution des maths doit être répercutée
 * ici. Les pages citées renvoient au livre de base CO2.
 */
import type { DerivedInput, DerivedMods, HpLevelGain } from '@/lib/engine';
import { MAX_ATTACK_LEVEL } from '@/lib/engine';
import { families } from '@/data';
import type { FamilyId } from '@/data/schema';
import { ABILITY_NAMES } from './ability';
import type { DerivedStatId } from './derivedStats';

const familyById = new Map<FamilyId, (typeof families)[number]>(families.map((f) => [f.id, f]));

/** Un terme du détail : libellé français + valeur (signée à l'affichage). */
export interface BreakdownTerm {
  label: string;
  value: number;
  /**
   * Sous-détail facultatif (affiché plus petit, en retrait) : décompose ce terme
   * en ses contributions. Utilisé pour lister les capacités qui composent la
   * ligne « Capacités / divers ». N'entre pas dans la somme (le terme parent
   * porte déjà le total).
   */
  subTerms?: BreakdownTerm[];
  /**
   * Id de la capacité SOURCE de ce terme (PER-73). Présent → l'UI affiche une puce de
   * voie (`CapabilityChip` : voie en couleur + icône + rang) sous le libellé, pour situer
   * la provenance (ex. « Colosse » → Voie du demi-orc). Absent = terme non lié à une capacité.
   */
  featureId?: string;
  /**
   * Effet conditionnel / temporaire (vs bonus permanent) ? Affiché comme marqueur
   * « (conditionnel) » discret à côté du libellé/de la puce. Sert aux sous-termes de
   * « Capacités / divers » (le libellé reste le nom nu, porté par la puce de voie).
   */
  conditional?: boolean;
}

/**
 * Détail par stat des capacités contribuant au modificateur « Capacités /
 * divers », indexé par clé moteur (`DerivedMods`). Fourni par l'appelant
 * (l'UI connaît les capacités acquises) ; absent → aucune sous-liste.
 */
export type ModSources = Partial<Record<keyof DerivedMods, BreakdownTerm[]>>;

export interface StatBreakdown {
  /** Termes additifs ; leur somme vaut `total`. */
  terms: BreakdownTerm[];
  /** Total (= valeur affichée). `null` quand la stat ne s'applique pas. */
  total: number | null;
  /** Précision libre (type de dé, cas particulier…). */
  note?: string;
  /**
   * Tonalité de la note : `info` (défaut — simple précision neutre) ou `warning`
   * quand elle signale une LIMITE atteinte par le joueur (ex. AGI plafonnée par
   * l'armure portée), à mettre en avant visuellement. Absent = `info`.
   */
  noteTone?: 'info' | 'warning';
  /** Page source dans le livre de base CO2. */
  page: number;
}

const sum = (terms: BreakdownTerm[]) => terms.reduce((acc, t) => acc + t.value, 0);

/** Nombre formaté à la française (virgule décimale), pour les demi-PV (ex. « 3,5 »). */
const frenchNum = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');

/**
 * Construit le détail d'une statistique dérivée à partir des mêmes entrées que
 * `deriveStats`. Les modificateurs plats (`mods`) ne sont inclus que s'ils sont
 * non nuls, pour ne pas afficher de ligne « +0 ».
 */
export function derivedStatBreakdown(
  statId: DerivedStatId,
  input: DerivedInput,
  modSources: ModSources = {},
): StatBreakdown {
  const { abilities, level, family, defenseEquipment, spellCount } = input;
  const mods = input.mods ?? {};
  const mod = (label: string, value: number | undefined): BreakdownTerm[] =>
    value ? [{ label, value }] : [];
  // Ligne « Capacités / divers » d'une stat, assortie du détail par capacité
  // (sous-liste) quand l'appelant a fourni les sources pour cette clé moteur.
  // On affiche la ligne dès qu'il existe des contributions de capacités, MÊME si
  // leur somme nette est nulle (ex. un bonus conditionnel +2 et un malus
  // temporaire −2 qui s'annulent) : sinon le détail « masquerait » des effets
  // pourtant actifs, ce qui laisserait croire qu'un effet a disparu.
  const capacities = (key: keyof DerivedMods): BreakdownTerm[] => {
    const value = mods[key] ?? 0;
    const subTerms = modSources[key];
    if (!value && !subTerms?.length) return [];
    return [{ label: 'Capacités / divers', value, subTerms }];
  };
  const baseAttack = Math.min(level, MAX_ATTACK_LEVEL);

  switch (statId) {
    case 'maxHp': {
      // Un profil hybride a un calcul de PV particulier (p. 177 et 180) : on le
      // détaille niveau par niveau pour qu'il soit compréhensible ; un profil
      // mono-famille garde l'affichage compact « 2 × base + (gain × niveaux) ».
      const hybridLevel1Families = input.hpLevel1Families ?? [];
      const isHybridLevel1 = hybridLevel1Families.length >= 2;
      const levelGains = input.hpLevelGains ?? [];
      const hasMixedLevel = levelGains.some((g) => g.familyIds.length >= 2);
      // Règle maison « dé de vie » (PER-87) : un niveau au jet a un gain propre → on
      // force le détail niveau par niveau pour l'expliciter (sinon l'affichage compact
      // afficherait un gain « famille » fixe qui ne correspond pas au total).
      const hasRolledLevel = levelGains.some((g) => g.rolled);
      const detailed = isHybridLevel1 || hasMixedLevel || hasRolledLevel;
      const con = abilities.CON;
      const conLabel = con >= 0 ? `+ CON ${con}` : `− CON ${Math.abs(con)}`;
      const familyName = (id: FamilyId): string => familyById.get(id)?.name ?? id;
      const terms: BreakdownTerm[] = [];

      // --- Niveau 1 : PV de base ---
      if (isHybridLevel1) {
        // Un profil hybride additionne les PV de base de ses deux profils (p. 180).
        for (const familyId of hybridLevel1Families) {
          const f = familyById.get(familyId);
          terms.push({
            label: `Niveau 1 · ${familyName(familyId)} (PV de base du profil, p. 180)`,
            value: f?.baseHp ?? 0,
          });
        }
      } else {
        terms.push({
          label: `Niveau 1 · Famille de profil (2 × ${family.baseHp} PV de base, p. 30)`,
          value: 2 * family.baseHp,
        });
      }
      terms.push({ label: 'Niveau 1 · Constitution (CON)', value: con });

      // --- Niveaux 2 et suivants ---
      if (level > 1) {
        if (detailed) {
          // Détail par niveau : gain de la famille (ou moyenne d'un niveau mixte)
          // + CON, pour suivre exactement la règle p. 177. Mais on regroupe les
          // niveaux consécutifs identiques en une plage « Niveaux X à Y » : un
          // hybride à la base mais mono-famille ensuite n'affiche plus une
          // quinzaine de lignes identiques. Les niveaux mixtes ne se fondent
          // jamais dans une plage avec leurs voisins (libellé/gain distincts).
          // `labelSuffix` = tout ce qui suit « Niveau(x) … · » ; deux niveaux ne
          // se regroupent que si ce suffixe (qui encode famille ET gain) coïncide.
          const labelSuffix = (g: HpLevelGain): string => {
            // Dé de vie lancé (règle maison PER-87) : le jet remplace la part famille.
            if (g.rolled) {
              return `dé de vie : jet ${g.familyGain} PV, ${conLabel} (règle maison)`;
            }
            if (g.familyIds.length >= 2) {
              const values = g.familyIds.map((id) => familyById.get(id)?.hpPerLevel ?? 0);
              const rawAverage = values.reduce((s, v) => s + v, 0) / values.length;
              const detail = g.familyIds
                .map((id, i) => `${familyName(id)} ${values[i]}`)
                .join(' / ');
              if (Number.isInteger(rawAverage)) {
                return `niveau mixte : moyenne ${detail} = ${g.familyGain}, ${conLabel} (p. 177)`;
              }
              const direction = g.familyGain < rawAverage ? 'inférieur' : 'supérieur';
              return `niveau mixte : moyenne ${detail} = ${frenchNum(rawAverage)} → arrondi à ${g.familyGain} (demi-PV ${direction}, alterné), ${conLabel} (p. 177)`;
            }
            return `${familyName(g.familyIds[0])} (${g.familyGain} PV), ${conLabel} (p. 39)`;
          };
          for (let i = 0; i < levelGains.length; ) {
            const g = levelGains[i];
            const suffix = labelSuffix(g);
            const perLevelValue = g.familyGain + con;
            let j = i + 1;
            while (j < levelGains.length && labelSuffix(levelGains[j]) === suffix) j++;
            const count = j - i;
            const prefix =
              count === 1 ? `Niveau ${g.level}` : `Niveaux ${g.level} à ${levelGains[j - 1].level}`;
            terms.push({ label: `${prefix} · ${suffix}`, value: perLevelValue * count });
            i = j;
          }
        } else {
          // Mono-famille : gain constant par niveau, présenté de façon compacte.
          const familyPart = levelGains.length
            ? levelGains.reduce((s, g) => s + g.familyGain, 0)
            : family.hpPerLevel * (level - 1);
          terms.push({
            label: `Niveaux 2 à ${level} (${family.hpPerLevel} PV de famille ${conLabel} par niveau, p. 39)`,
            value: familyPart + con * (level - 1),
          });
        }
      }

      terms.push(...capacities('maxHp'));

      const baseNote =
        isHybridLevel1 || hasMixedLevel
          ? "Profil hybride : au niveau 1 on additionne les PV de base de chaque profil au lieu de doubler ceux d'un seul (p. 180). Ensuite chaque niveau ajoute les PV de la famille des capacités prises ; un « niveau mixte » (deux familles) prend leur moyenne, demi-PV arrondis en alternance inférieur/supérieur (p. 177). CON s'ajoute à chaque niveau (p. 30, 39)."
          : "PV au niveau 1 = 2 × PV de base de la famille + CON (p. 30) ; chaque niveau suivant ajoute les PV de la famille + CON (p. 39).";
      // Règle maison « dé de vie » (PER-87) : signalée quand au moins un niveau au jet.
      const note = hasRolledLevel
        ? `${baseNote} Dé de vie (règle maison) : à ces niveaux, le jet saisi à la table remplace les PV fixes de la famille, la CON s'ajoutant par-dessus.`
        : baseNote;
      // Lien de source principal : niveaux mixtes (p. 177) s'il y en a, sinon
      // base hybride du niveau 1 (p. 180), sinon règle générale (p. 30) ; les
      // autres pages pertinentes sont citées dans la note ci-dessus.
      const page = hasMixedLevel ? 177 : isHybridLevel1 ? 180 : 30;
      return { terms, total: sum(terms), note, page };
    }
    case 'defense': {
      const cappedAgi =
        defenseEquipment.maxAgi === null
          ? abilities.AGI
          : Math.min(abilities.AGI, defenseEquipment.maxAgi);
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 10 },
        { label: 'Agilité (AGI)', value: cappedAgi },
        ...mod('Armure / bouclier', defenseEquipment.defBonus),
        ...capacities('def'),
      ];
      // Plafonnement de l'AGI par l'armure : le joueur a atteint une LIMITE → note en
      // tonalité « warning » pour qu'il comprenne que son AGI ne compte pas en entier.
      const capped = defenseEquipment.maxAgi !== null && abilities.AGI > defenseEquipment.maxAgi;
      const note = capped
        ? `AGI plafonnée à ${defenseEquipment.maxAgi} par l'armure portée (p. 188).`
        : undefined;
      return { terms, total: sum(terms), note, noteTone: capped ? 'warning' : undefined, page: 31 };
    }
    case 'initiative': {
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 10 },
        { label: 'Perception (PER)', value: abilities.PER },
        ...capacities('initiative'),
      ];
      return { terms, total: sum(terms), page: 31 };
    }
    case 'luckPoints': {
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 2 },
        { label: 'Charisme (CHA)', value: abilities.CHA },
        ...mod('Bonus de famille', family.bonusLuckPointsOnCreation),
        ...capacities('luckPoints'),
      ];
      return { terms, total: Math.max(0, sum(terms)), page: 30 };
    }
    case 'recoveryDice': {
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 2 },
        { label: 'Constitution (CON)', value: abilities.CON },
        ...mod('Bonus de famille', family.bonusRecoveryDiceOnCreation),
        ...capacities('recoveryDiceCount'),
      ];
      return {
        terms,
        total: Math.max(0, sum(terms)),
        note: `Type de dé déterminé par la famille de profil : ${family.recoveryDie}.`,
        page: 30,
      };
    }
    case 'manaPoints': {
      if (spellCount <= 0) {
        return { terms: [], total: null, note: 'Aucun sort connu → pas de réserve de mana.', page: 31 };
      }
      // Carac de base des PM : VOL par défaut, ou la carac de substitution (ex. Charisme
      // héroïque : CHA au lieu de VOL — la VOL n'apparaît alors PAS, c'est le CHA qui sert).
      const manaAbility = input.manaAbility ?? 'VOL';
      const terms: BreakdownTerm[] = [
        { label: `${ABILITY_NAMES[manaAbility]} (${manaAbility})`, value: abilities[manaAbility] },
        { label: 'Sorts connus', value: spellCount },
        ...capacities('manaPoints'),
      ];
      const note =
        manaAbility !== 'VOL'
          ? `${ABILITY_NAMES[manaAbility]} (${manaAbility}) utilisé au lieu de la Volonté pour les PM (capacité).`
          : undefined;
      return { terms, total: Math.max(0, sum(terms)), note, page: 31 };
    }
    case 'meleeAttack': {
      const terms: BreakdownTerm[] = [
        { label: `Niveau (max ${MAX_ATTACK_LEVEL})`, value: baseAttack },
        { label: 'Force (FOR)', value: abilities.FOR },
        ...capacities('meleeAttack'),
      ];
      return { terms, total: sum(terms), page: 32 };
    }
    case 'rangedAttack': {
      const terms: BreakdownTerm[] = [
        { label: `Niveau (max ${MAX_ATTACK_LEVEL})`, value: baseAttack },
        { label: 'Agilité (AGI)', value: abilities.AGI },
        ...capacities('rangedAttack'),
      ];
      return { terms, total: sum(terms), page: 32 };
    }
    case 'magicAttack': {
      const terms: BreakdownTerm[] = [
        { label: `Niveau (max ${MAX_ATTACK_LEVEL})`, value: baseAttack },
        { label: 'Volonté (VOL)', value: abilities.VOL },
        ...capacities('magicAttack'),
      ];
      return { terms, total: sum(terms), page: 32 };
    }
  }
}

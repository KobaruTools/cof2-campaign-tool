/**
 * Légalité des choix et conformité aux règles — module pur (PRD §5.4, §5.5).
 *
 * Deux usages :
 *  - `peutAcquerirCapacite` : utilisé par le **wizard bloquant** — ne propose
 *    qu'un choix légal (rang dans l'ordre, niveau requis, accès prestige,
 *    plafond de voies).
 *  - `verifierConformite` : utilisé par la **fiche permissive** — liste les
 *    écarts aux règles sous forme d'avertissements NON bloquants.
 *
 * Règles : `creation-progression.md` §11-13 (p. 39-42) et `progression.ts`.
 *
 * Hors périmètre de ce module (volontaire) : le budget exact de points de
 * capacité (gratuit vs acheté, bonus de mage, points orphelins). Il dépend de
 * l'historique de création/montée de niveau que le wizard renseignera ; tant
 * qu'il n'est pas fiable, on n'émet aucun avertissement « points » pour éviter
 * les faux positifs. Voir TODO en bas.
 */
import { CARAC_MAX, CARAC_MIN } from '@/data/schema';
import type {
  Capacite,
  CaracId,
  Famille,
  FamilleId,
  Profil,
  ReglesProgression,
  Voie,
} from '@/data/schema';
import type { Character } from '@/lib/character/types';

/** Données de règles injectées (testable avec des fixtures). */
export interface MoteurContexte {
  capaciteParId: Map<string, Capacite>;
  voieParId: Map<string, Voie>;
  profilParId: Map<string, Profil>;
  familleParId: Map<FamilleId, Famille>;
  progression: ReglesProgression;
}

export interface ResultatLegalite {
  legal: boolean;
  raisons: string[];
}

export type CodeAvertissement =
  | 'RANG_MANQUANT'
  | 'NIVEAU_RANG_INSUFFISANT'
  | 'CARAC_HORS_PLAGE'
  | 'TROP_DE_VOIES'
  | 'PRESTIGE_MULTIPLE'
  | 'PRESTIGE_NIVEAU_INSUFFISANT'
  | 'CAPACITE_INCONNUE';

export interface Avertissement {
  code: CodeAvertissement;
  message: string;
  capaciteId?: string;
  voieId?: string;
}

/** Plafond de voies hors voie de peuple (p. 42 : « six voies, plus la voie de peuple »). */
export const MAX_VOIES_HORS_PEUPLE = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coût d'une capacité en points (rang 1-2 → 1, rang 3+ → 2 — p. 39). */
export function coutCapacite(capacite: Capacite, progression: ReglesProgression): number {
  return progression.coutParRang[capacite.rang] ?? (capacite.rang <= 2 ? 1 : 2);
}

function familleDuPersonnage(character: Character, ctx: MoteurContexte): Famille | undefined {
  const profil = ctx.profilParId.get(character.profilId);
  if (!profil) return undefined;
  return ctx.familleParId.get(profil.familleId);
}

/**
 * Niveau minimum requis pour acquérir une capacité d'un rang donné.
 * Exception mage (p. 39) : un personnage de la famille des mages peut obtenir
 * une capacité de rang 2 dès le niveau 1 (le « 2* » de la table) ; cette
 * exception ne s'étend pas au rang 3.
 */
export function niveauMinPourRang(
  rang: number,
  famille: Famille | undefined,
  progression: ReglesProgression,
): number {
  if (rang === 2 && famille?.id === 'mages') return 1;
  return progression.niveauMinParRang[rang] ?? 1;
}

/** Rangs effectivement possédés dans une voie, triés croissant. */
export function rangsPossedes(character: Character, voieId: string, ctx: MoteurContexte): number[] {
  return character.capaciteIds
    .map((id) => ctx.capaciteParId.get(id))
    .filter((c): c is Capacite => !!c && c.voieId === voieId)
    .map((c) => c.rang)
    .sort((a, b) => a - b);
}

/** Voies (hors voie de peuple/voie du mage) actuellement entamées. */
function voiesHorsPeuple(character: Character, ctx: MoteurContexte): Set<string> {
  const voies = new Set<string>();
  for (const id of character.capaciteIds) {
    const cap = ctx.capaciteParId.get(id);
    if (!cap) continue;
    const voie = ctx.voieParId.get(cap.voieId);
    if (!voie) continue;
    if (voie.type === 'profil' || voie.type === 'prestige') voies.add(voie.id);
  }
  return voies;
}

/** Voies de prestige actuellement entamées. */
function voiesPrestige(character: Character, ctx: MoteurContexte): Set<string> {
  const voies = new Set<string>();
  for (const id of character.capaciteIds) {
    const cap = ctx.capaciteParId.get(id);
    const voie = cap && ctx.voieParId.get(cap.voieId);
    if (voie && voie.type === 'prestige') voies.add(voie.id);
  }
  return voies;
}

// ---------------------------------------------------------------------------
// Légalité d'acquisition (wizard bloquant)
// ---------------------------------------------------------------------------

/**
 * Détermine si le personnage peut acquérir la capacité donnée, à son niveau
 * actuel. Retourne toutes les raisons d'illégalité (vide si légal).
 */
export function peutAcquerirCapacite(
  character: Character,
  capaciteId: string,
  ctx: MoteurContexte,
): ResultatLegalite {
  const raisons: string[] = [];
  const cap = ctx.capaciteParId.get(capaciteId);
  if (!cap) return { legal: false, raisons: [`Capacité inconnue : ${capaciteId}`] };

  if (character.capaciteIds.includes(capaciteId)) {
    raisons.push('Capacité déjà acquise.');
  }

  const voie = ctx.voieParId.get(cap.voieId);
  if (!voie) {
    return { legal: false, raisons: [`Voie inconnue : ${cap.voieId}`] };
  }
  const famille = familleDuPersonnage(character, ctx);

  // Ordre des rangs : tous les rangs inférieurs de la voie doivent être acquis.
  const rangs = rangsPossedes(character, voie.id, ctx);
  for (let r = (voie.type === 'prestige' ? 4 : 1); r < cap.rang; r++) {
    if (!rangs.includes(r)) {
      raisons.push(`Rang ${r} de « ${voie.nom} » non acquis (rangs dans l'ordre).`);
    }
  }

  // Niveau requis par le rang.
  const niveauReq = niveauMinPourRang(cap.rang, famille, ctx.progression);
  if (character.niveau < niveauReq) {
    raisons.push(`Niveau ${niveauReq} requis pour un rang ${cap.rang} (niveau actuel ${character.niveau}).`);
  }

  // Règles spécifiques aux voies de prestige (p. 42).
  if (voie.type === 'prestige') {
    if (character.niveau < ctx.progression.niveauAccesPrestige) {
      raisons.push(`Voie de prestige accessible au niveau ${ctx.progression.niveauAccesPrestige}.`);
    }
    const prestigeDejaPrises = voiesPrestige(character, ctx);
    if (prestigeDejaPrises.size > 0 && !prestigeDejaPrises.has(voie.id)) {
      raisons.push('Une seule voie de prestige est autorisée sur toute la carrière.');
    }
  }

  // Plafond de voies (si l'on ouvre une nouvelle voie hors peuple).
  if (voie.type === 'profil' || voie.type === 'prestige') {
    const voies = voiesHorsPeuple(character, ctx);
    if (!voies.has(voie.id) && voies.size >= MAX_VOIES_HORS_PEUPLE) {
      raisons.push(`Plafond de ${MAX_VOIES_HORS_PEUPLE} voies (hors voie de peuple) atteint.`);
    }
  }

  return { legal: raisons.length === 0, raisons };
}

// ---------------------------------------------------------------------------
// Conformité (fiche permissive)
// ---------------------------------------------------------------------------

/**
 * Liste les écarts aux règles du personnage courant (avertissements non
 * bloquants). N'empêche jamais la sauvegarde — c'est l'UI qui les affiche.
 */
export function verifierConformite(character: Character, ctx: MoteurContexte): Avertissement[] {
  const av: Avertissement[] = [];
  const famille = familleDuPersonnage(character, ctx);

  // Caractéristiques hors de la plage du livre (informatif).
  (Object.keys(character.caracteristiques) as CaracId[]).forEach((id) => {
    const v = character.caracteristiques[id];
    if (v < CARAC_MIN || v > CARAC_MAX) {
      av.push({
        code: 'CARAC_HORS_PLAGE',
        message: `${id} = ${v} hors de la plage du livre (${CARAC_MIN} à ${CARAC_MAX}).`,
      });
    }
  });

  // Regroupe les capacités possédées par voie.
  const rangsParVoie = new Map<string, number[]>();
  for (const id of character.capaciteIds) {
    const cap = ctx.capaciteParId.get(id);
    if (!cap) {
      av.push({ code: 'CAPACITE_INCONNUE', message: `Capacité inconnue : ${id}.`, capaciteId: id });
      continue;
    }
    const liste = rangsParVoie.get(cap.voieId) ?? [];
    liste.push(cap.rang);
    rangsParVoie.set(cap.voieId, liste);
  }

  // Par voie : rangs manquants (trous) + niveau requis dépassé.
  for (const [voieId, rangs] of rangsParVoie) {
    const voie = ctx.voieParId.get(voieId);
    if (!voie) continue;
    const min = voie.type === 'prestige' ? 4 : 1;
    const max = Math.max(...rangs);
    for (let r = min; r < max; r++) {
      if (!rangs.includes(r)) {
        av.push({
          code: 'RANG_MANQUANT',
          message: `« ${voie.nom} » : rang ${r} manquant alors que le rang ${max} est acquis (pas de voie à trous).`,
          voieId,
        });
      }
    }
    for (const r of rangs) {
      const niveauReq = niveauMinPourRang(r, famille, ctx.progression);
      if (character.niveau < niveauReq) {
        av.push({
          code: 'NIVEAU_RANG_INSUFFISANT',
          message: `« ${voie.nom} » rang ${r} : niveau ${niveauReq} requis (niveau actuel ${character.niveau}).`,
          voieId,
        });
      }
    }
  }

  // Plafond de voies.
  const voiesNonPeuple = voiesHorsPeuple(character, ctx);
  if (voiesNonPeuple.size > MAX_VOIES_HORS_PEUPLE) {
    av.push({
      code: 'TROP_DE_VOIES',
      message: `${voiesNonPeuple.size} voies entamées (hors voie de peuple) ; le maximum est ${MAX_VOIES_HORS_PEUPLE}.`,
    });
  }

  // Voies de prestige : unicité et niveau d'accès.
  const prestige = voiesPrestige(character, ctx);
  if (prestige.size > 1) {
    av.push({
      code: 'PRESTIGE_MULTIPLE',
      message: `${prestige.size} voies de prestige entamées ; une seule est autorisée.`,
    });
  }
  if (prestige.size > 0 && character.niveau < ctx.progression.niveauAccesPrestige) {
    av.push({
      code: 'PRESTIGE_NIVEAU_INSUFFISANT',
      message: `Voie de prestige entamée avant le niveau ${ctx.progression.niveauAccesPrestige}.`,
    });
  }

  return av;
}

// TODO(moteur, J5/J7) : avertissement de budget de points de capacité
// (sur/sous-dépense) une fois que l'historique de création/montée de niveau
// distingue les capacités gratuites (2 voies de rang 1, voie de peuple rang 1,
// bonus de rang 2 des mages) des capacités achetées.

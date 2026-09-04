/**
 * Termes désignant du contenu PAYANT « Le Compagnon » (peuples, profils,
 * voies de prestige, règles optionnelles). Le générateur de patchnotes
 * (PER-460) DOIT exclure tout commit qui en parle plutôt que d'essayer de le
 * reformuler de façon générique — même une mention vague pourrait laisser
 * deviner qu'un chantier de contenu payant est en cours, alors que ce
 * contenu est gaté en base précisément pour rester invisible tant qu'on n'y
 * a pas explicitement accès.
 *
 * En cas de doute (ex: « minotaure »/« gobelin » existent aussi comme
 * simples créatures du bestiaire de base), on choisit de SUR-exclure : rater
 * une ligne de patchnote légitime est sans conséquence, en publier une
 * illégitime ne l'est pas.
 *
 * À enrichir à chaque nouveau ticket Linear « (Le Compagnon) » — peuple,
 * profil, voie de prestige ou règle optionnelle — AVANT que son premier
 * commit ne parte, pas après.
 */

const PAID_CONTENT_TERMS = [
  // La notion même de « contenu payant »/« gating » est un leak à elle seule :
  // même sans nommer d'entité précise, ça révèle au repo public qu'un
  // chantier de contenu payant existe et qu'un mécanisme le cache. Cf.
  // incident du 2026-09-04 : le patchnote décrivant CETTE fonctionnalité de
  // filtrage citait lui-même « le contenu payant ».
  'contenu payant',
  'payant',
  // Le sourcebook lui-même. Forme PARENTHÉSÉE uniquement : « compagnon » seul
  // (ou « le compagnon ») est un terme de jeu générique très fréquent pour
  // un compagnon animal/invoqué (« tourbillon pour le compagnon », etc.) —
  // le bloquer sans parenthèses ferait sauter énormément de patchnotes
  // légitimes sur des mécaniques de compagnon qui n'ont rien à voir avec le
  // sourcebook payant.
  '(le compagnon)',
  // Peuples (PER-316, 17 peuples)
  'nephilim',
  'ophidien',
  'ame forgee',
  'satyre',
  'cambion',
  'frouin',
  'minotaure',
  'felis',
  'lutin',
  'wolfer',
  'elfe pale',
  'drakonide',
  'gobelin',
  'demi-ogre',
  'demi ogre',
  'elfe des profondeurs',
  'demi-elfe',
  'demi elfe',
  'kobold',
  // Sous-capacités du peuple lutins (PER-333)
  'farfadet',
  'poudre de fee',
  'voie de la fee',
  'voie du farfadet',
  // Profils (PER-317, 5 profils)
  'caravanier',
  'psionique',
  'parangon',
  'chamane',
  'primaliste',
  // Voies de prestige propres au Compagnon (PER-344) — distinctes des voies
  // de prestige génériques du livre de base (celles-ci restent citables)
  "voie de l'entite",
  'voie de l entite',
  'voie des mutations',
  // Domaines de prêtre du Compagnon (PER-318, 32 domaines)
  'domaine de pretre',
  // Artisanat (PER-319/349/354-357)
  'artisanat',
  // Règles optionnelles (PER-351/352/353)
  'options tactiques',
  'monture volante',
  'brulure de mana revisee',
] as const;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const NORMALIZED_TERMS = PAID_CONTENT_TERMS.map(normalize);

export function containsPaidContent(text: string): boolean {
  const normalized = normalize(text);
  return NORMALIZED_TERMS.some((term) => normalized.includes(term));
}

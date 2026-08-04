/**
 * AIDE-MÉMOIRE — DANGERS DE L'ENVIRONNEMENT (extraction PER-42, section 'environment').
 *
 * Chapitre « Les règles de l'aventure » → « Autres dangers et obstacles » (p. 236-240) : saut en
 * longueur, chute, feu, chaleur, froid, poisons (règle + table), pièges (règle + table + descriptions),
 * et structures / forcer un obstacle (règle + table « Obstacles »). `body` recopié VERBATIM du livre de
 * base ; `sourcePage` = page imprimée.
 *
 * ATTENTION VERBATIM : le livre note certains dés avec le symbole degré (« 1d4° », « 10d4° ») — conservé
 * tel quel. La phrase « Lorsqu'une personne est en mise en contact » (p. 238) est reprise telle quelle
 * (tournure du livre). Les tables « Poisons » (p. 238), « Pièges » (p. 239) et « Obstacles » (p. 240)
 * sont des `ReferenceTableEntry`.
 *
 * HORS PÉRIMÈTRE de ce fichier : le déplacement / l'encombrement (VOYAGER, p. 232-233) est dans
 * `encumbrance.ts`. Le matériel d'aventure (sous-domaine 'gear') n'a PAS de bloc de règles distinct dans
 * la Partie III — les caractéristiques du matériel relèvent du chapitre Équipement (Partie II) — donc
 * aucune entrée 'gear' n'est saisie ici (rien inventé).
 */

import type { ReferenceEntry, ReferenceTableEntry, ReferenceTextEntry } from './schema';

const SUBSECTION = 'environment';

/** Encadrés de texte des dangers de l'environnement (p. 236-240). */
const ENVIRONMENT_TEXT_ENTRIES: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'long-jump',
    title: 'Saut en longueur',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['saut', 'saut en longueur', 'élan', 'gouffre', 'fossé', 'test d’AGI'],
    sourcePage: 236,
    shortEffect: 'Test d’AGI ; difficulté = 3 × la distance en mètres avec élan, 6 × sans élan.',
    test: 'Test d’AGI difficulté 3 × distance (m) avec élan ; 6 × distance (m) sans élan (l’élan doit valoir au moins le double du saut).',
    body: `Que ce soit pour franchir un gouffre ou un fossé défensif, il y aura toujours un moment dans une aventure où un aventurier devra effectuer un saut en longueur.

Pour résoudre cette action, le PJ doit effectuer un test d’AGI dont la difficulté dépend de l’élan dont il dispose et de la distance à franchir :

saut AVEC élan : la difficulté est égale à 3 × la distance en mètres ;

saut SANS élan : la difficulté est égale à 6 × la distance en mètres, l’élan devant être au moins le double du saut.`,
  },
  {
    kind: 'text',
    id: 'falling',
    title: 'Chute',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['chute', 'tomber', 'DM de chute', 'test d’AGI'],
    sourcePage: 236,
    shortEffect: '1d4° DM par tranche de 3 m (max 10d4° à 30 m) ; un test d’AGI difficulté 10 ignore les 3 premiers mètres.',
    test: 'Test d’AGI difficulté 10 pour ignorer les trois premiers mètres de chute.',
    body: `La chute est un classique de l’aventurier, que ce soit parce qu’il a échoué à un saut pour franchir un fossé ou parce qu’il a été lâché par l’aigle géant qui s’est emparé de lui. À moins de disposer d’une capacité spéciale qui peut le tirer de là, au moins partiellement, il va automatiquement subir des DM.

Les DM de chute sont de 1d4° par tranche de 3 m de chute pour un maximum de 10d4° (30 m).

Un test d’AGI difficulté 10 permet d’ignorer les trois premiers mètres de chute.`,
  },
  {
    kind: 'text',
    id: 'fire',
    title: 'Feu',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['feu', 'incendie', 'suffoquer', 'test de CON', 'DM par round'],
    sourcePage: 238,
    shortEffect: '1d6 DM par round ; dans un incendie, test de CON difficulté [5 + 2 par round] chaque round pour ne pas suffoquer.',
    test: 'Incendie : test de CON difficulté [5 + 2 par round] chaque round pour ne pas suffoquer et perdre connaissance.',
    body: `Prendre feu ou traverser un incendie inflige 1d6 DM par round. Dans le cas d’un incendie, il faut de plus réussir un test de CON difficulté [5 + 2 par round] chaque round pour ne pas suffoquer et perdre connaissance.`,
  },
  {
    kind: 'text',
    id: 'heat',
    title: 'Chaleur',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['chaleur', 'température', 'canicule', 'test de CON', 'malus d’armure'],
    sourcePage: 238,
    shortEffect: 'Au-dessus de 40°C : test de CON (difficulté = température − 30) toutes les 6 h, sinon 1d4° DM.',
    test: 'Test de CON par tranche de 6 h, difficulté égale à la température − 30 (10 à 40°C) ; échec = 1d4° DM. Le malus d’armure peut s’appliquer.',
    body: `Chaleur. Lorsque la température ambiante excède les 40°C, un test de CON difficulté 10 s’impose par tranche de 6 h. En cas d’échec, le PJ subit 1d4° DM. Le malus d’armure peut s’appliquer pour ce test. La difficulté du test augmente de 1 par degré supplémentaire (autrement dit, la difficulté est égale à la température - 30).`,
  },
  {
    kind: 'text',
    id: 'cold',
    title: 'Froid',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['froid', 'gel', 'température négative', 'vêtements chauds', 'test de CON'],
    sourcePage: 238,
    shortEffect: 'Sous 0°C sans vêtements adaptés : test de CON (difficulté = valeur absolue de la température) toutes les 6 h, sinon 1d4° DM.',
    test: 'En dessous de 0°C sans vêtements adaptés : test de CON par tranche de 6 h, difficulté = valeur absolue de la température (ex. 15 pour −15) ; échec = 1d4° DM. Vêtements chauds : bonus de +5 à +10.',
    body: `Froid. Jusqu’à 0°C, des vêtements corrects suffisent à se protéger. En dessous de 0°C, si le PJ ne porte pas de vêtements adaptés, il doit réussir un test de CON dont la difficulté est égale à la température négative par tranche de 6 h (par exemple, difficulté 15 pour -15) ou subir 1d4° DM. Des vêtements chauds peuvent apporter un bonus de +5 à +10 au test de CON.`,
  },
  {
    kind: 'text',
    id: 'poisons-rules',
    title: 'Poisons',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['poison', 'venin', 'enduire une arme', 'test de CON', 'test d’INT', 'virulence'],
    sourcePage: 238,
    shortEffect: 'Contact / ingestion / inhalation : test de CON difficulté 10 (modulé par la virulence) ; échec = effets du poison.',
    test: 'Test de CON difficulté 10 (modifiable selon la virulence) à l’exposition ; en cas d’échec, la victime subit les effets du poison.',
    body: `Les poisons peuvent être naturels (venin d’araignée, plante toxique) ou créés par un individu dans le but de nuire. Ils peuvent être ingérés dans un aliment ou inoculés par une morsure ou en enduisant une arme. Seul ce dernier cas nécessite une règle particulière :

Enduire une arme de poison nécessite un test d’INT difficulté 10. En cas d’échec, la dose est gaspillée. Un échec critique sur ce test signifie que le personnage s’empoisonne lui-même. Seule la première attaque réussie avec une arme enduite de poison permet d’appliquer les effets du poison à la victime.

Récupérer du poison sur une créature morte n’est pas suffisant pour bénéficier des effets du dit poison, les composants actifs se dégradent en 1d6 minutes. Cependant, à la discrétion du MJ, une glande à venin ou une plante toxique peuvent devenir les composants nécessaires à la fabrication de poison et se revendre à bon prix au marché noir.

Effet des poisons

Lorsqu’une personne est en mise en contact, que ce soit par ingestion, inhalation ou contact, elle doit effectuer un test de CON difficulté 10 (cette difficulté peut être modifiée selon la virulence du poison). En cas d’échec, la victime subit les effets du poison. Selon les poisons, il peut arriver que la victime subisse des effets même si elle réussit ce test de CON ; par exemple, pour des poisons puissants infligeant des DM, la victime pourra subir la moitié des DM normalement infligés par le poison.

Vous trouverez dans le tableau « Poisons » ci-dessus quelques types de poisons ainsi que leurs effets (selon l’échec ou la réussite au test de CON), la durée de l’effet (les poisons infligeant des DM n’ont généralement pas de durée) et le délai nécessaire avant que la victime ressente les effets.

La vente de poison est généralement illégale et leur coût prohibitif. Si un PJ souhaite se procurer un poison, il appartient au MJ de déterminer sa rareté et les conditions pour y accéder.`,
  },
  {
    kind: 'text',
    id: 'traps-rules',
    title: 'Pièges',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['piège', 'détecter', 'désamorcer', 'test de PER', 'test d’AGI', 'test d’INT'],
    sourcePage: 239,
    shortEffect: 'Détecter : test de PER (+5 si recherche active, déplacement ÷2). Éviter : test d’AGI. Désamorcer : test d’INT.',
    test: 'Détecter : test de PER (bonus +5 si le personnage cherche activement, mais déplacement divisé par deux). Contourner : test d’AGI. Désamorcer : test d’INT. La difficulté dépend de la nature du piège.',
    body: `Un piège est un système mécanique (parfois magique) destiné à capturer, ralentir ou tuer.

Un personnage qui risque de déclencher un piège doit faire un test de PER pour le détecter. S’il réussit, il découvre la menace à temps ; sinon, il tombe dans le piège et subit ses effets !

Si le PJ annonce qu’il cherche des pièges de façon active pendant sa progression, il bénéficie d’un bonus de +5 à son test. Toutefois, cela divise son déplacement par deux.

S’il détecte un piège, le personnage peut essayer de le contourner si c’est possible (test d’AGI) ou de le désamorcer (test d’INT). La difficulté dépend de la nature du piège. En cas d’échec, on considère généralement que le piège est activé et affecte le personnage.

Si le piège se déclenche, la victime subit immédiatement ses effets, qui consistent souvent en des DM, mais peuvent aussi intégrer un état spécifique. Dans certains cas, le PJ peut essayer d’échapper partiellement aux effets, par exemple en réalisant un test d’AGI ; les DM subis sont alors réduits de moitié.

Vous trouverez ci-après une liste de pièges non exhaustive avec leur description. La difficulté des tests pour détecter et désamorcer ainsi que les effets du piège sont indiqués dans le tableau « Pièges ».`,
  },
  {
    kind: 'text',
    id: 'trap-descriptions',
    title: 'Description des pièges',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['piège', 'aiguille empoisonnée', 'chausse-trappe', 'fosse à pieux', 'piège à loups', 'se libérer'],
    sourcePage: 239,
    shortEffect: 'Descriptions et mécaniques de libération des pièges du tableau (fosse, filet, mâchoire, etc.).',
    body: `Aiguille empoisonnée : dans une serrure, ce piège se déclenche lorsque la cible force l’ouverture ou la crochète, propulsant une fine aiguille dans la main de l’intrus.

Balancier : un objet dangereux balaie une zone en effectuant un mouvement de balancier pour faucher la cible (hache géante, tronc muni de pieux, etc.).

Bloc de pierre : piège létal souvent utilisé pour protéger les tombes des rois, un énorme bloc de pierre écrase l’intrus.

Chausse-trappe : des étoiles métalliques qui pointent vers le haut pour se planter dans les pieds de la cible. Elles sont disposées au sol, camouflées ou non, ce qui les rend plus ou moins facile à détecter (test de PER difficulté 5 ou 15). Une chausse-trappe occupe une zone de 3 × 3 m et nécessite un sac d’étoiles d’un coût de 3 pa pour être mise en place ; il faut 10 min pour les camoufler.

Fosse à pieu : utilisée en milieu naturel pour tuer du gros gibier, la fosse à pieux est un trou profond (3 m) hérissé de pieux. Pour s’échapper après être tombé dans le piège, il faut réussir un test d’AGI difficulté 15.

Lasso ou filet : destiné à capturer, le lasso enserre un pied et soulève la cible tête en bas, tandis que le filet capture une ou plusieurs créatures. Pour délivrer la victime, il faut couper la corde, ce qui nécessite de réussir un test d’AGI difficulté 15 (un essai par round).

Piège à loups : le piège à loups est une grosse mâchoire de métal posée au sol qui se referme sur la jambe de celui qui marche dessus. La victime peut être libérée en forçant la réouverture de la mâchoire (test de FOR difficulté 15).

Trappe et lames : une variante bien plus dangereuse de la fosse trouvée dans les donjons (6 m). Pour s’échapper, il faut réussir un test d’AGI difficulté 20.`,
  },
  {
    kind: 'text',
    id: 'forcing-obstacles',
    title: 'Forcer un obstacle',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['forcer', 'obstacle', 'porte', 'structure', 'solidité', 'RD', 'test de FOR', 'perforant', 'tranchant'],
    sourcePage: 240,
    shortEffect: 'Forcer : test de FOR difficulté = solidité. Détruire : la structure a autant de PV que sa solidité et sa RD ; les armes perforantes n’endommagent pas les structures, les tranchantes pas la maçonnerie.',
    test: 'Enfoncer une porte / tordre des barreaux : test de FOR difficulté égale à la valeur de solidité de l’obstacle.',
    body: `Au cours de leurs aventures, les personnages feront parfois face à des obstacles ou à des objets qui leur barreront le passage (porte, barreaux…) ou les empêcheront d’atteindre un objectif (coffre…). Ils pourront alors être tentés de forcer ou détruire ces obstacles.

Pour enfoncer une porte ou tordre des barreaux, le personnage doit réussir un test de FOR de difficulté égale à la valeur de solidité de l’obstacle (voir le tableau « Obstacles » ci-dessous).

Pour briser une porte en lui infligeant des DM avec une arme, considérez que la porte possède autant de PV que sa solidité et retranchez à tous les DM infligés sa valeur de RD (voir le tableau « Obstacles »). Les armes perforantes (flèches, rapière, dague, etc.) n’infligent pas de DM aux structures. Les armes tranchantes n’infligent pas de DM aux structures maçonnées (murs). Les caractéristiques des murs sont données à titre d’information, car seuls les engins de siège ou les explosifs ont une chance de les endommager sérieusement.`,
  },
];

/** Tables des dangers de l'environnement : poisons (p. 238), pièges (p. 239), obstacles (p. 240). */
const ENVIRONMENT_TABLE_ENTRIES: ReferenceTableEntry[] = [
  {
    kind: 'table',
    id: 'poisons-table',
    title: 'Poisons',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['poison', 'affaiblissant', 'lent', 'rapide', 'mortel', 'test de CON'],
    sourcePage: 238,
    columns: [
      { key: 'type', label: 'Type de poison' },
      { key: 'effectFailure', label: 'Effet — échec au test de CON' },
      { key: 'effectSuccess', label: 'Effet — réussite au test de CON' },
      { key: 'duration', label: 'Durée' },
      { key: 'delay', label: 'Délai avant effet' },
      { key: 'note', label: 'Note' },
    ],
    rows: [
      { type: 'Affaiblissant long', effectFailure: 'Victime affaiblie', effectSuccess: '–', duration: '1d6 h', delay: '1d6 rounds', note: '' },
      { type: 'Affaiblissant rapide', effectFailure: 'Victime est affaiblie', effectSuccess: '–', duration: '1d6 min', delay: 'Immédiat', note: '' },
      { type: 'Lent', effectFailure: '1d4° DM', effectSuccess: '–', duration: '–', delay: 'Immédiat', note: 'Un test par jour jusqu’à réussite' },
      { type: 'Rapide', effectFailure: '2d4° DM', effectSuccess: '1d4° DM', duration: '–', delay: 'Immédiat', note: '' },
      { type: 'Mortel', effectFailure: 'Mort (PJ : 0 PV)', effectSuccess: '2d4° DM', duration: '–', delay: '1d6 min', note: 'Généralement ingéré' },
    ],
  },
  {
    kind: 'table',
    id: 'traps-table',
    title: 'Pièges',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['piège', 'détecter', 'désamorcer', 'effet', 'DM'],
    sourcePage: 239,
    columns: [
      { key: 'name', label: 'Nom du piège' },
      { key: 'detect', label: 'Diff. Détecter' },
      { key: 'disarm', label: 'Diff. Désamorcer' },
      { key: 'effect', label: 'Effet' },
      { key: 'complement', label: 'Complément' },
    ],
    rows: [
      { name: 'Aiguille empoisonnée', detect: '20', disarm: '10', effect: 'selon poison', complement: '' },
      { name: 'Balancier', detect: '15', disarm: '10', effect: '3d6 DM', complement: 'DM/2 sur test AGI diff. 15' },
      { name: 'Bloc de pierre', detect: '15', disarm: '15', effect: '10d4° DM', complement: 'DM/2 sur test AGI diff. 15' },
      { name: 'Chausse-trappe', detect: '5 ou 15', disarm: '5', effect: '1 DM + invalide', complement: 'L’invalidité cesse lorsque la victime est soignée' },
      { name: 'Fosse à pieux', detect: '15', disarm: '5', effect: '2d6 DM', complement: 'DM/2 sur test AGI diff. 15' },
      { name: 'Lasso/Filet', detect: '15', disarm: '10', effect: 'immobilisé + renversé', complement: '' },
      { name: 'Piège à loups', detect: '15', disarm: '5', effect: '1 DM + immobilisé', complement: '' },
      { name: 'Trappe et lames', detect: '20', disarm: '15', effect: '5d4° DM', complement: 'DM/2 sur test AGI diff. 15' },
    ],
  },
  {
    kind: 'table',
    id: 'obstacles-table',
    title: 'Obstacles',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['obstacle', 'structure', 'solidité', 'RD', 'porte', 'mur', 'barreaux'],
    sourcePage: 240,
    columns: [
      { key: 'structure', label: 'Structure' },
      { key: 'solidity', label: 'Solidité' },
      { key: 'rd', label: 'RD' },
    ],
    rows: [
      { structure: 'Porte simple en bois', solidity: '15', rd: '5' },
      { structure: 'Porte épaisse', solidity: '20', rd: '7' },
      { structure: 'Porte renforcée', solidity: '25', rd: '10' },
      { structure: 'Porte blindée', solidity: '30', rd: '15' },
      { structure: 'Barreaux simples', solidity: '25', rd: '20' },
      { structure: 'Barreaux croisés', solidity: '30', rd: '20' },
      { structure: 'Cloison de bois et plâtre', solidity: '20', rd: '5' },
      { structure: 'Cloison en brique', solidity: '25', rd: '10' },
      { structure: 'Mur de pierre de 30 cm d’épaisseur', solidity: '30', rd: '20' },
    ],
    note: 'Les caractéristiques des murs sont données à titre d’information : seuls les engins de siège ou les explosifs ont une chance de les endommager sérieusement. Les armes perforantes n’infligent pas de DM aux structures ; les armes tranchantes n’en infligent pas aux structures maçonnées (murs).',
  },
];

/** Toutes les entrées « dangers de l'environnement » (p. 236-240). */
export const ENVIRONMENT: ReferenceEntry[] = [...ENVIRONMENT_TEXT_ENTRIES, ...ENVIRONMENT_TABLE_ENTRIES];

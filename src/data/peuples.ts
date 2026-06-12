/**
 * Peuples de CO2 — chapitre 3 (p. 44-60), table « Modificateur de peuple » p. 28.
 *
 * Descriptions verbatim : paragraphes descriptifs principaux + section
 * « Interpréter un … » (les sections « Dans les Terres d'Osgild » et
 * « Noms typiques » ne sont pas reprises). Les césures de fin de ligne du
 * livre sont recollées, sans autre modification.
 */

import type { Peuple } from './schema';

export const peuples: Peuple[] = [
  {
    id: 'demi-elfe',
    nom: 'Demi-elfe',
    description:
      'Le demi-elfe a hérité des qualités de ses deux parents (humain et elfe). Il est généralement traité avec condescendance parmi les elfes et perçu comme un elfe parmi les humains.\n\n' +
      'Toutefois, presque tous les demi-elfes ont un point commun : ils sont souvent d’une nature poétique, voire mélancolique. En effet, il n’est pas facile de voir les ravages que cause une si grande différence d’espérance de vie entre vos deux parents, et entre vos parents et vous-même. Cela pousse inévitablement le jeune demi-elfe à se poser des questions existentielles sur l’amour, la vie et la mort. Pour cette raison, alors que les elfes détestent généralement la nécromancie, c’est une spécialité qui n’est pas rare chez les sang-mêlé. Cette fragilité intérieure associée à la dualité de culture fait aussi des demi-elfes des bardes d’exception.\n\n' +
      'Interpréter un demi-elfe\n\n' +
      'Le caractère et les aspirations d’un demi-elfe dépendent surtout de son éducation. Vous devez déterminer lequel de vos deux parents était un elfe et s’il s’agissait d’un elfe haut ou d’un elfe sylvain. Vos deux parents vous ont-ils élevé ensemble ? Si c’est le cas, vous avez probablement une vision éclairée et tolérante des différentes cultures. Mais si ce n’est pas le cas, vous avez peut-être hérité de quelques préjugés, voire d’un certain ressentiment pour la culture qui vous a renié.\n\n' +
      // Encadré « Voie du demi-elfe » — p. 46 (règle du choix de voie, reflétée
      // dans voieDePeupleIds ci-dessous).
      'Voie du demi-elfe\n\n' +
      'Le demi-elfe ne possède pas de voie de peuple dédiée, selon l’héritage culturel et le lieu de l’éducation de son personnage, le joueur devra choisir entre la voie de l’humain ou une des voies de peuple d’elfe (elfe sylvain ou elfe haut).',
    reperes: {
      ageDepart: '20+',
      esperanceVie: '150 ans',
      taille: '1,50 m à 1,90 m',
      poids: '40 à 80 kg',
      traits: 'grâce naturelle, oreilles légèrement pointues, pilosité faible.',
    },
    // p. 28 et p. 46 : « +1 PER ou CHA, -1 FOR ou CON ».
    modificateurs: [
      { valeur: 1, caracs: ['PER', 'CHA'] },
      { valeur: -1, caracs: ['FOR', 'CON'] },
    ],
    // Pas de voie dédiée : choix entre la voie de l'humain et une des deux
    // voies d'elfe (encadré p. 46).
    voieDePeupleIds: ['humain', 'elfe-sylvain', 'elfe-haut'],
    sourcePage: 45,
  },
  {
    id: 'demi-orc',
    nom: 'Demi-orc',
    description:
      'Le demi-orc est de grande taille. Il possède une force physique hors du commun, et est généralement méprisé par les autres peuples, en particulier par les nains et les elfes.\n\n' +
      'Interpréter un demi-orc\n\n' +
      'Comme pour le demi-elfe, le caractère et les préjugés des demi-orcs dépendent beaucoup des conditions de leur éducation. Toutefois, contrairement à ce cousin « de bonne famille », il est bien rare qu’un enfant demi-orc ait eu la chance de bénéficier des soins d’un couple aimant et sans histoire. Les demi-orcs sont, plus souvent qu’à leur tour, élevés dans la misère par une mère seule, reniée même par sa propre famille, quand ils ne sont pas tout simplement déposés devant les portes d’un orphelinat ou d’un temple. Pour cette raison, on trouve presque autant de prêtres demi-orcs que de guerriers ou de voleurs. Lorsqu’ils sont recueillis par un ordre religieux, ils deviennent généralement d’une loyauté sans faille pour leur nouvelle famille et d’un zèle qui confine au fanatisme. Pour les autres, souvent rejetés et victimes de racisme, les demi-orcs apprennent rapidement à user de leur talent pour la violence afin de survivre.\n\n' +
      'Dans tous les cas, vous savez que vous devez vous montrer fort et impitoyable, car, à la moindre faiblesse, les « braves gens » se jetteront sur vous avec la bienveillance d’une bande de hyènes affamées. Alors vous avez appris à savourer la peur que vous allumez dans leur regard, lorsque vous découvrez vos crocs dans un rictus provocateur.',
    reperes: {
      ageDepart: '15+',
      esperanceVie: '60 ans',
      taille: '1,70 m à 2,10 m',
      poids: '70 à 150 kg',
      traits:
        'grand et athlétique. Peau verdâtre qui tend parfois vers un vert plus franc, mâchoire large, front bas, petits yeux.',
    },
    // p. 28 et p. 48 : « +1 FOR ou CON et -1 CHA ou INT ».
    modificateurs: [
      { valeur: 1, caracs: ['FOR', 'CON'] },
      { valeur: -1, caracs: ['CHA', 'INT'] },
    ],
    voieDePeupleIds: ['demi-orc'],
    sourcePage: 46,
  },
  {
    id: 'elfe-haut',
    nom: 'Elfe haut',
    description:
      'L’elfe haut est un être féérique qui vit extrêmement longtemps et dont le niveau de civilisation et de culture se révèle généralement supérieur à celui des autres peuples. Proche de la nature, il maîtrise aussi bien les arts de la magie que ceux de la guerre.\n\n' +
      'Interpréter un elfe haut\n\n' +
      'Essayez de garder une certaine distance avec les autres personnages, une certaine hauteur de vue. Vous êtes réservé et vous ne montrez pas facilement vos sentiments profonds. La plupart des elfes hauts ont une haute probité morale et une haute opinion d’eux-mêmes. Ils détestent la corruption, la vulgarité et la violence et ils ont un grand respect pour la vie. Ce sont des êtres civilisés et cultivés, bien plus que n’importe quel autre peuple, et cela les rend parfois arrogants. Les elfes aiment la beauté, les arts, les vêtements de luxe et les matériaux nobles, ils attachent sans doute trop d’importance aux apparences. Ils sont souvent méprisants envers les nains qu’ils jugent avides et sans finesse.',
    reperes: {
      ageDepart: '80+',
      esperanceVie: '450 ans',
      taille: '1,50 m à 1,80 m',
      poids: '40 à 70 kg',
      traits:
        'élancé, svelte et gracieux. Jeunesse éternelle. Oreilles pointues, yeux en amandes (verts, violets), cheveux parfois blancs, argent ou or.',
    },
    // p. 28 et p. 50 : « +1 INT ou CHA, -1 FOR ».
    modificateurs: [
      { valeur: 1, caracs: ['INT', 'CHA'] },
      { valeur: -1, caracs: ['FOR'] },
    ],
    voieDePeupleIds: ['elfe-haut'],
    sourcePage: 48,
  },
  {
    id: 'elfe-sylvain',
    nom: 'Elfe sylvain',
    description:
      'L’elfe sylvain est issu d’une culture différente de celle des elfes hauts. Légèrement plus petits, ils vivent au plus profond des forêts, s’abritant dans les arbres et vivant simplement de la chasse et de la cueillette. Moins arrogants que leurs cousins hauts elfes, ils sont cependant beaucoup plus méfiants. Ils maîtrisent particulièrement l’art du camouflage et l’utilisation de l’arc.\n\n' +
      'Interpréter un elfe sylvain\n\n' +
      'Vous êtes un écologiste dans un monde qui ne connaît pas la signification de ce mot. Pour vous, la nature — plus particulièrement la forêt — est une mère qu’il faut aimer et respecter. Au mieux, vous ne comprenez pas ceux qui détruisent vos très chers arbres, au pire, vous les haïssez. Si les elfes sylvains ne respectaient pas autant la valeur de la vie, le métier de bûcheron serait sans aucun doute le plus dangereux des Terres d’Osgild. Vous partagez avec vos cousins elfes hauts une langue, une culture et un amour des arts et de la beauté, mais vos goûts sont plus simples. En particulier vous préférez les tenues fonctionnelles et les couleurs de la nature, tandis que les elfes hauts aiment le bleu, le blanc, l’or ou l’argent. Vous êtes méfiant vis-à-vis des étrangers, peut-être plus encore que vos cousins, et vous ne cherchez pas à vous en cacher. Pourtant, vous restez moins prompt qu’eux à juger sur les apparences.',
    reperes: {
      ageDepart: '50+',
      esperanceVie: '350 ans',
      taille: '1,40 m à 1,70 m',
      poids: '30 à 60 kg',
      traits:
        'menu, svelte. Oreilles pointues, yeux en amandes (verts, violets), cheveux sombres (bruns, noirs, roux), tatouages, pilosité absente.',
    },
    // p. 28 et p. 51 : « +1 AGI ou PER, -1 FOR ».
    modificateurs: [
      { valeur: 1, caracs: ['AGI', 'PER'] },
      { valeur: -1, caracs: ['FOR'] },
    ],
    voieDePeupleIds: ['elfe-sylvain'],
    sourcePage: 50,
  },
  {
    id: 'gnome',
    nom: 'Gnome',
    description:
      'Le gnome est une créature de petite taille pourvue d’un gros nez, d’une bonne nature et d’une curiosité insatiable pour la magie et les sciences. C’est un compagnon souvent agréable, bien qu’un peu original. Les nains et les halfelins l’apprécient, tandis que les « grandes » personnes se montrent plutôt indifférentes à leur égard.\n\n' +
      'Interpréter un gnome\n\n' +
      'Vous êtes généralement joyeux, optimiste et enthousiaste et cet état d’esprit positif fait de vous un agréable compagnon. Mais il faut bien cela pour vous supporter, car vous êtes aussi très original, et jamais à court d’idée ou de plans farfelus. De plus, vous avez tendance à n’en faire qu’à votre tête… Essayez de trouver une passion originale, un sujet d’étude improbable ou une collection étrange. Par exemple, un gnome pourrait avoir une passion pour la composition de la terre de surface, et le projet de sa vie pourrait être de recenser tous les terroirs des Terres d’Osgild au sein d’une classification basée sur leur goût en bouche… Vos affinités avec les nains et les halfelins sont très fortes. Vous vous entendez bien avec les elfes et, bien que ceux-ci vous considèrent avec condescendance, vous ne leur en tenez pas rigueur. Car globalement, les gnomes ont très bon caractère et il en faut vraiment beaucoup pour mettre un gnome en colère. D’ailleurs, il se dit que si un gnome devait se venger de son pire ennemi, il le ferait sans doute en blaguant.',
    reperes: {
      ageDepart: '40+',
      esperanceVie: '250 ans',
      taille: '1 m à 1,20 m',
      poids: '30 à 50 kg',
      traits:
        'Petit et rondouillard, gros nez. Moustaches et rouflaquettes pour les gnomes, couettes pour les gnomettes. Oreilles un peu pointues ou grandes et rondes.',
    },
    // p. 28 et p. 53 : « +1 en INT ou PER, -1 en FOR ».
    modificateurs: [
      { valeur: 1, caracs: ['INT', 'PER'] },
      { valeur: -1, caracs: ['FOR'] },
    ],
    voieDePeupleIds: ['gnome'],
    sourcePage: 52,
  },
  {
    id: 'halfelin',
    nom: 'Halfelin',
    description:
      'Les halfelins représentent le plus petit des peuples jouables. Toujours bons vivants, souvent vifs, curieux, et parfois farceurs, les halfelins sont des incompris que les autres peuples considèrent souvent comme turbulents, pénibles, si ce n’est comme des voleurs.\n\n' +
      'Interpréter un halfelin\n\n' +
      'La plupart des halfelins sont des gens paisibles et sans histoire qui fuient l’incertitude et le danger une fois atteint l’âge de raison. Mais avant cela, les jeunes adultes ont une période de curiosité insatiable et de remise en question de leur mode de vie paisible. Durant cette parenthèse turbulente, ils sont enclins à l’aventure et il est alors fréquent pour le jeune halfelin de s’émanciper de sa parenté. Ainsi, les petites gens se sont approprié la devise « les voyages forment la jeunesse ». À moins que ce ne soit simplement une manière pratique pour les adultes de se débarrasser des jeunes gens agités… C’est généralement durant leurs voyages que les jeunes halfelins, sans fortune ni principes, construisent leur réputation de voleur, alors que la société de leurs parents réprouve totalement ce type de pratique.\n\n' +
      'En tant que jeune halfelin, vous êtes idéaliste et naïf, mais aussi curieux et aventureux, ce qui vous pousse parfois à prendre des risques inconsidérés. Toutefois, les halfelins ont aussi un bon fond qui leur vient de l’amour qu’ils ont reçu durant leur enfance et qui les pousse instinctivement à aider les plus faibles et les plus démunis. Dans la société des halfelins, la nourriture occupe une place centrale et on ne laisse pas quelqu’un en manquer. Enfin, un peu avant leurs trente ans, la plupart des petites gens cessent leur errance et s’installent pour mener une vie paisible. Cependant, il arrive que, de façon très exceptionnelle, certains prennent goût à l’aventure.',
    reperes: {
      ageDepart: '20+',
      esperanceVie: '150 ans',
      taille: '80 cm à 1 m',
      poids: '20 à 30 kg',
      traits: 'petit et vif. Pieds poilus, regard espiègle.',
    },
    // p. 28 et p. 55 : « +1 AGI ou VOL, -1 FOR ».
    modificateurs: [
      { valeur: 1, caracs: ['AGI', 'VOL'] },
      { valeur: -1, caracs: ['FOR'] },
    ],
    voieDePeupleIds: ['halfelin'],
    sourcePage: 54,
  },
  {
    id: 'humain',
    nom: 'Humain',
    description:
      'L’humain se distingue par sa capacité d’adaptation et son instinct qui le pousse à coloniser tous les territoires qui l’entourent. Le peuple humain est le plus représenté et le plus répandu dans les zones dites civilisées.\n\n' +
      'Interpréter un humain\n\n' +
      'Interpréter un humain ne devrait pas poser beaucoup de difficultés, puisque vous en êtes un (jusqu’à preuve du contraire). Les humains sont très différents les uns des autres et permettent une grande liberté d’interprétation. Rappelez-vous simplement que la plupart des humains des Terres d’Osgild sont assez peu cultivés et que votre personnage n’a pas du tout le même niveau de connaissance que vous. Les humains prennent sans compter ce que la nature peut leur offrir, ils considèrent que les dieux leur ont offert le monde pour qu’ils le modèlent à leur guise. Leur vie est courte et frénétique. Ils ont la mémoire courte et ne tirent aucune leçon du passé.',
    reperes: {
      ageDepart: '18+',
      esperanceVie: '100 ans',
      taille: '1,50 m à 2 m',
      poids: '40 à 120 kg',
      traits:
        'toute la diversité possible à l’exception des couleurs trop exotiques (cheveux violets, etc.).',
    },
    /**
     * p. 57 : « Un personnage humain gagne +1 à la valeur d'une de ses deux
     * plus faibles caractéristiques au choix. » (table p. 28 : « +1 à une des
     * deux plus faibles carac. »). La contrainte « parmi les deux plus
     * faibles » n'est pas exprimable dans `ModificateurCarac` : les 7 caracs
     * sont listées et le moteur/wizard doit restreindre le choix aux deux
     * plus faibles valeurs du personnage.
     */
    modificateurs: [{ valeur: 1, caracs: ['AGI', 'CON', 'FOR', 'PER', 'CHA', 'INT', 'VOL'] }],
    voieDePeupleIds: ['humain'],
    sourcePage: 56,
  },
  {
    id: 'nain',
    nom: 'Nain',
    description:
      'Le nain est petit mais robuste. Célèbre pour sa barbe, il aime les profondeurs de la terre, dont il extrait des métaux et des pierres précieuses. Isolé, il est généralement ouvert et chaleureux, mais la société naine peut paraître sévère, car le travail et l’entraînement militaire y sont des obligations.\n\n' +
      'Interpréter un nain\n\n' +
      'Vous pouvez être taciturne ou braillard, mais vous ne faites pas les choses à moitié, et quand vous donnez votre avis, il est franc et massif, tant pis si cela froisse quelque susceptibilité. Vous êtes méfiant de prime abord, mais chaleureux une fois la glace rompue et vous savez entretenir l’amitié autour d’une bière ou deux… ou plus. La demi-mesure n’est pas votre fort. Votre parole est solide comme le roc et vos griefs durs comme l’acier. Vous êtes coriace, courageux, opiniâtre, et un combat ne vous fera jamais reculer. Oui, c’est vrai, vous aimez les joyaux et les métaux précieux, mais surtout parce qu’ils permettent de produire cet artisanat raffiné qui fait la fierté du peuple nain.',
    reperes: {
      ageDepart: '40+',
      esperanceVie: '250 ans',
      taille: '1,15 m à 1,35 m',
      poids: '50 à 100 kg',
      traits:
        'robuste et trapu. Pilosité très développée, tresses dans les cheveux et la barbe, bijoux et piercing. Non, les naines n’ont pas de barbe, tout juste un fin duvet avec l’âge.',
    },
    // p. 28 et p. 59 : « +1 en CON ou VOL, -1 en AGI ».
    modificateurs: [
      { valeur: 1, caracs: ['CON', 'VOL'] },
      { valeur: -1, caracs: ['AGI'] },
    ],
    voieDePeupleIds: ['nain'],
    sourcePage: 58,
  },
];

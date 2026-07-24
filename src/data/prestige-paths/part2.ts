/**
 * Voies de prestige — partie 2/2 : pages 146 à 175 du livre de base CO2.
 *
 * Catégories couvertes :
 *  - 'combattant'  p. 146-153 (12 voies)
 *  - 'mage'        p. 154-165 (13 voies)
 *  - 'mystique'    p. 166-175 (12 voies)
 *
 * Rangs réels des capacités : 4 à 8 (voies de prestige). Textes verbatim.
 * Astérisque après le nom → estSort:true ; (A)/(L)/(G)/(M) → typesAction.
 */
import type { PrestigePath, Feature } from '../schema';

export const prestigePaths2: PrestigePath[] = [
  // ===================================================================
  // VOIES DE COMBATTANT — p. 146-153
  // ===================================================================
  {
    id: 'prestige-armes-a-deux-mains',
    name: 'Voie des armes à deux mains',
    type: 'prestige',
    category: 'fighter',
    prerequisites:
      "Les capacités issues de cette voie ne fonctionnent pas avec les armes qui infligent des DM non létaux ou seulement 1d6 DM.",
    featureIds: [
      'prestige-armes-a-deux-mains-r4',
      'prestige-armes-a-deux-mains-r5',
      'prestige-armes-a-deux-mains-r6',
      'prestige-armes-a-deux-mains-r7',
      'prestige-armes-a-deux-mains-r8',
    ],
    sourcePage: 146,
  },
  {
    id: 'prestige-arme-liee',
    name: "Voie de l'arme liée",
    type: 'prestige',
    category: 'fighter',
    prerequisites:
      "Le personnage choisit une arme et se lie avec l'objet par un rituel informel qui dure 2d6 jours. Une fois par niveau, le personnage peut créer un lien avec une nouvelle arme, mais le lien qui le liait à la précédente disparaît.",
    featureIds: [
      'prestige-arme-liee-r4',
      'prestige-arme-liee-r5',
      'prestige-arme-liee-r6',
      'prestige-arme-liee-r7',
      'prestige-arme-liee-r8',
    ],
    sourcePage: 147,
  },
  {
    id: 'prestige-chevalier-dragon',
    name: 'Voie du chevalier dragon',
    type: 'prestige',
    category: 'fighter',
    prerequisites:
      "Pour choisir cette voie, il faut avoir acquis la capacité Monture fantastique (rang 5 de la voie du cavalier) et choisi un drake au niveau 9 (une sorte de lézard volant, cousin mineur du dragon). De fait, à moins d'une autorisation très spécifique du MJ, cette voie ne sera ouverte qu'à haut niveau (9 à 13).",
    featureIds: [
      'prestige-chevalier-dragon-r4',
      'prestige-chevalier-dragon-r5',
      'prestige-chevalier-dragon-r6',
      'prestige-chevalier-dragon-r7',
      'prestige-chevalier-dragon-r8',
    ],
    sourcePage: 147,
  },
  {
    id: 'prestige-combattant-des-tunnels',
    name: 'Voie du combattant des tunnels',
    type: 'prestige',
    category: 'fighter',
    prerequisites: '',
    featureIds: [
      'prestige-combattant-des-tunnels-r4',
      'prestige-combattant-des-tunnels-r5',
      'prestige-combattant-des-tunnels-r6',
      'prestige-combattant-des-tunnels-r7',
      'prestige-combattant-des-tunnels-r8',
    ],
    sourcePage: 148,
  },
  {
    id: 'prestige-combat-du-mal',
    name: 'Voie du combat du mal',
    type: 'prestige',
    category: 'fighter',
    prerequisites: '',
    featureIds: [
      'prestige-combat-du-mal-r4',
      'prestige-combat-du-mal-r5',
      'prestige-combat-du-mal-r6',
      'prestige-combat-du-mal-r7',
      'prestige-combat-du-mal-r8',
    ],
    sourcePage: 149,
  },
  {
    id: 'prestige-colosse',
    name: 'Voie du colosse',
    type: 'prestige',
    category: 'fighter',
    prerequisites:
      "Il est nécessaire d'avoir au moins +3 en Force pour choisir cette voie.",
    note: "À force d'entraînement, le personnage développe une force prodigieuse et des muscles énormes. Il augmente son poids d'au moins 10 kg par rang atteint dans la voie, tout en muscle.",
    featureIds: [
      'prestige-colosse-r4',
      'prestige-colosse-r5',
      'prestige-colosse-r6',
      'prestige-colosse-r7',
      'prestige-colosse-r8',
    ],
    sourcePage: 149,
  },
  {
    id: 'prestige-danseur-de-guerre',
    name: 'Voie du danseur de guerre',
    type: 'prestige',
    category: 'fighter',
    prerequisites:
      "Pour pouvoir utiliser les capacités de cette voie, le personnage ne doit pas porter d'armure plus encombrante qu'une chemise de mailles.",
    featureIds: [
      'prestige-danseur-de-guerre-r4',
      'prestige-danseur-de-guerre-r5',
      'prestige-danseur-de-guerre-r6',
      'prestige-danseur-de-guerre-r7',
      'prestige-danseur-de-guerre-r8',
    ],
    sourcePage: 150,
  },
  {
    id: 'prestige-ecorcheur',
    name: "Voie de l'écorcheur",
    type: 'prestige',
    category: 'fighter',
    prerequisites: '',
    featureIds: [
      'prestige-ecorcheur-r4',
      'prestige-ecorcheur-r5',
      'prestige-ecorcheur-r6',
      'prestige-ecorcheur-r7',
      'prestige-ecorcheur-r8',
    ],
    sourcePage: 150,
  },
  {
    id: 'prestige-guerrier-mage',
    name: 'Voie du guerrier-mage',
    type: 'prestige',
    category: 'fighter',
    prerequisites:
      "Exceptionnellement, cette voie donne seulement 4 PV par niveau. Il est nécessaire d'avoir acquis au moins une voie de combattant et une voie de mage.",
    featureIds: [
      'prestige-guerrier-mage-r4',
      'prestige-guerrier-mage-r5',
      'prestige-guerrier-mage-r6',
      'prestige-guerrier-mage-r7',
      'prestige-guerrier-mage-r8',
    ],
    sourcePage: 151,
  },
  {
    id: 'prestige-ours',
    name: "Voie de l'ours",
    type: 'prestige',
    category: 'fighter',
    prerequisites: '',
    featureIds: [
      'prestige-ours-r4',
      'prestige-ours-r5',
      'prestige-ours-r6',
      'prestige-ours-r7',
      'prestige-ours-r8',
    ],
    sourcePage: 151,
  },
  {
    id: 'prestige-porteur-de-bouclier',
    name: 'Voie du porteur de bouclier',
    type: 'prestige',
    category: 'fighter',
    prerequisites: '',
    featureIds: [
      'prestige-porteur-de-bouclier-r4',
      'prestige-porteur-de-bouclier-r5',
      'prestige-porteur-de-bouclier-r6',
      'prestige-porteur-de-bouclier-r7',
      'prestige-porteur-de-bouclier-r8',
    ],
    sourcePage: 152,
  },
  {
    id: 'prestige-tueur-de-geants',
    name: 'Voie du tueur de géants',
    type: 'prestige',
    category: 'fighter',
    prerequisites: '',
    featureIds: [
      'prestige-tueur-de-geants-r4',
      'prestige-tueur-de-geants-r5',
      'prestige-tueur-de-geants-r6',
      'prestige-tueur-de-geants-r7',
      'prestige-tueur-de-geants-r8',
    ],
    sourcePage: 153,
  },

  // ===================================================================
  // VOIES DE MAGE — p. 154-165
  // Note transversale : « Les sorts des voies de mage sont tous indexés
  // sur l'Intelligence. Toutefois, si un ensorceleur (ou un barde)
  // choisit une de ces voies, il utilisera son Charisme. » (p. 154)
  // ===================================================================
  {
    id: 'prestige-archimage',
    name: "Voie de l'archimage",
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    featureIds: [
      'prestige-archimage-r4',
      'prestige-archimage-r5',
      'prestige-archimage-r6',
      'prestige-archimage-r7',
      'prestige-archimage-r8',
    ],
    sourcePage: 154,
  },
  {
    id: 'prestige-chaos',
    name: 'Voie du chaos',
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    featureIds: [
      'prestige-chaos-r4',
      'prestige-chaos-r5',
      'prestige-chaos-r6',
      'prestige-chaos-r7',
      'prestige-chaos-r8',
    ],
    sourcePage: 155,
  },
  {
    id: 'prestige-cristaux',
    name: 'Voie des cristaux',
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    note: "Pour fonctionner, un cristal doit être lancé près de la tête du personnage, il se met alors à tourner rapidement autour de celle-ci. Activer ou désactiver un cristal correspond à une action limitée. Le personnage peut activer ou désactiver un cristal qu'il a fabriqué à n'importe quelle distance par une action limitée. Fabriquer un cristal demande 1d6 jours de travail et la dépense de 500 pa.\n\nTable des cristaux (Couleur — Forme — Effet) :\n- Blanc laiteux — Fuseau — Régénération (1 PV/h)\n- Bleu incandescent — Sphère — Bonus de +1 en PER\n- Bleu nuit — Rhombe — Bonus de +5 en Init.\n- Bleu pâle — Rhombe — Bonus de +1 en FOR\n- Irisé — Fuseau — Permet de survivre sans respirer\n- Noir fumé — Prisme — Résistance au feu et au froid 10 points\n- Orange — Fuseau — Résistance acide et électricité 10 points\n- Violet — Sphère — Bonus de +1 en CHA\n- Rose laiteux — Prisme — Bonus de +2 en DEF\n- Rouge sang — Rhombe — Bonus de +1 en CON\n- Rouge et bleu — Sphère — Bonus de +1 en INT\n- Rose vif — Sphère — Bonus de +1 en AGI\n- Translucide — Fuseau — Permet de subsister sans boire ni manger\n- Vert pâle — Prisme — Bonus de +1 en attaque",
    featureIds: [
      'prestige-cristaux-r4',
      'prestige-cristaux-r5',
      'prestige-cristaux-r6',
      'prestige-cristaux-r7',
      'prestige-cristaux-r8',
    ],
    sourcePage: 156,
  },
  {
    id: 'prestige-elementaliste',
    name: "Voie de l'élémentaliste",
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    featureIds: [
      'prestige-elementaliste-r4',
      'prestige-elementaliste-r5',
      'prestige-elementaliste-r6',
      'prestige-elementaliste-r7',
      'prestige-elementaliste-r8',
    ],
    sourcePage: 157,
  },
  {
    id: 'prestige-enchanteur',
    name: "Voie de l'enchanteur",
    type: 'prestige',
    category: 'mage',
    prerequisites: 'Requis : au moins une voie de magie jusqu’au rang 4',
    note: "Il est des mages qui se spécialisent dans la fabrication d'objets magiques (voir le chapitre « Objets magiques », page 242).\n\nLa capacité « Enchantement » est identique à chaque rang ; seul le niveau de magie maximal des objets enchantables augmente (niveau de magie maximal = rang atteint dans la voie – 3).",
    featureIds: [
      'prestige-enchanteur-r4',
      'prestige-enchanteur-r5',
      'prestige-enchanteur-r6',
      'prestige-enchanteur-r7',
      'prestige-enchanteur-r8',
    ],
    sourcePage: 157,
  },
  {
    id: 'prestige-gel',
    name: 'Voie du gel',
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    featureIds: [
      'prestige-gel-r4',
      'prestige-gel-r5',
      'prestige-gel-r6',
      'prestige-gel-r7',
      'prestige-gel-r8',
    ],
    sourcePage: 158,
  },
  {
    id: 'prestige-invocation-majeure',
    name: "Voie de l'invocation majeure",
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    note: "Durée d'incantation : tous les sorts de la voie de l'invocation majeure sont des actions limitées qui demandent un rituel d'incantation d'une durée d'une minute, mais ils bénéficient automatiquement de la Concentration, c'est-à-dire qu'ils coûtent un nombre de PM égal à leur rang - 2.",
    featureIds: [
      'prestige-invocation-majeure-r4',
      'prestige-invocation-majeure-r5',
      'prestige-invocation-majeure-r6',
      'prestige-invocation-majeure-r7',
      'prestige-invocation-majeure-r8',
    ],
    sourcePage: 158,
  },
  {
    id: 'prestige-mage-de-guerre',
    name: 'Voie du mage de guerre',
    type: 'prestige',
    category: 'mage',
    prerequisites:
      'Requis : connaître au moins trois sorts qui infligent des DM directs (Projectile de mana, Explosion de feu, Foudre, etc.).',
    featureIds: [
      'prestige-mage-de-guerre-r4',
      'prestige-mage-de-guerre-r5',
      'prestige-mage-de-guerre-r6',
      'prestige-mage-de-guerre-r7',
      'prestige-mage-de-guerre-r8',
    ],
    sourcePage: 160,
  },
  {
    id: 'prestige-magie-de-l-esprit',
    name: "Voie de la magie de l'esprit",
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    featureIds: [
      'prestige-magie-de-l-esprit-r4',
      'prestige-magie-de-l-esprit-r5',
      'prestige-magie-de-l-esprit-r6',
      'prestige-magie-de-l-esprit-r7',
      'prestige-magie-de-l-esprit-r8',
    ],
    sourcePage: 161,
  },
  {
    id: 'prestige-magie-des-mots',
    name: 'Voie de la magie des mots',
    type: 'prestige',
    category: 'mage',
    prerequisites:
      "Cette voie est accessible aux bardes comme s'il s'agissait d'une voie de leur famille de profil.",
    featureIds: [
      'prestige-magie-des-mots-r4',
      'prestige-magie-des-mots-r5',
      'prestige-magie-des-mots-r6',
      'prestige-magie-des-mots-r7',
      'prestige-magie-des-mots-r8',
    ],
    sourcePage: 162,
  },
  {
    id: 'prestige-magie-du-temps',
    name: 'Voie de la magie du temps',
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    note: "Contretemps : cette règle optionnelle permet de simuler les effets secondaires des sorts temporels. Elle sert aussi d'exemple à ce que le MJ pourrait inventer comme effet secondaire pour d'autres voies de prestige. Pour tous les sorts de cette voie, si le lanceur obtient un échec critique au test d'attaque magique (1 au d20), il subit un contrecoup : lancez un d6 sur la table ci-dessous.\n1 Reste perdu dans ses pensées pour 1d4° rounds. Attaqué, il se défend.\n2 Ne sait plus qui il est durant 1d4° minutes.\n3 Ne sait plus où il est ni pourquoi il est là durant 1d4° minutes.\n4 Ne reconnaît plus l'un de ses compagnons (déterminé au hasard) durant 1d4° h.\n5 Oubli d'un événement important durant 1d4° jours.\n6 Oubli d'un détail durant 1d4° mois.",
    featureIds: [
      'prestige-magie-du-temps-r4',
      'prestige-magie-du-temps-r5',
      'prestige-magie-du-temps-r6',
      'prestige-magie-du-temps-r7',
      'prestige-magie-du-temps-r8',
    ],
    sourcePage: 163,
  },
  {
    id: 'prestige-maitre-des-sorts',
    name: 'Voie du maître des sorts',
    type: 'prestige',
    category: 'mage',
    prerequisites: '',
    note: 'Les sorts de magie profane sont tous les sorts des profils de mage plus les sorts de barde.',
    featureIds: [
      'prestige-maitre-des-sorts-r4',
      'prestige-maitre-des-sorts-r5',
      'prestige-maitre-des-sorts-r6',
      'prestige-maitre-des-sorts-r7',
      'prestige-maitre-des-sorts-r8',
    ],
    sourcePage: 164,
  },
  {
    id: 'prestige-vision',
    name: 'Voie de la vision',
    type: 'prestige',
    category: 'mage',
    prerequisites:
      'Requis : avoir accès à une voie parmi la voie de la magie universelle, la voie de la divination, la voie des illusions ou la voie de la sombre magie.',
    featureIds: [
      'prestige-vision-r4',
      'prestige-vision-r5',
      'prestige-vision-r6',
      'prestige-vision-r7',
      'prestige-vision-r8',
    ],
    sourcePage: 165,
  },

  // ===================================================================
  // VOIES DE MYSTIQUE — p. 166-175
  // Note transversale : « Les sorts des voies de mystique sont tous
  // indexés sur le CHA. Toutefois, si un druide (ou un moine) choisit
  // une de ces voies, il utilisera sa PER. Vous remarquerez par ailleurs
  // que certaines voies utilisent la VOL ou la PER : cela est voulu et,
  // dans ce cas, un prêtre aura l'obligation d'utiliser la
  // caractéristique indiquée. » (p. 166)
  // ===================================================================
  {
    id: 'prestige-armure-sacree',
    name: "Voie de l'armure sacrée",
    type: 'prestige',
    category: 'mystic',
    prerequisites:
      "Cette voie est ouverte à tous les mystiques. Dans le cas du moine et du druide, elle n'empêche pas l'utilisation des capacités de ces profils. Pour le druide, l'armure est constituée d'écailles de dragon de la couleur correspondante.",
    note: "Les porteurs d'armure sont hiérarchisés en trois rangs : bronze, argent, or.",
    featureIds: [
      'prestige-armure-sacree-r4',
      'prestige-armure-sacree-r5',
      'prestige-armure-sacree-r6',
      'prestige-armure-sacree-r7',
      'prestige-armure-sacree-r8',
    ],
    sourcePage: 166,
  },
  {
    id: 'prestige-elementaire-du-feu',
    name: 'Voie élémentaire du feu',
    type: 'prestige',
    category: 'mystic',
    prerequisites:
      "Cette voie peut aussi être choisie par un mage qui maîtrise au moins deux sorts de feu. Remplacer le Charisme par l'Intelligence dans le texte des capacités.",
    note: "Les voies élémentaires ont tendance à changer profondément ceux qui les suivent, tant physiquement que mentalement. Dans le cas du feu, les cheveux deviennent roux, les ongles noircissent, tandis que le tempérament devient plus explosif.",
    featureIds: [
      'prestige-elementaire-du-feu-r4',
      'prestige-elementaire-du-feu-r5',
      'prestige-elementaire-du-feu-r6',
      'prestige-elementaire-du-feu-r7',
      'prestige-elementaire-du-feu-r8',
    ],
    sourcePage: 167,
  },
  {
    id: 'prestige-elementaire-de-la-terre',
    name: 'Voie élémentaire de la terre',
    type: 'prestige',
    category: 'mystic',
    prerequisites:
      "Cette voie peut aussi être choisie par un mage qui maîtrise au moins un sort de terre. Remplacer le Charisme par l'Intelligence dans le texte des capacités.",
    note: "Les voies élémentaires ont tendance à changer profondément ceux qui les suivent, tant physiquement que mentalement. Dans le cas de la terre, les cheveux deviennent gris, la peau terreuse, tandis que le tempérament devient plus introverti.",
    featureIds: [
      'prestige-elementaire-de-la-terre-r4',
      'prestige-elementaire-de-la-terre-r5',
      'prestige-elementaire-de-la-terre-r6',
      'prestige-elementaire-de-la-terre-r7',
      'prestige-elementaire-de-la-terre-r8',
    ],
    sourcePage: 167,
  },
  {
    id: 'prestige-elementaire-de-l-air',
    name: "Voie élémentaire de l'air",
    type: 'prestige',
    category: 'mystic',
    prerequisites:
      "Cette voie peut aussi être choisie par un mage qui maîtrise au moins un sort d'air. Remplacer le Charisme par l'Intelligence dans le texte des capacités.",
    note: "Les voies élémentaires ont tendance à changer profondément ceux qui les suivent, tant physiquement que mentalement. Dans le cas de l'air, les cheveux deviennent blancs et la peau très pâle, tandis que le tempérament devient rêveur.",
    featureIds: [
      'prestige-elementaire-de-l-air-r4',
      'prestige-elementaire-de-l-air-r5',
      'prestige-elementaire-de-l-air-r6',
      'prestige-elementaire-de-l-air-r7',
      'prestige-elementaire-de-l-air-r8',
    ],
    sourcePage: 168,
  },
  {
    id: 'prestige-elementaire-de-l-eau',
    name: "Voie élémentaire de l'eau",
    type: 'prestige',
    category: 'mystic',
    prerequisites:
      "Cette voie peut aussi être choisie par un mage qui maîtrise au moins un sort d'eau. Remplacer le Charisme par l'Intelligence dans le texte des capacités.",
    note: "Les voies élémentaires ont tendance à changer profondément ceux qui les suivent, tant physiquement que mentalement. Dans le cas de l'eau, les cheveux semblent toujours mouillés et les yeux prennent une couleur délavée, tandis que le tempérament devient plus changeant.",
    featureIds: [
      'prestige-elementaire-de-l-eau-r4',
      'prestige-elementaire-de-l-eau-r5',
      'prestige-elementaire-de-l-eau-r6',
      'prestige-elementaire-de-l-eau-r7',
      'prestige-elementaire-de-l-eau-r8',
    ],
    sourcePage: 169,
  },
  {
    id: 'prestige-changeforme',
    name: 'Voie du changeforme',
    type: 'prestige',
    category: 'mystic',
    prerequisites:
      "La capacité de druide Forme animale n'est pas requise pour développer cette voie. Toutefois elle permet d'en tirer plus d'avantages. Les animaux mentionnés dans les capacités suivantes figurent dans le chapitre « Adversité », à partir de la page 259.",
    featureIds: [
      'prestige-changeforme-r4',
      'prestige-changeforme-r5',
      'prestige-changeforme-r6',
      'prestige-changeforme-r7',
      'prestige-changeforme-r8',
    ],
    sourcePage: 170,
  },
  {
    id: 'prestige-combat-mystique',
    name: 'Voie du combat mystique',
    type: 'prestige',
    category: 'mystic',
    prerequisites: '',
    featureIds: [
      'prestige-combat-mystique-r4',
      'prestige-combat-mystique-r5',
      'prestige-combat-mystique-r6',
      'prestige-combat-mystique-r7',
      'prestige-combat-mystique-r8',
    ],
    sourcePage: 171,
  },
  {
    id: 'prestige-guerisseur',
    name: 'Voie du guérisseur',
    type: 'prestige',
    category: 'mystic',
    prerequisites: '',
    featureIds: [
      'prestige-guerisseur-r4',
      'prestige-guerisseur-r5',
      'prestige-guerisseur-r6',
      'prestige-guerisseur-r7',
      'prestige-guerisseur-r8',
    ],
    sourcePage: 171,
  },
  {
    id: 'prestige-maitre-de-la-nature',
    name: 'Voie du maître de la nature',
    type: 'prestige',
    category: 'mystic',
    prerequisites: '',
    featureIds: [
      'prestige-maitre-de-la-nature-r4',
      'prestige-maitre-de-la-nature-r5',
      'prestige-maitre-de-la-nature-r6',
      'prestige-maitre-de-la-nature-r7',
      'prestige-maitre-de-la-nature-r8',
    ],
    sourcePage: 172,
  },
  {
    id: 'prestige-saisons',
    name: 'Voie des saisons',
    type: 'prestige',
    category: 'mystic',
    prerequisites: '',
    note: "Le personnage qui choisit la voie des saisons laisse les cycles naturels s'emparer de son corps et cela modifie son apparence. Au printemps, il semble plus jeune que son âge d'un nombre d'années égal à deux fois le rang atteint dans la voie (pour un humain) et en hiver c'est l'inverse.",
    featureIds: [
      'prestige-saisons-r4',
      'prestige-saisons-r5',
      'prestige-saisons-r6',
      'prestige-saisons-r7',
      'prestige-saisons-r8',
    ],
    sourcePage: 173,
  },
  {
    id: 'prestige-templier',
    name: 'Voie du templier',
    type: 'prestige',
    category: 'mystic',
    prerequisites:
      "Cette voie est obligatoirement utilisée avec le CHA (même si le personnage est druide ou moine).",
    featureIds: [
      'prestige-templier-r4',
      'prestige-templier-r5',
      'prestige-templier-r6',
      'prestige-templier-r7',
      'prestige-templier-r8',
    ],
    sourcePage: 174,
  },
  {
    id: 'prestige-vermines',
    name: 'Voie des vermines',
    type: 'prestige',
    category: 'mystic',
    prerequisites: '',
    featureIds: [
      'prestige-vermines-r4',
      'prestige-vermines-r5',
      'prestige-vermines-r6',
      'prestige-vermines-r7',
      'prestige-vermines-r8',
    ],
    sourcePage: 175,
  },
];

export const prestigeFeatures2: Feature[] = [
  // ----- Voie des armes à deux mains (p. 146) -----
  {
    id: 'prestige-armes-a-deux-mains-r4',
    name: 'Frappe massive',
    pathId: 'prestige-armes-a-deux-mains',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage fait une attaque au contact et inflige ses DM maximaux en cas de réussite (les dés bonus ne sont pas maximisés). De plus, la cible doit réussir un test opposé de FOR ou être renversée (rendement décroissant sur le test de FOR : la cible bénéficie d'un bonus cumulatif de +5 à son test pour chaque nouvelle tentative durant le même combat). Si la cible est de taille énorme ou colossale, elle obtient un dé bonus au test de FOR.",
    sourcePage: 146,
  },
  {
    id: 'prestige-armes-a-deux-mains-r5',
    name: 'Gros monstre, grosse arme',
    pathId: 'prestige-armes-a-deux-mains',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Contre les créatures de taille grande et supérieure, les DM des armes à deux mains augmentent d'une catégorie d12 et 2d6 passent à 2d8, 1d8 et 1d10 passent à 1d12 (uniquement pour les armes tenues à deux mains), 2d8 passent à 2d10.",
    sourcePage: 146,
  },
  {
    id: 'prestige-armes-a-deux-mains-r6',
    name: 'Tenir à distance',
    pathId: 'prestige-armes-a-deux-mains',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque le personnage tient une arme à deux mains, il gagne un bonus de +1 en DEF. Ce bonus passe à +2 au rang 8.",
    sourcePage: 146,
  },
  {
    id: 'prestige-armes-a-deux-mains-r7',
    name: 'Critique destructeur',
    pathId: 'prestige-armes-a-deux-mains',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage abaisse son seuil de critique avec toutes les armes à deux mains de 1 point. De plus, lorsqu'il obtient un critique avec une arme à deux mains, le combattant obtient +2d4° aux DM en plus des effets du critique.",
    sourcePage: 146,
  },
  {
    id: 'prestige-armes-a-deux-mains-r8',
    name: 'Décapitation',
    pathId: 'prestige-armes-a-deux-mains',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque vous obtenez le résultat maximal sur un dé de DM d'une attaque au contact avec une arme à deux mains (par exemple 6 sur l'un des d6 de l'épée à deux mains), si la cible possède un NC inférieur ou égal à 5, elle est décapitée (ou même tranchée en deux) et morte. Si vous obtenez le résultat maximal sur les deux dés de DM (impossible donc si vous lancez un seul dé de DM !), le personnage décapite une cible d'un NC inférieur à son niveau. Une capacité qui lui permet d'obtenir automatiquement les DM maximaux (comme Frappe massive) ne permet pas de déclencher cet effet.",
    sourcePage: 146,
  },

  // ----- Voie de l'arme liée (p. 147) -----
  {
    id: 'prestige-arme-liee-r4',
    name: 'Fidèle',
    pathId: 'prestige-arme-liee',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arme est considérée comme magique et octroie au PJ un dé bonus en attaque une fois par combat. Si l'arme est en vue et à moins de 10 m (ou sa portée dans le cas d'une arme de lancer), il peut la faire revenir dans sa main en action gratuite. Si l'arme est saisie par une autre créature, il doit emporter un test opposé de CHA contre la FOR de son adversaire pour la faire revenir dans sa main. Si elle n'est pas en vue, il sait toujours dans quelle direction elle se trouve.",
    sourcePage: 147,
  },
  {
    id: 'prestige-arme-liee-r5',
    name: 'Alliée loyale',
    pathId: 'prestige-arme-liee',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par combat, lorsqu'il obtient 1 au test d'attaque avec son arme, le joueur peut le remplacer par la valeur 20.",
    sourcePage: 147,
  },
  {
    id: 'prestige-arme-liee-r6',
    name: 'Arme dansante',
    pathId: 'prestige-arme-liee',
    rank: 6,
    isSpell: false,
    actionTypes: ['M'],
    text:
      "Une fois par combat, le personnage peut demander à son arme de combattre pour lui. Elle attaque pendant [rang] rounds en utilisant la valeur d'attaque magique du PJ et en infligeant ses DM de base (plus un éventuel bonus de magie si l'arme est enchantée). S'il sombre dans l'inconscience, l'arme continue à veiller sur lui et à attaquer tous les ennemis qui approchent de son corps, tant que la durée totale de la capacité n'est pas atteinte. Ensuite elle devient inerte et tombe au sol.",
    sourcePage: 147,
  },
  {
    id: 'prestige-arme-liee-r7',
    name: 'Aura élémentaire',
    pathId: 'prestige-arme-liee',
    rank: 7,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "Une fois par combat, le personnage imprègne son arme d'une aura élémentaire pendant CON minutes. Cette aura lui offre un bonus de +1d4° aux DM qui prennent la forme de feu, d'acide, de froid ou d'électricité. L'élément choisi reste toujours le même. Ce bonus aux DM ne peut pas se cumuler à un autre bonus magique élémentaire (arc de feu, sort élémentaire, etc.).",
    sourcePage: 147,
  },
  {
    id: 'prestige-arme-liee-r8',
    name: 'Milles lames',
    pathId: 'prestige-arme-liee',
    rank: 8,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le personnage fait couler son propre sang sur son arme : il sacrifie 2d4° PV et invoque les sœurs spirituelles de son arme. Pendant 5 rounds, tous les adversaires du personnage dans un rayon de 10 m autour de lui sont frappés par une arme translucide semblable à la sienne et subissent automatiquement 1d4° DM.",
    sourcePage: 147,
  },

  // ----- Voie du chevalier dragon (p. 147) -----
  {
    id: 'prestige-chevalier-dragon-r4',
    name: 'Ordre du chevalier dragon',
    pathId: 'prestige-chevalier-dragon',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le cavalier rejoint l'ordre des chevaliers dragons avec le grade d'apprenti. Lorsqu'il porte les insignes de son ordre ou chevauche son drake, il gagne un bonus de +5 pour tous les tests de persuasion et d'intimidation. De plus, son drake obtient une réduction des DM contre le feu de 10.",
    sourcePage: 147,
  },
  {
    id: 'prestige-chevalier-dragon-r5',
    name: 'Résistance au feu',
    pathId: 'prestige-chevalier-dragon',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le cavalier est désormais un membre à part entière de l'ordre des chevaliers Dragon. Il a appris à résister aux flammes les plus féroces et il retranche 5 à tous les DM de feu subis (RD [feu] 5). Cette réduction passe à 10 une fois atteint le rang 7.",
    // PER-137 : RD permanente sur le feu, scalante par rang de voie (−5, puis −10 au rang 7).
    damageReduction: {
      kind: 'flat',
      value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 5, value: 5 }, { min: 7, value: 10 }] },
      scopes: ['fire'],
    },
    sourcePage: 148,
  },
  {
    id: 'prestige-chevalier-dragon-r6',
    name: 'Épée de feu',
    pathId: 'prestige-chevalier-dragon',
    rank: 6,
    isSpell: false,
    actionTypes: ['M'],
    text:
      "Le cavalier peut enflammer son épée pour [5 + CHA] rounds. Elle inflige dès lors +1d4° DM de feu.",
    sourcePage: 148,
  },
  {
    id: 'prestige-chevalier-dragon-r7',
    name: 'Monture puissante',
    pathId: 'prestige-chevalier-dragon',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le drake atteint sa pleine maturité et augmente ses capacités offensives.\n\nDRAKE\nAGI +0 | CON +6* | FOR +6 | PER +1 | INT -2 | CHA +0 | VOL +2\nDéfense 22 · Points de vigueur [10 + niveau × 6] · Initiative [Init. du personnage]\nAttaque [attaque magique] · DM 2d4°+6",
    sourcePage: 148,
  },
  {
    id: 'prestige-chevalier-dragon-r8',
    name: 'Souffle enflammé',
    pathId: 'prestige-chevalier-dragon',
    rank: 8,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "Le drake est désormais capable de cracher du feu au prix d'une action d'attaque une fois par combat. Toutes les cibles situées dans un cône de 10 m de long sur 10 m de large, subissent 8d4° DM de feu, ou la moitié seulement si elles réussissent un test d'AGI difficulté 12.",
    sourcePage: 148,
  },

  // ----- Voie du combattant des tunnels (p. 148) -----
  {
    id: 'prestige-combattant-des-tunnels-r4',
    name: 'Infravision',
    pathId: 'prestige-combattant-des-tunnels',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le combattant devient capable de voir dans le noir à une distance de 10 m (ou il augmente la portée de celle-ci de 10 m). De plus, il obtient +5 à tous les tests de survie et d'orientation en milieu souterrain.",
    sourcePage: 148,
  },
  {
    id: 'prestige-combattant-des-tunnels-r5',
    name: 'Combat confiné',
    pathId: 'prestige-combattant-des-tunnels',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque l'espace est réduit, le combattant des tunnels ne subit plus de dé malus en attaque avec une arme plus longue qu'une dague. Il peut utiliser une arme à deux mains avec un dé malus. De plus, puisqu'il peut rarement esquiver, le combattant améliore ses techniques de parade, il gagne +1 en DEF et ce bonus passe à +2 au rang 7, tant qu'il tient une arme en main. Ce bonus s'applique même en dehors d'un combat en milieu confiné.",
    sourcePage: 148,
  },
  {
    id: 'prestige-combattant-des-tunnels-r6',
    name: 'Briseur de hordes',
    pathId: 'prestige-combattant-des-tunnels',
    rank: 6,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, le personnage inflige automatiquement 1d4° DM à chaque adversaire à son contact dont le NC est inférieur ou égal à la moitié de son propre niveau (il doit pouvoir agir et avoir une arme en main).",
    sourcePage: 148,
  },
  {
    id: 'prestige-combattant-des-tunnels-r7',
    name: 'Tueur de nuées',
    pathId: 'prestige-combattant-des-tunnels',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le combattant des tunnels inflige +1d4° DM aux créatures de tailles Petite ou inférieures (striges, kobolds, etc.). Ce bonus s'applique aussi aux DM qu'il inflige aux nuées.",
    sourcePage: 148,
  },
  {
    id: 'prestige-combattant-des-tunnels-r8',
    name: 'Briseur de voûte',
    pathId: 'prestige-combattant-des-tunnels',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par combat, dans une cavité de moins de 6 m de hauteur, le combattant des tunnels peut frapper le sol ou un mur pour faire s'écrouler la voûte sur ses adversaires. Tous les adversaires dans une zone de 10 × 10 m face à lui subissent 4d4° DM à cause des rochers qui tombent du plafond. La zone affectée devient un terrain difficile et les créatures réduites à 0 PV sont ensevelies sous l'éboulis.",
    sourcePage: 148,
  },

  // ----- Voie du combat du mal (p. 148) -----
  {
    id: 'prestige-combat-du-mal-r4',
    name: 'Juste courroux',
    pathId: 'prestige-combat-du-mal',
    rank: 4,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Chaque fois que le personnage est victime d'une Attaque sournoise (voie de l'assassin, profil de voleur) ou d'une Attaque mortelle (capacité de créature), il peut riposter par une attaque au contact en action gratuite.",
    sourcePage: 149,
  },
  {
    id: 'prestige-combat-du-mal-r5',
    name: 'Épée de lumière',
    pathId: 'prestige-combat-du-mal',
    rank: 5,
    isSpell: false,
    actionTypes: ['M'],
    text:
      "L'arme du personnage brille d'une lumière magique équivalente à une torche pour le reste du combat. Elle occasionne +1d4° DM supplémentaire aux morts-vivants, aux créatures démoniaques ou aux animaux corrompus par le mal. Alternativement, si cette voie est choisie par un barbare qui déteste la magie, la lame ne brille pas et les DM supplémentaires sont juste le fruit de sa hargne.",
    sourcePage: 149,
  },
  {
    id: 'prestige-combat-du-mal-r6',
    name: 'Sentir la corruption',
    pathId: 'prestige-combat-du-mal',
    rank: 6,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage se concentre et détecte si une source maléfique est présente dans un rayon de 20 m autour de lui. Il ne peut ni déterminer sa localisation, ni sa nature. Les sources maléfiques possibles sont les démons, les morts-vivants, les animaux corrompus, les artefacts maléfiques, les lieux maudits.",
    sourcePage: 149,
  },
  {
    id: 'prestige-combat-du-mal-r7',
    name: 'Frappe suppressive',
    pathId: 'prestige-combat-du-mal',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "En plus d'infliger des DM normaux, cette attaque oblige la cible à faire un test opposé d'attaque magique contre le personnage. En cas d'échec, elle ne peut utiliser aucun pouvoir magique à son prochain tour.",
    sourcePage: 149,
  },
  {
    id: 'prestige-combat-du-mal-r8',
    name: 'Résister à la corruption',
    pathId: 'prestige-combat-du-mal',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par combat, le personnage résiste totalement à un sort ou un effet magique de son choix. De plus, il est immunisé aux effets de corruption : drain, affaiblissement, pourriture, empoisonnement ou maladie provoqués par les morts-vivants, les démons ou les animaux maléfiques ou corrompus.",
    sourcePage: 149,
  },

  // ----- Voie du colosse (p. 149) -----
  {
    id: 'prestige-colosse-r4',
    name: 'Stature de géant',
    pathId: 'prestige-colosse',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le colosse est considéré comme faisant une taille de plus que sa taille réelle (grande au lieu de moyenne, par exemple) pour déterminer s'il peut être affecté par les capacités spéciales des créatures et des adversaires (fauchage, agripper, etc.). De plus il inflige 1d6 DM à mains nues.",
    sourcePage: 149,
  },
  {
    id: 'prestige-colosse-r5',
    name: 'Résistance colossale',
    pathId: 'prestige-colosse',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le colosse gagne immédiatement 5 PV supplémentaires, auxquels il ajoute sa CON.",
    sourcePage: 149,
  },
  {
    id: 'prestige-colosse-r6',
    name: 'Force du titan',
    pathId: 'prestige-colosse',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text: "Le colosse augmente sa valeur de FOR de +1.",
    sourcePage: 149,
  },
  {
    id: 'prestige-colosse-r7',
    name: 'Poigne de fer',
    pathId: 'prestige-colosse',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le colosse peut utiliser une arme à deux mains à une seule main (épée ou hache à deux mains). À deux mains, il peut utiliser une arme prévue pour une créature de taille grande qui inflige 2d8 DM au lieu de 2d6.",
    sourcePage: 149,
  },
  {
    id: 'prestige-colosse-r8',
    name: 'Attaque monumentale',
    pathId: 'prestige-colosse',
    rank: 8,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, le colosse rassemble toute sa puissance pour porter une attaque absolument dévastatrice en dépensant toute la rage accumulée jusque-là. L'attaque obtient un bonus de +5 pour toucher et un bonus aux DM de +1d4°/round de combat contre cette créature. Si la cible a un NC inférieur au niveau du colosse, elle est immédiatement affaiblie pour 1 round pour chaque round de combat. Pour le bonus au dégât comme pour l'état affaibli, on comptabilise tous les rounds précédents durant lesquels le personnage a attaqué la créature au moins une fois (maximum 5 rounds).",
    sourcePage: 150,
  },

  // ----- Voie du danseur de guerre (p. 149) -----
  {
    id: 'prestige-danseur-de-guerre-r4',
    name: 'Vent des lames',
    pathId: 'prestige-danseur-de-guerre',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut utiliser son AGI au choix en attaque au contact ou aux DM (mais pas les deux, sauf capacité l'y autorisant) au lieu de sa FOR lorsqu'il utilise une dague, une épée (courte, longue, sabre ou vivelame) ou une lance. Dans le cas d'une arme à une main, il ne peut bénéficier de ce bonus que sur sa main principale.",
    sourcePage: 150,
  },
  {
    id: 'prestige-danseur-de-guerre-r5',
    name: 'Pirouettes',
    pathId: 'prestige-danseur-de-guerre',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Les pas de danse rendent le personnage insaisissable. Il gagne +1 en DEF et ce bonus passe à +2 au rang 8. De plus, le personnage gagne un bonus de +5 aux tests de danse et d'acrobaties.",
    sourcePage: 150,
  },
  {
    id: 'prestige-danseur-de-guerre-r6',
    name: 'Attaque en mouvement',
    pathId: 'prestige-danseur-de-guerre',
    rank: 6,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "À chaque fois qu'il réalise une action limitée pour porter une attaque au contact, le personnage peut en plus se déplacer de 10 m avant ou après.",
    sourcePage: 150,
  },
  {
    id: 'prestige-danseur-de-guerre-r7',
    name: 'Danse des lames',
    pathId: 'prestige-danseur-de-guerre',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage réalise un pas de danse et entre en transe pour le reste du combat. Pendant la Danse des lames, il peut réaliser une attaque gratuite supplémentaire à son tour chaque round bien qu'elle subisse un dé malus. Le personnage peut mettre fin à la transe au moment où il le veut, mais il ne peut recommencer avant le prochain combat. Toutefois, s'il reçoit les DM d'une attaque critique, la transe est stoppée net.",
    sourcePage: 150,
  },
  {
    id: 'prestige-danseur-de-guerre-r8',
    name: 'Volte-face',
    pathId: 'prestige-danseur-de-guerre',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Pour chaque round où le PJ attaque une cible différente de celle du round précédent, il obtient un dé bonus en attaque et un bonus de +1d4° aux DM sur sa première attaque.",
    sourcePage: 150,
  },

  // ----- Voie de l'écorcheur (p. 150) -----
  {
    id: 'prestige-ecorcheur-r4',
    name: 'Armes dentelées',
    pathId: 'prestige-ecorcheur',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Les armes et les lames du personnage sont dentelées, elles possèdent des formes torturées destinées à provoquer des blessures sanglantes. Le personnage obtient un bonus de +5 à tous ses tests d'intimidation. De plus, lors d'une attaque réussie, il provoque un effet de saignement qui inflige 1 DM par round à la victime pour le reste du combat. Pour stopper cette hémorragie, la victime doit recevoir des soins ou prendre une action limitée et réussir un test d'AGI difficulté 10. Cet effet de saignement passe à 2 DM au rang 8 de la voie. Il ne se cumule pas.",
    sourcePage: 150,
  },
  {
    id: 'prestige-ecorcheur-r5',
    name: 'Armure à pointes',
    pathId: 'prestige-ecorcheur',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "L'armure et le bouclier du guerrier sont décorés de piques et de lames afin de blesser les créatures qui l'attaquent. À chaque fois qu'une créature attaque au contact le personnage avec des armes naturelles (mains nues, griffes crocs) et qu'elle touche au moins une Défense de 10, elle subit 1d4 DM. Ces DM passent à 1d4° au rang 7.",
    sourcePage: 150,
  },
  {
    id: 'prestige-ecorcheur-r6',
    name: 'Blessures affreuses',
    pathId: 'prestige-ecorcheur',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Les blessures infligées par les attaques au contact du personnage sont très longues à guérir. Les effets de soins ou de régénération sont divisés par 2 lorsqu'il s'agit de guérir ces DM.",
    sourcePage: 151,
  },
  {
    id: 'prestige-ecorcheur-r7',
    name: 'Hémorragie interne',
    pathId: 'prestige-ecorcheur',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque le personnage inflige un critique, la victime subit 1d4° DM supplémentaires à chaque round suivant pendant 3 rounds.",
    sourcePage: 151,
  },
  {
    id: 'prestige-ecorcheur-r8',
    name: 'Impitoyable',
    pathId: 'prestige-ecorcheur',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque l'écorcheur rate une attaque, il inflige tout de même 1d4° DM à sa cible (de même nature que les DM habituels de son attaque).",
    sourcePage: 151,
  },

  // ----- Voie du guerrier-mage (p. 150) -----
  {
    id: 'prestige-guerrier-mage-r4',
    name: 'Magie en armure',
    pathId: 'prestige-guerrier-mage',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut lancer des sorts de magie profane en armure. Le bonus de DEF total des protections portées doit être inférieur ou égal au rang - 2. Par exemple, au rang 4, le personnage peut lancer des sorts en armure de cuir, et au rang 8, il peut porter une armure de plaque. Lorsqu'il respecte cette limitation, il est dispensé du surcoût de mana pour lancer un sort en armure (voir Profils hybrides, page 176). Les bonus magiques des armures ne comptent pas dans le calcul de cette limitation. Cette capacité ne permet pas d'apprendre à utiliser des armures.",
    sourcePage: 151,
  },
  {
    id: 'prestige-guerrier-mage-r5',
    name: 'Rituel de combat',
    pathId: 'prestige-guerrier-mage',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Parmi les sorts infligeant des DM que connaît le personnage, il en choisit un qui lui coûte désormais 1 PM de moins à lancer.",
    sourcePage: 151,
  },
  {
    id: 'prestige-guerrier-mage-r6',
    name: 'Déflexion arcanique',
    pathId: 'prestige-guerrier-mage',
    rank: 6,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Le combattant dépense 1 PM pour obtenir +2 en DEF contre une attaque. Il peut annoncer cette action après avoir pris connaissance du résultat de l'attaque, de façon à la faire échouer. Il ne peut pas dépenser plus d'un PM par attaque, mais peut utiliser cette capacité plusieurs fois dans le round. À partir du rang 9, il peut dépenser 3 PM pour obtenir +5 en DEF.",
    sourcePage: 151,
  },
  {
    id: 'prestige-guerrier-mage-r7',
    name: 'Magie de combat',
    pathId: 'prestige-guerrier-mage',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsqu'il utilise la Concentration (L) pour lancer un sort de rang 1 à 3, le combattant peut choisir de faire une attaque au contact gratuite au lieu de réduire son coût.",
    sourcePage: 151,
  },
  {
    id: 'prestige-guerrier-mage-r8',
    name: 'Frappe des arcanes',
    pathId: 'prestige-guerrier-mage',
    rank: 8,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Le personnage insuffle sa puissance magique dans une attaque au contact : il dépense 1 PM pour obtenir un dé bonus et +1d4° aux DM sur cette attaque.",
    sourcePage: 151,
  },

  // ----- Voie de l'ours (p. 151) -----
  {
    id: 'prestige-ours-r4',
    name: "Caractère d'ours",
    pathId: 'prestige-ours',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage gagne un bonus de +5 à tous les tests d'intimidation. Une fois par combat, il peut pousser un terrible grondement en action gratuite. Tous les adversaires à son contact de NC inférieur à son niveau doivent réussir un test de VOL difficulté [6 + rang] ou s'enfuir en courant pendant 1d4 rounds.",
    sourcePage: 151,
  },
  {
    id: 'prestige-ours-r5',
    name: 'Hibernation',
    pathId: 'prestige-ours',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut dormir sans interruption jusqu'à 2 jours par rang. Durant cette période, il n'a besoin ni d'eau ni de nourriture et ne souffre pas plus du froid que de la chaleur ; il récupère normalement de ses blessures. Après avoir dormi plusieurs jours de suite, le personnage est capable de rester le même nombre de jours sans dormir.",
    sourcePage: 152,
  },
  {
    id: 'prestige-ours-r6',
    name: 'Métamorphose',
    pathId: 'prestige-ours',
    rank: 6,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le personnage peut prendre la forme d'un ours pendant [1d6+CON] minutes. Le personnage ne doit pas porter d'armure plus lourde que le cuir renforcé pour utiliser cette capacité.\n\nOURS BRUN — TAILLE GRANDE\nAGI +1 | CON +6* | FOR +6 | PER +2 | CHA -2 | INT [INT du personnage] | VOL [VOL du personnage + 2]\nDéfense [12 + rang] · Points de vigueur [rang × 5] · Initiative 11\nAttaque Morsure et griffes attaque magique du personnage · DM 2d4+6\nLe personnage conserve sa propre INT, mais il a tendance à réagir comme l'animal qu'il est devenu et ne peut plus utiliser ses capacités de profil. Si le personnage est réduit à 0 PV sous cette forme, il reprend forme humaine au début de son prochain tour par une action de mouvement et retrouve les PV qu'il avait avant la transformation.",
    sourcePage: 152,
  },
  {
    id: 'prestige-ours-r7',
    name: "Étreinte de l'ours",
    pathId: 'prestige-ours',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, le personnage peut se saisir d'un adversaire dont la FOR est inférieure à la sienne et l'écraser entre ses bras puissants. Sur un test d'attaque au contact réussi, le personnage inflige [2d4°+FOR] DM à sa cible et elle est immobilisée entre ses bras. À son tour, la victime peut tenter de se libérer avec un test de FOR en opposition ; en cas d'échec, elle ne peut faire aucune action. À chacun des tours suivants, tant que l'étreinte est maintenue, le personnage inflige à nouveau des DM sans avoir à réaliser son test d'attaque. Cette capacité peut être utilisée sous forme d'ours.",
    sourcePage: 152,
  },
  {
    id: 'prestige-ours-r8',
    name: 'Métamorphose supérieure',
    pathId: 'prestige-ours',
    rank: 8,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Les plus puissants guerriers-ours peuvent prendre la forme d'un ours une fois par combat (nécessite de terminer une récupération rapide). Ces métamorphoses durent chaque fois jusqu'à [1d6+CON] heures.",
    sourcePage: 152,
  },

  // ----- Voie du porteur de bouclier (p. 152) -----
  {
    id: 'prestige-porteur-de-bouclier-r4',
    name: 'Parade au bouclier',
    pathId: 'prestige-porteur-de-bouclier',
    rank: 4,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par combat, le personnage peut parer une attaque au contact ou à distance qui le touche avec son bouclier (action gratuite). Il ne subit aucun DM sauf s'il s'agit d'un critique (il ne peut pas le parer).",
    sourcePage: 152,
  },
  {
    id: 'prestige-porteur-de-bouclier-r5',
    name: 'Attaque au bouclier',
    pathId: 'prestige-porteur-de-bouclier',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, le personnage peut faire une attaque gratuite au bouclier. Il subit un dé malus en attaque et il inflige [1d4°+FOR] DM.",
    sourcePage: 152,
  },
  {
    id: 'prestige-porteur-de-bouclier-r6',
    name: 'Bousculade',
    pathId: 'prestige-porteur-de-bouclier',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque le personnage réussit son attaque au bouclier, il peut choisir de faire reculer sa cible de 2 m. Si la cible est d'une taille supérieure à la sienne, il doit emporter un test opposé de FOR. De plus, le personnage augmente de +1 la DEF apportée par son bouclier. Ce bonus passe à +2 au rang 8 de la voie.",
    sourcePage: 152,
  },
  {
    id: 'prestige-porteur-de-bouclier-r7',
    name: 'Dévier les coups',
    pathId: 'prestige-porteur-de-bouclier',
    rank: 7,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, en action gratuite, le personnage retranche la valeur de DEF de son bouclier (bonus de magie inclus) aux DM subis d'une attaque au contact ou à distance, sauf s'il est surpris.",
    // PER-137/PER-236 : RD = valeur de DEF du BOUCLIER porté, sur UNE attaque, 1×/round → ACTÉE NON
    // MODÉLISÉE (décision proprio 2026-07-23), manœuvre au tour par tour hors du modèle de RD continue,
    // jouée à la table. Verbatim.
    sourcePage: 152,
  },
  {
    id: 'prestige-porteur-de-bouclier-r8',
    name: 'Lancer de bouclier',
    pathId: 'prestige-porteur-de-bouclier',
    rank: 8,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "Le personnage peut lancer son bouclier à une portée de 20 m par une action d'attaque s'il réussit un test d'attaque à distance, il inflige les DM d'une Attaque au bouclier et la cible doit faire un test de FOR difficulté [10 + FOR du personnage] ou être renversée. Tant que le bouclier est à moins de 20 m du personnage, il peut le faire revenir à son bras (et l'équiper) par une action de mouvement (M).",
    sourcePage: 153,
  },

  // ----- Voie du tueur de géants (p. 152) -----
  {
    id: 'prestige-tueur-de-geants-r4',
    name: 'Profil bas',
    pathId: 'prestige-tueur-de-geants',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Que ce soit pour approcher ou pour éviter les grandes créatures, le tueur de géants sait se faire tout petit. Il obtient un bonus de +5 à tous les tests de discrétion destinés à échapper à la perception des créatures de taille grande et supérieure.",
    sourcePage: 153,
  },
  {
    id: 'prestige-tueur-de-geants-r5',
    name: 'Ventre mou',
    pathId: 'prestige-tueur-de-geants',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage sait se placer de façon à atteindre les parties molles ou vitales en passant sous les grandes créatures. Il ignore la RD des créatures lorsqu'elle est basée sur leur taille.",
    sourcePage: 153,
  },
  {
    id: 'prestige-tueur-de-geants-r6',
    name: 'Réduire la distance',
    pathId: 'prestige-tueur-de-geants',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage est passé maître dans l'art de réduire la distance pour gêner les créatures avec une grande allonge. Il obtient +1 en DEF contre les créatures de taille grande, +2 contre les créatures énormes et +3 contre les créatures colossales.",
    sourcePage: 153,
  },
  {
    id: 'prestige-tueur-de-geants-r7',
    name: "Pieds d'argile",
    pathId: 'prestige-tueur-de-geants',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le tueur de géants réalise une attaque aux jambes contre une créature de taille grande ou supérieure. En cas de réussite, il inflige ½ DM, mais la créature est ralentie au prochain round et invalide pour tout le reste du combat. En cas de réussite avec une marge d'au moins 10 points, la cible est de plus renversée ! Une cible ne peut subir ces effets plus d'une fois par combat (ralenti et invalide).",
    sourcePage: 153,
  },
  {
    id: 'prestige-tueur-de-geants-r8',
    name: 'Tueur de géants',
    pathId: 'prestige-tueur-de-geants',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage est habitué à combattre les géants et les énormes créatures. Il obtient +1d6 DM contre les créatures de taille grande, +1d4° DM contre les créatures de taille énorme et +2d4° DM contre celles de taille colossale. Si votre PJ n'est pas un nain, c'est sans doute parce qu'il est capable de sauter sur sa victime pour atteindre des points vitaux. S'il s'agit d'un nain, c'est plutôt parce que sa victime a posé genoux à terre !",
    sourcePage: 153,
  },

  // ----- Voie de l'archimage (p. 154) -----
  {
    id: 'prestige-archimage-r4',
    name: 'Sceptre défensif',
    pathId: 'prestige-archimage',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le bâton du mage est un outil de défense complet, il lui sert aussi bien à parer efficacement en mêlée qu'à se protéger des sorts adverses. Lorsqu'il tient son bâton en main, le personnage gagne un bonus de +1 en DEF et à tous les tests opposés de magie effectués pour résister à des sorts. Ce bonus passe à +2 au rang 6 et +3 au rang 8.",
    sourcePage: 154,
  },
  {
    id: 'prestige-archimage-r5',
    name: 'Bâton magique',
    pathId: 'prestige-archimage',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage choisit un sort de rang 1 de la famille des mages. Il est lié à son bâton et il peut l'utiliser au prix d'une action de mouvement sans dépense de mana. À partir du rang 7, il peut ajouter un sort de rang 2 qui ne coûte pas non plus de point de mana.",
    sourcePage: 154,
  },
  {
    id: 'prestige-archimage-r6',
    name: 'Paralysie',
    pathId: 'prestige-archimage',
    rank: 6,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le lanceur de sort paralyse autant de créatures qu'il le peut (cf. ci-après) dans un rayon de 10 m autour de lui pendant [1d4° + INT] rounds. Il doit maintenir sa concentration par une action de mouvement pendant toute la durée du sort. Il peut affecter autant de créatures qu'il souhaite tant que la somme de leurs NC ne dépasse pas son niveau. Les créatures de NC 4 ou plus peuvent se libérer du sort en réussissant un test de CON difficulté 15, une tentative par round (G).",
    sourcePage: 154,
  },
  {
    id: 'prestige-archimage-r7',
    name: 'Barrière magique',
    pathId: 'prestige-archimage',
    rank: 7,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le lanceur de sort trace une ligne imaginaire de son bâton, qui constitue une frontière invisible que nul ne saurait franchir sans son autorisation. Toute créature qui tente de passer ressent une forte contrainte à rebrousser chemin ; si elle tente de forcer le passage, elle doit réaliser un test opposé d'attaque magique contre le personnage. En cas d'échec, elle subit [5d4° + INT] DM et ne peut faire de nouvelle tentative avant une heure. En cas de succès, elle parvient à franchir la limite et ne subit que la moitié des DM. La frontière mesure un maximum de 20 m de long (sans limite de hauteur) et sa durée est de 24 h.",
    sourcePage: 154,
  },
  {
    id: 'prestige-archimage-r8',
    name: "Métamorphose d'autrui",
    pathId: 'prestige-archimage',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le lanceur de sort doit réussir un test opposé d'attaque magique contre une cible à une portée de 20 m. Il la transforme en un animal de taille petite ou inférieure de son choix (grenouille et mouton sont les favoris des magiciens). La créature possède 1 PV (grenouille) ou 2 PV (mouton), et si elle est réduite à 0 PV, elle retrouve sa forme initiale et doit faire un test de CON difficulté 10. En cas d'échec, elle meurt. La durée du sort dépend du NC de la cible :\n- NC 0 à 1 : permanent\n- NC 2 : 24 h\n- NC 3 : 1d6 h\n- NC 4 : 1d6 minutes\n- NC 5+ : 1d6 rounds\n- NC égal ou supérieur au mage : 1 round\nUne créature ne peut pas être la cible de ce sort (réussi ou raté) plus d'une fois par combat.",
    sourcePage: 155,
  },

  // ----- Voie du chaos (p. 155) -----
  {
    id: 'prestige-chaos-r4',
    name: 'Arc-en-ciel',
    pathId: 'prestige-chaos',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Un rayon de lumière arc-en-ciel jaillit de la main du personnage et sur un test opposé d'attaque magique réussi, il percute une cible à une portée de 10 m. Les effets du sort dépendent du niveau de la cible (ou NC pour une créature).\n- NC 1 ou moins : inconscient 1d6 rounds.\n- NC 2 ou 3 : aveuglé 1d6 rounds.\n- NC 4 et plus : affaibli 1d6 rounds.\nAucune créature d'un niveau supérieur ou égal au magicien ne peut être affectée par le sort.",
    sourcePage: 155,
  },
  {
    id: 'prestige-chaos-r5',
    name: 'Mur arc-en-ciel',
    pathId: 'prestige-chaos',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sort crée un mur opaque de couleurs chatoyantes et changeantes. Le personnage invoque au choix un mur rectiligne qui mesure jusqu'à 5 m de haut et 3 m de long par rang ou un mur circulaire d'un diamètre maximal égal au rang, dans les deux cas pour une durée d'INT minutes. Si une créature d'un NC inférieur au niveau du personnage tente de traverser le mur, elle est violemment repoussée de 2d4° mètres en arrière et elle subit autant de DM. Une créature de niveau supérieur ou égal doit réussir un test d'INT difficulté [10 + INT du personnage] pour le franchir ou subir le même effet que les autres en cas d'échec. Le magicien peut passer à travers le mur comme s'il n'existait pas. Le mur stoppe toutes les attaques magiques et les projectiles lancés à travers disparaissent simplement (une arme magique réapparaît à la fin du sort à l'endroit où elle a disparu).",
    sourcePage: 155,
  },
  {
    id: 'prestige-chaos-r6',
    name: 'Pont arc-en-ciel',
    pathId: 'prestige-chaos',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage crée un pont arc-en-ciel pendant INT heures entre deux points situés en vue (la distance peut mesurer plusieurs kilomètres). Les alliés du magicien peuvent l'emprunter comme un pont normal, mais la distance séparant les deux arches est parcourue instantanément. Les autres créatures doivent faire un test d'INT difficulté [10 + INT du mage]. En cas d'échec, déterminez l'effet aléatoirement en lançant 1d6.\n1-2 : La créature est projetée en l'air et subit 3d4° DM de chute.\n3-4 : la créature est projetée dans le temps et réapparaît 1d4° min plus tard.\n5-6 : la créature est projetée dans l'espace et elle réapparaît à 1d4° km dans une direction aléatoire.",
    sourcePage: 155,
  },
  {
    id: 'prestige-chaos-r7',
    name: 'Explosion multicolore',
    pathId: 'prestige-chaos',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L'explosion produit les mêmes effets que l'arc-en-ciel dans une zone de 10 m de diamètre à une portée de 30 m.",
    sourcePage: 155,
  },
  {
    id: 'prestige-chaos-r8',
    name: 'Sphère multicolore',
    pathId: 'prestige-chaos',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien invoque une sphère immobile de lumières chatoyantes de 5 m de diamètre autour de lui, pour une durée d'INT heures. Aucun sort ne peut traverser la sphère (dans un sens comme dans l'autre) et les créatures subissent un effet qui dépend de leur NC.\n- NC inférieur à la moitié du niveau du personnage : téléportation à une distance de 2d4° × 100 km dans une direction aléatoire.\n- NC inférieur au niveau du personnage : téléportation à une distance de 2d4° km.\n- NC supérieur ou égal au niveau du personnage : comme le précédent, mais la créature peut résister et réussir à entrer dans la sphère en réussissant un test d'INT difficulté [10 + INT du personnage].\nLe lieu où la créature est téléportée doit être sans danger direct (ni dans un endroit solide ni dans les flammes, etc.). Le magicien peut entrer et sortir à volonté de la sphère ainsi que toute personne qu'il autorise à passer.",
    sourcePage: 156,
  },

  // ----- Voie des cristaux (p. 156) -----
  {
    id: 'prestige-cristaux-r4',
    name: 'Premier cristal',
    pathId: 'prestige-cristaux',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend à créer le cristal de son choix. Il peut le porter où le confier à la personne de son choix. Il ne peut activer qu'un seul cristal à la fois.",
    sourcePage: 156,
  },
  {
    id: 'prestige-cristaux-r5',
    name: 'Second cristal',
    pathId: 'prestige-cristaux',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend à créer un cristal de son choix. Il peut activer les effets de 2 cristaux simultanément, mais pas plusieurs fois le même sur une personne.",
    sourcePage: 156,
  },
  {
    id: 'prestige-cristaux-r6',
    name: 'Troisième cristal',
    pathId: 'prestige-cristaux',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend à créer deux nouveaux cristaux de son choix. Il peut activer les effets de 3 cristaux simultanément, mais pas plusieurs fois le même sur une personne.",
    sourcePage: 156,
  },
  {
    id: 'prestige-cristaux-r7',
    name: 'Quatrième cristal',
    pathId: 'prestige-cristaux',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend à créer deux nouveaux cristaux de son choix. Il peut activer les effets de 4 cristaux simultanément, mais pas plusieurs fois le même sur une personne.",
    sourcePage: 156,
  },
  {
    id: 'prestige-cristaux-r8',
    name: 'Cinquième cristal',
    pathId: 'prestige-cristaux',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend à créer trois nouveaux cristaux de son choix. Il peut activer les effets de 5 cristaux simultanément, mais pas plusieurs fois le même sur une personne.",
    sourcePage: 156,
  },

  // ----- Voie de l'élémentaliste (p. 157) -----
  {
    id: 'prestige-elementaliste-r4',
    name: 'Élément de prédilection',
    pathId: 'prestige-elementaliste',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage choisit un élément parmi feu, froid, électricité et acide. Lorsqu'il utilise un sort de cet élément, il obtient un bonus de +2 en attaque magique et il augmente de +2 la difficulté de tous les tests destinés à résister au sort.",
    sourcePage: 157,
  },
  {
    id: 'prestige-elementaliste-r5',
    name: 'Résistance élémentaire',
    pathId: 'prestige-elementaliste',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage ne subit que la moitié des DM provenant de son élément de prédilection. Il peut transformer un sort élémentaire pour le remplacer par son élément de prédilection en action gratuite.",
    sourcePage: 157,
  },
  {
    id: 'prestige-elementaliste-r6',
    name: "Invocation d'élémentaire",
    pathId: 'prestige-elementaliste',
    rank: 6,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par combat, le magicien invoque un élémentaire de l'élément de son choix, il lui obéit pendant INT minutes puis disparaît. Il agit au tour du magicien.\n\nÉLÉMENTAIRE — CRÉATURE NON VIVANTE DE TAILLE GRANDE\nAGI +2 | CON +6* | FOR +6* | PER +0 | CHA -2 | INT -2 | VOL +4\nDéfense 19 · Points de vigueur [niv. du magicien × 5] · Initiative 10\nCoup [attaque magique du magicien] · DM 2d4°+6\nFeu : +1d4° DM, immunisé au feu. Eau : dé bonus en attaque, immunisé à l'acide. Air : vol 30 m, immunisé à la foudre. Terre : +5 DEF, immunisé au froid.",
    sourcePage: 157,
  },
  {
    id: 'prestige-elementaliste-r7',
    name: 'Élément puissant',
    pathId: 'prestige-elementaliste',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage ajoute +1d4° aux DM de tous les sorts qui infligent des dommages de son élément de prédilection. Les sorts qui infligent des DM sur la durée augmentent seulement leurs DM initiaux (flèche enflammée, etc.).",
    sourcePage: 157,
  },
  {
    id: 'prestige-elementaliste-r8',
    name: 'Métamorphose élémentaire',
    pathId: 'prestige-elementaliste',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut prendre une seule forme élémentaire de son choix pendant [5 + INT] minutes. La forme élémentaire lui permet de retrancher 5 points à tous les DM subis (RD 5), elle l'immunise aux DM de la forme choisie et lui octroie les capacités suivantes :\n- Feu : le personnage ajoute +2d4° DM de feu à toutes ses attaques au contact. Une créature qui s'attaque à lui avec des armes naturelles subit 1d4° DM pour chaque attaque réussie.\n- Eau : le personnage guérit toutes ses blessures au rythme de 1d4° PV par round et il peut déformer son corps pour passer dans le moindre interstice.\n- Terre : le personnage obtient un bonus de +3 en FOR (+3 attaque et DM au contact et +3 tests de FOR) et en DEF.\n- Air : le personnage peut voler (à une vitesse de 20 m par action de mouvement), il divise par deux les DM de ses attaques physiques mais pas ceux des sorts) et sa RD passe à 10.",
    // PER-137 : RD −5 sur TOUS les DM, CONDITIONNELLE à la forme élémentaire (durée du sort). Marqueur
    // d'état pour l'affichage. Cas non modélisés (verbatim) : l'immunité aux DM de l'élément choisi
    // (cadre « Immunités », phase 2) et la variante Air (RD portée à 10), choix-dépendants.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Forme élémentaire active', activeByDefault: false },
      },
    ],
    damageReduction: { kind: 'flat', value: 5 },
    sourcePage: 157,
  },

  // ----- Voie de l'enchanteur (p. 157) -----
  // La même capacité « Enchantement » à chaque rang ; seul le niveau de magie
  // maximal des objets enchantables augmente (niveau = rang atteint – 3).
  {
    id: 'prestige-enchanteur-r4',
    name: 'Enchantement',
    pathId: 'prestige-enchanteur',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut enchanter des objets magiques dont le niveau de magie maximal est égal à 1 (voir le chapitre « Objets magiques », page 242). Si vous jouez avec le module high fantasy (voir Atlas d'Osgild & règles optionnelles), vous pouvez si vous le souhaitez doubler ce niveau.",
    sourcePage: 157,
  },
  {
    id: 'prestige-enchanteur-r5',
    name: 'Enchantement',
    pathId: 'prestige-enchanteur',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut enchanter des objets magiques dont le niveau de magie maximal est égal à 2 (voir le chapitre « Objets magiques », page 242). Si vous jouez avec le module high fantasy (voir Atlas d'Osgild & règles optionnelles), vous pouvez si vous le souhaitez doubler ce niveau.",
    sourcePage: 157,
  },
  {
    id: 'prestige-enchanteur-r6',
    name: 'Enchantement',
    pathId: 'prestige-enchanteur',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut enchanter des objets magiques dont le niveau de magie maximal est égal à 3 (voir le chapitre « Objets magiques », page 242). Si vous jouez avec le module high fantasy (voir Atlas d'Osgild & règles optionnelles), vous pouvez si vous le souhaitez doubler ce niveau.",
    sourcePage: 157,
  },
  {
    id: 'prestige-enchanteur-r7',
    name: 'Enchantement',
    pathId: 'prestige-enchanteur',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut enchanter des objets magiques dont le niveau de magie maximal est égal à 4 (voir le chapitre « Objets magiques », page 242). Si vous jouez avec le module high fantasy (voir Atlas d'Osgild & règles optionnelles), vous pouvez si vous le souhaitez doubler ce niveau.",
    sourcePage: 157,
  },
  {
    id: 'prestige-enchanteur-r8',
    name: 'Enchantement',
    pathId: 'prestige-enchanteur',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut enchanter des objets magiques dont le niveau de magie maximal est égal à 5 (voir le chapitre « Objets magiques », page 242). Si vous jouez avec le module high fantasy (voir Atlas d'Osgild & règles optionnelles), vous pouvez si vous le souhaitez doubler ce niveau.",
    sourcePage: 157,
  },

  // ----- Voie du gel (p. 157) -----
  {
    id: 'prestige-gel-r4',
    name: 'Verglas',
    pathId: 'prestige-gel',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Un verglas glissant recouvre le sol sur une surface de 10 m de diamètre pendant INT minutes (vous pouvez stopper le sort plus tôt). Dans cette zone, pour rester debout il faut réussir un test d'AGI de difficulté 10 à son tour, s'y déplacer ou combattre demande un test de difficulté 15. Un échec signifie que la créature est renversée se relever nécessite de réussir un nouveau test d'AGI difficulté 15 et prend un round. Ramper en dehors de la zone demande un round complet.",
    sourcePage: 158,
  },
  {
    id: 'prestige-gel-r5',
    name: 'Cœur de glace',
    pathId: 'prestige-gel',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Vous divisez par deux tous les DM de froid que vous subissez et vous êtes désormais immunisé à la peur.",
    sourcePage: 158,
  },
  {
    id: 'prestige-gel-r6',
    name: 'Souffle glacial',
    pathId: 'prestige-gel',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le mage ouvre la bouche et souffle un blizzard glacial et des éclats de glace tranchants. Le sort affecte toutes les créatures dans un cône approximatif de 20 m de long sur 20 m de large à son extrémité. Les victimes subissent [4d4° + INT] DM et sont ralenties pour 1 round si elles ratent un test de CON difficulté [10 + INT]. Sinon, elles subissent seulement la moitié des DM et ne sont pas ralenties.",
    sourcePage: 158,
  },
  {
    id: 'prestige-gel-r7',
    name: 'Présence glaciale',
    pathId: 'prestige-gel',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L'ensorceleur transforme son corps en glace vivante, il gagne +4 en DEF, est immunisé au froid et divise les DM de feu par deux. Les créatures qui le touchent ou l'attaquent avec des armes naturelles subissent 1d4° DM. Lorsqu'il marche, il gèle le sol et peut se déplacer sur l'eau en la transformant en glace. Le sort a une durée de [1d6 + INT] minutes.",
    sourcePage: 158,
  },
  {
    id: 'prestige-gel-r8',
    name: 'Cryogénisation',
    pathId: 'prestige-gel',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le mage projette un rayon de froid absolu sur sa cible. S'il réussit un test opposé d'attaque magique ou si la cible est volontaire, elle est congelée dans une gangue de glace de la forme d'un énorme cristal. La gangue peut être détruite en lui infligeant 50 DM ; sinon, elle se brise d'elle-même après une durée qui dépend du NC de la créature.\n- NC 1 ou moins : valeur d'INT en siècles\n- NC 2 : valeur d'INT en années\n- NC 3 : valeur d'INT en jours\n- NC 4 : valeur d'INT en heures\n- NC 5 : valeur d'INT en minutes\n- NC 6 et + : valeur d'INT en rounds\nSi la cible est volontaire, la durée du sort est la même que si elle était de NC 1.",
    sourcePage: 158,
  },

  // ----- Voie de l'invocation majeure (p. 158) -----
  {
    id: 'prestige-invocation-majeure-r4',
    name: 'Monture fantôme',
    pathId: 'prestige-invocation-majeure',
    rank: 4,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le personnage conjure un cheval fantomatique qui peut le transporter (plus éventuellement un autre cavalier) pendant [1d4° + INT] heures. Cette monture est un peu plus rapide qu'un cheval ordinaire (10 km/période) sauf si elle transporte deux cavaliers (5 km/h). Elle n'est pas ralentie par les terrains difficiles ; à partir du rang 6, elle peut courir sur l'eau et à partir du rang 8, elle peut se déplacer dans les airs. Ce type de monture ne peut être guidée que par son invocateur.",
    sourcePage: 158,
  },
  {
    id: 'prestige-invocation-majeure-r5',
    name: "Manoir d'outre-monde",
    pathId: 'prestige-invocation-majeure',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "L'invocateur enchante une porte ordinaire existante (pas une porte artificielle) et, pour une durée allant jusqu'à 1 h/niveau, elle s'ouvre sur un manoir magique au lieu de l'endroit habituel. La porte garde ses caractéristiques originelles (solidité, serrure, etc.), mais ne peut pas être bloquée par magie. Le manoir possède jusqu'à une pièce par niveau, pour une surface totale jusqu'à 50 m2 par niveau de l'invocateur. Il est meublé selon le style choisi par l'invocateur, depuis un taudis lugubre jusqu'à un palais luxueux rempli de victuailles et de vaisselle d'or (aucun objet magique). Les pièces n'ont pas de fenêtre et les objets disparaissent s'ils sortent du manoir. La nourriture qui peut y être trouvée possède des qualités gustatives à la discrétion de l'invocateur. Tous ces aliments désaltèrent ou procurent un effet normal de satiété, mais ils ne nourrissent pas réellement. Si l'invocateur utilise à nouveau ce sort alors qu'un autre manoir était encore actif, le premier disparaît immédiatement. Toutes les créatures à l'intérieur du manoir au moment où il disparaît, sont éjectées devant la porte et subissent 1d6 DM.",
    sourcePage: 159,
  },
  {
    id: 'prestige-invocation-majeure-r6',
    name: 'Navire fantôme',
    pathId: 'prestige-invocation-majeure',
    rank: 6,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Un navire fantôme surgit des profondeurs de la mer et se place sous les ordres du personnage. Il est recouvert d'algues et de coquillages, il n'a pas d'équipage et n'en a nul besoin. Il se déplace au bon vouloir du personnage à une vitesse de 20 km/h. Il peut abriter une vingtaine de personnes, mais peut en transporter jusqu'à cent. Il disparaît au prochain lever de soleil. Le navire fantôme ne peut naviguer à plus d'une journée de la côte la plus proche, les étendues lointaines lui sont interdites… À partir du rang 8, le personnage devient capable d'invoquer une nef fantôme qui navigue dans les airs (considéré comme un sort de rang 8 pour le coût en PM).",
    sourcePage: 159,
  },
  {
    id: 'prestige-invocation-majeure-r7',
    name: 'Chasseur ailé',
    pathId: 'prestige-invocation-majeure',
    rank: 7,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le personnage invoque à son service une créature ailée de grande taille pendant 24 h. À son arrivée, il doit lui donner la mission de trouver et de lui rapporter une personne ou un objet. Le chasseur se met immédiatement en chasse avec un instinct infaillible et la trouve à moins que la cible ne soit dissimulée par magie (sort de non-détection, par exemple). Le chasseur utilise au mieux ses capacités et son intelligence pour réussir sa mission, mais il ne combat pas, sauf pour se défendre. Il parcourt jusqu'à 25 km/h. En cas de réussite, le chasseur rapporte l'objet ou la créature et le dépose devant l'invocateur. À la fin de la durée du sort, si le chasseur ailé n'a pas pu remplir sa mission, il entre dans une rage destructrice, il retrouve alors le personnage qui l'a invoqué et l'attaque jusqu'à ce qu'il soit vaincu (il n'utilise pas sa capacité d'Enlèvement pour ce combat).\n\nCHASSEUR AILÉ — NC5\nLe chasseur ailé ressemble à un humain à la peau noire, doté d'une tête de faucon de la même couleur. Ses bras sont remplacés par des ailes et ses jambes par de puissantes serres.\nTAILLE GRANDE, CRÉATURE NON VIVANTE\nAGI +1 | CON +6 | FOR +6 | PER +0 | CHA +0 | INT +2 | VOL +6\nDéfense 18 · Points de vigueur 50 · Initiative 12\nSerres +10 · DM 2d6+6\nVOL RAPIDE : Le chasseur ailé obtient une action de mouvement supplémentaire par round lorsqu'il est en vol. Au premier round de combat, la créature obtient un bonus de +5 en attaque et +1d6 aux DM si elle est en vol et attaque une créature au sol, elle peut tenter un enlèvement.\nENLÈVEMENT : Le chasseur ailé peut tenter d'agripper une cible de taille moyenne ou inférieure en action d'attaque. La cible peut faire un test de FOR opposé pour échapper à son étreinte à sa première attaque, en cas d'échec, elle est immobilisée et elle ne peut pas se libérer avant que le serviteur ne décide de la relâcher ou qu'il soit vaincu.",
    sourcePage: 160,
  },
  {
    id: 'prestige-invocation-majeure-r8',
    name: 'Portail magique',
    pathId: 'prestige-invocation-majeure',
    rank: 8,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le personnage peut faire apparaître un portail lumineux pour une durée maximale de [5 + INT] minutes, bien qu'il puisse mettre fin au sort à tout moment. Cette porte apparaît simultanément dans un autre lieu choisi par le magicien, soit à portée de vue, soit à un endroit parfaitement connu du magicien à une portée maximale égale à son niveau × 10 km. Tant qu'il est actif, le portail magique peut être emprunté dans un sens ou dans un autre par toute créature de taille énorme ou inférieure.",
    sourcePage: 160,
  },

  // ----- Voie du mage de guerre (p. 160) -----
  {
    id: 'prestige-mage-de-guerre-r4',
    name: 'Coup au but',
    pathId: 'prestige-mage-de-guerre',
    rank: 4,
    isSpell: true,
    actionTypes: ['G', 'M'],
    text:
      "Le personnage ou la cible (portée 10 m) bénéficie d'un bonus de +10 sur son prochain test d'attaque contre DEF (au contact, à distance ou magique au choix) qui doit être exécuté avant la fin du round. Si ce sort est lancé en action de mouvement, il coûte seulement 2 PM.",
    sourcePage: 161,
  },
  {
    id: 'prestige-mage-de-guerre-r5',
    name: 'Explosion différée',
    pathId: 'prestige-mage-de-guerre',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage invoque une bille de feu qui se positionne là où le mage lui en donne l'ordre. La trajectoire peut comporter jusqu'à deux coudes à 90° et la distance totale parcourue ne doit pas dépasser 50 m. Le magicien n'a pas besoin de voir le lieu. La bille explose immédiatement si une des conditions suivantes est remplie.\n- Quelque chose ou quelqu'un touche la bille.\n- Le magicien prononce un mot de commande (action gratuite).\n- Le délai fixé par le magicien est terminé.\n- Au bout d'un nombre de minutes égal à l'INT du personnage.\nLa bille de feu explose dans un rayon de 5 m et inflige [4d4° + INT] DM. Les créatures qui réussissent un test d'AGI difficulté [10 + INT] ne subissent que la moitié des dégâts. Avant son explosion, la bille de feu produit une lumière équivalant celle d'une torche.",
    sourcePage: 161,
  },
  {
    id: 'prestige-mage-de-guerre-r6',
    name: 'Aura du chef de guerre',
    pathId: 'prestige-mage-de-guerre',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Tous vos alliés dans un rayon de 20 m autour de vous bénéficient d'un bonus de +1 en DEF et aux DM pendant INT minutes. À partir du niveau 16, ce bonus passe à +2.",
    sourcePage: 161,
  },
  {
    id: 'prestige-mage-de-guerre-r7',
    name: 'Épargner les alliés',
    pathId: 'prestige-mage-de-guerre',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Vous êtes capable de sculpter et de contrôler la puissance de vos sorts de zone de façon à épargner vos alliés. Lorsque vous lancez un sort de zone, vous pouvez dépenser 1 PM par allié présent dans la zone que vous souhaitez épargner.",
    sourcePage: 161,
  },
  {
    id: 'prestige-mage-de-guerre-r8',
    name: 'Vague de feu',
    pathId: 'prestige-mage-de-guerre',
    rank: 8,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le personnage dresse un mur de feu de 3 m de hauteur et de 20 de large à une portée initiale de 10 m. La vague de feu s'éloigne de lui et parcourt 50 m en infligeant [5d4° + INT] DM sur son passage. Les créatures qui réussissent un test d'AGI difficulté 15 ne subissent que la moitié des DM.",
    sourcePage: 161,
  },

  // ----- Voie de la magie de l'esprit (p. 161) -----
  {
    id: 'prestige-magie-de-l-esprit-r4',
    name: 'Esprit impénétrable',
    pathId: 'prestige-magie-de-l-esprit',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage ou un allié au contact est immunisé à toutes les tentatives de détection des mensonges, des sentiments ou des émotions, même magiques pendant INT heures. Il ne peut pas non plus être localisé ou scruté par des moyens magiques (sorts ou pouvoirs comme clairvoyance ou détection de l'invisible). En plus de ce sort, le personnage obtient un bonus de +5 à tous les tests destinés à cacher ses émotions et ses sentiments ou pour résister aux sorts qui affectent l'esprit (charme, fascination, domination, etc.).",
    sourcePage: 161,
  },
  {
    id: 'prestige-magie-de-l-esprit-r5',
    name: 'Lire les pensées',
    pathId: 'prestige-magie-de-l-esprit',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "S'il réussit un test opposé d'attaque magique contre une créature de NC inférieur à son niveau, le personnage « entend » les pensées de la cible, pendant [1d6 + INT] rounds (portée 20 m). Il ne peut fouiller dans sa mémoire, seulement savoir ce qu'elle pense à ce moment-là. En combat, le lanceur obtient un bonus de +3 en DEF contre les attaques portées par la cible du sort.",
    sourcePage: 161,
  },
  {
    id: 'prestige-magie-de-l-esprit-r6',
    name: 'Prison mentale',
    pathId: 'prestige-magie-de-l-esprit',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par combat, le personnage peut faire un test opposé d'attaque magique contre une cible à une portée de 20 m. En cas de réussite, la victime est emprisonnée dans un labyrinthe extradimensionnel. La durée d'emprisonnement dépend du NC de la cible :\n- NC 1 ou moins, valeur d'INT jours ;\n- NC 2, valeur d'INT heures ;\n- NC 3, valeur d'INT minutes ;\n- NC 4 et +, 1d6 rounds.\nLa cible peut faire un test d'INT difficulté [10 + INT] pour diviser par deux sa durée d'emprisonnement (minimum 1 round). Dans tous les cas, si la victime possède une valeur d'INT supérieure ou égale à celle du mage, elle n'est pas affectée par le sort.",
    sourcePage: 162,
  },
  {
    id: 'prestige-magie-de-l-esprit-r7',
    name: 'Attaque mentale',
    pathId: 'prestige-magie-de-l-esprit',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une surcharge de stimulus sensoriels qui provoque des DM et éventuellement une perte de connaissance de la cible. Le personnage fait un test opposé d'attaque magique contre une cible à une portée de 20 m. En cas de succès, il inflige [5d4° + INT] DM et la cible doit faire un test d'INT difficulté [10 + INT]. En cas d'échec, si la cible est de niveau inférieur au mage, elle perd conscience pour 1d6 rounds, sinon elle est immobilisée (sonnée debout) pour 1 round.",
    sourcePage: 162,
  },
  {
    id: 'prestige-magie-de-l-esprit-r8',
    name: 'Contrôle mental',
    pathId: 'prestige-magie-de-l-esprit',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Si le personnage réussit un test opposé d'attaque magique contre une cible à une portée de 20 m, il prend le contrôle des actions de sa cible (c'est le joueur qui décide de ses actions comme s'il s'agissait de son PJ). Pendant ce temps-là, le corps du mage est inactif.\nLa durée du contrôle dépend du NC de la cible :\n- NC 1 ou moins, valeur d'INT heures ;\n- NC 2, valeur d'INT minutes ;\n- NC 3, valeur d'INT rounds ;\n- NC 4 et +, 1d6 rounds.\nLa cible peut faire un test d'INT difficulté [10 + INT] pour diviser par deux la durée de contrôle (minimum 1 round). Dans tous les cas, si la victime possède une valeur d'INT supérieure ou égale à celle du mage, elle n'est pas affectée par le sort. Le mage ne peut contrôler plus d'une créature à la fois.",
    sourcePage: 162,
  },

  // ----- Voie de la magie des mots (p. 162) -----
  {
    id: 'prestige-magie-des-mots-r4',
    name: 'Chant fascinant',
    pathId: 'prestige-magie-des-mots',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le lanceur de sort entonne un chant si merveilleux qu'il fascine toutes les créatures humanoïdes et les animaux de NC 1 ou inférieur dans un rayon de 20 m. Le NC augmente de 1 par rang acquis (NC 2 au rang 6, NC 3 au rang 7 et enfin NC 4 au rang 8). Les victimes cessent toute activité tant que le personnage continue à chanter par une action de mouvement à chaque round et pour une durée maximale de [1d6 + INT] minutes et, si le personnage se déplace, elles le suivent. Les créatures sourdes ou qui se bouchent les oreilles sont immunisées au sort tant qu'elles ne l'entendent pas. Une créature blessée pendant le sort reprend ses esprits et elle y est immunisée pendant 24 h. Un barde peut aussi utiliser un instrument de musique pour lancer ce sort.",
    sourcePage: 162,
  },
  {
    id: 'prestige-magie-des-mots-r5',
    name: 'Poids des mots',
    pathId: 'prestige-magie-des-mots',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le personnage déforme la réalité et la plie à sa volonté par la force du conte. Par exemple, avant de savoir si une porte est fermée à clé, il dira « La porte était habituellement fermée à clé mais, ce jour-là, le maître des lieux, pressé de rejoindre sa fougueuse maîtresse, avait oublié de la verrouiller ». Le personnage peut tenter d'altérer la réalité tant que celle-ci n'a pas été révélée, ensuite ce n'est plus possible. Le MJ peut choisir de refuser les allégations du joueur mais, dans ce cas, les points de mana ne sont pas dépensés.",
    sourcePage: 163,
  },
  {
    id: 'prestige-magie-des-mots-r6',
    name: 'Cri de la banshee',
    pathId: 'prestige-magie-des-mots',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le personnage peut pousser un terrible cri. Toutes les créatures vivantes dans un rayon de 10 m autour du personnage doivent réussir un test de CON difficulté [10 + INT] ou subir 6d4° DM (rien en cas de succès). Les alliés du mage ont un bonus de +5 à ce test (qui prend en compte le fait que ceux-ci sont prévenus et peuvent entre autres se boucher les oreilles). Les victimes qui ont été réduites à 0 PV voient leurs cheveux blanchir définitivement.",
    sourcePage: 163,
  },
  {
    id: 'prestige-magie-des-mots-r7',
    name: 'Mot de mana',
    pathId: 'prestige-magie-des-mots',
    rank: 7,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le lanceur de sort désigne une cible à une portée de 20 m et prononce un mot empreint de la puissance brute de la magie. Si la cible possède moins de 120 PV (on parle ici des PV max), elle est aveuglée pour 1d4 rounds. À partir du niveau 15, le personnage peut, s'il le souhaite, utiliser le mot d'étourdissement, si la cible possède moins de 100 PV, elle est étourdie pour 1d4 rounds. À partir du niveau 18, le personnage peut, s'il le souhaite, utiliser le mot de mort : si la cible possède moins de 80 PV, elle meurt (réduite à 0 PV). Le lanceur de sort doit terminer une récupération rapide avant d'être à nouveau capable d'utiliser ce sort.",
    sourcePage: 163,
  },
  {
    id: 'prestige-magie-des-mots-r8',
    name: 'Souhait',
    pathId: 'prestige-magie-des-mots',
    rank: 8,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le personnage modifie le monde par la force des mots et émet un vœu qui est exaucé. Une fois par jour, il peut dupliquer les effets de n'importe quelle capacité de n'importe quelle voie, jusqu'au rang 5. Une fois par aventure, il peut émettre un souhait qui dépasse ce cadre et dont les limites sont fixées par le seul bon vouloir du MJ. Toutefois, plutôt que d'empêcher le souhait du joueur de se réaliser, le MJ inventera des effets collatéraux préjudiciables qui feront de l'utilisation du souhait un moment de tension et de danger… Par exemple, si le personnage souhaite devenir « extrêmement fort », le MJ peut lui octroyer +4 en FOR, mais lui enlever 4 points en AGI. Les effets du sort sont généralement valables jusqu'à la fin de l'aventure en cours.",
    sourcePage: 163,
  },

  // ----- Voie de la magie du temps (p. 163) -----
  {
    id: 'prestige-magie-du-temps-r4',
    name: 'Fuite en avant',
    pathId: 'prestige-magie-du-temps',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage se projette dans le futur, s'il réussit un test d'attaque magique contre une difficulté égale à [10 + durée choisie en min], il disparaît et réapparaît à la fin de la durée choisie. Si un obstacle occupe sa position, il réapparaît au plus près et subit 1d4° DM, s'il s'agit d'un être vivant la créature subit des DM similaires.",
    sourcePage: 164,
  },
  {
    id: 'prestige-magie-du-temps-r5',
    name: 'Lenteur',
    pathId: 'prestige-magie-du-temps',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage doit emporter un test opposé d'attaque magique contre une créature située à moins de 30 m. Si la cible est de niveau supérieur ou égal au PJ, elle est ralentie pendant 1d4 rounds sinon la durée est doublée. Si la victime réussit son test de résistance, elle ne peut plus être la cible de ce pour le reste du combat.",
    sourcePage: 164,
  },
  {
    id: 'prestige-magie-du-temps-r6',
    name: 'Décalage',
    pathId: 'prestige-magie-du-temps',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage touche sa cible et doit réussir un test opposé d'attaque magique contre elle. En cas de réussite, il envoie la cible 1d4° min dans le futur (au maximum, moins s'il le souhaite). La victime devient une image transparente, immatérielle et immobile pour la durée du sort. Elle reprend consistance et son activité normale à la fin de celui-ci. Si un obstacle occupe sa position, elle réapparaît au plus près et subit 1d4° DM, s'il s'agit d'un être vivant la créature subit des DM similaires.",
    sourcePage: 164,
  },
  {
    id: 'prestige-magie-du-temps-r7',
    name: 'Enkystement lointain',
    pathId: 'prestige-magie-du-temps',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par combat, le personnage désigne une cible à moins de 20 m d'un mouvement de la main et un tourbillon de lumière multicolore emporte la victime en un lieu lointain. En cas de succès d'un test opposé d'attaque magique, la cible est instantanément téléportée dans une direction aléatoire (à peu près horizontalement et dans un milieu adapté à sa survie). Les créatures de NC inférieur à la moitié du niveau du magicien sont téléportées à une distance de 2d4° × 100 km, celles de niveau inférieur à 2d4° km et celles de niveau supérieur ou égal à 2d4° × 10 m. Une créature ne peut pas être victime de ce sort plus d'une fois par jour.",
    sourcePage: 164,
  },
  {
    id: 'prestige-magie-du-temps-r8',
    name: 'Arrêt du temps',
    pathId: 'prestige-magie-du-temps',
    rank: 8,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le magicien peut arrêter le temps pendant [1d4° + INT] rounds. Seul le magicien peut agir à sa guise pendant cette période, lancer des sorts sur lui-même, se déplacer et déplacer des objets, tant qu'il ne touche pas un autre être vivant ou n'interagit pas avec lui (en lui lançant un sort, par exemple). Dans le cas d'un contact (même magique), le temps reprend instantanément son cours normal. Si vous utilisez la règle optionnelle du contretemps, l'effet se produit sur un résultat de 1 au d4° qui détermine la durée du sort.",
    sourcePage: 164,
  },

  // ----- Voie du maître des sorts (p. 164) -----
  {
    id: 'prestige-maitre-des-sorts-r4',
    name: 'Connaissance des arcanes inférieures',
    pathId: 'prestige-maitre-des-sorts',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend deux sorts de rang 1 de magie profane de son choix.",
    sourcePage: 164,
  },
  {
    id: 'prestige-maitre-des-sorts-r5',
    name: 'Connaissance des arcanes mineures',
    pathId: 'prestige-maitre-des-sorts',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend deux sorts de rang 2 de magie profane de son choix.",
    sourcePage: 164,
  },
  {
    id: 'prestige-maitre-des-sorts-r6',
    name: 'Connaissance des arcanes supérieures',
    pathId: 'prestige-maitre-des-sorts',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend deux sorts de rang 3 de magie profane de son choix.",
    sourcePage: 164,
  },
  {
    id: 'prestige-maitre-des-sorts-r7',
    name: 'Connaissance des arcanes majeures',
    pathId: 'prestige-maitre-des-sorts',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend deux sorts de rang 4 de magie profane de son choix.",
    sourcePage: 165,
  },
  {
    id: 'prestige-maitre-des-sorts-r8',
    name: 'Connaissance des arcanes suprêmes',
    pathId: 'prestige-maitre-des-sorts',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage apprend deux sorts de rang 5 de magie profane de son choix.",
    sourcePage: 165,
  },

  // ----- Voie de la vision (p. 165) -----
  {
    id: 'prestige-vision-r4',
    name: 'Cécité',
    pathId: 'prestige-vision',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage doit emporter un test opposé d'attaque magique contre une cible à une portée de 20 m. En cas de succès la cible est aveuglée (-5 en Init., Att et DEF, -10 en attaque à distance). La durée du sort est de 1d6 rounds si la cible est d'un NC inférieur au niveau personnage, sinon elle est d'un round seulement.",
    sourcePage: 165,
  },
  {
    id: 'prestige-vision-r5',
    name: 'Œil magique',
    pathId: 'prestige-vision',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage détache son œil et l'envoie explorer son environnement. Il voit par cet œil et le déplace en volant de 10 m par action de mouvement pour une durée d'INT min. L'œil possède une DEF 20 et 1 PV. S'il est réduit à 0 PV, l'œil est détruit et le mage perd 1d6 PV (son œil repousse immédiatement).",
    sourcePage: 165,
  },
  {
    id: 'prestige-vision-r6',
    name: 'Motif hypnotique',
    pathId: 'prestige-vision',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage crée dans le ciel un tableau coloré hypnotique dans lequel chacun voit une scène différente qui le touche au plus profond de son être. Chaque créature à portée (20 m) doit réussir un test d'INT difficulté [12 + INT du magicien] ou cesser ce qu'elle faisait pour regarder intensément le tableau. Elle ne prête plus du tout attention à son environnement, toutefois, si elle est attaquée, elle riposte bien qu'elle reprenne immédiatement sa contemplation dès son adversaire vaincu ou en fuite. Le sort a une durée d'INT min et il n'affecte que les créatures dont le NC est inférieur au rang atteint dans la voie.",
    sourcePage: 165,
  },
  {
    id: 'prestige-vision-r7',
    name: 'Vision de la vérité',
    pathId: 'prestige-vision',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Pendant INT min, le personnage voit à travers les illusions et les déguisements, même magiques, comme s'ils n'existaient pas. Il voit aussi les créatures invisibles. Au prix d'une action de mouvement, il peut se concentrer sur l'aura d'une créature à moins de 20 m, et s'il réussit un test opposé d'attaque magique, il apprend son niveau approximatif, ses PV et ses pouvoirs particuliers.",
    sourcePage: 165,
  },
  {
    id: 'prestige-vision-r8',
    name: 'Invisibilité supérieure',
    pathId: 'prestige-vision',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Au choix, le personnage peut lancer invisibilité (rang 3 de la voie de la magie universelle) sur lui-même plus un nombre d'alliés égal à son INT (durée [1d4° + INT] minutes) ou il lance invisibilité supérieure seulement sur lui-même. Dans ce cas, il reste invisible même s'il utilise des actions offensives, mais la durée est exprimée en rounds. Ses adversaires l'attaquent comme s'ils étaient aveuglés (-5 en Att et en DEF, -10 aux attaques à distance, ne peut être ciblé par les sorts).",
    sourcePage: 165,
  },

  // ----- Voie de l'armure sacrée (p. 166) -----
  {
    id: 'prestige-armure-sacree-r4',
    name: 'Armure de bronze',
    pathId: 'prestige-armure-sacree',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage acquiert son armure de bronze. Celle-ci se présente sous la forme d'un cube de métal d'environ 50 cm d'arête pour 10 kg, portant son symbole. Sur un simple mot de commande (action de mouvement), l'armure se déploie et recouvre son corps. L'armure confère une RD égale à 3 et n'inflige aucune pénalité d'encombrement.",
    sourcePage: 166,
  },
  {
    id: 'prestige-armure-sacree-r5',
    name: 'Pouvoir unique',
    pathId: 'prestige-armure-sacree',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage associe à son armure un sort de son choix de rang 1 à 4 de n'importe quelle voie. Il peut utiliser ce sort plus souvent s'il est moins puissant :\n- Rang 1, 4 fois par combat ;\n- Rang 2, 3 fois par combat ;\n- Rang 3, 2 fois par combat ;\n- Rang 4, 1 fois par combat.",
    sourcePage: 166,
  },
  {
    id: 'prestige-armure-sacree-r6',
    name: "Armure d'argent",
    pathId: 'prestige-armure-sacree',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text: "L'armure acquiert la couleur de l'argent. Elle octroie une RD 5.",
    // PER-137 : RD −5 sur tous les DM, octroyée par l'armure sacrée propre à la voie (toujours portée
    // par définition du personnage de prestige) → traitée comme permanente.
    damageReduction: { kind: 'flat', value: 5 },
    sourcePage: 166,
  },
  {
    id: 'prestige-armure-sacree-r7',
    name: 'Pouvoir puissant',
    pathId: 'prestige-armure-sacree',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage associe à son armure un sort de son choix de rang 5 à 7 de n'importe quelle voie. Il peut utiliser ce sort plus souvent s'il est moins puissant, mais dans tous les cas pas plus d'une fois par combat :\n- Rang 5, 3 fois par jour ;\n- Rang 6, 2 fois par jour ;\n- Rang 7, 1 fois par jour.",
    sourcePage: 166,
  },
  {
    id: 'prestige-armure-sacree-r8',
    name: "Armure d'or",
    pathId: 'prestige-armure-sacree',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text: "L'armure acquiert la couleur de l'or et elle octroie une RD 7.",
    // PER-137 : RD −7 sur tous les DM (armure sacrée de la voie, toujours portée) → permanente.
    damageReduction: { kind: 'flat', value: 7 },
    sourcePage: 167,
  },

  // ----- Voie élémentaire du feu (p. 166) -----
  {
    id: 'prestige-elementaire-du-feu-r4',
    name: 'Mur de feu',
    pathId: 'prestige-elementaire-du-feu',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut créer un mur de feu rectiligne de 20 m de long pour 4 m de haut (portée 20 m, épaisseur 30 cm). Toute créature qui franchit le mur subit [2d4° + CHA] DM de feu. Le sort a une durée de CHA minutes.",
    sourcePage: 167,
  },
  {
    id: 'prestige-elementaire-du-feu-r5',
    name: 'Tornade de feu',
    pathId: 'prestige-elementaire-du-feu',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage invoque une colonne de feu (portée 20 m) qui inflige [4d4° + CHA] DM à la cible sur un test d'attaque magique réussi contre DEF. Les DM sont doublés contre les morts-vivants et les démons.",
    sourcePage: 167,
  },
  {
    id: 'prestige-elementaire-du-feu-r6',
    name: 'Insensible au feu',
    pathId: 'prestige-elementaire-du-feu',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage devient insensible aux DM de feu et il divise par deux les DM de froid.",
    // PER-137 : deux modes traités SÉPARÉMENT — immunité au feu (puce verte) ET ÷2 froid (puce bleue).
    damageReduction: [
      { kind: 'immunity', scopes: ['fire'] },
      { kind: 'divide', value: 2, scopes: ['cold'] },
    ],
    sourcePage: 167,
  },
  {
    id: 'prestige-elementaire-du-feu-r7',
    name: 'Immolation',
    pathId: 'prestige-elementaire-du-feu',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage s'immole dans une aura de flammes vives pendant CHA minutes. Il est immunisé aux DM de feu et inflige 1d4° DM de feu à tout attaquant qui réussit à le blesser avec une arme, 2d4° s'il s'agit d'une arme naturelle.",
    sourcePage: 167,
  },
  {
    id: 'prestige-elementaire-du-feu-r8',
    name: 'Forme élémentaire de feu',
    pathId: 'prestige-elementaire-du-feu',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le personnage peut se transformer en élémentaire de feu (taille grand), pendant un maximum de CHA minutes. Sous cette forme, il ne peut pas employer d'autres capacités que celles de la voie élémentaire du feu et il ne peut pas parler. S'il est réduit à 0 PV sous cette forme, il reprend sa forme initiale avec les PV qu'il avait au moment de la transformation.\n\nÉLÉMENTAIRE DE FEU\nAGI +3* | CON +5 | FOR +5 | PER [mystique] | CHA [mystique] | INT [mystique] | VOL [mystique]\nDéfense 20 · Points de vigueur [Niv. du mystique × 4] · Initiative [Init. du mystique]\nFrappe de feu [attaque magique] · DM 2d4°+5 · DM de feu. La forme élémentaire de feu profite en permanence des effets des capacités Insensible au feu et Immolation.",
    sourcePage: 167,
  },

  // ----- Voie élémentaire de la terre (p. 167) -----
  {
    id: 'prestige-elementaire-de-la-terre-r4',
    name: 'Mur de pierre',
    pathId: 'prestige-elementaire-de-la-terre',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage invoque un mur de pierre de 20 m de long pour 4 m de haut (portée 20 m). Le mur est parfaitement rectiligne sur toute sa longueur. Il peut prendre attache sur un mur ou une paroi rocheuse et ainsi boucher complètement un passage. Le mur a une durée d'existence d'INT heures (Solidité 30, RD 20, 30 cm d'épaisseur).",
    sourcePage: 167,
  },
  {
    id: 'prestige-elementaire-de-la-terre-r5',
    name: 'Litomorphose',
    pathId: 'prestige-elementaire-de-la-terre',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut modeler la pierre par sa simple volonté (portée 10 m). Il affecte un volume maximal de 1 m3 par niveau et lui donne la forme qu'il désire. Ainsi au niveau 10, il peut percer un tunnel de 1 m de côté pour environ 10 m de long ou au contraire créer une arche de pierre de 1 m de large pour 10 m de long afin de franchir un précipice. La transformation dure INT heures.",
    sourcePage: 168,
  },
  {
    id: 'prestige-elementaire-de-la-terre-r6',
    name: 'Pétrification',
    pathId: 'prestige-elementaire-de-la-terre',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage effectue un test opposé d'attaque magique (portée 20 m) contre sa cible. En cas de réussite, la victime est changée en pierre (effet permanent). Sous cette forme, elle a une RD 30, mais un sort de litomorphose lui inflige 4d4° DM sans réduction. Si la victime est de niveau supérieur ou égal au lanceur du sort, elle peut faire un test de CON difficulté [10 + CHA] à la fin de chaque round pour mettre fin au sort.",
    sourcePage: 168,
  },
  {
    id: 'prestige-elementaire-de-la-terre-r7',
    name: 'Séisme',
    pathId: 'prestige-elementaire-de-la-terre',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage déclenche un terrible tremblement de terre qui fait s'effondrer les bâtisses dans une zone de 100 m de rayon autour de lui. Les maisonnettes pauvres s'écroulent automatiquement, les villas ont 4 chances sur 6 de s'effondrer, les palais 2 chances sur 6 et les édifices fortifiés 1 chance sur 6. Toute créature présente dans un édifice qui s'effondre subit 4d6 DM (on considère qu'elle sort de l'édifice, sinon elle subit le double de DM). Les DM sont divisés par deux si la bâtisse a résisté. Sous terre, le sort inflige 4d6 DM dans toute la zone.",
    sourcePage: 168,
  },
  {
    id: 'prestige-elementaire-de-la-terre-r8',
    name: 'Forme élémentaire de terre',
    pathId: 'prestige-elementaire-de-la-terre',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le personnage peut se transformer en élémentaire de terre (taille grand), pendant un maximum de CHA minutes. Sous cette forme, il ne peut pas employer d'autres capacités que celles de la voie élémentaire de terre et il ne peut pas parler. S'il est réduit à 0 PV sous cette forme, il reprend sa forme initiale avec les PV qu'il avait au moment de la transformation.\n\nÉLÉMENTAIRE DE TERRE\nAGI +1 | CON +6 | FOR +6* | PER [mystique] | CHA [mystique] | INT [mystique] | VOL [mystique]\nDéfense 23 · Points de vigueur [Niv. × 5] · Initiative [mystique]\nCoup de poing [attaque magique] · DM 2d4°+6",
    sourcePage: 168,
  },

  // ----- Voie élémentaire de l'air (p. 168) -----
  {
    id: 'prestige-elementaire-de-l-air-r4',
    name: 'Bourrasque',
    pathId: 'prestige-elementaire-de-l-air',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage prend une grande inspiration et souffle une terrible bourrasque. Toutes les créatures face à lui dans un cône de 30 m de long et de large à son extrémité doivent faire un test de FOR difficulté [10 + rang] ou être renversée et repoussées en arrière à une distance qui dépend de leur taille.\n- Très petite à moyenne : 20 m, subit 3d4° DM\n- Grande : 10 m, subit 2d4° DM\n- Énorme : 5 m subit 1d4° DM\n- Colossale : seulement renversée",
    sourcePage: 168,
  },
  {
    id: 'prestige-elementaire-de-l-air-r5',
    name: 'Chevaucher les nuées',
    pathId: 'prestige-elementaire-de-l-air',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage et un compagnon supplémentaire par rang peuvent être transportés par les forces du vent sur une distance de 1 km au maximum à la vitesse de 100 m par round. Le personnage doit voir l'endroit où le sort va le transporter et cet endroit doit pouvoir recevoir toutes les personnes qui l'accompagnent.",
    sourcePage: 168,
  },
  {
    id: 'prestige-elementaire-de-l-air-r6',
    name: 'Mur de vent',
    pathId: 'prestige-elementaire-de-l-air',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sort crée un mur de vent circulaire de 5 à 10 m de diamètre autour du personnage (au choix) pendant CHA minutes. Il bloque les attaques à distance dans les deux sens (mais pas la magie) et repousse les créatures qui tentent de le franchir. Il leur faut réussir un test de FOR difficulté [10 + rang] pour passer.",
    sourcePage: 169,
  },
  {
    id: 'prestige-elementaire-de-l-air-r7',
    name: 'Cyclone',
    pathId: 'prestige-elementaire-de-l-air',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage invoque un violent maelström de vents tourbillonnants à une portée de 500 m. Le phénomène occupe un espace de 20 m de diamètre et toutes les créatures présentes dans la zone d'effet subissent 2d4° DM par round. De plus, une cible doit réussir un test de FOR difficulté 15 ou être renversée. Le sort a une durée CHA minutes et le personnage peut déplacer la tornade de 10 m par action de mouvement.",
    sourcePage: 169,
  },
  {
    id: 'prestige-elementaire-de-l-air-r8',
    name: "Forme élémentaire d'air",
    pathId: 'prestige-elementaire-de-l-air',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le personnage peut se transformer en élémentaire d'air (taille grand), pendant un maximum de CHA minutes. Sous cette forme, il ne peut pas employer d'autres capacités que celles de la voie élémentaire de l'air et il ne peut pas parler. S'il est réduit à 0 PV sous cette forme, il reprend sa forme initiale avec les PV qu'il avait au moment de la transformation.\n\nÉLÉMENTAIRE D'AIR\nAGI +5* | CON +4 | FOR +4 | PER [mystique] | CHA [mystique] | INT [mystique] | VOL [mystique]\nDéfense 25 · Points de vigueur [Niv. × 5] · Initiative [mystique + 3]\nFrappe [attaque magique] · DM 2d4°+ 4 de foudre Immunité aux DM de foudre.",
    sourcePage: 169,
  },

  // ----- Voie élémentaire de l'eau (p. 169) -----
  {
    id: 'prestige-elementaire-de-l-eau-r4',
    name: 'Brouillard',
    pathId: 'prestige-elementaire-de-l-eau',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage lève un brouillard dense (pénombre dans un rayon de 10 m, puis équivalent au noir total) dans un rayon de 20 m autour de lui. S'il maintient sa concentration, il peut continuer à augmenter le rayon de la zone de 20 m par action limitée à chaque round suivant pendant un maximum de round égal à son niveau. Une fois qu'il cesse sa concentration, le brouillard dure pendant CHA minutes.",
    sourcePage: 169,
  },
  {
    id: 'prestige-elementaire-de-l-eau-r5',
    name: 'Mur acide',
    pathId: 'prestige-elementaire-de-l-eau',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut créer un mur d'acide rectiligne de 20 m de long pour 4 m de haut (portée 20 m, épaisseur 30 cm). Toute créature qui franchit le mur subit [3d4° + CHA] DM d'acide. Le sort a une durée de CHA minutes.",
    sourcePage: 169,
  },
  {
    id: 'prestige-elementaire-de-l-eau-r6',
    name: "Armure d'eau",
    pathId: 'prestige-elementaire-de-l-eau',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une couche d'eau de quelques centimètres d'épaisseur recouvre le corps du personnage pendant CHA minutes, elle lui donne une RD 3 contre tous les DM physiques et RD 10 contre les DM de feu et d'acide. Enfin le personnage est glissant comme un poisson et ne peut être saisi.",
    sourcePage: 169,
  },
  {
    id: 'prestige-elementaire-de-l-eau-r7',
    name: 'Écartement des eaux',
    pathId: 'prestige-elementaire-de-l-eau',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut stopper le cours d'une rivière ou écarter les eaux d'un lac. L'eau s'ouvre devant le personnage et se referme derrière lui sur une distance maximale de 1 km (moins selon son choix). Lui et ses compagnons peuvent alors traverser à pied sec pendant une durée de CHA heures.",
    sourcePage: 169,
  },
  {
    id: 'prestige-elementaire-de-l-eau-r8',
    name: "Forme élémentaire d'eau",
    pathId: 'prestige-elementaire-de-l-eau',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le personnage peut se transformer en élémentaire d'eau (taille grand), pendant un maximum de CHA minutes. Sous cette forme, il ne peut pas employer d'autres capacités que celles de la voie élémentaire de l'eau et il ne peut pas parler. S'il est réduit à 0 PV sous cette forme, il reprend sa forme initiale avec les PV qu'il avait au moment de la transformation.\n\nÉLÉMENTAIRE D'EAU\nAGI +3* | CON +5 | FOR +5 | PER [mystique] | CHA [mystique] | INT [mystique] | VOL [mystique]\nDéfense 23 · Points de vigueur [Niv. x 5] · Initiative [mystique]\nFrappe [attaque magique] · DM 2d4°+ 5 d'acide Immunité aux DM d'acide.",
    sourcePage: 170,
  },

  // ----- Voie du changeforme (p. 170) -----
  {
    id: 'prestige-changeforme-r4',
    name: 'Forme de voyage',
    pathId: 'prestige-changeforme',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut prendre la forme d'un animal de son choix parmi chat, chien, chevreuil, saumon ou corbeau. Il doit choisir cet animal à l'acquisition de ce sort et ce sera toujours le même. La transformation dure PER minutes ou PER heures si le personnage connaît le sort de druide Forme animale de la voie des animaux. Il peut faire l'acquisition d'une forme de voyage supplémentaire par rang atteint dans la voie. Voir le sort de druide Forme animale pour les effets.",
    sourcePage: 170,
  },
  {
    id: 'prestige-changeforme-r5',
    name: 'Transformation en animal',
    pathId: 'prestige-changeforme',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage fait l'acquisition de la capacité de druide Forme animale, mais il ne connaît qu'une seule catégorie d'animaux (parmi mammifère, poissons, arthropodes, reptiles ou oiseaux). Si le personnage connaît déjà la capacité de druide du même nom, il peut désormais rester sous forme animale pour une durée égale à sa PER en heures (au lieu de minutes) et à la fin de la transformation, il récupère 3d4° PV.",
    sourcePage: 170,
  },
  {
    id: 'prestige-changeforme-r6',
    name: 'Transformation puissante',
    pathId: 'prestige-changeforme',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Lorsqu'il prend une forme animale, le personnage peut conserver sa propre DEF et utiliser sa valeur d'attaque magique pour attaquer si ceux-ci sont supérieurs au profil de la forme choisie. Désormais, le personnage peut prendre la forme des animaux géants ou préhistoriques (mais toujours sans dépasser la taille M).",
    sourcePage: 170,
  },
  {
    id: 'prestige-changeforme-r7',
    name: 'Grande forme animale',
    pathId: 'prestige-changeforme',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Lorsqu'il utilise le sort de Forme animale, le personnage peut prendre la forme d'un animal de taille grande (ours, tigre, etc.). Il peut conserver sa DEF et utiliser sa valeur d'attaque magique pour attaquer s'il le souhaite. Le coût du sort est égal à 2 + NC de la créature en points de magie (ou NC PM en utilisant la concentration). Par exemple, une transformation en cheval coûte 3 PM (1 PM en concentration) tandis qu'une transformation en loup géant coûte 6 PM (4 PM en concentration).",
    sourcePage: 170,
  },
  {
    id: 'prestige-changeforme-r8',
    name: 'Forme animale énorme',
    pathId: 'prestige-changeforme',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Lorsqu'il utilise le sort de Forme animale, le personnage peut prendre la forme d'un animal ou d'un animal géant de taille énorme (par exemple, un éléphant). Il suit les mêmes règles que pour la capacité précédente.",
    sourcePage: 170,
  },

  // ----- Voie du combat mystique (p. 170) -----
  {
    id: 'prestige-combat-mystique-r4',
    name: 'Attaque étourdissante',
    pathId: 'prestige-combat-mystique',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage réalise une attaque à mains nues ou avec une arme contondante. En plus des DM habituels, si le NC de la victime est inférieur au rang atteint dans la voie, elle doit réussir un test de CON difficulté [10 + VOL] ou être étourdie pour un round.",
    sourcePage: 171,
  },
  {
    id: 'prestige-combat-mystique-r5',
    name: 'Frappe concentrée',
    pathId: 'prestige-combat-mystique',
    rank: 5,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "Le personnage se concentre pendant 1d4 rounds (le MJ garde cette durée secrète et annonce au joueur lorsqu'il est prêt) pendant lesquels il ne peut ni attaquer ni se déplacer, mais bénéficie d'une RD 5. Au round suivant, en utilisant une action d'attaque, il peut réaliser une attaque dévastatrice : il touche automatiquement et il triple ses DM. S'il cesse sa concentration prématurément, le personnage ne profite d'aucun bénéfice.",
    sourcePage: 171,
  },
  {
    id: 'prestige-combat-mystique-r6',
    name: 'Pression nerveuse',
    pathId: 'prestige-combat-mystique',
    rank: 6,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, s'il réussit un test d'attaque au contact à mains nues, le personnage pince le nerf d'une créature humanoïde. Si le NC de la cible est inférieur au rang atteint dans la voie, elle est paralysée pour VOL minutes. Si son NC est supérieur ou égal, elle est paralysée pour 1 round seulement.",
    sourcePage: 171,
  },
  {
    id: 'prestige-combat-mystique-r7',
    name: 'Paume mortelle',
    pathId: 'prestige-combat-mystique',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le personnage peut tenter une attaque à mains nues capable de tuer net un adversaire. Le personnage doit être au contact est réussir un test opposé d'attaque magique contre sa cible. En cas de réussite, la victime meurt sur le coup. Si elle est d'un niveau supérieur ou égal au personnage, elle est seulement paralysée pour 1 round.",
    sourcePage: 171,
  },
  {
    id: 'prestige-combat-mystique-r8',
    name: 'Main du tout puissant',
    pathId: 'prestige-combat-mystique',
    rank: 8,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le personnage frappe le sol de la paume de sa main. Une onde de choc dévastatrice percute toutes les créatures face à lui sur 20 m de large et autant de profondeur. Chacune d'elle est renversée et subit [4d4° + VOL] DM.",
    sourcePage: 171,
  },

  // ----- Voie du guérisseur (p. 171) -----
  {
    id: 'prestige-guerisseur-r4',
    name: 'Premiers soins',
    pathId: 'prestige-guerisseur',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Cette capacité s'utilise seulement sur une créature vivante à 0 PV. La cible touchée récupère immédiatement [3d4°+ CHA] PV. Un patient ne peut bénéficier de cette capacité qu'une seule fois par combat.",
    sourcePage: 171,
  },
  {
    id: 'prestige-guerisseur-r5',
    name: 'Soins rapides',
    pathId: 'prestige-guerisseur',
    rank: 5,
    isSpell: true,
    actionTypes: ['G'],
    text:
      "D'un simple regard, le personnage soigne une cible (ou lui-même) à une portée de 20 m, elle récupère immédiatement [2d4° + CHA] PV.",
    sourcePage: 171,
  },
  {
    id: 'prestige-guerisseur-r6',
    name: 'Rappel à la vie',
    pathId: 'prestige-guerisseur',
    rank: 6,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le personnage peut rappeler à la vie un mort décédé depuis moins de [6 + CON du personnage] heures par un rituel de 30 min. Il doit avoir accès au corps. Le personnage revient à la conscience avec 1d4° PV et il est affaibli pendant 24 h. Le sort ne régénère pas les membres ou les parties perdues (il faut pour cela utiliser Régénération, sort de druide).",
    sourcePage: 171,
  },
  {
    id: 'prestige-guerisseur-r7',
    name: 'Zone de vie',
    pathId: 'prestige-guerisseur',
    rank: 7,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut enchanter une zone de 10 m de rayon autour de lui pour une durée de CHA rounds. La zone se met à luire d'une lumière bienfaitrice et l'air scintille. Toutes les créatures vivantes dans la zone récupèrent 2d4°PV à chaque round (à la fin de leur tour). Les morts-vivants et les démons subissent des DM équivalents. Une fois le sort lancé, la zone reste immobile.",
    sourcePage: 171,
  },
  {
    id: 'prestige-guerisseur-r8',
    name: 'Résurrection',
    pathId: 'prestige-guerisseur',
    rank: 8,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par aventure, le personnage peut rappeler à la vie un personnage décédé depuis moins de [CHA du prêtre] jours par un rituel de 7 h. Il doit avoir accès à une relique (ongle, cheveux, etc.). Le personnage rappelé à la vie revient à la conscience avec 1 PV, il est affaibli pendant 7 jours. Si une créature bénéficie de ce sort plus d'une fois dans sa vie, elle perd 1 point de CON pour chaque résurrection au-delà de la première.",
    sourcePage: 172,
  },

  // ----- Voie du maître de la nature (p. 172) -----
  {
    id: 'prestige-maitre-de-la-nature-r4',
    name: 'Amitié animale',
    pathId: 'prestige-maitre-de-la-nature',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage cible un animal à une distance maximale de 10 m et doit faire un test opposé d'attaque magique. En cas de réussite, l'animal se met au service du personnage et le défend pendant PER heures. À la fin du sort, l'animal s'enfuit. La somme des NC des animaux que le personnage garde sous contrôle ne peut à aucun moment dépasser le rang atteint dans la voie. À partir du rang 6, le personnage peut cibler les animaux géants et à partir du rang 8 les animaux fantastiques (griffon, ourhible, hippogriffe, etc.). Si le personnage essaie d'emmener un animal en milieu urbain, le sort prend immédiatement fin.",
    sourcePage: 172,
  },
  {
    id: 'prestige-maitre-de-la-nature-r5',
    name: 'Seigneur de la nature',
    pathId: 'prestige-maitre-de-la-nature',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Choisissez un milieu naturel de prédilection, puis un milieu naturel supplémentaire au rang 7. Lorsque le personnage est dans un milieu naturel de prédilection, il obtient un dé bonus à tous ses tests et récupère 1d4° PV durant chaque récupération rapide. Milieux naturels de prédilection : forêt et jungle, déserts et plaines, montagnes et collines, marais et milieu aquatique, grottes et profondeurs.",
    sourcePage: 173,
  },
  {
    id: 'prestige-maitre-de-la-nature-r6',
    name: 'Invisibilité aux animaux',
    pathId: 'prestige-maitre-de-la-nature',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsqu'il est dans un milieu de prédilection, le personnage est totalement indétectable par les animaux et les insectes même géants, tant qu'il le décide (que ce soit par la vue, l'odorat ou l'ouïe). S'il entreprend une action offensive contre un animal, la capacité prend fin immédiatement et ne sera à nouveau active qu'à la fin d'une récupération rapide.",
    sourcePage: 173,
  },
  {
    id: 'prestige-maitre-de-la-nature-r7',
    name: 'Monture géante',
    pathId: 'prestige-maitre-de-la-nature',
    rank: 7,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage obtient une monture géante de son choix (mammouth, dinosaure, aigle géant, etc.). Elle doit être adaptée à un de ses milieux de prédilection et le NC de la créature ne peut pas être supérieur à [rang + PER]. Si le cadre de jeu ne le permet pas, le meneur de jeu peut décider d'interdire les dinosaures de la liste. La monture géante est parfaitement sous contrôle et lorsque le personnage la monte, elle peut attaquer une fois par round sur son ordre (action d'attaque pour la monture, l'ordre est une action gratuite pour le cavalier).",
    sourcePage: 173,
  },
  {
    id: 'prestige-maitre-de-la-nature-r8',
    name: 'Magie druidique innée',
    pathId: 'prestige-maitre-de-la-nature',
    rank: 8,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "3 fois par jour, lorsqu'il est dans un milieu de prédilection, le personnage peut lancer n'importe quel sort de druide de son choix (le même ou trois sorts différents). Ceci est une action gratuite qui ne peut être utilisée qu'une seule fois par round et ne coûte aucun point de mana.",
    sourcePage: 173,
  },

  // ----- Voie des saisons (p. 173) -----
  {
    id: 'prestige-saisons-r4',
    name: 'Vigueur du printemps',
    pathId: 'prestige-saisons',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage gagne 2 DR supplémentaires. De plus, lorsqu'il utilise des DR, il relance tous les 1 obtenus.",
    sourcePage: 173,
  },
  {
    id: 'prestige-saisons-r5',
    name: "Flamme de l'été",
    pathId: 'prestige-saisons',
    rank: 5,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "S'il a accès à une flamme (une torche suffit), le personnage peut lancer un projectile de feu qui inflige [2d4° + PER] DM de feu à une cible à moins de 30 m sur un test d'attaque magique réussi. De plus, le personnage divise par deux tous les DM de feu subis.",
    sourcePage: 173,
  },
  {
    id: 'prestige-saisons-r6',
    name: "Tourbillon d'automne",
    pathId: 'prestige-saisons',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage souffle un tourbillon de feuilles mortes aux bords tranchants de 5 m de diamètre à une portée de 10 m. À chaque round, toutes les créatures dans la zone subissent [3d4° + PER] DM ou la moitié sur un test de CON difficulté 10 réussi (durée PER rounds). Le personnage peut le déplacer à chaque round de 10 m par action de mouvement.",
    sourcePage: 173,
  },
  {
    id: 'prestige-saisons-r7',
    name: "Frimas de l'hiver",
    pathId: 'prestige-saisons',
    rank: 7,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "S'il a accès à de l'eau, il peut lancer un projectile de glace qui inflige [4d4° + PER] DM de froid à une cible à moins de 30 m sur un test d'attaque magique réussi. Si la victime rate un test de CON difficulté [10 + PER], elle est ralentie à son prochain tour. De plus, le personnage divise par deux tous les DM de froid subis.",
    sourcePage: 173,
  },
  {
    id: 'prestige-saisons-r8',
    name: 'Contrôle climatique',
    pathId: 'prestige-saisons',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le personnage peut influer sur la météo. Il lui faut 1 min de concentration pour faire varier les conditions météorologiques d'un palier dans l'échelle suivante et il ne peut la faire varier que d'un nombre de paliers maximal égal à sa PER. La modification climatique a une durée de [1d6 + INT] heures et couvre un rayon égal au niveau du personnage exprimé en kilomètres (éventuellement moins). À la fin du sort, la météo reprend son cours normal.\n1 Ciel bleu\n2 Nuageux\n3 Pluie fine et vent faible\n4 Pluie dense et vent moyen\n5 Pluie intense et vent fort\n6 Tempête (trombes d'eau et vent violent)\nAu dernier palier, le personnage peut appeler la foudre sur une cible en vue par une action gratuite une fois par round. L'éclair inflige 4d4° DM.",
    sourcePage: 174,
  },

  // ----- Voie du templier (p. 174) -----
  {
    id: 'prestige-templier-r4',
    name: 'Résistance au mal',
    pathId: 'prestige-templier',
    rank: 4,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Le personnage touche une cible volontaire (ce peut être lui-même). Celle-ci devient immunisée à toutes les capacités de drain, de charme, de domination, de paralysie ou d'affaiblissement (etc.) des morts-vivants pendant CHA minutes. En plus de ce sort, le personnage gagne +1 en DEF.",
    sourcePage: 174,
  },
  {
    id: 'prestige-templier-r5',
    name: 'Quête',
    pathId: 'prestige-templier',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le personnage assigne une quête à une cible volontaire (ou contrainte à accepter sous la menace) lors d'un long rituel de 10 min. La créature récupère 1 PC par jour tant qu'elle travaille à sa quête. En revanche, si elle cesse de travailler à l'objectif fixé, elle est affaiblie après un laps de temps de 24 h. L'effet préjudiciable cesse si la créature reprend la quête et le sort prend fin une fois la quête menée à bien. Alternativement, le personnage peut imposer au récipiendaire un interdit : tu ne tueras point, tu ne parleras point, tu ne mangeras pas de viande, etc. Dans ce cas, le sort dure un mois par point de CHA du lanceur de sort et à chaque incartade, la cible subit un dé malus pendant 24 h. Le personnage ne peut maintenir plus d'un sort de quête à la fois.",
    sourcePage: 174,
  },
  {
    id: 'prestige-templier-r6',
    name: 'Résistance au mal supérieure',
    pathId: 'prestige-templier',
    rank: 6,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Cette version permet au personnage visé de résister à la fois aux pouvoirs des morts-vivants et à ceux des démons. Le bonus de DEF permanent passe à +2.",
    sourcePage: 174,
  },
  {
    id: 'prestige-templier-r7',
    name: 'Châtiment du mal',
    pathId: 'prestige-templier',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage effectue une attaque contre un mort-vivant ou un démon. Il inflige le double des DM habituels s'il réussit son attaque (le triple en cas de critique). S'il la rate, il inflige ses DM normaux. Si le personnage connaît la capacité Châtiment divin, il peut appliquer cette capacité simultanément (le bonus de CHA sera doublé).",
    sourcePage: 174,
  },
  {
    id: 'prestige-templier-r8',
    name: "Forme d'Ange",
    pathId: 'prestige-templier',
    rank: 8,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le personnage prend la forme d'un ange pendant CHA minutes. Lorsqu'il est en forme d'ange, il garde son profil et toutes ses caractéristiques habituelles, mais il peut voler à une vitesse de 30 m par action de mouvement et il obtient une RD 10 contre les attaques des morts-vivants et des démons.",
    sourcePage: 174,
  },

  // ----- Voie des vermines (p. 175) -----
  {
    id: 'prestige-vermines-r4',
    name: 'Maître vermine',
    pathId: 'prestige-vermines',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage peut communiquer avec les vermines géantes (insectes, araignées, scorpions, mille-pattes, etc.) et celles-ci le considèrent plutôt comme une créature amicale, sauf si elles sont sous l'emprise d'un druide ou sous contrôle magique.",
    sourcePage: 175,
  },
  {
    id: 'prestige-vermines-r5',
    name: 'Nuées de criquets',
    pathId: 'prestige-vermines',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "S'il réussit un test opposé d'attaque magique (portée 20 m), le personnage libère sur sa cible une nuée de criquets affamés qui la dévorent pendant [5 + CHA] rounds. La victime subit 2 DM par tour et un malus de -3 à toutes ses actions. Les DM de zone détruisent la nuée (minimum 1 DM).",
    sourcePage: 175,
  },
  {
    id: 'prestige-vermines-r6',
    name: 'Compagnon vermine',
    pathId: 'prestige-vermines',
    rank: 6,
    isSpell: false,
    actionTypes: [],
    text:
      "Le personnage adopte un scorpion ou une araignée géante (au choix du joueur).\n\nSCORPION OU ARAIGNÉE — TAILLE MOYENNE\nAGI +3* | CON +5 | FOR +5 | PER +2 | CHA -4 | INT -3 | VOL +2\nDéfense [15 + rang dans la voie] · Points de vigueur [niveau du personnage × 5] · Initiative [Init. du personnage]\nAttaque au contact [attaque magique] · DM 1d4°+5 et poison +1d4° DM\nAu prix d'une action limitée, le scorpion peut attaquer une fois avec ses pinces (pas de poison) et une fois avec son dard (avec poison). L'araignée peut se déplacer sur les surfaces verticales. Déplacement rapide : les vermines se déplacent de 20 m par action de mouvement.",
    sourcePage: 175,
  },
  {
    id: 'prestige-vermines-r7',
    name: 'Affinité au poison',
    pathId: 'prestige-vermines',
    rank: 7,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le personnage peut enduire une arme tranchante ou perforante de poison une fois par combat. Cette arme inflige +1d4° DM de poison. En plus des effets décrits ci-dessus, le personnage divise par deux les DM et la durée d'effet des poisons.",
    sourcePage: 175,
  },
  {
    id: 'prestige-vermines-r8',
    name: 'Vermine supérieure',
    pathId: 'prestige-vermines',
    rank: 8,
    isSpell: false,
    actionTypes: [],
    text:
      "Le compagnon vermine du personnage gagne une des capacités suivantes, qui dépend de sa nature. De plus, la vermine peut désormais servir de monture à son maître.\nÉtreinte du scorpion : le scorpion peut désormais tenter d'attraper entre ses pinces une créature de taille grande ou inférieure. Lorsqu'il obtient un résultat de 15 à 20 sur son dé d'attaque, le scorpion immobilise son adversaire en plus des DM habituels.\nToile d'araignée (L) : l'araignée gagne la capacité de lancer (portée 10 m) une toile gluante et collante. Si elle réussit son attaque, la cible est immobilisée pour 1d6 rounds. Au début de son tour, la créature engluée peut faire un test de FOR difficulté 15, en cas de succès, elle réussit à se libérer, sinon elle reste immobilisée.",
    sourcePage: 175,
  },
];

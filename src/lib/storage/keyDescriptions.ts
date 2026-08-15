/**
 * Description humaine + statut « protégé » de chaque clé `localStorage`
 * connue de l'app (nouvelle nomenclature `cof2:...` ET anciennes clés encore
 * présentes tant que PER-411 n'a pas nettoyé). Utilisé par le bloc
 * « Données stockées sur cet appareil » de la page Compte (PER-412) : liste de
 * debug + bouton de réinitialisation.
 *
 * `protect: true` = jamais touchée par la réinitialisation globale (contenu de
 * personnage/campagne, session compte, marqueur interne) — voir critère
 * d'acceptation PER-412 « ne supprime pas les personnages ni les données du
 * compte utilisateur ».
 */
import { storageKeys, STORAGE_MIGRATION_MARKER_KEY } from './keys';

type Rule = {
  match: string | RegExp;
  describe: string | ((match: RegExpMatchArray) => string);
  protect?: boolean;
};

const RULES: readonly Rule[] = [
  // --- Contenu protégé : jamais supprimé par le bouton de réinitialisation ---
  { match: storageKeys.store.characters, describe: 'Personnages en cache local (avant synchronisation compte)', protect: true },
  { match: 'cof2-characters', describe: 'Personnages en cache local — ancienne clé (avant synchronisation compte)', protect: true },
  { match: storageKeys.store.wizardDraft, describe: 'Brouillon de création de personnage en cours', protect: true },
  { match: 'cof2-wizard-draft', describe: 'Brouillon de création de personnage en cours — ancienne clé', protect: true },
  { match: storageKeys.store.campaignDraft, describe: 'Brouillon de création de campagne en cours', protect: true },
  { match: 'cof2-campaign-draft', describe: 'Brouillon de création de campagne en cours — ancienne clé', protect: true },
  { match: STORAGE_MIGRATION_MARKER_KEY, describe: 'Marqueur interne : migration de nomenclature déjà exécutée', protect: true },
  { match: /^sb-.*-auth-token$/, describe: 'Jeton de session Supabase (authentification) — ne pas supprimer sans vouloir te déconnecter', protect: true },

  // --- Réglages/préférences : réinitialisables ---
  { match: storageKeys.store.preferences, describe: 'Préférences générales de l’appli' },
  { match: 'cof2-preferences', describe: 'Préférences générales de l’appli — ancienne clé' },
  { match: storageKeys.auth.lastMethod, describe: 'Dernier mode de connexion utilisé' },
  { match: 'cof2:last-auth-method', describe: 'Dernier mode de connexion utilisé — ancienne clé' },

  { match: storageKeys.sheet.pinAbilities, describe: 'Fiche : caractéristiques épinglées' },
  { match: 'sheet:pin-abilities', describe: 'Fiche : caractéristiques épinglées — ancienne clé' },
  { match: storageKeys.sheet.pinDerivedStats, describe: 'Fiche : statistiques dérivées épinglées' },
  { match: 'sheet:pin-derived-stats', describe: 'Fiche : statistiques dérivées épinglées — ancienne clé' },
  { match: 'sheet:pin-derived-stat-items', describe: 'Fiche : éléments de stats dérivées épinglés individuellement' },
  { match: storageKeys.sheet.pinStatusGauges, describe: 'Fiche : jauges d’état épinglées' },
  { match: 'sheet:pin-status-gauges', describe: 'Fiche : jauges d’état épinglées — ancienne clé' },
  { match: storageKeys.sheet.pinInventory, describe: 'Fiche : inventaire épinglé' },
  { match: 'sheet:pin-inventory', describe: 'Fiche : inventaire épinglé — ancienne clé' },
  { match: storageKeys.sheet.pinInventoryPurse, describe: 'Fiche : bourse épinglée' },
  { match: 'sheet:pin-inventory-purse', describe: 'Fiche : bourse épinglée — ancienne clé' },
  { match: storageKeys.sheet.pinInventoryCustomItem, describe: 'Fiche : objet personnalisé épinglé' },
  { match: 'sheet:pin-inventory-custom-item', describe: 'Fiche : objet personnalisé épinglé — ancienne clé' },
  { match: 'sheet:pin-rest-items', describe: 'Fiche : éléments de repos épinglés' },
  { match: storageKeys.sheet.initiativeBarCollapsed, describe: 'Barre d’initiative repliée ou non' },
  { match: 'sheet-initiative-bar-collapsed', describe: 'Barre d’initiative repliée ou non — ancienne clé' },
  { match: 'sheet:voies-layout', describe: 'Fiche : disposition choisie pour l’affichage des voies' },
  { match: 'sheet:levelup-longpress-tutorial-seen', describe: 'Montée de niveau : tutoriel d’appui long déjà vu' },

  { match: storageKeys.testDomains.includeAbility, describe: 'Tests de domaine : inclure le bonus de caractéristique' },
  { match: 'test-domains:include-ability', describe: 'Tests de domaine : inclure le bonus de caractéristique — ancienne clé' },
  { match: storageKeys.testDomains.hideZero, describe: 'Tests de domaine : masquer les bonus à zéro' },
  { match: 'test-domains:hide-zero', describe: 'Tests de domaine : masquer les bonus à zéro — ancienne clé' },

  { match: storageKeys.gauge.hp, describe: 'Jauge de points de vie dépliée ou non' },
  { match: storageKeys.gauge.mana, describe: 'Jauge de mana dépliée ou non' },
  { match: storageKeys.gauge.luck, describe: 'Jauge de chance dépliée ou non' },
  { match: storageKeys.gauge.homeDemo, describe: 'Jauge de démo (page d’accueil) dépliée ou non' },
  { match: storageKeys.gauge.homeDemoMana, describe: 'Jauge de mana de démo (page d’accueil) dépliée ou non' },
  { match: 'gauge-expanded:hp', describe: 'Jauge de points de vie dépliée ou non — ancienne clé' },
  { match: 'gauge-expanded:mana', describe: 'Jauge de mana dépliée ou non — ancienne clé' },
  { match: 'gauge-expanded:luck', describe: 'Jauge de chance dépliée ou non — ancienne clé' },
  { match: 'gauge-expanded:home-demo', describe: 'Jauge de démo (page d’accueil) dépliée ou non — ancienne clé' },
  { match: 'gauge-expanded:home-demo-mana', describe: 'Jauge de mana de démo (page d’accueil) dépliée ou non — ancienne clé' },

  { match: storageKeys.inventory.grouped, describe: 'Inventaire : affichage groupé' },
  { match: 'cof2-inventory-grouped', describe: 'Inventaire : affichage groupé — ancienne clé' },
  { match: storageKeys.inventory.cards, describe: 'Inventaire : affichage en cartes' },
  { match: 'cof2-inventory-cards', describe: 'Inventaire : affichage en cartes — ancienne clé' },

  { match: storageKeys.levelUp.simplifiedView, describe: 'Montée de niveau : vue simplifiée' },
  { match: 'level-up:simplified-view', describe: 'Montée de niveau : vue simplifiée — ancienne clé' },

  { match: storageKeys.initiative.densityCompact, describe: 'Traqueur d’initiative : densité compacte' },
  { match: 'initiative-tracker-density-compact', describe: 'Traqueur d’initiative : densité compacte — ancienne clé' },
  { match: storageKeys.initiative.gmCollapsed, describe: 'Écran MJ : bloc initiative replié' },
  { match: 'gm-screen-initiative-collapsed', describe: 'Écran MJ : bloc initiative replié — ancienne clé' },
  { match: storageKeys.initiative.paletteDetailed, describe: 'Palette d’initiative détaillée' },
  { match: 'initiative-tracker-palette-detailed', describe: 'Palette d’initiative détaillée — ancienne clé' },
  { match: storageKeys.initiative.paletteCompact, describe: 'Palette d’initiative compacte' },
  { match: 'initiative-tracker-palette-compact', describe: 'Palette d’initiative compacte — ancienne clé' },

  { match: storageKeys.home.sort, describe: 'Accueil : tri des personnages' },
  { match: 'home-sort', describe: 'Accueil : tri des personnages — ancienne clé' },
  { match: storageKeys.home.archivedOpen, describe: 'Accueil : section archivés dépliée' },
  { match: 'home-archived-open', describe: 'Accueil : section archivés dépliée — ancienne clé' },

  { match: storageKeys.campaign.archivedOpen, describe: 'Campagne : section archivés dépliée' },
  { match: 'campaign-archived-open', describe: 'Campagne : section archivés dépliée — ancienne clé' },
  { match: storageKeys.campaign.settingsPlayersOpen, describe: 'Campagne : section joueurs des réglages dépliée' },
  { match: 'campaign-settings-players-open', describe: 'Campagne : section joueurs des réglages dépliée — ancienne clé' },
  { match: storageKeys.campaign.settingsRulesOpen, describe: 'Campagne : section règles des réglages dépliée' },
  { match: 'campaign-settings-rules-open', describe: 'Campagne : section règles des réglages dépliée — ancienne clé' },
  { match: storageKeys.campaign.gmScreenPlayersOpen, describe: 'Écran MJ : section joueurs dépliée' },
  { match: 'gm-screen-players-open', describe: 'Écran MJ : section joueurs dépliée — ancienne clé' },
  { match: storageKeys.campaign.gmScreenCompanionsOpen, describe: 'Écran MJ : section compagnons dépliée' },
  { match: 'gm-screen-companions-open', describe: 'Écran MJ : section compagnons dépliée — ancienne clé' },
  { match: storageKeys.campaign.gmScreenAlliesOpen, describe: 'Écran MJ : section alliés dépliée' },
  { match: 'gm-screen-allies-open', describe: 'Écran MJ : section alliés dépliée — ancienne clé' },
  { match: storageKeys.campaign.gmScreenEnemiesOpen, describe: 'Écran MJ : section ennemis dépliée' },
  { match: 'gm-screen-enemies-open', describe: 'Écran MJ : section ennemis dépliée — ancienne clé' },

  // --- Clés à suffixe dynamique (nouvelle nomenclature) ---
  { match: /^cof2:sheet:section-collapsed:(.+)$/, describe: (m) => `Fiche : section « ${m[1]} » repliée ou non` },
  { match: /^cof2:gm-sheet:section-collapsed:(.+)$/, describe: (m) => `Écran MJ : section « ${m[1]} » repliée ou non` },
  { match: /^cof2:gauge:usage:(.+)$/, describe: (m) => `Jauge d’usage dépliée ou non — ${m[1]}` },
  { match: /^cof2:gauge:companion:(.+)$/, describe: (m) => `Jauge dépliée ou non — compagnon ${m[1]}` },
  { match: /^cof2:gauge:mount:(.+)$/, describe: (m) => `Jauge dépliée ou non — monture ${m[1]}` },
  { match: /^cof2:gauge:gm-init:(.+):compact$/, describe: (m) => `Écran MJ : initiative compacte — personnage ${m[1]}` },
  { match: /^cof2:gauge:gm-init:(.+)$/, describe: (m) => `Écran MJ : jauge d’initiative dépliée — personnage ${m[1]}` },
  { match: /^cof2:inventory:pinned-desc:(.+)$/, describe: (m) => `Inventaire : description épinglée — personnage ${m[1]}` },

  // --- Clés à suffixe dynamique (ancienne nomenclature, encore présentes tant que PER-411 n'a pas nettoyé) ---
  { match: /^sheet-section-collapsed:(.+)$/, describe: (m) => `Fiche : section « ${m[1]} » repliée ou non — ancienne clé` },
  { match: /^cof2-inventory-pinned-desc:(.+)$/, describe: (m) => `Inventaire : description épinglée — personnage ${m[1]} (ancienne clé)` },
  { match: /^gauge-expanded:usage:(.+)$/, describe: (m) => `Jauge d’usage dépliée ou non — ${m[1]} (ancienne clé)` },
  { match: /^gauge-expanded:companion:(.+)$/, describe: (m) => `Jauge dépliée ou non — compagnon ${m[1]} (ancienne clé)` },
  { match: /^gauge-expanded:mount:(.+)$/, describe: (m) => `Jauge dépliée ou non — monture ${m[1]} (ancienne clé)` },
  { match: /^gauge-expanded:gm-init:(.+)$/, describe: (m) => `Écran MJ : jauge d’initiative dépliée — personnage ${m[1]} (ancienne clé)` },
  { match: /^gm-combat:(.+)$/, describe: (m) => `État de combat relogé — personnage ${m[1]}` },
];

function findRule(key: string): Rule | undefined {
  return RULES.find((rule) =>
    typeof rule.match === 'string' ? rule.match === key : rule.match.test(key),
  );
}

/** Libellé humain d'une clé `localStorage`. Générique si non cataloguée. */
export function describeStorageKey(key: string): string {
  const rule = findRule(key);
  if (!rule) return 'Clé technique non cataloguée';
  if (typeof rule.describe === 'string') return rule.describe;
  const match = typeof rule.match === 'string' ? null : key.match(rule.match);
  return match ? rule.describe(match) : 'Clé technique non cataloguée';
}

/** `true` si la clé ne doit jamais être touchée par la réinitialisation globale. */
export function isProtectedStorageKey(key: string): boolean {
  return findRule(key)?.protect ?? false;
}

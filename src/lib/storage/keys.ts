/**
 * Source de vérité unique pour toute clé `localStorage`/zustand `persist` de
 * l'app. Nomenclature cible : `cof2:<domaine>:<sujet>[:<scopeId>]` — un seul
 * préfixe (plus de mélange `cof2-` / `cof2:`), `scopeId` toujours en dernier
 * segment.
 *
 * Ticket PER-408 (fondations) : ce fichier n'est PAS encore branché aux call
 * sites existants (littéraux historiques toujours en place) — voir PER-409.
 *
 * Hors périmètre — NE JAMAIS ajouter ni renommer ici :
 * - `cof2-bestiary` (IndexedDB, pas localStorage, clé gérée dans
 *   `src/lib/bestiary/idb.ts`) ;
 * - `cof2-character-export` (tag `kind` DANS le JSON exporté/importé par les
 *   joueurs — un renommage casse l'import de fiches déjà exportées, voir
 *   `src/lib/character/transfer.ts`).
 */

const PREFIX = 'cof2';

function key(domain: string, subject: string, scopeId?: string): string {
  return scopeId ? `${PREFIX}:${domain}:${subject}:${scopeId}` : `${PREFIX}:${domain}:${subject}`;
}

/** Marqueur posé après la première exécution de la migration rétroactive (voir `migrateLegacyKeys.ts`). */
export const STORAGE_MIGRATION_MARKER_KEY = key('meta', 'storage-migrated-v1');

export const storageKeys = {
  store: {
    characters: key('store', 'characters'),
    preferences: key('store', 'preferences'),
    wizardDraft: key('store', 'wizard-draft'),
    campaignDraft: key('store', 'campaign-draft'),
    tours: key('store', 'tours'),
  },
  auth: {
    lastMethod: key('auth', 'last-method'),
  },
  sheet: {
    pinAbilities: key('sheet', 'pin-abilities'),
    pinDerivedStats: key('sheet', 'pin-derived-stats'),
    pinStatusGauges: key('sheet', 'pin-status-gauges'),
    pinInventory: key('sheet', 'pin-inventory'),
    pinInventoryPurse: key('sheet', 'pin-inventory-purse'),
    pinInventoryCustomItem: key('sheet', 'pin-inventory-custom-item'),
    initiativeBarCollapsed: key('sheet', 'initiative-bar-collapsed'),
    sectionCollapsed: (section: string) => key('sheet', 'section-collapsed', section),
  },
  gmSheet: {
    sectionCollapsed: (section: string) => key('gm-sheet', 'section-collapsed', section),
  },
  // Réglages partagés fiche joueur/MJ (dupliqués à l'identique dans
  // `character/[id]/page.tsx` et `GmSheetDrawer.tsx` — extraits ici en une
  // seule constante).
  testDomains: {
    includeAbility: key('test-domains', 'include-ability'),
    hideZero: key('test-domains', 'hide-zero'),
  },
  gauge: {
    hp: key('gauge', 'hp'),
    mana: key('gauge', 'mana'),
    luck: key('gauge', 'luck'),
    homeDemo: key('gauge', 'home-demo'),
    homeDemoMana: key('gauge', 'home-demo-mana'),
    usage: (statKey: string) => key('gauge', 'usage', statKey),
    companion: (entryKey: string) => key('gauge', 'companion', entryKey),
    mount: (ownedId: string) => key('gauge', 'mount', ownedId),
    gmInit: (characterId: string) => key('gauge', 'gm-init', characterId),
    gmInitCompact: (characterId: string) => key('gauge', 'gm-init', `${characterId}:compact`),
  },
  inventory: {
    grouped: key('inventory', 'grouped'),
    cards: key('inventory', 'cards'),
    pinnedDesc: (characterId: string) => key('inventory', 'pinned-desc', characterId),
  },
  levelUp: {
    simplifiedView: key('level-up', 'simplified-view'),
  },
  initiative: {
    densityCompact: key('initiative', 'density-compact'),
    gmCollapsed: key('initiative', 'gm-collapsed'),
    paletteDetailed: key('initiative', 'palette-detailed'),
    paletteCompact: key('initiative', 'palette-compact'),
  },
  home: {
    sort: key('home', 'sort'),
    archivedOpen: key('home', 'archived-open'),
  },
  campaign: {
    archivedOpen: key('campaign', 'archived-open'),
    settingsPlayersOpen: key('campaign', 'settings-players-open'),
    settingsRulesOpen: key('campaign', 'settings-rules-open'),
    gmScreenPlayersOpen: key('campaign', 'gm-screen-players-open'),
    gmScreenCompanionsOpen: key('campaign', 'gm-screen-companions-open'),
    gmScreenAlliesOpen: key('campaign', 'gm-screen-allies-open'),
    gmScreenEnemiesOpen: key('campaign', 'gm-screen-enemies-open'),
  },
} as const;

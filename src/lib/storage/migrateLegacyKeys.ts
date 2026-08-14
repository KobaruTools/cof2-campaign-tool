/**
 * Migration rétroactive des anciennes clés `localStorage` vers la nomenclature
 * `keys.ts`. Zustand n'a pas de renommage de clé intégré (`persist.migrate`
 * gère les versions DANS une clé, pas le renommage de clé) — copie brute
 * ancienne → nouvelle en best-effort, sans supprimer l'ancienne (call sites
 * pas encore basculés, voir PER-409 ; l'ancienne clé reste lue jusqu'au
 * nettoyage PER-411).
 *
 * Best-effort volontaire : une clé absente ou une exception (mode privé,
 * quota) est silencieusement ignorée. Perte max = un réglage UI retombe à sa
 * valeur par défaut, jamais une perte de données de personnage (les stores
 * zustand sont copiés eux aussi, mais restent lisibles depuis leur ancienne
 * clé tant qu'elle existe).
 *
 * `runStorageMigration()` doit être appelée en module-level, AVANT
 * l'hydratation des stores zustand `persist` (PER-409 la branchera dans les 4
 * stores). Ne tourne qu'une fois (marqueur `STORAGE_MIGRATION_MARKER_KEY`).
 */
import { storageKeys, STORAGE_MIGRATION_MARKER_KEY } from './keys';

// Clés statiques : une ancienne clé → une nouvelle, copie directe.
const STATIC_KEY_MAP: ReadonlyArray<readonly [string, string]> = [
  ['cof2-characters', storageKeys.store.characters],
  ['cof2-preferences', storageKeys.store.preferences],
  ['cof2-wizard-draft', storageKeys.store.wizardDraft],
  ['cof2-campaign-draft', storageKeys.store.campaignDraft],
  ['cof2:last-auth-method', storageKeys.auth.lastMethod],
  ['sheet:pin-abilities', storageKeys.sheet.pinAbilities],
  ['sheet:pin-derived-stats', storageKeys.sheet.pinDerivedStats],
  ['sheet:pin-status-gauges', storageKeys.sheet.pinStatusGauges],
  ['sheet:pin-inventory', storageKeys.sheet.pinInventory],
  ['sheet:pin-inventory-purse', storageKeys.sheet.pinInventoryPurse],
  ['sheet:pin-inventory-custom-item', storageKeys.sheet.pinInventoryCustomItem],
  ['sheet-initiative-bar-collapsed', storageKeys.sheet.initiativeBarCollapsed],
  ['sheet-section-collapsed:equipment', storageKeys.sheet.sectionCollapsed('equipment')],
  ['sheet-section-collapsed:identity', storageKeys.sheet.sectionCollapsed('identity')],
  ['sheet-section-collapsed:notes', storageKeys.sheet.sectionCollapsed('notes')],
  ['sheet-section-collapsed:level-history', storageKeys.sheet.sectionCollapsed('level-history')],
  ['sheet-section-collapsed:gm-sheet:equipment', storageKeys.gmSheet.sectionCollapsed('equipment')],
  ['test-domains:include-ability', storageKeys.testDomains.includeAbility],
  ['test-domains:hide-zero', storageKeys.testDomains.hideZero],
  ['gauge-expanded:hp', storageKeys.gauge.hp],
  ['gauge-expanded:mana', storageKeys.gauge.mana],
  ['gauge-expanded:luck', storageKeys.gauge.luck],
  ['gauge-expanded:home-demo', storageKeys.gauge.homeDemo],
  ['gauge-expanded:home-demo-mana', storageKeys.gauge.homeDemoMana],
  ['cof2-inventory-grouped', storageKeys.inventory.grouped],
  ['cof2-inventory-cards', storageKeys.inventory.cards],
  ['level-up:simplified-view', storageKeys.levelUp.simplifiedView],
  ['initiative-tracker-density-compact', storageKeys.initiative.densityCompact],
  ['gm-screen-initiative-collapsed', storageKeys.initiative.gmCollapsed],
  ['initiative-tracker-palette-detailed', storageKeys.initiative.paletteDetailed],
  ['initiative-tracker-palette-compact', storageKeys.initiative.paletteCompact],
  ['home-sort', storageKeys.home.sort],
  ['home-archived-open', storageKeys.home.archivedOpen],
  ['campaign-archived-open', storageKeys.campaign.archivedOpen],
  ['campaign-settings-players-open', storageKeys.campaign.settingsPlayersOpen],
  ['campaign-settings-rules-open', storageKeys.campaign.settingsRulesOpen],
  ['gm-screen-players-open', storageKeys.campaign.gmScreenPlayersOpen],
  ['gm-screen-companions-open', storageKeys.campaign.gmScreenCompanionsOpen],
  ['gm-screen-allies-open', storageKeys.campaign.gmScreenAlliesOpen],
  ['gm-screen-enemies-open', storageKeys.campaign.gmScreenEnemiesOpen],
];

// Clés à suffixe dynamique (id de personnage, de monture, ...) : pas de table
// statique possible, on scanne `localStorage` par préfixe.
const DYNAMIC_PREFIX_MAP: ReadonlyArray<readonly [string, string]> = [
  ['cof2-inventory-pinned-desc:', 'cof2:inventory:pinned-desc:'],
  ['gauge-expanded:usage:', 'cof2:gauge:usage:'],
  ['gauge-expanded:companion:', 'cof2:gauge:companion:'],
  ['gauge-expanded:mount:', 'cof2:gauge:mount:'],
  ['gauge-expanded:gm-init:', 'cof2:gauge:gm-init:'],
];

function copyKey(oldKey: string, newKey: string): void {
  try {
    if (localStorage.getItem(newKey) !== null) return;
    const value = localStorage.getItem(oldKey);
    if (value === null) return;
    localStorage.setItem(newKey, value);
  } catch {
    // Best-effort : mode privé, quota, etc. — on garde l'ancienne clé.
  }
}

export function runStorageMigration(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(STORAGE_MIGRATION_MARKER_KEY) !== null) return;

    for (const [oldKey, newKey] of STATIC_KEY_MAP) {
      copyKey(oldKey, newKey);
    }

    const existingKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const oldKey = localStorage.key(i);
      if (oldKey !== null) existingKeys.push(oldKey);
    }
    for (const [oldPrefix, newPrefix] of DYNAMIC_PREFIX_MAP) {
      for (const oldKey of existingKeys) {
        if (!oldKey.startsWith(oldPrefix)) continue;
        const suffix = oldKey.slice(oldPrefix.length);
        copyKey(oldKey, `${newPrefix}${suffix}`);
      }
    }

    localStorage.setItem(STORAGE_MIGRATION_MARKER_KEY, '1');
  } catch {
    // Best-effort : localStorage indisponible (mode privé strict, etc.).
  }
}

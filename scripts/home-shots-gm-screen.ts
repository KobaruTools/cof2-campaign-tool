/**
 * Capture de l'**écran de MJ** pour la section « À quoi ça ressemble » de la vitrine.
 *
 * Pourquoi un module à part du reste de `generate-home-shots.ts` : c'est le seul écran
 * de l'application qui vit DERRIÈRE l'authentification et qui lit ses données dans le
 * cloud (campagne, joueurs, combat en cours). Les autres captures se contentent de
 * visiter une page publique ; celle-ci doit d'abord se doter d'une session et d'une
 * campagne — d'où une mécanique propre, isolée ici pour ne pas alourdir le script.
 *
 * ## Comment on entre
 *
 * 1. **Session anonyme Supabase** (`POST /auth/v1/signup`). Le gating de routes
 *    (`src/lib/auth/routeAccess.ts`) est appliqué par le proxy, donc CÔTÉ SERVEUR :
 *    aucune interception de navigateur ne peut le contourner, il faut une vraie
 *    session. Un utilisateur anonyme suffit : `roleOfUser` ne lui trouve ni
 *    `player_id` ni `projection`, il vaut donc `owner` pour le gating. Rien de plus
 *    n'est accordé pour autant — la RLS refuse à un anonyme la moindre campagne
 *    (`not public.is_anonymous()`, migration 0003), ce qui nous convient : les
 *    données de la démonstration ne viennent pas de la base.
 * 2. **Cookie de session** au format `@supabase/ssr` (`base64-` + base64url du JSON),
 *    posé sur le contexte du navigateur pour que le proxy comme le client le lisent.
 * 3. **Interception des lectures cloud** propres à la campagne (campagne, joueurs,
 *    combat, personnages) : elles répondent la FIXTURE ci-dessous. Tout le reste passe
 *    au vrai Supabase — en particulier le **bestiaire**, dont la source libre (DRS) est
 *    lisible par une session anonyme : les créatures du combat sont donc les VRAIES,
 *    blocs de statistiques compris.
 *
 * Aucune écriture n'atteint la base : les requêtes d'écriture de la page (l'écran de MJ
 * republie l'affichage des créatures à mesure que les blocs se chargent) sont absorbées
 * par la même interception. La seule trace laissée est l'utilisateur anonyme créé pour
 * la session, du même ordre que la visite d'un joueur invité.
 *
 * ## Ce que la capture montre
 *
 * Une manche de combat en cours, cartes compactes (le tracker d'initiative devient
 * alors une bande collée en bas de l'écran, qui tient treize combattants d'un coup
 * d'œil) : cinq personnages joueurs de niveau 20 tirés des recettes du dépôt, deux
 * alliés et six adversaires du bestiaire, des points de vie entamés, des états
 * préjudiciables posés avec leur compteur de tours, et une créature préparée mais
 * encore masquée aux joueurs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Page } from 'playwright';

/** Nom du fichier produit (`public/home/<slug>.webp`) et de l'onglet de la vitrine. */
export const GM_SHOT_SLUG = 'gm-screen';

/**
 * Identifiant de la campagne de démonstration. Un UUID **fixe** : il apparaît dans
 * l'URL visitée et sert de clé aux réponses interceptées, autant qu'il ne bouge pas
 * d'une génération à l'autre.
 */
const CAMPAIGN_ID = 'd7c1f0a2-5b64-4e39-9f0c-1a2b3c4d5e6f';

const CAMPAIGN_NAME = 'Les Cendres de Valmourne';

/**
 * Joueurs de la table. `lastSeenAt` alimente la présence (PER-195) : deux joueurs
 * viennent d'être vus, un a été vu il y a un moment, un dernier n'a jamais activé
 * son lien — l'écran de MJ montre ainsi ses trois états de présence.
 */
interface DemoPlayer {
  id: string;
  name: string;
  /** Minutes depuis la dernière activité, ou `null` pour « jamais connecté ». */
  seenMinutesAgo: number | null;
}

const PLAYERS: DemoPlayer[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Camille', seenMinutesAgo: 0 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Théo', seenMinutesAgo: 1 },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Awa', seenMinutesAgo: 2 },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Naïm', seenMinutesAgo: 40 },
  { id: '55555555-5555-4555-8555-555555555555', name: 'Louis', seenMinutesAgo: null },
  { id: '66666666-6666-4666-8666-666666666666', name: 'Inès', seenMinutesAgo: 3 },
];

/**
 * Personnages de la table : une recette du dépôt (donc un personnage aux voies et à
 * l'équipement COMPLETS, calculé par le vrai moteur), renommée pour l'affichage et
 * rattachée à un joueur. `hp`/`mana` sont les MANQUES à afficher sur les jauges — un
 * combat entamé, pas une table qui commence.
 */
interface DemoCharacter {
  fixture: string;
  name: string;
  playerIndex: number;
  hp: number;
  mana?: number;
  portraitVariant?: 'alt';
}

const PARTY: DemoCharacter[] = [
  { fixture: 'test-chevalier-humain.json', name: 'Aldric', playerIndex: 0, hp: 21 },
  { fixture: 'test-rodeur-humain.json', name: 'Sylwen', playerIndex: 1, hp: 8 },
  { fixture: 'test-magicien-gnome.json', name: 'Nissa', playerIndex: 2, hp: 4, mana: 17 },
  {
    fixture: 'test-pretre-gnome.json',
    name: 'Bertold',
    playerIndex: 3,
    hp: 13,
    mana: 9,
    portraitVariant: 'alt',
  },
  { fixture: 'test-voleur-humain.json', name: 'Kesh', playerIndex: 4, hp: 26 },
  { fixture: 'test-barbare-humain.json', name: 'Torvald', playerIndex: 5, hp: 34 },
];

/**
 * Roster du combat. Les slugs sont ceux du bestiaire libre (source DRS) : les blocs
 * de statistiques sont donc chargés pour de vrai depuis la base. Deux gardes du même
 * slug pour montrer la numérotation des homonymes, et une abomination **préparée mais
 * masquée** aux joueurs (l'œil fermé de la carte).
 */
const CREATURES = [
  { id: 'gm-shot-e1', slug: 'momie-auguste', side: 'enemy', name: 'Sethis' },
  { id: 'gm-shot-e2', slug: 'momie', side: 'enemy' },
  { id: 'gm-shot-e3', slug: 'momie', side: 'enemy' },
  { id: 'gm-shot-e4', slug: 'squelette-geant', side: 'enemy' },
  { id: 'gm-shot-e5', slug: 'squelette-geant', side: 'enemy' },
  { id: 'gm-shot-e6', slug: 'goule-abomination', side: 'enemy', visible: false },
  { id: 'gm-shot-a1', slug: 'garde-de-la-ville', side: 'ally' },
  { id: 'gm-shot-a2', slug: 'garde-de-la-ville', side: 'ally' },
] as const;

/** Manches déjà jouées (« Tour 3 » sur la bande d'initiative). */
const ROUND_NUMBER = 3;

/** Manque de points de vie par instance de créature. */
const CREATURE_HP_LOSS: Record<string, number> = {
  'gm-shot-e1': 24,
  'gm-shot-e2': 11,
  'gm-shot-e4': 33,
  'gm-shot-a1': 7,
};

/**
 * États préjudiciables posés par le MJ, indexés comme dans l'application : id de
 * personnage OU id d'instance de créature. `untilRound` est la DERNIÈRE manche
 * couverte (borne inclusive, PER-305) — avec `ROUND_NUMBER` à 3, un `untilRound: 4`
 * s'affiche « encore 2 tours ».
 */
const STATUSES: Record<string, { id: string; intensity?: number; untilRound?: number }[]> = {
  'gm-shot-e1': [{ id: 'slowed' }],
  'gm-shot-e4': [{ id: 'dazed', untilRound: 4 }],
  'gm-shot-e2': [{ id: 'prone' }],
  'gm-shot-a2': [{ id: 'blinded', untilRound: 3 }],
};

/** États posés sur les personnages joueurs, par leur RANG dans `PARTY`. */
const PARTY_STATUSES: Record<number, { id: string; untilRound?: number }[]> = {
  0: [{ id: 'prone' }],
  2: [{ id: 'blinded', untilRound: 5 }],
  4: [{ id: 'immobilized' }],
};

/** Personnage dont c'est le tour (rang dans `PARTY`) : la bande le met en avant. */
const CURRENT_TURN_PARTY_INDEX = 1;

/** Clé `localStorage` du store `characters` (cf. son bloc `persist`). */
const CHARACTERS_STORAGE_KEY = 'cof2-characters';

/**
 * Clé `localStorage` de la densité du tracker (cf. `InitiativeTracker`). Le mode
 * compact est le sujet même de la capture : plus de combattants d'un coup d'œil, et
 * la bande d'initiative collée en bas de l'écran.
 */
const COMPACT_STORAGE_KEY = 'initiative-tracker-density-compact';

/**
 * Longueur maximale d'un cookie avant que `@supabase/ssr` ne le DÉCOUPE en tranches
 * (`MAX_CHUNK_SIZE`). On préfère échouer clairement que reproduire ici son
 * découpage : une session Supabase tient très largement sous cette limite.
 */
const COOKIE_CHUNK_LIMIT = 3180;

/** Chemin de l'écran de MJ de la campagne de démonstration. */
export const gmScreenPath = () => `/campaign/${CAMPAIGN_ID}/gm-screen`;

export interface GmScreenOptions {
  baseUrl: string;
  supabaseUrl: string;
  publishableKey: string;
  viewport: { width: number; height: number };
}

/** Horodatage ISO d'il y a `minutes` minutes. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** Ouvre une session ANONYME et retourne le JSON de session tel que Supabase l'émet. */
async function signInAnonymously(supabaseUrl: string, publishableKey: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: {} }),
  });
  const session = (await response.json()) as { access_token?: string; user?: unknown };
  if (!response.ok || !session.access_token) {
    throw new Error(
      `connexion anonyme refusée (${response.status}) — les connexions anonymes sont-elles ` +
        'activées sur le projet Supabase (`enable_anonymous_sign_ins`) ?',
    );
  }
  return session;
}

/**
 * Cookie de session au format attendu par `@supabase/ssr` : nom dérivé de la
 * référence du projet, valeur `base64-` + base64url du JSON de session.
 */
function sessionCookie(supabaseUrl: string, session: unknown, host: string) {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const value = `base64-${Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')}`;
  if (value.length > COOKIE_CHUNK_LIMIT) {
    throw new Error(
      'la session dépasse la taille d’un cookie unique : @supabase/ssr la découperait en ' +
        'tranches, ce que ce script ne reproduit pas.',
    );
  }
  return {
    name: `sb-${projectRef}-auth-token`,
    value,
    domain: host,
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  };
}

/** Ligne `campaigns` de la campagne de démonstration, telle que la base la rendrait. */
function campaignRow(ownerId: string) {
  return {
    id: CAMPAIGN_ID,
    owner_id: ownerId,
    name: CAMPAIGN_NAME,
    description:
      'La cité basse est tombée. Ce qui remonte des catacombes ne cherche pas de rançon.',
    rules: { firearmsAllowed: false, hitDieOnLevelUp: true },
    rumors: [],
    loot: [],
    created_at: minutesAgo(60 * 24 * 90),
    updated_at: minutesAgo(12),
  };
}

/** Lignes `players` de la campagne. */
function playerRows() {
  return PLAYERS.map((player, index) => ({
    id: player.id,
    campaign_id: CAMPAIGN_ID,
    name: player.name,
    join_secret: `00000000-0000-4000-8000-00000000000${index}`,
    created_at: minutesAgo(60 * 24 * 90),
    first_joined_at: player.seenMinutesAgo === null ? null : minutesAgo(60 * 24 * 80),
    last_seen_at: player.seenMinutesAgo === null ? null : minutesAgo(player.seenMinutesAgo),
  }));
}

/**
 * Personnages de la table, prêts pour le `localStorage` : la recette du dépôt,
 * renommée, rattachée à son joueur et à la campagne, points de vie et mana entamés.
 */
function partyCharacters(cwd: string) {
  return PARTY.map((entry) => {
    const raw = JSON.parse(
      readFileSync(join(cwd, 'examples', 'characters', entry.fixture), 'utf8'),
    ) as Record<string, unknown>;
    const depletion: Record<string, unknown> = { hp: { lethal: entry.hp, temp: 0 } };
    if (entry.mana !== undefined) depletion.mana = entry.mana;
    return {
      ...raw,
      name: entry.name,
      campaignId: CAMPAIGN_ID,
      playerId: PLAYERS[entry.playerIndex].id,
      ...(entry.portraitVariant ? { portraitVariant: entry.portraitVariant } : {}),
      depletion,
    };
  });
}

/** État de combat en cours (forme `GmCombatState`), servi à la place de la table. */
function combatState(characters: readonly Record<string, unknown>[]) {
  const depletions: Record<string, unknown> = {};
  for (const [instanceId, lethal] of Object.entries(CREATURE_HP_LOSS)) {
    depletions[instanceId] = { hp: { lethal, temp: 0 } };
  }
  const statuses: Record<string, unknown> = { ...STATUSES };
  for (const [index, applied] of Object.entries(PARTY_STATUSES)) {
    statuses[String(characters[Number(index)].id)] = applied;
  }
  return {
    creatures: CREATURES.map((creature) => ({ ...creature })),
    nextInstanceId: CREATURES.length + 1,
    depletions,
    currentTurnKey: String(characters[CURRENT_TURN_PARTY_INDEX].id),
    roundNumber: ROUND_NUMBER,
    statuses,
    // Départage des égalités d'initiative : une graine fixe, pour que l'ordre affiché
    // soit le même à chaque génération de la capture.
    tieBreakSeed: 20_260_806,
    creatureInfo: {},
  };
}

/**
 * Ouvre l'écran de MJ de la campagne de démonstration dans un contexte dédié et
 * retourne la page, prête à photographier.
 */
export async function openGmScreen(browser: Browser, opts: GmScreenOptions): Promise<Page> {
  const session = await signInAnonymously(opts.supabaseUrl, opts.publishableKey);
  const ownerId =
    (session.user as { id?: string } | undefined)?.id ?? '00000000-0000-4000-8000-000000000000';

  const characters = partyCharacters(process.cwd());
  const combat = combatState(characters);

  const context = await browser.newContext({ viewport: opts.viewport });
  await context.addCookies([
    sessionCookie(opts.supabaseUrl, session, new URL(opts.baseUrl).hostname),
  ]);

  // Réponses de la campagne de démonstration. Les tables NON listées ici (bestiaire,
  // sources) partent au vrai Supabase : la session anonyme y lit la source libre.
  const rows: Record<string, unknown[]> = {
    campaigns: [campaignRow(ownerId)],
    players: playerRows(),
    campaign_combat: [{ state: combat }],
    // Les personnages de la table sont injectés en `localStorage` (l'application est
    // locale d'abord) : le cloud n'en connaît aucun.
    characters: [],
    // Aucune session de jeu en cours : l'indicateur d'en-tête reste au repos plutôt
    // que d'afficher une erreur de lecture.
    game_sessions: [],
  };

  await context.route(`${opts.supabaseUrl}/rest/v1/**`, async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const body = rows[table];
    if (body === undefined) return route.continue();
    // Écritures de la page (republication de l'affichage des créatures) : acquittées
    // sans rien envoyer à la base.
    if (route.request().method() !== 'GET') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await context.addInitScript(
    ([charactersKey, charactersPayload, compactKey]) => {
      window.localStorage.setItem(charactersKey, charactersPayload);
      window.localStorage.setItem(compactKey, 'true');
    },
    [
      CHARACTERS_STORAGE_KEY,
      JSON.stringify({ state: { characters, cloudBackedIds: [] }, version: 0 }),
      COMPACT_STORAGE_KEY,
    ] as const,
  );

  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${opts.baseUrl}${gmScreenPath()}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  return page;
}

/**
 * Cadrage de cette capture, plus HAUT que celui des autres écrans (cf. `VIEWPORT` du
 * script) : les six cartes de personnages tiennent sur deux rangées, et la bande
 * d'initiative compacte occupe à elle seule le bas de la fenêtre. À 900 px de haut, la
 * seconde rangée serait coupée en deux par la bande.
 */
export const GM_SHOT_VIEWPORT = { width: 1440, height: 1390 } as const;

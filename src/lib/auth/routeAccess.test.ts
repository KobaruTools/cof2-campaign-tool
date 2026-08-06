import { describe, expect, it } from 'vitest';

import { decideRouteAccess } from './routeAccess';
import { roleOfUser, type SessionRole } from './sessionRole';

/** Raccourci de lecture : la route est-elle ouverte à ce rôle ? */
const allows = (pathname: string, role: SessionRole) =>
  decideRouteAccess(pathname, role).allow;

/** Destination de renvoi (ou `null` si la route est ouverte). */
const redirectOf = (pathname: string, role: SessionRole) => {
  const decision = decideRouteAccess(pathname, role);
  return decision.allow ? null : decision.redirectTo;
};

describe('roleOfUser', () => {
  it('sans utilisateur, la session est anonyme', () => {
    expect(roleOfUser(null)).toBe('anonymous');
    expect(roleOfUser(undefined)).toBe('anonymous');
  });

  it('un compte réel (aucun claim applicatif) est propriétaire', () => {
    expect(roleOfUser({ app_metadata: {} })).toBe('owner');
    expect(roleOfUser({ app_metadata: null })).toBe('owner');
    // `app_metadata` contient aussi des clés Supabase (provider…) : sans claim
    // applicatif, c'est un propriétaire.
    expect(roleOfUser({ app_metadata: { campaign_id: 'c1' } })).toBe('owner');
  });

  it('le claim `player_id` désigne un joueur invité', () => {
    expect(roleOfUser({ app_metadata: { player_id: 'p1', campaign_id: 'c1' } })).toBe('player');
  });

  it('le claim `projection` est résolu AVANT le joueur (il n’a pas de player_id)', () => {
    expect(roleOfUser({ app_metadata: { projection: true, campaign_id: 'c1' } })).toBe(
      'projection',
    );
  });
});

describe('decideRouteAccess — visiteur sans session', () => {
  it('la vitrine et les pages publiques sont ouvertes', () => {
    expect(allows('/', 'anonymous')).toBe(true);
    expect(allows('/login', 'anonymous')).toBe(true);
    expect(allows('/about', 'anonymous')).toBe(true);
    expect(allows('/privacy', 'anonymous')).toBe(true);
    expect(allows('/join', 'anonymous')).toBe(true);
    expect(allows('/join/8f1c2e0a-1111-2222-3333-444455556666', 'anonymous')).toBe(true);
    expect(allows('/auth/callback', 'anonymous')).toBe(true);
  });

  it("l'atelier de personnage est ouvert sans compte (l'app est locale d'abord)", () => {
    // N'importe qui peut créer un personnage : il vit dans le localStorage du
    // navigateur, le cloud n'étant qu'une synchronisation optionnelle.
    expect(allows('/characters', 'anonymous')).toBe(true);
    expect(allows('/create', 'anonymous')).toBe(true);
    expect(allows('/character/abc', 'anonymous')).toBe(true);
  });

  it('le contenu de règles est ouvert sans compte (DRS en accès libre)', () => {
    // Le gating du contenu PAYANT ne passe pas par ici : il est porté par la RLS
    // (`current_user_is_entitled`, fail-safe sur `is_anonymous()`) et par le bucket
    // privé des PDF payants. `/pdf` doit suivre `/rules` — sinon pdf.js reçoit une
    // redirection au lieu du document.
    for (const path of ['/bestiary', '/reference', '/rules/core-rulebook/12', '/pdf/core.pdf']) {
      expect(allows(path, 'anonymous')).toBe(true);
    }
  });

  it("l'UI propriétaire renvoie vers la connexion, avec report de la destination", () => {
    const decision = decideRouteAccess('/campaigns', 'anonymous');
    expect(decision).toEqual({ allow: false, redirectTo: '/login', withNext: true });
    expect(redirectOf('/campaign/c1', 'anonymous')).toBe('/login');
    expect(redirectOf('/account', 'anonymous')).toBe('/login');
    expect(redirectOf('/play', 'anonymous')).toBe('/login');
  });
});

describe('decideRouteAccess — session joueur (lien du MJ)', () => {
  it('navigue librement sur la vitrine et le contenu de règles', () => {
    for (const path of [
      '/',
      '/bestiary',
      '/reference',
      '/rules/core-rulebook/1',
      '/pdf/core-rulebook.pdf',
    ]) {
      expect(allows(path, 'player')).toBe(true);
    }
  });

  it('atteint la connexion pour se créer un compte', () => {
    expect(allows('/login', 'player')).toBe(true);
  });

  it('garde son espace et ses fiches', () => {
    expect(allows('/play', 'player')).toBe(true);
    expect(allows('/play/initiative', 'player')).toBe(true);
    expect(allows('/characters', 'player')).toBe(true);
    expect(allows('/character/abc', 'player')).toBe(true);
    expect(allows('/create', 'player')).toBe(true);
  });

  it("reste hors de l'UI propriétaire, renvoyé vers son espace", () => {
    for (const path of ['/campaigns', '/campaign/c1', '/account']) {
      expect(redirectOf(path, 'player')).toBe('/play');
    }
  });
});

describe('decideRouteAccess — session de projection', () => {
  it('reste confinée à sa vue — vitrine, contenu et atelier inclus', () => {
    expect(allows('/project', 'projection')).toBe(true);
    for (const path of ['/', '/bestiary', '/reference', '/play', '/characters', '/create']) {
      expect(redirectOf(path, 'projection')).toBe('/project');
    }
  });
});

describe('decideRouteAccess — session propriétaire', () => {
  it('accède à la vitrine, au contenu et à son UI', () => {
    for (const path of [
      '/',
      '/characters',
      '/campaigns',
      '/campaign/c1/gm-screen',
      '/bestiary',
      '/reference',
      '/rules/core-rulebook/1',
      '/pdf/core-rulebook.pdf',
      '/account',
      '/create',
      '/character/abc',
    ]) {
      expect(allows(path, 'owner')).toBe(true);
    }
  });

  it("l'espace joueur lui est fermé (exclusif au joueur) et le ramène à la vitrine", () => {
    expect(redirectOf('/play', 'owner')).toBe('/');
    expect(redirectOf('/play/initiative', 'owner')).toBe('/');
  });

  it('aucune redirection ne demande de report `?next=` (déjà authentifié)', () => {
    const decision = decideRouteAccess('/play', 'owner');
    expect(decision.allow === false && decision.withNext).toBe(false);
  });
});

describe('decideRouteAccess — pièges de préfixes', () => {
  it('« / » est un chemin EXACT : il n’ouvre pas tout le site au visiteur anonyme', () => {
    // Garde-fou : si `/` était traité comme un préfixe, `matchesPrefix` ouvrirait
    // n'importe quelle route à un visiteur sans session.
    expect(allows('/campaigns', 'anonymous')).toBe(false);
    expect(allows('/campaign/c1/gm-screen', 'anonymous')).toBe(false);
  });

  it('« /characters » n’est PAS couvert par le préfixe « /character »', () => {
    // Les deux doivent être listés : `/characters` ne commence pas par `/character/`.
    // Le jour où l'un des deux quitterait la liste, ce test tombe.
    expect(allows('/characters', 'anonymous')).toBe(true);
    expect(allows('/character/abc', 'anonymous')).toBe(true);
  });

  it('« /campaigns » et « /campaign/... » restent propriétaire', () => {
    expect(allows('/campaigns', 'owner')).toBe(true);
    expect(allows('/campaign/c1', 'owner')).toBe(true);
    expect(allows('/campaigns', 'player')).toBe(false);
  });
});

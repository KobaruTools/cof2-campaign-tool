/**
 * Décision de gating des routes, **pure** (aucune dépendance à Next ni à Supabase)
 * pour être testable seule. Le proxy (`updateSession`) ne fait que résoudre le rôle
 * de la session puis appliquer la décision rendue ici.
 *
 * Le périmètre par rôle (PER-189/191, révisé avec la vitrine publique) :
 *
 * | Route                                     | anonyme | joueur | projection | proprio |
 * |-------------------------------------------|---------|--------|------------|---------|
 * | `/` (vitrine)                             |   oui   |  oui   |    non     |   oui   |
 * | `/login` `/auth` `/join` `/about` …       |   oui   |  oui   |    oui     |   oui   |
 * | `/characters` `/character/*` `/create`    |   oui   |  oui   |    non     |   oui   |
 * | `/bestiary` `/reference` `/rules` `/pdf` `/codex` |   oui   |  oui   |    non     |   oui   |
 * | `/play`                                   |   non   |  oui   |    non     |   non   |
 * | `/campaigns` `/campaign/*` `/account`     |   non   |  non   |    non     |   oui   |
 *
 * Il ne reste donc derrière l'authentification que ce qui est **par nature** rattaché à
 * un compte : les campagnes, l'écran de MJ, les réglages de compte — et l'espace joueur,
 * exclusif à l'invité. On garde malgré tout des listes d'autorisation explicites plutôt
 * qu'une liste d'interdiction : une route nouvelle doit exiger un compte PAR DÉFAUT, pas
 * s'ouvrir par oubli.
 */
import type { SessionRole } from './sessionRole';

/**
 * Vitrine publique. Contrairement aux préfixes ci-dessous, c'est un chemin EXACT :
 * `/` ne saurait servir de préfixe (il couvrirait tout le site).
 */
const HOME_PATH = '/';

/**
 * Préfixes de routes **publiques** : atteignables sans aucune session.
 * - `/login` : écran de connexion / création de compte (PER-188) ;
 * - `/auth` : callback PKCE + déconnexion (`/auth/callback`, `/auth/signout`) ;
 * - `/join` : landing du lien d'invitation joueur (PER-189/191) ;
 * - `/about` : page d'information publique, liée depuis le pied de page ;
 * - `/privacy` : politique de vie privée (RGPD) — un document légal doit rester
 *   consultable sans compte ;
 * - `/project` : lien de projection (PER-271), une TV n'a pas de compte.
 */
const PUBLIC_PATH_PREFIXES = ['/login', '/auth', '/join', '/about', '/privacy', '/project'] as const;

/**
 * Routes de **contenu de règles** : ouvertes à TOUT LE MONDE, visiteur sans compte
 * compris (le contenu est consultable depuis la vitrine, sans détour par la connexion).
 *
 * Le contenu servi ainsi est celui du **DRS** (Document de Référence du Système), mis
 * en accès libre et gratuit par l'éditeur — c'est l'unique source non payante en base
 * (vérifié : une session anonyme ne voit que `sources.slug = 'drs'`).
 *
 * Le gating par source **payante** reste porté par la base, sans une ligne de code
 * ici : `current_user_is_entitled` (migration 0007) est fail-safe sur
 * `public.is_anonymous()`, et les PDF payants vivent dans un bucket privé exigeant une
 * requête authentifiée (PER-252). Un visiteur anonyme ne peut donc rien en tirer.
 *
 * `/pdf` sert le fichier lui-même (`public/pdf/`), lu par pdf.js : il doit suivre
 * exactement le même périmètre que la page du visualiseur, sinon pdf.js reçoit une
 * redirection au lieu du document.
 *
 * `/codex` (PER-418) : bibliothèque de règles consultable hors personnage, même
 * périmètre public que `/bestiary`/`/reference` — le gating du contenu PAYANT qu'elle
 * liste (voies du Compagnon) reste porté par les registres (`contentRegistry.ts`), pas
 * par cette liste de préfixes.
 */
const CONTENT_PATH_PREFIXES = ['/bestiary', '/reference', '/rules', '/pdf', '/codex'] as const;

/**
 * Routes de l'**atelier de personnage** : ouvertes à TOUT LE MONDE, visiteur sans
 * compte compris.
 *
 * L'application est **locale d'abord** (zustand + `persist` localStorage, cf. le store
 * `characters`) : n'importe qui peut créer un personnage, le consulter et le faire
 * monter en niveau sans compte — le cloud n'est qu'une synchronisation optionnelle,
 * proposée quand on se connecte. Fermer ces routes reviendrait à exiger un compte pour
 * une fonctionnalité qui n'en a jamais eu besoin.
 *
 * `/characters` et `/character` sont deux préfixes DISTINCTS : `/characters` ne
 * commence pas par `/character/`, il ne serait donc pas couvert par le second.
 *
 * Le joueur invité y accède aussi (PER-196 : sa fiche est attribuée à lui dans sa
 * campagne, le scope réel étant porté par la RLS/trigger).
 */
const CHARACTER_PATH_PREFIXES = ['/characters', '/character', '/create'] as const;

/**
 * Routes **exclusives au joueur** invité : son espace de campagne. Le propriétaire
 * n'y a rien à faire (il a sa vue campagne et son écran de MJ).
 */
const PLAYER_ONLY_PATH_PREFIXES = ['/play'] as const;

/** Décision de gating pour un couple (chemin, rôle). */
export type RouteAccess =
  | { allow: true }
  | {
      allow: false;
      /** Chemin de redirection. */
      redirectTo: string;
      /**
       * `true` quand la destination visée doit être reportée en `?next=` pour y
       * revenir après connexion (cas du visiteur non authentifié seulement).
       */
      withNext: boolean;
    };

const ALLOW: RouteAccess = { allow: true };

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Chemin public au sens strict (y compris pour une session de projection). */
function isPublicPath(pathname: string): boolean {
  return matchesPrefix(pathname, PUBLIC_PATH_PREFIXES);
}

/**
 * Chemin ouvert au visiteur sans session : les routes publiques **plus** la vitrine.
 * La projection en est exclue (elle reste confinée à sa vue).
 */
function isOpenPath(pathname: string): boolean {
  return pathname === HOME_PATH || isPublicPath(pathname);
}

/**
 * Décide si `role` peut atteindre `pathname`, et sinon où le renvoyer.
 *
 * Contrôle **optimiste** (le proxy lit la session côté cookie), conforme à la doc
 * Next 16 : la sécurité porteuse reste la RLS Supabase côté données.
 */
export function decideRouteAccess(pathname: string, role: SessionRole): RouteAccess {
  switch (role) {
    case 'anonymous':
      // Vitrine, pages publiques, atelier de personnage (local d'abord) et contenu de
      // règles (DRS libre). Le reste renvoie à la connexion, en reportant la destination
      // visée via `?next=`.
      return isOpenPath(pathname) ||
        matchesPrefix(pathname, CHARACTER_PATH_PREFIXES) ||
        matchesPrefix(pathname, CONTENT_PATH_PREFIXES)
        ? ALLOW
        : { allow: false, redirectTo: '/login', withNext: true };

    case 'projection':
      // Observateur lecture seule (PER-271) : confiné à sa vue. Il n'a rien à faire
      // ailleurs — ni vitrine, ni contenu, ni atelier, ni UI propriétaire.
      return isPublicPath(pathname)
        ? ALLOW
        : { allow: false, redirectTo: '/project', withNext: false };

    case 'player':
      return isOpenPath(pathname) ||
        matchesPrefix(pathname, CHARACTER_PATH_PREFIXES) ||
        matchesPrefix(pathname, CONTENT_PATH_PREFIXES) ||
        matchesPrefix(pathname, PLAYER_ONLY_PATH_PREFIXES)
        ? ALLOW
        : { allow: false, redirectTo: '/play', withNext: false };

    case 'owner':
      // Tout lui est ouvert sauf l'espace joueur, exclusif à l'invité.
      return matchesPrefix(pathname, PLAYER_ONLY_PATH_PREFIXES)
        ? { allow: false, redirectTo: HOME_PATH, withNext: false }
        : ALLOW;
  }
}

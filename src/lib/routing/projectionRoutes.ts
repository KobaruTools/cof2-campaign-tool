/**
 * Routes de PROJECTION du tracker d'initiative, volontairement DÉPOUILLÉES (pas de header, pas de
 * footer, ni titre, ni fond). Source UNIQUE partagée par `AppHeader` et `AppFooter` — avant cette
 * extraction, seul `AppFooter` filtrait par chemin ; `AppHeader` ne se cachait que par RÔLE de
 * session (`sessionRole === 'projection'`), ce qui ne couvre pas la fenêtre projetée OWNER
 * (`/campaign/<cid>/gm-screen/tracker`, ouverte depuis la propre session du MJ — rôle `owner`, pas
 * `projection`) : l'en-tête y réapparaissait dès que `AppHeaderShell` est devenu un montage global
 * unique (`layout.tsx`) au lieu d'une omission par page.
 *  - `/campaign/<cid>/gm-screen/tracker` : fenêtre projetée owner (second écran, PER-248) ;
 *  - `/project` : lien de projection partageable cross-machine (PER-271), même rendu ;
 *  - `/play/initiative` : vue joueur de l'ordre d'initiative (PER-293), aligné sur le même
 *    rendu dépouillé (PER-271) — un joueur y atterrit depuis le lien de projection.
 */
const PROJECTION_ROUTES = [
  /^\/campaign\/[^/]+\/gm-screen\/tracker\/?$/,
  /^\/project\/?$/,
  /^\/play\/initiative\/?$/,
];

export function isProjectionRoute(pathname: string | null): boolean {
  return !!pathname && PROJECTION_ROUTES.some((route) => route.test(pathname));
}

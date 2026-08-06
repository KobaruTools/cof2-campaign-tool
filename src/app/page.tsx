import type { Metadata } from 'next';

import { HomeLanding } from '@/components/home/HomeLanding';
import { resolveServerSessionRole } from '@/lib/supabase/serverRole';

/**
 * Accueil `/` = **vitrine** de l'application, consultable SANS session (cf.
 * `decideRouteAccess`). Elle a remplacé la liste des personnages, désormais sur
 * `/characters`.
 *
 * Ce shell est un Server Component au périmètre volontairement minuscule : il ne
 * fait que résoudre le rôle de la session côté serveur, pour que la navigation et
 * les appels à l'action soient justes dès le premier rendu (c'est la seule page où
 * un visiteur sans session atterrit vraiment). Tout le rendu vit dans `HomeLanding`,
 * composant CLIENT — ses appels à l'action sont de vraies ancres `component={Link}`,
 * et un composant ne peut pas franchir la frontière serveur → client en prop.
 */
export const metadata: Metadata = {
  title: 'Éditeur de personnage CO2 — Chroniques Oubliées Fantasy 2e édition',
};

export default async function HomePage() {
  const role = await resolveServerSessionRole();
  return <HomeLanding role={role} />;
}

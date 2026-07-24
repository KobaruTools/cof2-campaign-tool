// Slot parallèle `@viewer` (PER-60) : repli au chargement dur d'une route qui n'ouvre pas le
// visualiseur → le slot ne rend rien. L'overlay n'apparaît que via interception (navigation douce).
export default function ViewerDefault() {
  return null;
}

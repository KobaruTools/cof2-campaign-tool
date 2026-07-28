/**
 * Lien croisé entre créatures dans la prose de règle. Un token
 * `[[creature:<slug>|<libellé>]]` (ex. `[[creature:spore-zombie|voir cette créature]]`)
 * est rendu en ancre vers la fiche de la créature dans le bestiaire. `slug` = id de
 * contenu (kebab-case, persisté) ; `libellé` = texte affiché du lien. Mécanisme GÉNÉRAL,
 * réutilisable dans tout texte passé par `RichTextRun` (capacités, descriptions).
 */

/** Href de la fiche d'une créature dans le bestiaire (sélection pilotée par `?c=`). */
export function bestiaryCreatureHref(slug: string): string {
  return `/bestiary?c=${encodeURIComponent(slug)}`;
}

export type CreatureLinkSegment =
  | { kind: 'text'; value: string }
  | { kind: 'link'; slug: string; label: string };

// `[[creature:<slug>|<libellé>]]` — slug kebab-case, libellé = tout sauf `]`.
const CREATURE_LINK = /\[\[creature:([a-z0-9-]+)\|([^\]]+)\]\]/g;

/** Découpe une chaîne en segments texte / lien créature, dans l'ordre d'apparition. */
export function splitCreatureLinks(value: string): CreatureLinkSegment[] {
  const segments: CreatureLinkSegment[] = [];
  let last = 0;
  for (const m of value.matchAll(CREATURE_LINK)) {
    const start = m.index ?? 0;
    if (start > last) segments.push({ kind: 'text', value: value.slice(last, start) });
    segments.push({ kind: 'link', slug: m[1], label: m[2] });
    last = start + m[0].length;
  }
  if (last < value.length) segments.push({ kind: 'text', value: value.slice(last) });
  return segments;
}

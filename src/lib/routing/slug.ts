'use client';

/**
 * URLs lisibles pour les campagnes et personnages (`/campaign/<slug>`, `/character/<slug>`),
 * résolues entièrement CÔTÉ CLIENT depuis les stores déjà chargés (pas de colonne DB, pas de
 * migration) : le slug est le nom normalisé, SANS suffixe la plupart du temps.
 *
 * DÉSAMBIGUÏSATION (homonymes) : elle ne se décide qu'en regardant TOUTE la liste (`buildSlugIndex`).
 * Le PREMIER CRÉÉ (`createdAt`) garde le nom nu ; seuls les suivants héritent d'un suffixe (8
 * caractères hex de leur id). Un lien déjà partagé sur le tout premier « Gald Hun » survit donc
 * à l'arrivée d'un second personnage du même nom — seul le second voit son URL se distinguer.
 *
 * Un lien historique (UUID complet, ou ancien slug suffixé dont la collision a depuis disparu —
 * l'homonyme renommé ou supprimé) reste résolu par `resolveBySlugOrId` puis canonisé vers le slug
 * courant par `useCanonicalRedirect` : la rétrocompatibilité est automatique, sans table de
 * redirection à maintenir.
 */
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeSearchText } from '@/lib/ui/searchText';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import type { Character } from '@/lib/character/types';
import type { Campaign } from '@/lib/campaign/types';

const ID_FRAGMENT_LENGTH = 8;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ce dont un slug a besoin : un id stable, un nom affichable, une date de création (tie-break). */
export interface Sluggable {
  id: string;
  name: string;
  createdAt: string;
}

function idFragment(id: string): string {
  return id.replace(/-/g, '').slice(0, ID_FRAGMENT_LENGTH).toLowerCase();
}

function slugifyName(name: string): string {
  return normalizeSearchText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Index id → slug pour TOUTE la liste : seuls les homonymes (même nom normalisé) reçoivent un
 * suffixe, et seulement à partir du 2ᵉ créé — le premier garde le nom nu.
 */
function buildSlugIndex(list: readonly Sluggable[], fallback: string): Map<string, string> {
  const groups = new Map<string, Sluggable[]>();
  for (const item of list) {
    const base = slugifyName(item.name) || fallback;
    const group = groups.get(base);
    if (group) group.push(item);
    else groups.set(base, [item]);
  }
  const index = new Map<string, string>();
  for (const [base, items] of groups) {
    if (items.length === 1) {
      index.set(items[0].id, base);
      continue;
    }
    const sorted = [...items].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    sorted.forEach((item, i) => index.set(item.id, i === 0 ? base : `${base}-${idFragment(item.id)}`));
  }
  return index;
}

/** Variante PURE (pas de hook) — pratique dans un gestionnaire d'évènement (hors rendu). */
export function characterSlugIndex(characters: readonly Character[]): Map<string, string> {
  return buildSlugIndex(characters, 'personnage');
}
export function campaignSlugIndex(campaigns: readonly Campaign[]): Map<string, string> {
  return buildSlugIndex(campaigns, 'campagne');
}

/** Index MÉMOÏSÉ sur le store global — à appeler UNE FOIS par composant, puis réutiliser via `hrefFromIndex` dans une boucle. */
export function useCharacterSlugIndex(): Map<string, string> {
  const characters = useCharactersStore((s) => s.characters);
  return useMemo(() => characterSlugIndex(characters), [characters]);
}
export function useCampaignSlugIndex(): Map<string, string> {
  const campaigns = useCampaignsStore((s) => s.campaigns);
  return useMemo(() => campaignSlugIndex(campaigns), [campaigns]);
}

/** `basePath/<slug>` depuis un index déjà construit — pour une boucle (une ligne de liste, etc). */
export function hrefFromIndex(basePath: string, index: Map<string, string>, id: string): string {
  return `${basePath}/${index.get(id) ?? id}`;
}

/** Convenience un-shot (hors boucle) : construit l'index à la volée pour une seule entité. */
export function characterHref(character: Sluggable, characters: readonly Character[]): string {
  return hrefFromIndex('/character', characterSlugIndex(characters), character.id);
}
export function campaignHref(campaign: Sluggable, campaigns: readonly Campaign[]): string {
  return hrefFromIndex('/campaign', campaignSlugIndex(campaigns), campaign.id);
}

/**
 * Résout un segment d'URL vers l'entité de la liste : slug courant (via `index`), OU UUID
 * historique, OU ancien slug suffixé dont la collision a depuis disparu (repli sur le fragment
 * d'id, seul bout stable d'un lien déjà partagé).
 */
function resolveBySlugOrId<T extends Sluggable>(
  list: readonly T[],
  index: Map<string, string>,
  param: string,
): T | undefined {
  if (UUID_RE.test(param)) return list.find((t) => t.id === param);
  for (const item of list) if (index.get(item.id) === param) return item;
  if (param.length >= ID_FRAGMENT_LENGTH) {
    const fragment = param.slice(-ID_FRAGMENT_LENGTH).toLowerCase();
    return list.find((t) => idFragment(t.id) === fragment);
  }
  return undefined;
}

/**
 * Bascule silencieusement l'URL vers sa forme canonique dès que l'entité est résolue : couvre
 * l'ancien lien UUID, un slug périmé (renommage) et un suffixe devenu inutile (collision
 * résolue entre-temps). Ne fait rien tant que `canonicalSlug` est `undefined` (entité pas
 * encore chargée) — pas de redirection prématurée pendant l'hydratation.
 */
export function useCanonicalRedirect(
  param: string,
  canonicalSlug: string | undefined,
  basePath: string,
): void {
  const router = useRouter();
  useEffect(() => {
    if (!canonicalSlug || canonicalSlug === param || typeof window === 'undefined') return;
    const prefix = `${basePath}/${param}`;
    const suffix = window.location.pathname.startsWith(prefix)
      ? window.location.pathname.slice(prefix.length)
      : '';
    router.replace(`${basePath}/${canonicalSlug}${suffix}${window.location.search}`);
  }, [param, canonicalSlug, basePath, router]);
}

/**
 * Résolution + rétrocompatibilité EN UN SEUL HOOK pour une page `/character/[id]` : le reste du
 * fichier appelant continue de lire `id` comme avant (désormais toujours le VRAI id une fois le
 * personnage résolu), et `href` donne le lien canonique de CE personnage (breadcrumbs, etc).
 */
export function useResolvedCharacter(idParam: string): {
  character: Character | undefined;
  id: string;
  href: string;
} {
  const characters = useCharactersStore((s) => s.characters);
  const index = useCharacterSlugIndex();
  const character = useMemo(
    () => resolveBySlugOrId(characters, index, idParam),
    [characters, index, idParam],
  );
  const slug = character ? index.get(character.id) : undefined;
  useCanonicalRedirect(idParam, slug, '/character');
  return { character, id: character?.id ?? idParam, href: `/character/${slug ?? idParam}` };
}

/** Symétrique de `useResolvedCharacter`, pour une page `/campaign/[cid]`. */
export function useResolvedCampaign(cidParam: string): {
  campaign: Campaign | undefined;
  cid: string;
  href: string;
} {
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const index = useCampaignSlugIndex();
  const campaign = useMemo(
    () => resolveBySlugOrId(campaigns, index, cidParam),
    [campaigns, index, cidParam],
  );
  const slug = campaign ? index.get(campaign.id) : undefined;
  useCanonicalRedirect(cidParam, slug, '/campaign');
  return { campaign, cid: campaign?.id ?? cidParam, href: `/campaign/${slug ?? cidParam}` };
}

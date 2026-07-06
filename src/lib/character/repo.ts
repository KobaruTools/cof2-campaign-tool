/**
 * Accès aux personnages côté cloud (PER-192) — CRUD via le client Supabase
 * **navigateur**, scopé par la RLS propriétaire (`owner_id = auth.uid()`,
 * migration 0001). Ce module est le seul point de contact entre le store
 * `characters` et la table `public.characters`.
 *
 * Modèle : le `Character` est un **blob JSONB** opaque (colonne `data`), versionné
 * côté client (`schemaVersion`, migrations réutilisées à la lecture). Les clés
 * étrangères et l'état vivent en **colonnes SQL** hors blob (`campaign_id`,
 * `player_id`, `status`, `version`) → RLS, `ON DELETE SET NULL` et verrou optimiste
 * sans éclater le blob. À la lecture, on **superpose** ces colonnes au blob migré
 * (les colonnes font foi pour les FK, car un `ON DELETE SET NULL` en base ne
 * traverse pas le blob).
 *
 * **Verrou optimiste** (`updateCharacterRow`) : chaque écriture cible
 * `WHERE version = :chargée` et pose `version + 1`. Zéro ligne touchée = la fiche a
 * été modifiée ailleurs → on renvoie `null` (le store rejette sans réécrire).
 *
 * Toutes les fonctions **lèvent** en cas d'erreur Supabase (le store les capte).
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/types';
import { migrateCharacter } from '@/lib/engine';
import type { Character, CharacterStatus } from './types';

type CharacterRow = Database['public']['Tables']['characters']['Row'];

/** Un personnage cloud chargé, avec sa version pour le verrou optimiste. */
export interface LoadedCharacter {
  character: Character;
  version: number;
}

/**
 * Mappe une ligne SQL `characters` vers un `Character` : migration du blob `data`
 * (peut lever si le blob est invalide) puis **superposition** des colonnes FK/état
 * qui font foi (`campaign_id`/`player_id`/`status`). La `version` accompagne le
 * personnage pour le verrou optimiste.
 */
export function rowToCharacter(row: CharacterRow): LoadedCharacter {
  const migrated = migrateCharacter(row.data);
  return {
    character: {
      ...migrated,
      campaignId: row.campaign_id,
      playerId: row.player_id,
      status: row.status as CharacterStatus,
    },
    version: row.version,
  };
}

/**
 * Fusionne les personnages cloud et locaux, dédupliqués par `id`. Le cloud **fait
 * foi** : pour un id présent des deux côtés, la copie cloud écrase la copie locale
 * (« Supabase prime » — la copie locale n'est alors qu'un tampon de transition).
 * Les persos uniquement locaux (hérités / anonymes / importés) sont conservés en
 * staging jusqu'à leur téléversement explicite (PER-193).
 */
export function mergeCharacters(cloud: Character[], local: Character[]): Character[] {
  const byId = new Map<string, Character>();
  for (const c of local) byId.set(c.id, c);
  for (const c of cloud) byId.set(c.id, c); // le cloud écrase le local
  return [...byId.values()];
}

/** Tous les personnages possédés par l'utilisateur courant (RLS), avec leur version. */
export async function fetchCharacters(): Promise<LoadedCharacter[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.from('characters').select('*');
  if (error) throw error;
  const loaded: LoadedCharacter[] = [];
  for (const row of data ?? []) {
    try {
      loaded.push(rowToCharacter(row));
    } catch (e) {
      // Un blob illisible ne doit pas faire échouer le chargement des autres.
      console.warn(`Personnage cloud ${row.id} illisible, ignoré :`, e);
    }
  }
  return loaded;
}

/**
 * Insère un nouveau personnage possédé par l'utilisateur courant (commit en fin de
 * wizard). `owner_id` est posé depuis la session (validé par la RLS `with check`) ;
 * l'`id` du blob devient l'`id` de la ligne (cohérence cache ↔ cloud). Renvoie la
 * `version` initiale (1).
 */
export async function insertCharacter(character: Character): Promise<number> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Session absente : impossible d’enregistrer le personnage.');

  const { data, error } = await supabase
    .from('characters')
    .insert({
      id: character.id,
      owner_id: user.id,
      campaign_id: character.campaignId,
      player_id: character.playerId,
      status: character.status,
      version: 1,
      schema_version: character.schemaVersion,
      data: character as unknown as Json,
    })
    .select('version')
    .single();
  if (error) throw error;
  return data.version;
}

/**
 * Écrit un personnage existant sous **verrou optimiste** : la mise à jour ne
 * s'applique que si la `version` en base vaut encore `loadedVersion`, et pose
 * `loadedVersion + 1`. Renvoie la nouvelle version, ou `null` si aucune ligne n'a
 * été touchée (version périmée → conflit ; le store rejette sans réécrire).
 */
export async function updateCharacterRow(
  character: Character,
  loadedVersion: number,
): Promise<number | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('characters')
    .update({
      campaign_id: character.campaignId,
      player_id: character.playerId,
      status: character.status,
      schema_version: character.schemaVersion,
      version: loadedVersion + 1,
      data: character as unknown as Json,
    })
    .eq('id', character.id)
    .eq('version', loadedVersion)
    .select('version')
    .maybeSingle();
  if (error) throw error;
  return data?.version ?? null;
}

/** Supprime un personnage cloud (RLS propriétaire). */
export async function deleteCharacter(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from('characters').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Prépare un personnage LOCAL (staging) pour son téléversement vers le cloud
 * (PER-193) : le rattache à la campagne cible choisie (`campaignId`, `null` =
 * « Non attribué ») et remet le joueur à `null` (attribution différée, cf. PER-184),
 * puis horodate. Fonction **pure** (l'horodatage est fourni) → testable ;
 * l'insertion elle-même passe par `insertCharacter`.
 */
export function bindForUpload(
  character: Character,
  campaignId: string | null,
  now: string,
): Character {
  return { ...character, campaignId, playerId: null, updatedAt: now };
}

/**
 * L'erreur PostgREST correspond-elle à une violation de contrainte d'unicité
 * (clé primaire déjà prise, code SQLSTATE `23505`) ? Sert au téléversement
 * (PER-193) à détecter une collision d'`id` — improbable avec des UUID, mais un
 * blob importé pourrait partager l'`id` d'une ligne existante — pour régénérer un
 * id et réessayer sans jamais bloquer l'adoption d'un perso local.
 */
export function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: unknown }).code === '23505'
  );
}

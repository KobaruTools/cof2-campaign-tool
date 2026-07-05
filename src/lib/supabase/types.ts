/**
 * Types de la base Supabase (PER-187).
 *
 * Rédigé à la main pour l'instant ; à terme régénérable via
 * `supabase gen types typescript --linked > src/lib/supabase/types.ts`.
 * Tant que le CLI n'est pas branché, ce fichier reste la source de vérité des
 * types de tables côté client et DOIT rester aligné sur
 * `supabase/migrations/0001_foundations.sql`.
 *
 * Rappel de modèle (pivot PER-180) : la campagne est un regroupement OPTIONNEL,
 * la propriété (tenancy) s'ancre sur `characters.owner_id` — pas sur la campagne.
 */

/** Valeur JSON arbitraire stockée en colonne `jsonb`. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Statut d'un personnage dans sa campagne (miroir de `CharacterStatus`). */
export type DbCharacterStatus = 'active' | 'dead' | 'retired';

export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          /** Réglages de règles de table (armes à feu, dé de vie…). Détail en PER-190. */
          rules: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          rules?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          rules?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          /** Secret du lien magique joueur (régénérable/révocable). Exploité en PER-191. */
          join_secret: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          join_secret?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          join_secret?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'players_campaign_id_fkey';
            columns: ['campaign_id'];
            referencedRelation: 'campaigns';
            referencedColumns: ['id'];
          },
        ];
      };
      characters: {
        Row: {
          id: string;
          owner_id: string;
          /** `null` = « Non attribué » (campagne = regroupement optionnel, PER-180). */
          campaign_id: string | null;
          player_id: string | null;
          status: DbCharacterStatus;
          /** Verrou optimiste (PER-192) : incrémenté à chaque écriture. */
          version: number;
          /** Version du blob `data` (schemaVersion du `Character`, actuellement 16). */
          schema_version: number;
          /** Le `Character` sérialisé, opaque et versionné côté client. */
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          campaign_id?: string | null;
          player_id?: string | null;
          status?: DbCharacterStatus;
          version?: number;
          schema_version: number;
          data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          campaign_id?: string | null;
          player_id?: string | null;
          status?: DbCharacterStatus;
          version?: number;
          schema_version?: number;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'characters_campaign_id_fkey';
            columns: ['campaign_id'];
            referencedRelation: 'campaigns';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'characters_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      character_status: DbCharacterStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}

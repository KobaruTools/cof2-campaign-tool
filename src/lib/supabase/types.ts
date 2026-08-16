export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campaign_combat: {
        Row: {
          campaign_id: string
          state: Json
          updated_at: string
        }
        Insert: {
          campaign_id: string
          state?: Json
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          state?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_combat_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_npcs: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_npcs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          gm_inventory: Json
          id: string
          loot: Json
          name: string
          npc_categories: Json
          owner_id: string
          rules: Json
          rumors: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gm_inventory?: Json
          id?: string
          loot?: Json
          name: string
          npc_categories?: Json
          owner_id: string
          rules?: Json
          rumors?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gm_inventory?: Json
          id?: string
          loot?: Json
          name?: string
          npc_categories?: Json
          owner_id?: string
          rules?: Json
          rumors?: Json
          updated_at?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          campaign_id: string | null
          created_at: string
          data: Json
          id: string
          owner_id: string
          player_id: string | null
          schema_version: number
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          data: Json
          id?: string
          owner_id: string
          player_id?: string | null
          schema_version: number
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          owner_id?: string
          player_id?: string | null
          schema_version?: number
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      character_session_notes: {
        Row: {
          character_id: string
          content: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          character_id: string
          content?: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          character_id?: string
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_session_notes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      creatures: {
        Row: {
          base_creature_id: string | null
          category: string
          created_at: string
          data: Json
          id: string
          name: string
          nature: string[]
          nc: number | null
          nc_note: string | null
          size: string | null
          slug: string
          sort_order: number
          source_id: string
          updated_at: string
        }
        Insert: {
          base_creature_id?: string | null
          category: string
          created_at?: string
          data: Json
          id?: string
          name: string
          nature?: string[]
          nc?: number | null
          nc_note?: string | null
          size?: string | null
          slug: string
          sort_order: number
          source_id: string
          updated_at?: string
        }
        Update: {
          base_creature_id?: string | null
          category?: string
          created_at?: string
          data?: Json
          id?: string
          name?: string
          nature?: string[]
          nc?: number | null
          nc_note?: string | null
          size?: string | null
          slug?: string
          sort_order?: number
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creatures_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_invite_links: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_session_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_session_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          player_id: string | null
          session_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id?: string | null
          session_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_session_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_session_recaps: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
          visible_to_players: boolean
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          visible_to_players?: boolean
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          visible_to_players?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "game_session_recaps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          campaign_id: string
          created_at: string
          ended_at: string | null
          ended_reason: string | null
          id: string
          last_active_at: string
          started_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          last_active_at?: string
          started_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          last_active_at?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      player_auth_sessions: {
        Row: {
          auth_user_id: string
          created_at: string
          player_id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          player_id: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_auth_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          campaign_id: string
          created_at: string
          first_joined_at: string | null
          id: string
          join_secret: string
          last_seen_at: string | null
          name: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          first_joined_at?: string | null
          id?: string
          join_secret?: string
          last_seen_at?: string | null
          name: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          first_joined_at?: string | null
          id?: string
          join_secret?: string
          last_seen_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          last_seen_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          last_seen_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          last_seen_at?: string | null
        }
        Relationships: []
      }
      projection_auth_sessions: {
        Row: {
          auth_user_id: string
          campaign_id: string
          created_at: string
        }
        Insert: {
          auth_user_id: string
          campaign_id: string
          created_at?: string
        }
        Update: {
          auth_user_id?: string
          campaign_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projection_auth_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      projection_links: {
        Row: {
          campaign_id: string
          created_at: string
          secret: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          secret?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "projection_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      redeem_allowlist: {
        Row: {
          granted_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      source_entitlements: {
        Row: {
          granted_at: string
          source_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          source_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_entitlements_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          content_version: number
          created_at: string
          id: string
          is_paid: boolean
          name: string
          redeem_code: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          content_version?: number
          created_at?: string
          id?: string
          is_paid?: boolean
          name: string
          redeem_code?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          content_version?: number
          created_at?: string
          id?: string
          is_paid?: boolean
          name?: string
          redeem_code?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_player_campaign_id: { Args: never; Returns: string }
      current_player_id: { Args: never; Returns: string }
      current_user_is_entitled: {
        Args: { p_source_id: string }
        Returns: boolean
      }
      find_profile_by_email: {
        Args: { p_email: string }
        Returns: {
          display_name: string
          handle: string
          id: string
        }[]
      }
      find_profile_by_handle: {
        Args: { p_handle: string }
        Returns: {
          display_name: string
          handle: string
          id: string
        }[]
      }
      give_item_to_character: {
        Args: { item: Json; receiver_id: string }
        Returns: Json
      }
      is_anonymous: { Args: never; Returns: boolean }
      is_campaign_actor: { Args: { cid: string }; Returns: boolean }
      is_campaign_member: { Args: { cid: string }; Returns: boolean }
      merge_game_state: {
        Args: { character_id: string; patch: Json }
        Returns: Json
      }
      merge_mount_hp: {
        Args: { current_mounts: Json; patch_mounts: Json }
        Returns: Json
      }
      redeem_friend_invite: { Args: { p_token: string }; Returns: undefined }
      redeem_source_code: { Args: { p_code: string }; Returns: Json }
      resolve_active_session: {
        Args: { cid: string }
        Returns: {
          campaign_id: string
          created_at: string
          ended_at: string | null
          ended_reason: string | null
          id: string
          last_active_at: string
          started_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "game_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      session_participant_join: { Args: { cid: string }; Returns: string }
      session_participant_leave: {
        Args: { participant_id: string }
        Returns: undefined
      }
      set_my_handle: { Args: { p_handle: string }; Returns: undefined }
      touch_game_session: { Args: { cid: string }; Returns: undefined }
      touch_my_presence: { Args: never; Returns: undefined }
      touch_player_presence: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

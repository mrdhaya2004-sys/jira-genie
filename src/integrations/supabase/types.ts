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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_provider_configs: {
        Row: {
          api_key_encrypted: string
          created_at: string
          display_name: string | null
          endpoint_url: string | null
          id: string
          is_active: boolean
          model_name: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          display_name?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          model_name: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          display_name?: string | null
          endpoint_url?: string | null
          id?: string
          is_active?: boolean
          model_name?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          message_type: string
          metadata: Json | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_type?: string
          metadata?: Json | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          message_type?: string
          metadata?: Json | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          id: string
          is_teams_synced: boolean
          name: string | null
          organization_id: string | null
          teams_chat_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_teams_synced?: boolean
          name?: string | null
          organization_id?: string | null
          teams_chat_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_teams_synced?: boolean
          name?: string | null
          organization_id?: string | null
          teams_chat_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          content: string
          created_at: string
          history_log_id: string | null
          id: string
          metadata: Json | null
          module_name: string
          role: string
          session_id: string
          turn_index: number
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          history_log_id?: string | null
          id?: string
          metadata?: Json | null
          module_name: string
          role?: string
          session_id: string
          turn_index?: number
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          history_log_id?: string | null
          id?: string
          metadata?: Json | null
          module_name?: string
          role?: string
          session_id?: string
          turn_index?: number
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_history_log_id_fkey"
            columns: ["history_log_id"]
            isOneToOne: false
            referencedRelation: "history_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      history_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          input_prompt: string | null
          metadata: Json | null
          module_name: string
          output_summary: string | null
          session_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          id?: string
          input_prompt?: string | null
          metadata?: Json | null
          module_name: string
          output_summary?: string | null
          session_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          input_prompt?: string | null
          metadata?: Json | null
          module_name?: string
          output_summary?: string | null
          session_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_connections: {
        Row: {
          connection_status: string
          created_at: string
          id: string
          is_connected: boolean
          jira_api_token: string
          jira_domain: string
          jira_email: string
          jira_project_key: string
          last_validated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_status?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          jira_api_token: string
          jira_domain: string
          jira_email: string
          jira_project_key: string
          last_validated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_status?: string
          created_at?: string
          id?: string
          is_connected?: boolean
          jira_api_token?: string
          jira_domain?: string
          jira_email?: string
          jira_project_key?: string
          last_validated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          content_snippet: string
          created_at: string
          id: string
          is_read: boolean
          mention_type: string
          mentioned_by_user_id: string
          mentioned_user_id: string | null
          source_id: string | null
          source_title: string | null
          source_type: string
          workspace_id: string | null
        }
        Insert: {
          content_snippet: string
          created_at?: string
          id?: string
          is_read?: boolean
          mention_type: string
          mentioned_by_user_id: string
          mentioned_user_id?: string | null
          source_id?: string | null
          source_title?: string | null
          source_type: string
          workspace_id?: string | null
        }
        Update: {
          content_snippet?: string
          created_at?: string
          id?: string
          is_read?: boolean
          mention_type?: string
          mentioned_by_user_id?: string
          mentioned_user_id?: string | null
          source_id?: string | null
          source_title?: string | null
          source_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          is_important: boolean
          is_pinned: boolean
          position: number
          tag: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          is_important?: boolean
          is_pinned?: boolean
          position?: number
          tag?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          is_important?: boolean
          is_pinned?: boolean
          position?: number
          tag?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          employee_id: string
          full_name: string
          id: string
          mobile_number: string | null
          profile_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          employee_id: string
          full_name: string
          id?: string
          mobile_number?: string | null
          profile_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          employee_id?: string
          full_name?: string
          id?: string
          mobile_number?: string | null
          profile_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams_connections: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_connected: boolean
          last_synced_at: string | null
          microsoft_display_name: string | null
          microsoft_email: string | null
          microsoft_user_id: string | null
          refresh_token: string | null
          sync_enabled: boolean
          tenant_id: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          microsoft_display_name?: string | null
          microsoft_email?: string | null
          microsoft_user_id?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_synced_at?: string | null
          microsoft_display_name?: string | null
          microsoft_email?: string | null
          microsoft_user_id?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_code_playground: boolean | null
          auto_run_tests: boolean | null
          compact_ui: boolean | null
          created_at: string
          default_device: string | null
          default_test_mode: string | null
          hive_auto_open: boolean | null
          hive_button_behavior: string | null
          hive_chat_enabled: boolean
          id: string
          module_suggestions: boolean | null
          notify_email: boolean | null
          notify_inapp: boolean | null
          notify_jira: boolean | null
          notify_mentions: boolean | null
          notify_tests: boolean | null
          preferred_language: string | null
          response_style: string | null
          screenshot_on_failure: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_code_playground?: boolean | null
          auto_run_tests?: boolean | null
          compact_ui?: boolean | null
          created_at?: string
          default_device?: string | null
          default_test_mode?: string | null
          hive_auto_open?: boolean | null
          hive_button_behavior?: string | null
          hive_chat_enabled?: boolean
          id?: string
          module_suggestions?: boolean | null
          notify_email?: boolean | null
          notify_inapp?: boolean | null
          notify_jira?: boolean | null
          notify_mentions?: boolean | null
          notify_tests?: boolean | null
          preferred_language?: string | null
          response_style?: string | null
          screenshot_on_failure?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_code_playground?: boolean | null
          auto_run_tests?: boolean | null
          compact_ui?: boolean | null
          created_at?: string
          default_device?: string | null
          default_test_mode?: string | null
          hive_auto_open?: boolean | null
          hive_button_behavior?: string | null
          hive_chat_enabled?: boolean
          id?: string
          module_suggestions?: boolean | null
          notify_email?: boolean | null
          notify_inapp?: boolean | null
          notify_jira?: boolean | null
          notify_mentions?: boolean | null
          notify_tests?: boolean | null
          preferred_language?: string | null
          response_style?: string | null
          screenshot_on_failure?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_totp: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          totp_secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_chat_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_files: {
        Row: {
          content_extracted: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          metadata: Json | null
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          content_extracted?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          metadata?: Json | null
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          content_extracted?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          metadata?: Json | null
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          profile_id: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          profile_id?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          profile_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_notification: {
        Args: {
          _message: string
          _reference_id?: string
          _reference_type?: string
          _target_user_id: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      get_public_profile: {
        Args: { _target_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          profile_id: string
          user_id: string
        }[]
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      conversation_type: "direct" | "group"
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
    Enums: {
      conversation_type: ["direct", "group"],
    },
  },
} as const

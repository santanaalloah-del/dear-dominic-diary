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
      access_rules: {
        Row: {
          access_decision: string
          actor: string
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          priority: number
          reason: string | null
          resource_key: string
          resource_scope: string
          source_id: string | null
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_decision: string
          actor: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          reason?: string | null
          resource_key: string
          resource_scope: string
          source_id?: string | null
          source_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_decision?: string
          actor?: string
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          reason?: string | null
          resource_key?: string
          resource_scope?: string
          source_id?: string | null
          source_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      active_context: {
        Row: {
          activity: string | null
          context_type: string
          conversation_id: number | null
          created_at: string
          date_id: number | null
          ended_at: string | null
          id: number
          last_activity_at: string
          last_resolved_at: string | null
          metadata: Json
          place: string | null
          resolution_metadata: Json
          source_id: string | null
          source_type: string | null
          started_at: string
          state: Json
          status: string
          title: string | null
          together_now: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity?: string | null
          context_type?: string
          conversation_id?: number | null
          created_at?: string
          date_id?: number | null
          ended_at?: string | null
          id?: number
          last_activity_at?: string
          last_resolved_at?: string | null
          metadata?: Json
          place?: string | null
          resolution_metadata?: Json
          source_id?: string | null
          source_type?: string | null
          started_at?: string
          state?: Json
          status?: string
          title?: string | null
          together_now?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string | null
          context_type?: string
          conversation_id?: number | null
          created_at?: string
          date_id?: number | null
          ended_at?: string | null
          id?: number
          last_activity_at?: string
          last_resolved_at?: string | null
          metadata?: Json
          place?: string | null
          resolution_metadata?: Json
          source_id?: string | null
          source_type?: string | null
          started_at?: string
          state?: Json
          status?: string
          title?: string | null
          together_now?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_context_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_context_date_id_fkey"
            columns: ["date_id"]
            isOneToOne: false
            referencedRelation: "dates"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_patterns: {
        Row: {
          confidence: number | null
          created_at: string
          description: string | null
          evidence_count: number
          first_observed_at: string | null
          id: string
          is_current: boolean
          last_observed_at: string | null
          pattern_key: string
          pattern_type: string
          source_id: string | null
          source_type: string
          stage: string
          subject: string
          supersedes_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence_count?: number
          first_observed_at?: string | null
          id?: string
          is_current?: boolean
          last_observed_at?: string | null
          pattern_key: string
          pattern_type: string
          source_id?: string | null
          source_type: string
          stage?: string
          subject: string
          supersedes_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence_count?: number
          first_observed_at?: string | null
          id?: string
          is_current?: boolean
          last_observed_at?: string | null
          pattern_key?: string
          pattern_type?: string
          source_id?: string | null
          source_type?: string
          stage?: string
          subject?: string
          supersedes_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_patterns_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "behavior_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      canon_registry: {
        Row: {
          canon_key: string
          canon_status: string
          created_at: string
          domain: string
          id: string
          is_current: boolean
          origin: string
          source_id: string | null
          source_type: string | null
          supersedes_id: string | null
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          canon_key: string
          canon_status: string
          created_at?: string
          domain: string
          id?: string
          is_current?: boolean
          origin: string
          source_id?: string | null
          source_type?: string | null
          supersedes_id?: string | null
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          canon_key?: string
          canon_status?: string
          created_at?: string
          domain?: string
          id?: string
          is_current?: boolean
          origin?: string
          source_id?: string | null
          source_type?: string | null
          supersedes_id?: string | null
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "canon_registry_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "canon_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      character_actions: {
        Row: {
          action_type: string
          agency_class: string | null
          agency_valid: boolean | null
          agency_validation: Json
          canon_valid: boolean | null
          canon_validation: Json
          character_name: string
          completed_at: string | null
          conversation_id: number | null
          created_at: string
          decided_at: string | null
          description: string | null
          executed_at: string | null
          failure_reason: string | null
          id: number
          lived_event_id: string | null
          message_id: number | null
          motive_type: string | null
          payload: Json
          pending_thread_id: string | null
          requires_canon_validation: boolean
          requires_user_action: boolean
          responded_at: string | null
          result: Json
          scheduled_for: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string | null
          trigger_event_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          agency_class?: string | null
          agency_valid?: boolean | null
          agency_validation?: Json
          canon_valid?: boolean | null
          canon_validation?: Json
          character_name?: string
          completed_at?: string | null
          conversation_id?: number | null
          created_at?: string
          decided_at?: string | null
          description?: string | null
          executed_at?: string | null
          failure_reason?: string | null
          id?: number
          lived_event_id?: string | null
          message_id?: number | null
          motive_type?: string | null
          payload?: Json
          pending_thread_id?: string | null
          requires_canon_validation?: boolean
          requires_user_action?: boolean
          responded_at?: string | null
          result?: Json
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string | null
          trigger_event_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          agency_class?: string | null
          agency_valid?: boolean | null
          agency_validation?: Json
          canon_valid?: boolean | null
          canon_validation?: Json
          character_name?: string
          completed_at?: string | null
          conversation_id?: number | null
          created_at?: string
          decided_at?: string | null
          description?: string | null
          executed_at?: string | null
          failure_reason?: string | null
          id?: number
          lived_event_id?: string | null
          message_id?: number | null
          motive_type?: string | null
          payload?: Json
          pending_thread_id?: string | null
          requires_canon_validation?: boolean
          requires_user_action?: boolean
          responded_at?: string | null
          result?: Json
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string | null
          trigger_event_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_actions_lived_event_id_fkey"
            columns: ["lived_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_actions_pending_thread_id_fkey"
            columns: ["pending_thread_id"]
            isOneToOne: false
            referencedRelation: "pending_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_actions_trigger_event_id_fkey"
            columns: ["trigger_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
        ]
      }
      character_config: {
        Row: {
          brain_version: number
          character_profile: string | null
          character_version: number
          core_constitution: Json
          created_at: string
          current_life: Json
          evolving_self: Json
          id: number
          last_evolution_review_at: string | null
          name: string
          profile_photo_path: string | null
          system_prompt: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brain_version?: number
          character_profile?: string | null
          character_version?: number
          core_constitution?: Json
          created_at?: string
          current_life?: Json
          evolving_self?: Json
          id?: number
          last_evolution_review_at?: string | null
          name: string
          profile_photo_path?: string | null
          system_prompt: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brain_version?: number
          character_profile?: string | null
          character_version?: number
          core_constitution?: Json
          created_at?: string
          current_life?: Json
          evolving_self?: Json
          id?: number
          last_evolution_review_at?: string | null
          name?: string
          profile_photo_path?: string | null
          system_prompt?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      character_listening_history: {
        Row: {
          album_name: string | null
          artist_names: string[]
          character_name: string
          context_id: string | null
          context_type: string | null
          created_at: string
          id: number
          listened_at: string
          metadata: Json
          source: string
          spotify_track_id: string | null
          track_name: string
          user_id: string
        }
        Insert: {
          album_name?: string | null
          artist_names?: string[]
          character_name?: string
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: number
          listened_at?: string
          metadata?: Json
          source?: string
          spotify_track_id?: string | null
          track_name: string
          user_id: string
        }
        Update: {
          album_name?: string | null
          artist_names?: string[]
          character_name?: string
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: number
          listened_at?: string
          metadata?: Json
          source?: string
          spotify_track_id?: string | null
          track_name?: string
          user_id?: string
        }
        Relationships: []
      }
      character_music_affinity: {
        Row: {
          affinity_score: number
          artist_name: string | null
          became_favorite_at: string | null
          character_name: string
          created_at: string
          entity_key: string
          entity_type: string
          first_seen_at: string | null
          id: number
          interaction_count: number
          last_seen_at: string | null
          metadata: Json
          track_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affinity_score?: number
          artist_name?: string | null
          became_favorite_at?: string | null
          character_name?: string
          created_at?: string
          entity_key: string
          entity_type: string
          first_seen_at?: string | null
          id?: number
          interaction_count?: number
          last_seen_at?: string | null
          metadata?: Json
          track_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affinity_score?: number
          artist_name?: string | null
          became_favorite_at?: string | null
          character_name?: string
          created_at?: string
          entity_key?: string
          entity_type?: string
          first_seen_at?: string | null
          id?: number
          interaction_count?: number
          last_seen_at?: string | null
          metadata?: Json
          track_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      character_music_events: {
        Row: {
          album_name: string | null
          artist_name: string | null
          character_name: string
          created_at: string
          event_type: string
          id: number
          metadata: Json
          occurred_at: string
          reason: string | null
          significance: number
          source_context_id: string | null
          source_context_type: string | null
          source_type: string
          spotify_artist_id: string | null
          spotify_track_id: string | null
          track_name: string | null
          user_id: string
        }
        Insert: {
          album_name?: string | null
          artist_name?: string | null
          character_name?: string
          created_at?: string
          event_type: string
          id?: number
          metadata?: Json
          occurred_at?: string
          reason?: string | null
          significance?: number
          source_context_id?: string | null
          source_context_type?: string | null
          source_type?: string
          spotify_artist_id?: string | null
          spotify_track_id?: string | null
          track_name?: string | null
          user_id: string
        }
        Update: {
          album_name?: string | null
          artist_name?: string | null
          character_name?: string
          created_at?: string
          event_type?: string
          id?: number
          metadata?: Json
          occurred_at?: string
          reason?: string | null
          significance?: number
          source_context_id?: string | null
          source_context_type?: string | null
          source_type?: string
          spotify_artist_id?: string | null
          spotify_track_id?: string | null
          track_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      character_music_profile: {
        Row: {
          character_name: string
          created_at: string
          current_artists: Json
          current_tracks: Json
          dislikes: Json
          favorite_artists: Json
          favorite_genres: Json
          favorite_tracks: Json
          id: number
          last_evolved_at: string | null
          music_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          character_name?: string
          created_at?: string
          current_artists?: Json
          current_tracks?: Json
          dislikes?: Json
          favorite_artists?: Json
          favorite_genres?: Json
          favorite_tracks?: Json
          id?: number
          last_evolved_at?: string | null
          music_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          character_name?: string
          created_at?: string
          current_artists?: Json
          current_tracks?: Json
          dislikes?: Json
          favorite_artists?: Json
          favorite_genres?: Json
          favorite_tracks?: Json
          id?: number
          last_evolved_at?: string | null
          music_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      character_prompt_modules: {
        Row: {
          character_config_id: number
          content: string
          created_at: string
          id: string
          is_active: boolean
          module_key: string
          module_layer: string
          priority: number
          source_type: string
          title: string
          updated_at: string
          user_id: string
          version_number: number
        }
        Insert: {
          character_config_id: number
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key: string
          module_layer: string
          priority?: number
          source_type?: string
          title: string
          updated_at?: string
          user_id: string
          version_number?: number
        }
        Update: {
          character_config_id?: number
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          module_key?: string
          module_layer?: string
          priority?: number
          source_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_prompt_modules_character_config_id_fkey"
            columns: ["character_config_id"]
            isOneToOne: false
            referencedRelation: "character_config"
            referencedColumns: ["id"]
          },
        ]
      }
      character_self_versions: {
        Row: {
          change_summary: string | null
          change_type: string
          character_config_id: number
          core_constitution: Json
          created_at: string
          current_life: Json
          evidence: Json
          evolving_self: Json
          id: string
          source_id: string | null
          source_type: string
          user_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          change_type: string
          character_config_id: number
          core_constitution?: Json
          created_at?: string
          current_life?: Json
          evidence?: Json
          evolving_self?: Json
          id?: string
          source_id?: string | null
          source_type: string
          user_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          change_type?: string
          character_config_id?: number
          core_constitution?: Json
          created_at?: string
          current_life?: Json
          evidence?: Json
          evolving_self?: Json
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_self_versions_character_config_id_fkey"
            columns: ["character_config_id"]
            isOneToOne: false
            referencedRelation: "character_config"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: number
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      current_music_playback: {
        Row: {
          album_name: string | null
          artist_names: string[]
          chosen_by: string | null
          context_id: string | null
          context_type: string | null
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          id: number
          image_url: string | null
          metadata: Json
          music_item_id: number | null
          paused_at: string | null
          place: string | null
          playback_status: string
          position_ms: number
          source_type: string | null
          spotify_track_id: string | null
          started_at: string
          track_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          album_name?: string | null
          artist_names?: string[]
          chosen_by?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: number
          image_url?: string | null
          metadata?: Json
          music_item_id?: number | null
          paused_at?: string | null
          place?: string | null
          playback_status?: string
          position_ms?: number
          source_type?: string | null
          spotify_track_id?: string | null
          started_at?: string
          track_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          album_name?: string | null
          artist_names?: string[]
          chosen_by?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: number
          image_url?: string | null
          metadata?: Json
          music_item_id?: number | null
          paused_at?: string | null
          place?: string | null
          playback_status?: string
          position_ms?: number
          source_type?: string | null
          spotify_track_id?: string | null
          started_at?: string
          track_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "current_music_playback_music_item_id_fkey"
            columns: ["music_item_id"]
            isOneToOne: false
            referencedRelation: "music_items"
            referencedColumns: ["id"]
          },
        ]
      }
      date_moments: {
        Row: {
          activity: string | null
          created_at: string
          date_id: number
          description: string | null
          id: number
          metadata: Json
          moment_type: string
          occurred_at: string
          place: string | null
          significance: number
          user_id: string
        }
        Insert: {
          activity?: string | null
          created_at?: string
          date_id: number
          description?: string | null
          id?: number
          metadata?: Json
          moment_type: string
          occurred_at?: string
          place?: string | null
          significance?: number
          user_id: string
        }
        Update: {
          activity?: string | null
          created_at?: string
          date_id?: number
          description?: string | null
          id?: number
          metadata?: Json
          moment_type?: string
          occurred_at?: string
          place?: string | null
          significance?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_moments_date_id_fkey"
            columns: ["date_id"]
            isOneToOne: false
            referencedRelation: "dates"
            referencedColumns: ["id"]
          },
        ]
      }
      dates: {
        Row: {
          created_at: string
          current_activity: string | null
          current_context: string | null
          current_place: string | null
          ended_at: string | null
          ending_reason: string | null
          id: number
          initial_place: string | null
          invitation_responded_at: string | null
          invitation_source: string | null
          invitation_text: string | null
          invited_by: string
          metadata: Json
          ready_at: string | null
          scheduled_for: string | null
          significance: number
          started_at: string | null
          status: string
          story_memory_id: number | null
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_activity?: string | null
          current_context?: string | null
          current_place?: string | null
          ended_at?: string | null
          ending_reason?: string | null
          id?: number
          initial_place?: string | null
          invitation_responded_at?: string | null
          invitation_source?: string | null
          invitation_text?: string | null
          invited_by: string
          metadata?: Json
          ready_at?: string | null
          scheduled_for?: string | null
          significance?: number
          started_at?: string | null
          status?: string
          story_memory_id?: number | null
          timeline_event_id?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_activity?: string | null
          current_context?: string | null
          current_place?: string | null
          ended_at?: string | null
          ending_reason?: string | null
          id?: number
          initial_place?: string | null
          invitation_responded_at?: string | null
          invitation_source?: string | null
          invitation_text?: string | null
          invited_by?: string
          metadata?: Json
          ready_at?: string | null
          scheduled_for?: string | null
          significance?: number
          started_at?: string | null
          status?: string
          story_memory_id?: number | null
          timeline_event_id?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dates_story_memory_id_fkey"
            columns: ["story_memory_id"]
            isOneToOne: false
            referencedRelation: "story_memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dates_timeline_event_id_fkey"
            columns: ["timeline_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_items: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          event_at: string | null
          id: string
          kind: string
          owner: string
          planned_for: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          event_at?: string | null
          id?: string
          kind: string
          owner?: string
          planned_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          event_at?: string | null
          id?: string
          kind?: string
          owner?: string
          planned_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diario_links: {
        Row: {
          created_at: string
          data: Json
          id: string
          relation: string
          source_item_id: string
          target_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          relation: string
          source_item_id: string
          target_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          relation?: string
          source_item_id?: string
          target_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_links_source_user_fkey"
            columns: ["source_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "diario_items"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "diario_links_target_user_fkey"
            columns: ["target_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "diario_items"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      diario_settings: {
        Row: {
          appearance: string
          created_at: string
          data: Json
          music_enabled: boolean
          privacy_cover: boolean
          time_aware: boolean
          updated_at: string
          user_id: string
          voice_enabled: boolean
        }
        Insert: {
          appearance?: string
          created_at?: string
          data?: Json
          music_enabled?: boolean
          privacy_cover?: boolean
          time_aware?: boolean
          updated_at?: string
          user_id: string
          voice_enabled?: boolean
        }
        Update: {
          appearance?: string
          created_at?: string
          data?: Json
          music_enabled?: boolean
          privacy_cover?: boolean
          time_aware?: boolean
          updated_at?: string
          user_id?: string
          voice_enabled?: boolean
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          author: string
          content: string
          created_at: string
          entry_time: string
          entry_type: string
          id: number
          metadata: Json
          source_id: string | null
          source_type: string | null
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string
          content: string
          created_at?: string
          entry_time?: string
          entry_type?: string
          id?: number
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          timeline_event_id?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          entry_time?: string
          entry_type?: string
          id?: number
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          timeline_event_id?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_timeline_event_id_fkey"
            columns: ["timeline_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      emotional_associations: {
        Row: {
          association: Json
          created_at: string
          first_formed_at: string
          holder: string
          id: string
          is_current: boolean
          last_reinforced_at: string | null
          source_event_id: string | null
          source_id: string | null
          source_type: string
          status: string
          strength: number | null
          supersedes_id: string | null
          target_id: string | null
          target_key: string | null
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          association?: Json
          created_at?: string
          first_formed_at?: string
          holder: string
          id?: string
          is_current?: boolean
          last_reinforced_at?: string | null
          source_event_id?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          strength?: number | null
          supersedes_id?: string | null
          target_id?: string | null
          target_key?: string | null
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          association?: Json
          created_at?: string
          first_formed_at?: string
          holder?: string
          id?: string
          is_current?: boolean
          last_reinforced_at?: string | null
          source_event_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          strength?: number | null
          supersedes_id?: string | null
          target_id?: string | null
          target_key?: string | null
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotional_associations_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotional_associations_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "emotional_associations"
            referencedColumns: ["id"]
          },
        ]
      }
      episodic_memories: {
        Row: {
          confidence: number | null
          created_at: string
          event_id: string
          formed_at: string
          holder: string
          id: string
          is_current: boolean
          last_recalled_at: string | null
          memory_content: Json
          memory_state: string
          retrieval_enabled: boolean
          salience: number | null
          source_id: string | null
          source_type: string
          supersedes_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          event_id: string
          formed_at?: string
          holder: string
          id?: string
          is_current?: boolean
          last_recalled_at?: string | null
          memory_content?: Json
          memory_state?: string
          retrieval_enabled?: boolean
          salience?: number | null
          source_id?: string | null
          source_type?: string
          supersedes_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          event_id?: string
          formed_at?: string
          holder?: string
          id?: string
          is_current?: boolean
          last_recalled_at?: string | null
          memory_content?: Json
          memory_state?: string
          retrieval_enabled?: boolean
          salience?: number | null
          source_id?: string | null
          source_type?: string
          supersedes_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodic_memories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodic_memories_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "episodic_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_evidence: {
        Row: {
          created_at: string
          description: string | null
          evidence_role: string
          evolution_key: string
          habit_id: string | null
          id: string
          knowledge_id: string | null
          lived_event_id: string | null
          observed_at: string
          pattern_id: string | null
          source_id: string
          source_type: string
          target_layer: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          evidence_role?: string
          evolution_key: string
          habit_id?: string | null
          id?: string
          knowledge_id?: string | null
          lived_event_id?: string | null
          observed_at?: string
          pattern_id?: string | null
          source_id: string
          source_type: string
          target_layer: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          evidence_role?: string
          evolution_key?: string
          habit_id?: string | null
          id?: string
          knowledge_id?: string | null
          lived_event_id?: string | null
          observed_at?: string
          pattern_id?: string | null
          source_id?: string
          source_type?: string
          target_layer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_evidence_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_evidence_knowledge_id_fkey"
            columns: ["knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_evidence_lived_event_id_fkey"
            columns: ["lived_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_evidence_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "behavior_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          description: string | null
          details: Json
          ended_at: string | null
          habit_key: string
          id: string
          is_current: boolean
          last_observed_at: string | null
          owner: string
          pattern_id: string | null
          source_id: string | null
          source_type: string
          started_at: string | null
          status: string
          supersedes_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          details?: Json
          ended_at?: string | null
          habit_key: string
          id?: string
          is_current?: boolean
          last_observed_at?: string | null
          owner: string
          pattern_id?: string | null
          source_id?: string | null
          source_type: string
          started_at?: string | null
          status?: string
          supersedes_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          details?: Json
          ended_at?: string | null
          habit_key?: string
          id?: string
          is_current?: boolean
          last_observed_at?: string | null
          owner?: string
          pattern_id?: string | null
          source_id?: string | null
          source_type?: string
          started_at?: string | null
          status?: string
          supersedes_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "behavior_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      home_objects: {
        Row: {
          acquired_at: string | null
          condition: string | null
          created_at: string
          description: string | null
          home_state_id: number | null
          id: number
          metadata: Json
          name: string
          object_type: string
          position_description: string | null
          removed_at: string | null
          room: string | null
          source_id: string | null
          source_type: string | null
          status: string
          timeline_event_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          home_state_id?: number | null
          id?: number
          metadata?: Json
          name: string
          object_type: string
          position_description?: string | null
          removed_at?: string | null
          room?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          timeline_event_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          home_state_id?: number | null
          id?: number
          metadata?: Json
          name?: string
          object_type?: string
          position_description?: string | null
          removed_at?: string | null
          room?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          timeline_event_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_objects_home_state_id_fkey"
            columns: ["home_state_id"]
            isOneToOne: false
            referencedRelation: "home_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_objects_timeline_event_id_fkey"
            columns: ["timeline_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      home_state: {
        Row: {
          city: string
          created_at: string
          current_atmosphere: string | null
          current_notes: string | null
          current_room: string | null
          home_name: string
          id: number
          metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string
          created_at?: string
          current_atmosphere?: string | null
          current_notes?: string | null
          current_room?: string | null
          home_name?: string
          id?: number
          metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          current_atmosphere?: string | null
          current_notes?: string | null
          current_room?: string | null
          home_name?: string
          id?: number
          metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      impressions: {
        Row: {
          confidence: number | null
          created_at: string
          formed_at: string
          holder: string
          id: string
          impression_key: string
          is_current: boolean
          perception_id: string | null
          resolved_at: string | null
          resolved_by_knowledge_id: string | null
          source_event_id: string | null
          source_id: string | null
          source_type: string
          status: string
          subject: string
          supersedes_id: string | null
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          formed_at?: string
          holder: string
          id?: string
          impression_key: string
          is_current?: boolean
          perception_id?: string | null
          resolved_at?: string | null
          resolved_by_knowledge_id?: string | null
          source_event_id?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          subject: string
          supersedes_id?: string | null
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          confidence?: number | null
          created_at?: string
          formed_at?: string
          holder?: string
          id?: string
          impression_key?: string
          is_current?: boolean
          perception_id?: string | null
          resolved_at?: string | null
          resolved_by_knowledge_id?: string | null
          source_event_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          subject?: string
          supersedes_id?: string | null
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "impressions_perception_id_fkey"
            columns: ["perception_id"]
            isOneToOne: false
            referencedRelation: "perception_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressions_resolved_by_knowledge_id_fkey"
            columns: ["resolved_by_knowledge_id"]
            isOneToOne: false
            referencedRelation: "knowledge_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressions_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressions_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "impressions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_registry: {
        Row: {
          acquired_at: string
          confidence: number | null
          created_at: string
          epistemic_status: string
          holder: string
          id: string
          is_current: boolean
          knowledge_key: string
          learned_from_event_id: string | null
          source_id: string | null
          source_type: string
          subject: string
          supersedes_id: string | null
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          acquired_at?: string
          confidence?: number | null
          created_at?: string
          epistemic_status?: string
          holder: string
          id?: string
          is_current?: boolean
          knowledge_key: string
          learned_from_event_id?: string | null
          source_id?: string | null
          source_type: string
          subject: string
          supersedes_id?: string | null
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          acquired_at?: string
          confidence?: number | null
          created_at?: string
          epistemic_status?: string
          holder?: string
          id?: string
          is_current?: boolean
          knowledge_key?: string
          learned_from_event_id?: string | null
          source_id?: string | null
          source_type?: string
          subject?: string
          supersedes_id?: string | null
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_registry_learned_from_event_id_fkey"
            columns: ["learned_from_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_registry_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "knowledge_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      letters: {
        Row: {
          content: string
          created_at: string
          from_name: string
          id: number
          letter_time: string
          metadata: Json
          opened_at: string | null
          source_id: string | null
          source_type: string | null
          subject: string | null
          timeline_event_id: number | null
          to_name: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          from_name?: string
          id?: number
          letter_time?: string
          metadata?: Json
          opened_at?: string | null
          source_id?: string | null
          source_type?: string | null
          subject?: string | null
          timeline_event_id?: number | null
          to_name?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          from_name?: string
          id?: number
          letter_time?: string
          metadata?: Json
          opened_at?: string | null
          source_id?: string | null
          source_type?: string | null
          subject?: string | null
          timeline_event_id?: number | null
          to_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_timeline_event_id_fkey"
            columns: ["timeline_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      lived_events: {
        Row: {
          canon_eligible: boolean
          created_at: string
          domain: string
          ended_at: string | null
          event_status: string
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          source_id: string | null
          source_type: string
          summary: string | null
          user_id: string
        }
        Insert: {
          canon_eligible?: boolean
          created_at?: string
          domain: string
          ended_at?: string | null
          event_status?: string
          event_type: string
          id?: string
          occurred_at: string
          payload?: Json
          source_id?: string | null
          source_type: string
          summary?: string | null
          user_id: string
        }
        Update: {
          canon_eligible?: boolean
          created_at?: string
          domain?: string
          ended_at?: string | null
          event_status?: string
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          source_id?: string | null
          source_type?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          caption: string | null
          captured_at: string | null
          conversation_id: number | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size_bytes: number | null
          generation_prompt: string | null
          height: number | null
          id: number
          is_favorite: boolean
          is_gallery_visible: boolean
          location: string | null
          media_type: string
          message_id: number | null
          metadata: Json
          mime_type: string | null
          origin: string
          photographer: string | null
          storage_bucket: string
          storage_path: string
          subjects: string[]
          thumbnail_path: string | null
          timeline_event_id: number | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          captured_at?: string | null
          conversation_id?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          generation_prompt?: string | null
          height?: number | null
          id?: number
          is_favorite?: boolean
          is_gallery_visible?: boolean
          location?: string | null
          media_type: string
          message_id?: number | null
          metadata?: Json
          mime_type?: string | null
          origin: string
          photographer?: string | null
          storage_bucket?: string
          storage_path: string
          subjects?: string[]
          thumbnail_path?: string | null
          timeline_event_id?: number | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          captured_at?: string | null
          conversation_id?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          generation_prompt?: string | null
          height?: number | null
          id?: number
          is_favorite?: boolean
          is_gallery_visible?: boolean
          location?: string | null
          media_type?: string
          message_id?: number | null
          metadata?: Json
          mime_type?: string | null
          origin?: string
          photographer?: string | null
          storage_bucket?: string
          storage_path?: string
          subjects?: string[]
          thumbnail_path?: string | null
          timeline_event_id?: number | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_timeline_event_id_fkey"
            columns: ["timeline_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      media_links: {
        Row: {
          created_at: string
          id: number
          linked_id: string
          linked_type: string
          media_id: number
          metadata: Json
          relation_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          linked_id: string
          linked_type: string
          media_id: number
          metadata?: Json
          relation_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          linked_id?: string
          linked_type?: string
          media_id?: number
          metadata?: Json
          relation_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_links_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          access_count: number
          confidence: number | null
          content: string
          created_at: string | null
          embedding: string | null
          event_date: string | null
          id: number
          importance: number | null
          is_core: boolean
          last_accessed_at: string | null
          memory_key: string | null
          memory_type: string
          message_id: number | null
          source: string | null
          status: string
          superseded_by: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_count?: number
          confidence?: number | null
          content: string
          created_at?: string | null
          embedding?: string | null
          event_date?: string | null
          id?: number
          importance?: number | null
          is_core?: boolean
          last_accessed_at?: string | null
          memory_key?: string | null
          memory_type: string
          message_id?: number | null
          source?: string | null
          status?: string
          superseded_by?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_count?: number
          confidence?: number | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          event_date?: string | null
          id?: number
          importance?: number | null
          is_core?: boolean
          last_accessed_at?: string | null
          memory_key?: string | null
          memory_type?: string
          message_id?: number | null
          source?: string | null
          status?: string
          superseded_by?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: number
          created_at: string
          id: number
          role: string
          speaker_name: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: number
          created_at?: string
          id?: number
          role: string
          speaker_name?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: number
          created_at?: string
          id?: number
          role?: string
          speaker_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      music_items: {
        Row: {
          added_by: string | null
          album_name: string | null
          artist_names: string[]
          created_at: string
          duration_ms: number | null
          first_seen_at: string
          id: number
          image_url: string | null
          metadata: Json
          source_type: string
          spotify_track_id: string | null
          spotify_url: string | null
          track_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          album_name?: string | null
          artist_names?: string[]
          created_at?: string
          duration_ms?: number | null
          first_seen_at?: string
          id?: number
          image_url?: string | null
          metadata?: Json
          source_type?: string
          spotify_track_id?: string | null
          spotify_url?: string | null
          track_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          album_name?: string | null
          artist_names?: string[]
          created_at?: string
          duration_ms?: number | null
          first_seen_at?: string
          id?: number
          image_url?: string | null
          metadata?: Json
          source_type?: string
          spotify_track_id?: string | null
          spotify_url?: string | null
          track_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      music_links: {
        Row: {
          context_note: string | null
          created_at: string
          id: number
          linked_id: string
          linked_type: string
          metadata: Json
          music_item_id: number
          occurred_at: string | null
          relation_type: string
          significance: number
          user_id: string
        }
        Insert: {
          context_note?: string | null
          created_at?: string
          id?: number
          linked_id: string
          linked_type: string
          metadata?: Json
          music_item_id: number
          occurred_at?: string | null
          relation_type?: string
          significance?: number
          user_id: string
        }
        Update: {
          context_note?: string | null
          created_at?: string
          id?: number
          linked_id?: string
          linked_type?: string
          metadata?: Json
          music_item_id?: number
          occurred_at?: string | null
          relation_type?: string
          significance?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_links_music_item_id_fkey"
            columns: ["music_item_id"]
            isOneToOne: false
            referencedRelation: "music_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_evidence: {
        Row: {
          created_at: string
          event_id: string | null
          evidence_role: string
          id: string
          notes: string | null
          observed_at: string
          pattern_id: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          evidence_role?: string
          id?: string
          notes?: string | null
          observed_at?: string
          pattern_id: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          evidence_role?: string
          id?: string
          notes?: string | null
          observed_at?: string
          pattern_id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_evidence_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_evidence_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "behavior_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_threads: {
        Row: {
          completed_at: string | null
          created_at: string
          created_from_event_id: string | null
          details: Json
          expires_at: string | null
          id: string
          last_considered_at: string | null
          owner: string
          parent_thread_id: string | null
          priority: number
          relevant_after: string | null
          source_id: string | null
          source_type: string
          status: string
          status_reason: string | null
          thread_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_from_event_id?: string | null
          details?: Json
          expires_at?: string | null
          id?: string
          last_considered_at?: string | null
          owner: string
          parent_thread_id?: string | null
          priority?: number
          relevant_after?: string | null
          source_id?: string | null
          source_type: string
          status?: string
          status_reason?: string | null
          thread_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_from_event_id?: string | null
          details?: Json
          expires_at?: string | null
          id?: string
          last_considered_at?: string | null
          owner?: string
          parent_thread_id?: string | null
          priority?: number
          relevant_after?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          status_reason?: string | null
          thread_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_threads_created_from_event_id_fkey"
            columns: ["created_from_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_threads_parent_thread_id_fkey"
            columns: ["parent_thread_id"]
            isOneToOne: false
            referencedRelation: "pending_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      perception_records: {
        Row: {
          actor: string
          created_at: string
          event_id: string | null
          id: string
          interpretation: Json
          noticed_at: string | null
          perceived_at: string | null
          resource_key: string
          resource_scope: string
          source_id: string | null
          source_type: string
          user_id: string
          was_accessible: boolean
          was_noticed: boolean
          was_perceived: boolean
        }
        Insert: {
          actor: string
          created_at?: string
          event_id?: string | null
          id?: string
          interpretation?: Json
          noticed_at?: string | null
          perceived_at?: string | null
          resource_key: string
          resource_scope: string
          source_id?: string | null
          source_type: string
          user_id: string
          was_accessible?: boolean
          was_noticed?: boolean
          was_perceived?: boolean
        }
        Update: {
          actor?: string
          created_at?: string
          event_id?: string | null
          id?: string
          interpretation?: Json
          noticed_at?: string | null
          perceived_at?: string | null
          resource_key?: string
          resource_scope?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
          was_accessible?: boolean
          was_noticed?: boolean
          was_perceived?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "perception_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
        ]
      }
      proactive_events: {
        Row: {
          context: Json
          created_at: string
          decision_reason: string | null
          event_type: string
          id: number
          message_id: number | null
          processed_at: string | null
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          decision_reason?: string | null
          event_type?: string
          id?: number
          message_id?: number | null
          processed_at?: string | null
          scheduled_for: string
          status?: string
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          decision_reason?: string | null
          event_type?: string
          id?: number
          message_id?: number | null
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proactive_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      push_devices: {
        Row: {
          created_at: string
          device_name: string | null
          id: number
          is_active: boolean
          last_seen_at: string | null
          platform: string
          push_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          id?: number
          is_active?: boolean
          last_seen_at?: string | null
          platform: string
          push_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          id?: number
          is_active?: boolean
          last_seen_at?: string | null
          platform?: string
          push_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_outbox: {
        Row: {
          body: string
          created_at: string
          failed_at: string | null
          failure_reason: string | null
          id: number
          message_id: number | null
          metadata: Json
          notification_type: string
          sent_at: string | null
          status: string
          target_route: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: number
          message_id?: number | null
          metadata?: Json
          notification_type?: string
          sent_at?: string | null
          status?: string
          target_route?: string
          title?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: number
          message_id?: number | null
          metadata?: Json
          notification_type?: string
          sent_at?: string | null
          status?: string
          target_route?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_outbox_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_state: {
        Row: {
          affection_level: number
          closeness_level: number
          current_dynamic: string | null
          current_notes: string | null
          home_city: string
          id: number
          living_together: boolean
          relationship_label: string
          relationship_status: string
          started_at: string
          tension_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          affection_level?: number
          closeness_level?: number
          current_dynamic?: string | null
          current_notes?: string | null
          home_city?: string
          id?: number
          living_together?: boolean
          relationship_label?: string
          relationship_status?: string
          started_at?: string
          tension_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          affection_level?: number
          closeness_level?: number
          current_dynamic?: string | null
          current_notes?: string | null
          home_city?: string
          id?: number
          living_together?: boolean
          relationship_label?: string
          relationship_status?: string
          started_at?: string
          tension_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relationship_threads: {
        Row: {
          alloah_position: Json
          created_at: string
          created_from_event_id: string | null
          details: Json
          dominic_position: Json
          id: string
          is_current: boolean
          last_development_event_id: string | null
          resolved_at: string | null
          shared_understanding: Json
          source_id: string | null
          source_type: string
          started_at: string
          status: string
          supersedes_id: string | null
          thread_type: string
          title: string
          unresolved_points: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          alloah_position?: Json
          created_at?: string
          created_from_event_id?: string | null
          details?: Json
          dominic_position?: Json
          id?: string
          is_current?: boolean
          last_development_event_id?: string | null
          resolved_at?: string | null
          shared_understanding?: Json
          source_id?: string | null
          source_type: string
          started_at?: string
          status?: string
          supersedes_id?: string | null
          thread_type: string
          title: string
          unresolved_points?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          alloah_position?: Json
          created_at?: string
          created_from_event_id?: string | null
          details?: Json
          dominic_position?: Json
          id?: string
          is_current?: boolean
          last_development_event_id?: string | null
          resolved_at?: string | null
          shared_understanding?: Json
          source_id?: string | null
          source_type?: string
          started_at?: string
          status?: string
          supersedes_id?: string | null
          thread_type?: string
          title?: string
          unresolved_points?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_threads_created_from_event_id_fkey"
            columns: ["created_from_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_threads_last_development_event_id_fkey"
            columns: ["last_development_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_threads_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "relationship_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      retrieval_index: {
        Row: {
          content: string
          embedding: string | null
          event_id: string | null
          id: string
          importance: number | null
          indexed_at: string
          is_core: boolean
          is_current: boolean
          is_retrievable: boolean
          provenance_id: string | null
          provenance_type: string
          retrieval_holder: string
          source_id: string
          source_type: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          embedding?: string | null
          event_id?: string | null
          id?: string
          importance?: number | null
          indexed_at?: string
          is_core?: boolean
          is_current?: boolean
          is_retrievable?: boolean
          provenance_id?: string | null
          provenance_type: string
          retrieval_holder: string
          source_id: string
          source_type: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          embedding?: string | null
          event_id?: string | null
          id?: string
          importance?: number | null
          indexed_at?: string
          is_core?: boolean
          is_current?: boolean
          is_retrievable?: boolean
          provenance_id?: string | null
          provenance_type?: string
          retrieval_holder?: string
          source_id?: string
          source_type?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retrieval_index_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
        ]
      }
      spotify_connections: {
        Row: {
          access_token: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          expires_at: string | null
          id: number
          is_connected: boolean
          metadata: Json
          product: string | null
          refresh_token: string | null
          scope: string | null
          spotify_user_id: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          expires_at?: string | null
          id?: number
          is_connected?: boolean
          metadata?: Json
          product?: string | null
          refresh_token?: string | null
          scope?: string | null
          spotify_user_id?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          expires_at?: string | null
          id?: number
          is_connected?: boolean
          metadata?: Json
          product?: string | null
          refresh_token?: string | null
          scope?: string | null
          spotify_user_id?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_music_profile: {
        Row: {
          created_at: string
          id: number
          last_synced_at: string | null
          listening_summary: string | null
          recent_artists: Json
          recent_tracks: Json
          top_artists: Json
          top_genres: Json
          top_tracks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_synced_at?: string | null
          listening_summary?: string | null
          recent_artists?: Json
          recent_tracks?: Json
          top_artists?: Json
          top_genres?: Json
          top_tracks?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          last_synced_at?: string | null
          listening_summary?: string | null
          recent_artists?: Json
          recent_tracks?: Json
          top_artists?: Json
          top_genres?: Json
          top_tracks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_recent_tracks: {
        Row: {
          album_name: string | null
          artist_names: string[]
          created_at: string
          id: number
          image_url: string | null
          metadata: Json
          played_at: string | null
          spotify_track_id: string
          spotify_url: string | null
          track_name: string
          user_id: string
        }
        Insert: {
          album_name?: string | null
          artist_names?: string[]
          created_at?: string
          id?: number
          image_url?: string | null
          metadata?: Json
          played_at?: string | null
          spotify_track_id: string
          spotify_url?: string | null
          track_name: string
          user_id: string
        }
        Update: {
          album_name?: string | null
          artist_names?: string[]
          created_at?: string
          id?: number
          image_url?: string | null
          metadata?: Json
          played_at?: string | null
          spotify_track_id?: string
          spotify_url?: string | null
          track_name?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_sync_state: {
        Row: {
          created_at: string
          id: number
          last_completed_at: string | null
          last_error: string | null
          last_started_at: string | null
          metadata: Json
          next_sync_after: string | null
          status: string
          sync_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_completed_at?: string | null
          last_error?: string | null
          last_started_at?: string | null
          metadata?: Json
          next_sync_after?: string | null
          status?: string
          sync_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          last_completed_at?: string | null
          last_error?: string | null
          last_started_at?: string | null
          metadata?: Json
          next_sync_after?: string | null
          status?: string
          sync_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      state_history: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          intensity: number | null
          is_current: boolean
          last_updated_at: string
          source_event_id: string | null
          source_id: string | null
          source_type: string
          started_at: string
          state_key: string
          state_type: string
          status: string
          subject: string
          supersedes_id: string | null
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          intensity?: number | null
          is_current?: boolean
          last_updated_at?: string
          source_event_id?: string | null
          source_id?: string | null
          source_type: string
          started_at?: string
          state_key: string
          state_type: string
          status?: string
          subject: string
          supersedes_id?: string | null
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          intensity?: number | null
          is_current?: boolean
          last_updated_at?: string
          source_event_id?: string | null
          source_id?: string | null
          source_type?: string
          started_at?: string
          state_key?: string
          state_type?: string
          status?: string
          subject?: string
          supersedes_id?: string | null
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "state_history_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "lived_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "state_history_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "state_history"
            referencedColumns: ["id"]
          },
        ]
      }
      story_memories: {
        Row: {
          cover_id: string | null
          cover_type: string | null
          created_at: string
          ended_at: string | null
          excerpt: string | null
          id: number
          is_favorite: boolean
          is_hidden: boolean
          location: string | null
          memory_type: string
          metadata: Json
          mood: string | null
          occurred_at: string
          significance: number
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_id?: string | null
          cover_type?: string | null
          created_at?: string
          ended_at?: string | null
          excerpt?: string | null
          id?: number
          is_favorite?: boolean
          is_hidden?: boolean
          location?: string | null
          memory_type?: string
          metadata?: Json
          mood?: string | null
          occurred_at: string
          significance?: number
          timeline_event_id?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_id?: string | null
          cover_type?: string | null
          created_at?: string
          ended_at?: string | null
          excerpt?: string | null
          id?: number
          is_favorite?: boolean
          is_hidden?: boolean
          location?: string | null
          memory_type?: string
          metadata?: Json
          mood?: string | null
          occurred_at?: string
          significance?: number
          timeline_event_id?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_memories_timeline_event_id_fkey"
            columns: ["timeline_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      story_memory_items: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          display_style: string | null
          id: number
          item_id: string
          item_type: string
          metadata: Json
          relation_type: string
          story_memory_id: number
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          display_style?: string | null
          id?: number
          item_id: string
          item_type: string
          metadata?: Json
          relation_type?: string
          story_memory_id: number
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          display_style?: string | null
          id?: number
          item_id?: string
          item_type?: string
          metadata?: Json
          relation_type?: string
          story_memory_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_memory_items_story_memory_id_fkey"
            columns: ["story_memory_id"]
            isOneToOne: false
            referencedRelation: "story_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_event_links: {
        Row: {
          created_at: string
          id: number
          linked_id: string
          linked_type: string
          relation_type: string
          timeline_event_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          linked_id: string
          linked_type: string
          relation_type?: string
          timeline_event_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          linked_id?: string
          linked_type?: string
          relation_type?: string
          timeline_event_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_event_links_timeline_event_id_fkey"
            columns: ["timeline_event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          calendar_category: string | null
          calendar_note: string | null
          calendar_visible: boolean
          created_at: string
          event_time: string
          event_type: string
          id: number
          location: string | null
          metadata: Json
          participants: string[]
          significance: number
          source_id: number | null
          source_type: string | null
          summary: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_category?: string | null
          calendar_note?: string | null
          calendar_visible?: boolean
          created_at?: string
          event_time?: string
          event_type: string
          id?: number
          location?: string | null
          metadata?: Json
          participants?: string[]
          significance?: number
          source_id?: number | null
          source_type?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_category?: string | null
          calendar_note?: string | null
          calendar_visible?: boolean
          created_at?: string
          event_time?: string
          event_type?: string
          id?: number
          location?: string | null
          metadata?: Json
          participants?: string[]
          significance?: number
          source_id?: number | null
          source_type?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          about_me: string | null
          created_at: string
          id: number
          name: string
          preferred_name: string
          profile_photo_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          about_me?: string | null
          created_at?: string
          id?: number
          name?: string
          preferred_name?: string
          profile_photo_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          about_me?: string | null
          created_at?: string
          id?: number
          name?: string
          preferred_name?: string
          profile_photo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      world_state: {
        Row: {
          alloah_location: string
          current_activity: string | null
          current_context: string | null
          current_date_id: number | null
          current_mode: string
          current_place: string
          dominic_location: string
          id: number
          time_period: string | null
          together_now: boolean
          updated_at: string
          user_id: string
          weather_context: string | null
        }
        Insert: {
          alloah_location?: string
          current_activity?: string | null
          current_context?: string | null
          current_date_id?: number | null
          current_mode?: string
          current_place?: string
          dominic_location?: string
          id?: number
          time_period?: string | null
          together_now?: boolean
          updated_at?: string
          user_id: string
          weather_context?: string | null
        }
        Update: {
          alloah_location?: string
          current_activity?: string | null
          current_context?: string | null
          current_date_id?: number | null
          current_mode?: string
          current_place?: string
          dominic_location?: string
          id?: number
          time_period?: string | null
          together_now?: boolean
          updated_at?: string
          user_id?: string
          weather_context?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_character_date_invite: {
        Args: { p_action_id: number }
        Returns: {
          created_at: string
          current_activity: string | null
          current_context: string | null
          current_place: string | null
          ended_at: string | null
          ending_reason: string | null
          id: number
          initial_place: string | null
          invitation_responded_at: string | null
          invitation_source: string | null
          invitation_text: string | null
          invited_by: string
          metadata: Json
          ready_at: string | null
          scheduled_for: string | null
          significance: number
          started_at: string | null
          status: string
          story_memory_id: number | null
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "dates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_date_invitation: {
        Args: { p_date_id: number }
        Returns: {
          created_at: string
          current_activity: string | null
          current_context: string | null
          current_place: string | null
          ended_at: string | null
          ending_reason: string | null
          id: number
          initial_place: string | null
          invitation_responded_at: string | null
          invitation_source: string | null
          invitation_text: string | null
          invited_by: string
          metadata: Json
          ready_at: string | null
          scheduled_for: string | null
          significance: number
          started_at: string | null
          status: string
          story_memory_id: number | null
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "dates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_brain2_evolution_evidence: {
        Args: {
          p_description?: string
          p_evidence_role?: string
          p_evolution_key: string
          p_source_id: string
          p_source_type: string
          p_target_layer: string
          p_user_id: string
        }
        Returns: Json
      }
      add_brain2_pattern_evidence: {
        Args: {
          p_description: string
          p_event_id: string
          p_evidence_role?: string
          p_notes?: string
          p_pattern_key: string
          p_pattern_type: string
          p_subject: string
          p_user_id: string
        }
        Returns: Json
      }
      add_character_music_event: {
        Args: {
          p_album_name?: string
          p_artist_name?: string
          p_event_type: string
          p_metadata?: Json
          p_reason?: string
          p_significance?: number
          p_source_context_id?: string
          p_source_context_type?: string
          p_source_type?: string
          p_spotify_artist_id?: string
          p_spotify_track_id?: string
          p_track_name?: string
          p_user_id: string
        }
        Returns: {
          album_name: string | null
          artist_name: string | null
          character_name: string
          created_at: string
          event_type: string
          id: number
          metadata: Json
          occurred_at: string
          reason: string | null
          significance: number
          source_context_id: string | null
          source_context_type: string | null
          source_type: string
          spotify_artist_id: string | null
          spotify_track_id: string | null
          track_name: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "character_music_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      advance_brain2_pattern_stage: {
        Args: {
          p_consolidation_reason: string
          p_pattern_id: string
          p_target_stage: string
          p_user_id: string
        }
        Returns: Json
      }
      apply_character_music_event: {
        Args: { p_event_id: number }
        Returns: {
          character_name: string
          created_at: string
          current_artists: Json
          current_tracks: Json
          dislikes: Json
          favorite_artists: Json
          favorite_genres: Json
          favorite_tracks: Json
          id: number
          last_evolved_at: string | null
          music_notes: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "character_music_profile"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_brain2_current_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      brain2_match_retrieval: {
        Args: {
          p_holder: string
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          content: string
          event_id: string
          importance: number
          is_core: boolean
          retrieval_holder: string
          retrieval_id: string
          similarity: number
          source_id: string
          source_type: string
          subject: string
        }[]
      }
      brain2_match_retrieval_internal: {
        Args: {
          p_holder: string
          p_match_count?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          content: string
          event_id: string
          importance: number
          is_core: boolean
          retrieval_holder: string
          retrieval_id: string
          similarity: number
          source_id: string
          source_type: string
          subject: string
        }[]
      }
      brain2_vector_cosine_distance: {
        Args: { p_left: string; p_right: string }
        Returns: number
      }
      check_brain2_access: {
        Args: {
          p_actor: string
          p_resource_key: string
          p_resource_scope: string
          p_user_id: string
        }
        Returns: Json
      }
      commit_brain2_character_evolution: {
        Args: {
          p_change_summary: string
          p_evolution_key: string
          p_new_value: Json
          p_source_id?: string
          p_source_type: string
          p_target_layer: string
          p_user_id: string
        }
        Returns: Json
      }
      commit_brain2_chat_analysis_current_user: {
        Args: { p_episode?: Json; p_knowledge?: Json; p_message_id: number }
        Returns: Json
      }
      commit_brain2_context_checkpoint: {
        Args: {
          p_context_id: number
          p_metadata?: Json
          p_resolved_until: string
          p_user_id: string
        }
        Returns: Json
      }
      create_brain2_character_action: {
        Args: {
          p_action_type: string
          p_agency_class: string
          p_conversation_id?: number
          p_description?: string
          p_message_id?: number
          p_motive_type: string
          p_payload?: Json
          p_pending_thread_id?: string
          p_requires_canon_validation?: boolean
          p_requires_user_action?: boolean
          p_scheduled_for?: string
          p_source_id?: string
          p_source_type?: string
          p_title?: string
          p_trigger_event_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_brain2_habit_from_pattern: {
        Args: {
          p_description: string
          p_details?: Json
          p_habit_key: string
          p_owner: string
          p_pattern_id: string
          p_user_id: string
        }
        Returns: Json
      }
      create_brain2_pending_thread: {
        Args: {
          p_created_from_event_id?: string
          p_details: Json
          p_expires_at?: string
          p_owner: string
          p_priority?: number
          p_relevant_after?: string
          p_source_id?: string
          p_source_type: string
          p_thread_type: string
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      create_brain2_relationship_thread: {
        Args: {
          p_alloah_position?: Json
          p_details: Json
          p_dominic_position?: Json
          p_event_id: string
          p_shared_understanding?: Json
          p_thread_type: string
          p_title: string
          p_unresolved_points?: Json
          p_user_id: string
        }
        Returns: Json
      }
      decline_character_date_invite: {
        Args: { p_action_id: number }
        Returns: {
          action_type: string
          agency_class: string | null
          agency_valid: boolean | null
          agency_validation: Json
          canon_valid: boolean | null
          canon_validation: Json
          character_name: string
          completed_at: string | null
          conversation_id: number | null
          created_at: string
          decided_at: string | null
          description: string | null
          executed_at: string | null
          failure_reason: string | null
          id: number
          lived_event_id: string | null
          message_id: number | null
          motive_type: string | null
          payload: Json
          pending_thread_id: string | null
          requires_canon_validation: boolean
          requires_user_action: boolean
          responded_at: string | null
          result: Json
          scheduled_for: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string | null
          trigger_event_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "character_actions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decline_date_invitation: {
        Args: { p_date_id: number }
        Returns: {
          created_at: string
          current_activity: string | null
          current_context: string | null
          current_place: string | null
          ended_at: string | null
          ending_reason: string | null
          id: number
          initial_place: string | null
          invitation_responded_at: string | null
          invitation_source: string | null
          invitation_text: string | null
          invited_by: string
          metadata: Json
          ready_at: string | null
          scheduled_for: string | null
          significance: number
          started_at: string | null
          status: string
          story_memory_id: number | null
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "dates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      execute_brain2_character_action: {
        Args: {
          p_action_id: number
          p_domain: string
          p_event_payload?: Json
          p_event_type: string
          p_result?: Json
          p_summary?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_brain2_character_constitution: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_brain2_chat_ingestion_context_current_user: {
        Args: { p_message_id: number }
        Returns: Json
      }
      get_brain2_offscreen_window: {
        Args: { p_now?: string; p_user_id: string }
        Returns: Json
      }
      get_brain2_prompt_pack: { Args: { p_user_id: string }; Returns: Json }
      get_brain2_prompt_pack_current_user: { Args: never; Returns: Json }
      get_brain2_runtime_context: { Args: { p_user_id: string }; Returns: Json }
      get_diario_runtime_context: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      get_music_context: { Args: { p_user_id?: string }; Returns: Json }
      get_spotify_connection_status: { Args: never; Returns: Json }
      get_spotify_oauth_state: { Args: never; Returns: Json }
      ingest_brain2_chat_analysis_current_user: {
        Args: {
          p_dominic_noticed: boolean
          p_episode?: Json
          p_event_id: string
          p_knowledge?: Json
          p_message_id: number
        }
        Returns: Json
      }
      initialize_brain2_character_versioning: {
        Args: { p_user_id: string }
        Returns: Json
      }
      link_music_to_moment: {
        Args: {
          p_added_by?: string
          p_album_name?: string
          p_artist_names?: string[]
          p_context_note?: string
          p_duration_ms?: number
          p_image_url?: string
          p_linked_id?: string
          p_linked_type?: string
          p_metadata?: Json
          p_occurred_at?: string
          p_relation_type?: string
          p_significance?: number
          p_source_type?: string
          p_spotify_track_id?: string
          p_spotify_url?: string
          p_track_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      mark_due_dates_ready: { Args: never; Returns: number }
      match_memories: {
        Args: {
          match_count?: number
          match_user_id: string
          query_embedding: string
        }
        Returns: {
          confidence: number
          content: string
          event_date: string
          id: number
          importance: number
          is_core: boolean
          memory_key: string
          memory_type: string
          similarity: number
          status: string
        }[]
      }
      pause_music_playback: {
        Args: { p_position_ms?: number; p_user_id: string }
        Returns: Json
      }
      promote_character_action_to_lived_event: {
        Args: {
          p_action_id: number
          p_domain: string
          p_event_type: string
          p_payload?: Json
          p_summary?: string
          p_user_id: string
        }
        Returns: Json
      }
      promote_character_music_favorites: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_brain2_message_event: {
        Args: { p_message_id: number; p_user_id: string }
        Returns: Json
      }
      record_brain2_message_event_current_user: {
        Args: { p_message_id: number }
        Returns: Json
      }
      record_brain2_perception: {
        Args: {
          p_actor: string
          p_event_id: string
          p_interpretation?: Json
          p_resource_key: string
          p_resource_scope: string
          p_source_id: string
          p_source_type: string
          p_user_id: string
          p_was_accessible: boolean
          p_was_noticed: boolean
          p_was_perceived: boolean
        }
        Returns: Json
      }
      resolve_brain2_impression_to_knowledge: {
        Args: {
          p_confidence?: number
          p_epistemic_status: string
          p_impression_id: string
          p_knowledge_key: string
          p_knowledge_subject: string
          p_knowledge_value: Json
          p_lived_event_id: string
          p_resolution: string
          p_source_id: string
          p_source_type: string
          p_user_id: string
        }
        Returns: Json
      }
      respond_to_brain2_character_action_current_user: {
        Args: { p_action_id: number; p_approved: boolean }
        Returns: Json
      }
      resume_music_playback: { Args: { p_user_id: string }; Returns: Json }
      save_spotify_connection: {
        Args: {
          p_access_token: string
          p_expires_at: string
          p_refresh_token: string
          p_scope: string
          p_token_type: string
        }
        Returns: undefined
      }
      save_spotify_oauth_state: {
        Args: { p_code_verifier: string; p_oauth_state: string }
        Returns: undefined
      }
      schedule_date: {
        Args: { p_date_id: number; p_scheduled_for: string }
        Returns: {
          created_at: string
          current_activity: string | null
          current_context: string | null
          current_place: string | null
          ended_at: string | null
          ending_reason: string | null
          id: number
          initial_place: string | null
          invitation_responded_at: string | null
          invitation_source: string | null
          invitation_text: string | null
          invited_by: string
          metadata: Json
          ready_at: string | null
          scheduled_for: string | null
          significance: number
          started_at: string | null
          status: string
          story_memory_id: number | null
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "dates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_music_playback: {
        Args: {
          p_album_name?: string
          p_artist_names?: string[]
          p_chosen_by?: string
          p_context_id?: string
          p_context_type?: string
          p_duration_ms?: number
          p_image_url?: string
          p_metadata?: Json
          p_place?: string
          p_source_type?: string
          p_spotify_track_id?: string
          p_spotify_url?: string
          p_track_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      start_ready_date: {
        Args: { p_date_id: number }
        Returns: {
          created_at: string
          current_activity: string | null
          current_context: string | null
          current_place: string | null
          ended_at: string | null
          ending_reason: string | null
          id: number
          initial_place: string | null
          invitation_responded_at: string | null
          invitation_source: string | null
          invitation_text: string | null
          invited_by: string
          metadata: Json
          ready_at: string | null
          scheduled_for: string | null
          significance: number
          started_at: string | null
          status: string
          story_memory_id: number | null
          timeline_event_id: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "dates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stop_music_playback: {
        Args: { p_position_ms?: number; p_user_id: string }
        Returns: Json
      }
      transition_brain2_pending_thread: {
        Args: {
          p_reason?: string
          p_target_status: string
          p_thread_id: string
          p_user_id: string
        }
        Returns: Json
      }
      transition_brain2_relationship_thread: {
        Args: {
          p_alloah_position?: Json
          p_dominic_position?: Json
          p_event_id: string
          p_shared_understanding?: Json
          p_target_status: string
          p_thread_id: string
          p_unresolved_points?: Json
          p_user_id: string
        }
        Returns: Json
      }
      update_brain2_current_life: {
        Args: {
          p_change_summary?: string
          p_evolution_key: string
          p_operation: string
          p_source_id?: string
          p_source_type?: string
          p_user_id: string
          p_value?: Json
        }
        Returns: Json
      }
      update_character_music_affinity: {
        Args: { p_event_id: number }
        Returns: undefined
      }
      upsert_brain2_impression: {
        Args: {
          p_confidence: number
          p_holder: string
          p_impression_key: string
          p_perception_id?: string
          p_source_event_id?: string
          p_source_id?: string
          p_source_type: string
          p_status: string
          p_subject: string
          p_user_id: string
          p_value: Json
        }
        Returns: Json
      }
      upsert_brain2_state: {
        Args: {
          p_intensity: number
          p_source_event_id?: string
          p_source_id?: string
          p_source_type: string
          p_state_key: string
          p_state_type: string
          p_status: string
          p_subject: string
          p_user_id: string
          p_value: Json
        }
        Returns: Json
      }
      validate_brain2_canon_write: {
        Args: {
          p_canon_key: string
          p_origin: string
          p_source_id?: string
          p_source_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_brain2_evolution: {
        Args: {
          p_evolution_key: string
          p_target_layer: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_character_action_agency: {
        Args: { p_agency_class: string; p_requires_user_action?: boolean }
        Returns: Json
      }
      write_brain2_episodic_memory: {
        Args: {
          p_confidence?: number
          p_event_id: string
          p_holder: string
          p_memory_content: Json
          p_salience?: number
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      write_brain2_knowledge: {
        Args: {
          p_confidence?: number
          p_epistemic_status: string
          p_holder: string
          p_knowledge_key: string
          p_learned_from_event_id?: string
          p_source_id: string
          p_source_type: string
          p_subject: string
          p_user_id: string
          p_value: Json
        }
        Returns: Json
      }
      write_brain2_lived_canon: {
        Args: {
          p_canon_key: string
          p_domain: string
          p_lived_event_id: string
          p_user_id: string
          p_value: Json
        }
        Returns: Json
      }
      write_brain2_retrieval_item: {
        Args: {
          p_content: string
          p_embedding?: string
          p_event_id?: string
          p_importance?: number
          p_is_core?: boolean
          p_provenance_id?: string
          p_provenance_type?: string
          p_retrieval_holder: string
          p_source_id: string
          p_source_type: string
          p_subject: string
          p_user_id: string
        }
        Returns: Json
      }
      write_brain2_retrieval_item_current_user: {
        Args: {
          p_content: string
          p_embedding: string
          p_event_id: string
          p_importance: number
          p_is_core?: boolean
          p_provenance_id: string
          p_provenance_type: string
          p_retrieval_holder: string
          p_source_id: string
          p_source_type: string
          p_subject: string
        }
        Returns: Json
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          email: string
          avatar_url: string | null
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          email: string
          avatar_url?: string | null
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          email: string
          invited_by: string | null
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          invited_by?: string | null
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          accepted_at?: string | null
        }
        Relationships: []
      }
      encounters: {
        Row: {
          id: string
          name: string
          title: string | null
          date: string
          location: string | null
          created_by: string | null
          share_token: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          title?: string | null
          date: string
          location?: string | null
          created_by?: string | null
          share_token?: string
          created_at?: string
        }
        Update: {
          name?: string
          title?: string | null
          date?: string
          location?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          encounter_id: string
          type: 'singles' | 'doubles'
          order_index: number
          player1_name: string
          player2_name: string | null
          player3_name: string
          player4_name: string | null
          num_sets: number
          games_per_set: number
          tiebreak_sets: boolean
          match_tiebreak: boolean
          no_ad: boolean
          status: 'pending' | 'running' | 'finished' | 'cancelled'
          edit_holder_id: string | null
          edit_status: 'free' | 'locked'
          edit_token: string
          winner_team: 1 | 2 | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          encounter_id: string
          type: 'singles' | 'doubles'
          order_index?: number
          player1_name: string
          player2_name?: string | null
          player3_name: string
          player4_name?: string | null
          num_sets?: number
          games_per_set?: number
          tiebreak_sets?: boolean
          match_tiebreak?: boolean
          no_ad?: boolean
          status?: 'pending' | 'running' | 'finished' | 'cancelled'
          edit_holder_id?: string | null
          edit_status?: 'free' | 'locked'
          winner_team?: 1 | 2 | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          order_index?: number
          player1_name?: string
          player2_name?: string | null
          player3_name?: string
          player4_name?: string | null
          num_sets?: number
          games_per_set?: number
          tiebreak_sets?: boolean
          match_tiebreak?: boolean
          no_ad?: boolean
          status?: 'pending' | 'running' | 'finished' | 'cancelled'
          edit_holder_id?: string | null
          edit_status?: 'free' | 'locked'
          winner_team?: 1 | 2 | null
        }
        Relationships: []
      }
      sets: {
        Row: {
          id: string
          match_id: string
          set_number: number
          games_team1: number
          games_team2: number
          is_tiebreak: boolean
          winner_team: 1 | 2 | null
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          match_id: string
          set_number: number
          games_team1?: number
          games_team2?: number
          is_tiebreak?: boolean
          winner_team?: 1 | 2 | null
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          games_team1?: number
          games_team2?: number
          is_tiebreak?: boolean
          winner_team?: 1 | 2 | null
          finished_at?: string | null
        }
        Relationships: []
      }
      score_events: {
        Row: {
          id: string
          match_id: string
          set_id: string | null
          event_type: 'point' | 'undo' | 'correction' | 'serve_change'
          scoring_team: 1 | 2 | null
          point_before: Json | null
          point_after: Json | null
          server_team: 1 | 2 | null
          created_by: string | null
          created_at: string
          is_undone: boolean
        }
        Insert: {
          id?: string
          match_id: string
          set_id?: string | null
          event_type: 'point' | 'undo' | 'correction' | 'serve_change'
          scoring_team?: 1 | 2 | null
          point_before?: Json | null
          point_after?: Json | null
          server_team?: 1 | 2 | null
          created_by?: string | null
          created_at?: string
          is_undone?: boolean
        }
        Update: {
          is_undone?: boolean
        }
        Relationships: []
      }
      edit_requests: {
        Row: {
          id: string
          match_id: string
          requester_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          requester_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'rejected'
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string | null
          push_endpoint: string
          push_keys: Json
          encounter_id: string | null
          match_id: string | null
          notify_on_game: boolean
          notify_on_set: boolean
          notify_on_match: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          push_endpoint: string
          push_keys: Json
          encounter_id?: string | null
          match_id?: string | null
          notify_on_game?: boolean
          notify_on_set?: boolean
          notify_on_match?: boolean
          created_at?: string
        }
        Update: {
          notify_on_game?: boolean
          notify_on_set?: boolean
          notify_on_match?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

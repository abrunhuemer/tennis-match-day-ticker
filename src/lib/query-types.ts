import type { Json } from './supabase/database.types'

export type ScoreEventRow = {
  id: string
  event_type: string
  scoring_team: number | null
  point_before: Json | null
  point_after: Json | null
  is_undone: boolean
  created_at: string
  server_team: number | null
  created_by: string | null
}

export type MatchWithEvents = {
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
  encounter: { id: string; name: string; share_token: string } | null
  holder: { id: string; display_name: string; avatar_url: string | null } | null
  score_events: ScoreEventRow[]
}

export type MatchSummary = {
  id: string
  type: 'singles' | 'doubles'
  order_index: number
  status: 'pending' | 'running' | 'finished' | 'cancelled'
  winner_team: 1 | 2 | null
  player1_name: string
  player2_name: string | null
  player3_name: string
  player4_name: string | null
  num_sets: number
  games_per_set: number
  tiebreak_sets: boolean
  match_tiebreak: boolean
  no_ad: boolean
  edit_holder_id: string | null
  edit_status: 'free' | 'locked'
  created_by: string | null
  score_events: ScoreEventRow[]
}

export type EncounterWithMatches = {
  id: string
  name: string
  title: string | null
  date: string
  location: string | null
  share_token: string
  created_by: string | null
  matches: MatchSummary[]
}

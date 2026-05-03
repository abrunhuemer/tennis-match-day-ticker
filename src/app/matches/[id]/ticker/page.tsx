import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { replayEvents, createInitialState, type ScoreEventRecord, type MatchConfig } from '@/lib/tennis-scoring'
import TickerClient from '@/components/ticker/ticker-client'
import type { MatchWithEvents } from '@/lib/query-types'

export default async function TickerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: raw } = await supabase
    .from('matches')
    .select(`
      *,
      encounter:encounters (id, name, share_token),
      holder:profiles!matches_edit_holder_id_fkey (id, display_name, avatar_url),
      score_events (
        id, event_type, scoring_team, point_before, point_after,
        is_undone, created_at, server_team, created_by
      )
    `)
    .eq('id', id)
    .single()

  if (!raw) notFound()
  const match = raw as unknown as MatchWithEvents

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Build match config
  const config: MatchConfig = {
    numSets: match.num_sets,
    gamesPerSet: match.games_per_set,
    tiebreakSets: match.tiebreak_sets,
    matchTiebreak: match.match_tiebreak,
    noAd: match.no_ad,
  }

  // Sort events by created_at
  const sortedEvents = [...(match.score_events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Map DB events to ScoreEventRecord format
  const events: ScoreEventRecord[] = sortedEvents.map(e => ({
    id: e.id,
    scoringTeam: e.scoring_team as 1 | 2 | null,
    pointBefore: e.point_before as ScoreEventRecord['pointBefore'],
    pointAfter: e.point_after as ScoreEventRecord['pointAfter'],
    isUndone: e.is_undone,
    eventType: e.event_type as ScoreEventRecord['eventType'],
  }))

  // Replay events to get current state (or use initial state if no events)
  const servingTeam: 1 | 2 = 1 // default; serve_change events override this
  const initialState = createInitialState(config, servingTeam)
  const currentState = events.length > 0 ? replayEvents(config, servingTeam, events) : initialState

  const teamA = match.type === 'doubles' && match.player2_name
    ? `${match.player1_name} / ${match.player2_name}`
    : match.player1_name

  const teamB = match.type === 'doubles' && match.player4_name
    ? `${match.player3_name} / ${match.player4_name}`
    : match.player3_name

  return (
    <TickerClient
      matchId={match.id}
      initialState={currentState}
      events={events}
      teamA={teamA}
      teamB={teamB}
      matchStatus={match.status}
      editHolderId={match.edit_holder_id}
      editStatus={match.edit_status}
      currentUserId={user.id}
      currentUserProfile={profile ?? null}
      holderProfile={match.holder ?? null}
      createdBy={match.created_by}
      encounterId={match.encounter?.id ?? null}
      encounterName={match.encounter?.name ?? null}
    />
  )
}

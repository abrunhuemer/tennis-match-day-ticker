import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createInitialState, replayEvents, getDisplayScore, type MatchConfig, type ScoreEventRecord } from '@/lib/tennis-scoring'
import ScoreDisplay from '@/components/ticker/score-display'
import type { MatchWithEvents } from '@/lib/query-types'

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('matches')
    .select(`
      *,
      encounter:encounters (id, name, share_token),
      holder:profiles!matches_edit_holder_id_fkey (id, display_name, avatar_url),
      score_events (id, event_type, scoring_team, point_before, point_after, is_undone, created_at, server_team, created_by)
    `)
    .eq('id', id)
    .single()

  if (!raw) notFound()
  const match = raw as unknown as MatchWithEvents

  const isHolder = match.edit_holder_id === user?.id
  const canTicker = user && (isHolder || match.edit_status === 'free')

  const config: MatchConfig = {
    numSets: match.num_sets,
    gamesPerSet: match.games_per_set,
    tiebreakSets: match.tiebreak_sets,
    matchTiebreak: match.match_tiebreak,
    noAd: match.no_ad,
  }
  const sortedEvents = [...(match.score_events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const events: ScoreEventRecord[] = sortedEvents.map(e => ({
    id: e.id,
    scoringTeam: e.scoring_team as 1 | 2 | null,
    pointBefore: e.point_before as ScoreEventRecord['pointBefore'],
    pointAfter: e.point_after as ScoreEventRecord['pointAfter'],
    isUndone: e.is_undone,
    eventType: e.event_type as ScoreEventRecord['eventType'],
  }))
  const initialState = createInitialState(config, 1)
  const currentState = events.length > 0 ? replayEvents(config, 1, events) : initialState
  const display = getDisplayScore(currentState)

  const teamA = match.type === 'doubles' && match.player2_name
    ? `${match.player1_name} / ${match.player2_name}`
    : match.player1_name

  const teamB = match.type === 'doubles' && match.player4_name
    ? `${match.player3_name} / ${match.player4_name}`
    : match.player3_name

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {match.encounter && (
            <Link
              href={`/encounters/${match.encounter.id}`}
              className="text-gray-400 hover:text-gray-600"
            >
              ← {match.encounter.name}
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Match header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-400">
              {match.type === 'doubles' ? 'Doppel' : 'Einzel'}
            </p>
            <div className="text-xl font-bold text-gray-900">{teamA}</div>
            <div className="text-gray-400 text-sm">vs.</div>
            <div className="text-xl font-bold text-gray-900">{teamB}</div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              {match.num_sets === 1 ? '1 Satz' : `Best of ${match.num_sets}`}
              {match.tiebreak_sets ? ' · Tiebreak' : ''}
              {match.match_tiebreak ? ' · Match-TB' : ''}
              {match.no_ad ? ' · No-Ad' : ''}
            </p>
          </div>
        </div>

        <ScoreDisplay
          display={display}
          teamA={teamA}
          teamB={teamB}
          winner={currentState.winner}
          status={currentState.status}
        />

        {/* Edit rights */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Editierrechte</h3>
          {match.edit_holder_id ? (
            <div className="flex items-center gap-2">
              {match.holder?.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.holder.avatar_url} alt="" className="w-6 h-6 rounded-full" />
              )}
              <span className="text-sm text-gray-700">
                {match.holder?.display_name ?? 'Unbekannt'} tickert gerade
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                {match.edit_status === 'locked' ? 'Gesperrt' : 'Frei'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Frei — kein aktiver Ticker</p>
          )}
        </div>

        {/* Actions */}
        {user && match.status !== 'finished' && match.status !== 'cancelled' && (
          <Link
            href={`/matches/${match.id}/ticker`}
            className={`block w-full py-4 rounded-xl text-center font-semibold text-white ${
              canTicker ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'
            }`}
          >
            {isHolder
              ? 'Ticker öffnen'
              : match.edit_status === 'free'
              ? 'Übernehmen & Tickern'
              : 'Ticker (nur ansehen)'}
          </Link>
        )}
      </main>
    </div>
  )
}

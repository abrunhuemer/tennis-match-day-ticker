import Link from 'next/link'

type ScoreEvent = {
  id: string
  event_type: string
  scoring_team: number | null
  point_after: unknown
  is_undone: boolean
  created_at: string
}

type Match = {
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
  score_events?: ScoreEvent[]
}

function teamName(match: Match, team: 1 | 2): string {
  if (team === 1) {
    return match.type === 'doubles' && match.player2_name
      ? `${match.player1_name} / ${match.player2_name}`
      : match.player1_name
  }
  return match.type === 'doubles' && match.player4_name
    ? `${match.player3_name} / ${match.player4_name}`
    : match.player3_name
}

function getLastScore(events: ScoreEvent[]): { sets: string; game: string } | null {
  const active = events.filter(e => !e.is_undone && e.event_type !== 'undo')
  const last = active.at(-1)
  if (!last?.point_after) return null

  const after = last.point_after as {
    sets?: Array<{ games: [number, number] }>
    currentGame?: { points: [number, number]; isDeuce?: boolean; advantage?: 1 | 2 | null }
  }

  const sets = (after.sets ?? []).map(s => `${s.games[0]}:${s.games[1]}`).join(' ')
  return { sets, game: '' }
}

const STATUS_LABELS: Record<Match['status'], string> = {
  pending: 'Ausstehend',
  running: 'Läuft',
  finished: 'Beendet',
  cancelled: 'Abgebrochen',
}

export default function MatchCard({
  match,
  currentUserId,
}: {
  match: Match
  currentUserId?: string
}) {
  const isHolder = match.edit_holder_id === currentUserId
  const isCreator = match.created_by === currentUserId
  const canTicker = isHolder || (match.edit_status === 'free' && !!currentUserId)
  const score = match.score_events ? getLastScore(match.score_events) : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  match.status === 'running'
                    ? 'bg-green-100 text-green-700'
                    : match.status === 'finished'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {STATUS_LABELS[match.status]}
              </span>
              <span className="text-xs text-gray-400">
                {match.type === 'doubles' ? 'Doppel' : 'Einzel'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    match.winner_team === 1 ? 'text-green-700' : 'text-gray-900'
                  }`}
                >
                  {teamName(match, 1)}
                </span>
                {match.winner_team === 1 && <span className="text-green-600 text-xs">✓</span>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    match.winner_team === 2 ? 'text-green-700' : 'text-gray-900'
                  }`}
                >
                  {teamName(match, 2)}
                </span>
                {match.winner_team === 2 && <span className="text-green-600 text-xs">✓</span>}
              </div>
            </div>

            {score?.sets && (
              <p className="text-sm text-gray-500 mt-2 font-mono">{score.sets}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex gap-2">
        <Link
          href={`/matches/${match.id}`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Details
        </Link>
        {match.status !== 'finished' && match.status !== 'cancelled' && currentUserId && (
          <Link
            href={`/matches/${match.id}/ticker`}
            className={`text-sm font-medium ${
              canTicker ? 'text-green-600 hover:text-green-700' : 'text-gray-400'
            }`}
          >
            {isHolder ? 'Tickern' : match.edit_status === 'free' ? 'Übernehmen & Tickern' : 'Ticker (nur ansehen)'}
          </Link>
        )}
        {isCreator && match.status === 'pending' && (
          <span className="ml-auto text-xs text-gray-400">Erstellt von dir</span>
        )}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { getDisplayScore, type MatchState, type DisplayScore } from '@/lib/tennis-scoring'

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

function getMatchDisplay(events: ScoreEvent[]): DisplayScore | null {
  const active = events.filter(e => !e.is_undone && e.event_type !== 'undo')
  const last = active.at(-1)
  if (!last?.point_after) return null
  return getDisplayScore(last.point_after as MatchState)
}

function perTeamGameScore(display: DisplayScore): [string, string] {
  const { game, advantage } = display
  if (!game) return ['', '']
  if (game === 'Einstand') return ['=', '=']
  if (game === 'Vorteil') return advantage === 1 ? ['Ad', ''] : ['', 'Ad']
  const [a, b] = game.split(':')
  return [a ?? '', b ?? '']
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
  const canTicker = isHolder || (match.edit_status === 'free' && !!currentUserId)
  const display = match.score_events ? getMatchDisplay(match.score_events) : null
  const [gameA, gameB] = display ? perTeamGameScore(display) : ['', '']
  const isRunning = match.status === 'running'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
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
        </div>

        {/* Teams with scores per row */}
        <div className="space-y-2">
          {([1, 2] as const).map(team => {
            const name = teamName(match, team)
            const isWinner = match.winner_team === team
            const gameScore = team === 1 ? gameA : gameB

            return (
              <div key={team} className="flex items-center gap-2">
                <span
                  className={`flex-1 text-sm font-medium truncate ${
                    isWinner ? 'text-green-700' : 'text-gray-900'
                  }`}
                >
                  {name}
                  {isWinner && <span className="ml-1 text-green-600 text-xs">✓</span>}
                </span>

                {/* Set and game scores */}
                {display && (
                  <div className="flex items-center gap-2.5 tabular-nums flex-shrink-0">
                    {display.sets.map((set, i) => (
                      <span
                        key={i}
                        className={`text-sm font-bold w-5 text-center ${
                          set.isCurrent ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {team === 1 ? set.team1 : set.team2}
                      </span>
                    ))}
                    {isRunning && gameScore && (
                      <span className={`text-sm font-medium w-7 text-center ${
                        gameScore === 'Ad' ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {gameScore}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
      </div>
    </div>
  )
}

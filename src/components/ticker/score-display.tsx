'use client'

import type { DisplayScore } from '@/lib/tennis-scoring'

type Props = {
  display: DisplayScore
  teamA: string
  teamB: string
  winner: 1 | 2 | null
  status: string
}

function perTeamGameScore(display: DisplayScore): [string, string] {
  const { game, advantage } = display
  if (!game) return ['', '']
  if (game === 'Einstand') return ['=', '=']
  if (game === 'Vorteil') return advantage === 1 ? ['Ad', ''] : ['', 'Ad']
  const [a, b] = game.split(':')
  return [a ?? '', b ?? '']
}

export default function ScoreDisplay({ display, teamA, teamB, winner, status }: Props) {
  const [gameA, gameB] = perTeamGameScore(display)
  const isRunning = status === 'running'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="space-y-3">
        {[1, 2].map(team => {
          const name = team === 1 ? teamA : teamB
          const isServer = display.server === team
          const isWinner = winner === team
          const gameScore = team === 1 ? gameA : gameB

          return (
            <div key={team} className="flex items-center gap-2">
              {/* Serve indicator — fixed width so names stay aligned */}
              <span className="w-3 flex-shrink-0 text-green-500 text-xs">
                {isServer ? '●' : ''}
              </span>

              {/* Team name */}
              <span className={`flex-1 font-semibold truncate text-base ${isWinner ? 'text-green-700' : 'text-gray-900'}`}>
                {name}
                {isWinner && <span className="ml-1.5 text-green-600 text-sm">✓</span>}
              </span>

              {/* Set scores */}
              <div className="flex items-center gap-3 tabular-nums">
                {display.sets.map((set, i) => (
                  <span
                    key={i}
                    className={`text-xl font-bold w-6 text-center ${
                      set.isCurrent
                        ? 'text-gray-900'
                        : 'text-gray-400 text-lg'
                    }`}
                  >
                    {team === 1 ? set.team1 : set.team2}
                  </span>
                ))}

                {/* Current game score */}
                {isRunning && (
                  <span className={`w-8 text-center font-bold tabular-nums text-lg ${
                    gameScore === 'Ad' ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {gameScore}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {status === 'finished' && (
        <div className="text-center border-t border-gray-100 mt-4 pt-3">
          <span className="text-sm font-semibold text-green-700">Match beendet</span>
        </div>
      )}
    </div>
  )
}

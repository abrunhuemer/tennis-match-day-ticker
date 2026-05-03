'use client'

import type { DisplayScore } from '@/lib/tennis-scoring'

type Props = {
  display: DisplayScore
  teamA: string
  teamB: string
  winner: 1 | 2 | null
  status: string
}

export default function ScoreDisplay({ display, teamA, teamB, winner, status }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      {/* Set scores */}
      {display.sets.length > 0 && (
        <div className="flex justify-center gap-3">
          {display.sets.map((set, i) => (
            <div
              key={i}
              className={`text-center ${
                set.isCurrent ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <div className={`text-2xl font-bold tabular-nums ${set.isCurrent ? '' : 'text-lg'}`}>
                {set.team1}:{set.team2}
              </div>
              {set.isTiebreak && (
                <div className="text-xs text-gray-400">TB</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Teams and game score */}
      <div className="space-y-2">
        {/* Team A */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {display.server === 1 && (
              <span className="text-green-500 text-lg flex-shrink-0">●</span>
            )}
            <span className={`font-semibold truncate ${
              winner === 1 ? 'text-green-700' : 'text-gray-900'
            }`}>
              {teamA}
              {winner === 1 && <span className="ml-1 text-green-600">✓</span>}
            </span>
          </div>
        </div>

        {/* Team B */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {display.server === 2 && (
              <span className="text-green-500 text-lg flex-shrink-0">●</span>
            )}
            <span className={`font-semibold truncate ${
              winner === 2 ? 'text-green-700' : 'text-gray-900'
            }`}>
              {teamB}
              {winner === 2 && <span className="ml-1 text-green-600">✓</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Current game score */}
      {status === 'running' && display.game && (
        <div className="text-center border-t border-gray-100 pt-3">
          <span className="text-3xl font-bold tabular-nums text-gray-800">
            {display.game}
          </span>
        </div>
      )}

      {status === 'finished' && (
        <div className="text-center border-t border-gray-100 pt-3">
          <span className="text-lg font-semibold text-green-700">Match beendet</span>
        </div>
      )}
    </div>
  )
}

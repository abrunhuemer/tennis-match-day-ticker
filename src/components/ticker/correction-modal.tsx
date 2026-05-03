'use client'

import { useState } from 'react'
import type { MatchState } from '@/lib/tennis-scoring'

type Props = {
  currentState: MatchState
  teamA: string
  teamB: string
  onClose: () => void
  onApply: (newState: MatchState) => void
}

export default function CorrectionModal({ currentState, teamA, teamB, onClose, onApply }: Props) {
  const set = currentState.sets[currentState.currentSet] ?? { games: [0, 0] }
  const [gamesA, setGamesA] = useState(set.games[0])
  const [gamesB, setGamesB] = useState(set.games[1])
  const [ptsA, setPtsA] = useState(currentState.currentGame.points[0])
  const [ptsB, setPtsB] = useState(currentState.currentGame.points[1])
  const [serve, setServe] = useState<1 | 2>(currentState.servingTeam)

  function handleApply() {
    const newSets = currentState.sets.map((s, i) =>
      i === currentState.currentSet ? { ...s, games: [gamesA, gamesB] as [number, number] } : s
    )
    while (newSets.length <= currentState.currentSet) {
      newSets.push({ games: [gamesA, gamesB] as [number, number], isTiebreak: false, winner: null })
    }
    newSets[currentState.currentSet] = {
      ...newSets[currentState.currentSet],
      games: [gamesA, gamesB] as [number, number],
    }

    const correctedState: MatchState = {
      ...currentState,
      sets: newSets,
      currentGame: {
        ...currentState.currentGame,
        points: [ptsA, ptsB],
        isDeuce: ptsA >= 3 && ptsB >= 3 && ptsA === ptsB,
        advantage: null,
      },
      servingTeam: serve,
    }
    onApply(correctedState)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900">Manuelle Korrektur</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Satzstand (aktueller Satz)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-1">{teamA}</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setGamesA(Math.max(0, gamesA - 1))}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >−</button>
                  <span className="text-2xl font-bold w-8 text-center">{gamesA}</span>
                  <button
                    onClick={() => setGamesA(gamesA + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >+</button>
                </div>
              </div>
              <span className="text-gray-400 font-bold">:</span>
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-1">{teamB}</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setGamesB(Math.max(0, gamesB - 1))}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >−</button>
                  <span className="text-2xl font-bold w-8 text-center">{gamesB}</span>
                  <button
                    onClick={() => setGamesB(gamesB + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Spielstand (Punkte)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPtsA(Math.max(0, ptsA - 1))}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >−</button>
                  <span className="text-2xl font-bold w-8 text-center">{ptsA}</span>
                  <button
                    onClick={() => setPtsA(ptsA + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >+</button>
                </div>
              </div>
              <span className="text-gray-400 font-bold">:</span>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPtsB(Math.max(0, ptsB - 1))}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >−</button>
                  <span className="text-2xl font-bold w-8 text-center">{ptsB}</span>
                  <button
                    onClick={() => setPtsB(ptsB + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-lg font-medium"
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Aufschläger</p>
            <div className="flex gap-2">
              {([1, 2] as const).map(team => (
                <button
                  key={team}
                  onClick={() => setServe(team)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium ${
                    serve === team
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {team === 1 ? teamA : teamB}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium"
          >
            Abbrechen
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium"
          >
            Anwenden
          </button>
        </div>
      </div>
    </div>
  )
}

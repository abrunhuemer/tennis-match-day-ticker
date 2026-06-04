'use client'

import { useState } from 'react'
import type { MatchState, SetScore } from '@/lib/tennis-scoring'

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
  const [serve, setServe] = useState<1 | 2>(currentState.servingTeam)

  const isTbInProgress = currentState.currentGame.isTiebreak || currentState.currentGame.isMatchTiebreak
  const config = currentState.config
  const gPerSet = config.gamesPerSet
  const needed = Math.ceil(config.numSets / 2)

  function handleApply() {
    if (isTbInProgress) {
      onApply({ ...currentState, servingTeam: serve })
      onClose()
      return
    }

    // Build updated sets array with corrected game counts for current set
    const newSets: SetScore[] = currentState.sets.map((s, i) =>
      i === currentState.currentSet
        ? { ...s, games: [gamesA, gamesB] as [number, number] }
        : s
    )
    while (newSets.length <= currentState.currentSet) {
      newSets.push({ games: [gamesA, gamesB] as [number, number], isTiebreak: false, winner: null })
    }
    newSets[currentState.currentSet] = {
      ...newSets[currentState.currentSet],
      games: [gamesA, gamesB] as [number, number],
    }

    const sg1 = gamesA
    const sg2 = gamesB

    // A set ends by tiebreak when scores reach gPerSet+1 : gPerSet (e.g. 7:6)
    const wonByTb =
      (config.tiebreakSets && sg1 === gPerSet + 1 && sg2 === gPerSet) ||
      (config.tiebreakSets && sg2 === gPerSet + 1 && sg1 === gPerSet)
    const team1WinsSet = (sg1 >= gPerSet && sg1 - sg2 >= 2) || (config.tiebreakSets && sg1 === gPerSet + 1 && sg2 === gPerSet)
    const team2WinsSet = (sg2 >= gPerSet && sg2 - sg1 >= 2) || (config.tiebreakSets && sg2 === gPerSet + 1 && sg1 === gPerSet)
    const setWinner: 1 | 2 | null = team1WinsSet ? 1 : team2WinsSet ? 2 : null

    // If games are exactly gPerSet:gPerSet and no set winner yet → tiebreak starts
    const nextIsTiebreak = !setWinner && config.tiebreakSets && sg1 === gPerSet && sg2 === gPerSet

    let correctedCurrentSet = currentState.currentSet
    let nextIsMatchTb = false
    let correctedWinner: 1 | 2 | null = currentState.winner
    let correctedStatus: MatchState['status'] = currentState.status === 'pending' ? 'running' : currentState.status

    if (setWinner) {
      newSets[currentState.currentSet] = {
        ...newSets[currentState.currentSet],
        winner: setWinner,
        isTiebreak: wonByTb,
      }

      const wins1 = newSets.filter(s => s.winner === 1).length
      const wins2 = newSets.filter(s => s.winner === 2).length
      const matchWinner: 1 | 2 | null = wins1 >= needed ? 1 : wins2 >= needed ? 2 : null

      if (matchWinner) {
        correctedWinner = matchWinner
        correctedStatus = 'finished'
      } else {
        correctedCurrentSet = currentState.currentSet + 1
        nextIsMatchTb = config.matchTiebreak && wins1 === needed - 1 && wins2 === needed - 1
      }
    }

    const correctedState: MatchState = {
      ...currentState,
      sets: newSets,
      currentSet: correctedCurrentSet,
      currentGame: {
        points: [0, 0],
        isDeuce: false,
        advantage: null,
        isTiebreak: nextIsTiebreak,
        isMatchTiebreak: nextIsMatchTb,
      },
      servingTeam: serve,
      winner: correctedWinner,
      status: correctedStatus,
    }
    onApply(correctedState)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900">Manuelle Korrektur</h2>

        <div className="space-y-4">
          {isTbInProgress ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              {currentState.currentGame.isMatchTiebreak
                ? 'Match-Tiebreak läuft — nur Aufschläger kann geändert werden. Nutze Undo zum Korrigieren von Punkten.'
                : 'Tiebreak läuft (6:6) — nur Aufschläger kann geändert werden. Nutze Undo zum Korrigieren von Punkten.'}
            </div>
          ) : (
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
              {nextIsTiebreakHint(gamesA, gamesB, gPerSet, config.tiebreakSets) && (
                <p className="text-xs text-blue-600 mt-2 text-center">→ Tiebreak wird gestartet</p>
              )}
            </div>
          )}

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

function nextIsTiebreakHint(gA: number, gB: number, gPerSet: number, tiebreakSets: boolean): boolean {
  return tiebreakSets && gA === gPerSet && gB === gPerSet
}

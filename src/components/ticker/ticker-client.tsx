'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  applyPoint,
  getDisplayScore,
  undoLastPoint,
  type MatchState,
  type ScoreEventRecord,
} from '@/lib/tennis-scoring'
import { useRealtimeMatch } from '@/lib/use-realtime-match'
import ScoreDisplay from './score-display'
import CorrectionModal from './correction-modal'
import EditRightsBar from './edit-rights-bar'

type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type Props = {
  matchId: string
  initialState: MatchState
  events: ScoreEventRecord[]
  teamA: string
  teamB: string
  matchStatus: string
  editHolderId: string | null
  editStatus: 'free' | 'locked'
  currentUserId: string
  currentUserProfile: Profile | null
  holderProfile: Profile | null
  createdBy: string | null
  encounterId: string | null
  encounterName: string | null
}

export default function TickerClient({
  matchId,
  initialState,
  events: initialEvents,
  teamA,
  teamB,
  matchStatus: initialMatchStatus,
  editHolderId: initialEditHolderId,
  editStatus: initialEditStatus,
  currentUserId,
  holderProfile: initialHolderProfile,
  createdBy,
  encounterId,
  encounterName,
}: Props) {
  const [state, setState] = useState<MatchState>(initialState)
  const [events, setEvents] = useState<ScoreEventRecord[]>(initialEvents)
  const [editHolderId, setEditHolderId] = useState<string | null>(initialEditHolderId)
  const [editStatus, setEditStatus] = useState<'free' | 'locked'>(initialEditStatus)
  const [holderProfile, setHolderProfile] = useState<Profile | null>(initialHolderProfile)
  const [loading, setLoading] = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)

  const isHolder = editHolderId === currentUserId

  // Realtime syncs state for non-holders (spectators, other devices)
  const { state: rtState, events: rtEvents } =
    useRealtimeMatch(matchId, initialState.config, initialState, initialEvents)

  // Non-holders receive realtime updates; holders drive their own optimistic state
  useEffect(() => {
    if (!isHolder) {
      setState(rtState)
      setEvents(rtEvents)
    }
  }, [isHolder, rtState, rtEvents])
  const isMatchDone = state.status === 'finished' || initialMatchStatus === 'finished'

  const display = getDisplayScore(state)

  const scorePoint = useCallback(async (team: 1 | 2) => {
    if (!isHolder || isMatchDone || loading) return

    // Optimistic update
    const stateBefore = state
    const stateAfter = applyPoint(state, team)
    setState(stateAfter)
    setLoading(true)

    try {
      const res = await fetch(`/api/matches/${matchId}/point`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ team, pointBefore: stateBefore, pointAfter: stateAfter }),
      })

      if (!res.ok) {
        // Rollback
        setState(stateBefore)
        return
      }

      const { event } = await res.json()
      setEvents(prev => [...prev, event])
    } catch {
      setState(stateBefore)
    } finally {
      setLoading(false)
    }
  }, [isHolder, isMatchDone, loading, state, matchId])

  const undo = useCallback(async () => {
    if (!isHolder || loading || events.length === 0) return

    const undoneState = undoLastPoint(state, events)
    const stateBefore = state
    setState(undoneState)
    setLoading(true)

    try {
      const res = await fetch(`/api/matches/${matchId}/undo`, { method: 'POST' })
      if (!res.ok) {
        setState(stateBefore)
        return
      }
      // Mark last active event as undone
      setEvents(prev => {
        const lastActive = [...prev].reverse().find(e => !e.isUndone && e.eventType === 'point')
        if (!lastActive) return prev
        return prev.map(e => e.id === lastActive.id ? { ...e, isUndone: true } : e)
      })
    } catch {
      setState(stateBefore)
    } finally {
      setLoading(false)
    }
  }, [isHolder, loading, events, state, matchId])

  const changeServe = useCallback(async () => {
    if (!isHolder || isMatchDone || loading) return

    const newState = { ...state, servingTeam: state.servingTeam === 1 ? 2 as const : 1 as const }
    setState(newState)
    await fetch(`/api/matches/${matchId}/serve`, { method: 'POST' })
  }, [isHolder, isMatchDone, loading, state, matchId])

  const applyCorrection = useCallback(async (correctedState: MatchState) => {
    if (!isHolder || isMatchDone) return

    const stateBefore = state
    setState(correctedState)
    setLoading(true)

    try {
      const res = await fetch(`/api/matches/${matchId}/correction`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ correctedState }),
      })
      if (!res.ok) setState(stateBefore)
    } catch {
      setState(stateBefore)
    } finally {
      setLoading(false)
    }
  }, [isHolder, isMatchDone, state, matchId])

  // Keyboard shortcuts for desktop
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isHolder || isMatchDone) return
      if (e.key === '1') scorePoint(1)
      if (e.key === '2') scorePoint(2)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isHolder, isMatchDone, scorePoint, undo])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {encounterId && (
            <Link href={`/encounters/${encounterId}`} className="text-gray-400 hover:text-gray-600">
              ← {encounterName}
            </Link>
          )}
          <span className="ml-auto text-xs text-gray-400">Ticker</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Score display */}
        <ScoreDisplay
          display={display}
          teamA={teamA}
          teamB={teamB}
          winner={state.winner}
          status={state.status}
        />

        {/* Edit rights bar */}
        <EditRightsBar
          matchId={matchId}
          editHolderId={editHolderId}
          editStatus={editStatus}
          currentUserId={currentUserId}
          createdBy={createdBy}
          holderProfile={holderProfile}
          onClaimed={(uid) => {
            setEditHolderId(uid)
            setEditStatus('locked')
            setHolderProfile(null)
          }}
          onReleased={() => {
            setEditHolderId(null)
            setEditStatus('free')
            setHolderProfile(null)
          }}
        />

        {/* Ticker buttons — minimum 80px tall per spec */}
        {!isMatchDone && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => scorePoint(1)}
              disabled={!isHolder || loading}
              className={`
                h-24 rounded-2xl text-white text-lg font-bold shadow-sm
                transition-all active:scale-95
                ${isHolder
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  : 'bg-gray-300 cursor-not-allowed'
                }
              `}
              style={{ minHeight: '80px' }}
            >
              <span className="block text-sm font-normal opacity-80 mb-1">Punkt</span>
              {teamA}
            </button>

            <button
              onClick={() => scorePoint(2)}
              disabled={!isHolder || loading}
              className={`
                h-24 rounded-2xl text-white text-lg font-bold shadow-sm
                transition-all active:scale-95
                ${isHolder
                  ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700'
                  : 'bg-gray-300 cursor-not-allowed'
                }
              `}
              style={{ minHeight: '80px' }}
            >
              <span className="block text-sm font-normal opacity-80 mb-1">Punkt</span>
              {teamB}
            </button>
          </div>
        )}

        {/* Secondary controls */}
        {isHolder && !isMatchDone && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={undo}
              disabled={loading || events.filter(e => !e.isUndone && e.eventType === 'point').length === 0}
              className="py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-40"
            >
              ↩ Undo
            </button>
            <button
              onClick={changeServe}
              disabled={loading}
              className="py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
            >
              ● Aufschlag
            </button>
            <button
              onClick={() => setShowCorrection(true)}
              className="py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100"
            >
              ✏ Korrektur
            </button>
          </div>
        )}
      </main>

      {showCorrection && (
        <CorrectionModal
          currentState={state}
          teamA={teamA}
          teamB={teamB}
          onClose={() => setShowCorrection(false)}
          onApply={applyCorrection}
        />
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  replayEvents,
  type MatchState,
  type ScoreEventRecord,
  type MatchConfig,
} from '@/lib/tennis-scoring'

type RawEvent = {
  id: string
  event_type: string
  scoring_team: number | null
  point_before: unknown
  point_after: unknown
  is_undone: boolean
  created_at: string
}

function toScoreEvent(e: RawEvent): ScoreEventRecord {
  return {
    id: e.id,
    scoringTeam: e.scoring_team as 1 | 2 | null,
    pointBefore: e.point_before as ScoreEventRecord['pointBefore'],
    pointAfter: e.point_after as ScoreEventRecord['pointAfter'],
    isUndone: e.is_undone,
    eventType: e.event_type as ScoreEventRecord['eventType'],
  }
}

export function useRealtimeMatch(
  matchId: string,
  config: MatchConfig,
  initialState: MatchState,
  initialEvents: ScoreEventRecord[]
) {
  const [state, setState] = useState<MatchState>(initialState)
  const [events, setEvents] = useState<ScoreEventRecord[]>(initialEvents)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'score_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newEvent = toScoreEvent(payload.new as RawEvent)
          setEvents(prev => {
            const updated = [...prev, newEvent].sort(
              (a, b) =>
                new Date((a as unknown as RawEvent).created_at ?? 0).getTime() -
                new Date((b as unknown as RawEvent).created_at ?? 0).getTime()
            )
            const newState = replayEvents(config, initialState.servingTeam, updated)
            setState(newState)
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'score_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as RawEvent
          setEvents(prev => {
            const newEvents = prev.map(e =>
              e.id === updated.id ? toScoreEvent(updated) : e
            )
            const newState = replayEvents(config, initialState.servingTeam, newEvents)
            setState(newState)
            return newEvents
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, config, initialState.servingTeam])

  return { state, setState, events, setEvents }
}

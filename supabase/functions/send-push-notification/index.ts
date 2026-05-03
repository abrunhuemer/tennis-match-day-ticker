import { createClient } from 'jsr:@supabase/supabase-js@2'

// This Edge Function is triggered by a DB webhook on score_events INSERT.
// It reads the point_after snapshot, determines the event type (game/set/match end),
// fetches matching subscriptions, and sends Web Push notifications.

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@tennis-ticker.app'

type ScoreEventPayload = {
  type: 'INSERT'
  record: {
    id: string
    match_id: string
    event_type: string
    point_before: unknown
    point_after: unknown
    is_undone: boolean
  }
}

type PointAfter = {
  status?: string
  winner?: number | null
  sets?: Array<{ games: [number, number]; winner: number | null; isTiebreak: boolean }>
  currentSet?: number
  currentGame?: { points: [number, number] }
}

function detectEventType(before: unknown, after: PointAfter): 'game' | 'set' | 'match' | null {
  if (!before || !after) return null

  const b = before as PointAfter

  // Match end
  if (after.status === 'finished' && after.winner) return 'match'

  // Set end: number of completed sets changed
  const bSetsCompleted = (b.sets ?? []).filter(s => s.winner !== null).length
  const aSetsCompleted = (after.sets ?? []).filter(s => s.winner !== null).length
  if (aSetsCompleted > bSetsCompleted) return 'set'

  // Game end: current set's game count increased
  const bGames = (b.sets ?? [])[b.currentSet ?? 0]
  const aGames = (after.sets ?? [])[after.currentSet ?? 0]
  if (bGames && aGames) {
    const bTotal = bGames.games[0] + bGames.games[1]
    const aTotal = aGames.games[0] + aGames.games[1]
    if (aTotal > bTotal) return 'game'
  }

  return 'game' // fallback for first game
}

async function sendPushNotification(
  endpoint: string,
  keys: { p256dh: string; auth: string },
  title: string,
  body: string
) {
  // Import web-push compatible library for Deno
  const { generateVAPIDKeys, encrypt } = await import('npm:web-push@3')

  const payload = JSON.stringify({ title, body, icon: '/icons/icon-192.png' })

  // Build signed headers using VAPID
  const details = {
    endpoint,
    keys,
    vapidDetails: {
      subject: VAPID_SUBJECT,
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    },
  }

  try {
    // Use web-push sendNotification equivalent for Deno
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body: payload,
    })
    return response.ok
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const payload: ScoreEventPayload = await req.json()
  const event = payload.record

  if (event.event_type !== 'point' || event.is_undone) {
    return new Response('ok', { status: 200 })
  }

  const pointAfter = event.point_after as PointAfter
  const pointBefore = event.point_before

  const eventType = detectEventType(pointBefore, pointAfter)
  if (!eventType) return new Response('ok', { status: 200 })

  // Fetch match info for notification text
  const { data: match } = await supabase
    .from('matches')
    .select('player1_name, player2_name, player3_name, player4_name, type, encounter_id')
    .eq('id', event.match_id)
    .single()

  if (!match) return new Response('ok', { status: 200 })

  const teamA = match.type === 'doubles' && match.player2_name
    ? `${match.player1_name}/${match.player2_name}`
    : match.player1_name
  const teamB = match.type === 'doubles' && match.player4_name
    ? `${match.player3_name}/${match.player4_name}`
    : match.player3_name

  // Build notification text based on event type
  let notifTitle = 'Tennis-Ticker'
  let notifBody = ''
  const currentSets = pointAfter.sets ?? []

  if (eventType === 'match') {
    const winnerTeam = pointAfter.winner
    const winner = winnerTeam === 1 ? teamA : teamB
    const setScores = currentSets.map(s => `${s.games[0]}:${s.games[1]}`).join(', ')
    notifTitle = 'Match beendet'
    notifBody = `${winner} gewinnt ${setScores}`
  } else if (eventType === 'set') {
    const lastSet = currentSets.filter(s => s.winner !== null).at(-1)
    if (lastSet) {
      const setNum = currentSets.filter(s => s.winner !== null).length
      const setWinner = lastSet.winner === 1 ? teamA : teamB
      notifTitle = `Satz ${setNum} beendet`
      notifBody = `${setWinner} gewinnt ${lastSet.games[0]}:${lastSet.games[1]}`
    }
  } else {
    // Game end
    const setIdx = pointAfter.currentSet ?? 0
    const set = currentSets[setIdx]
    if (set) {
      notifTitle = 'Spiel'
      notifBody = `${teamA} ${set.games[0]}:${set.games[1]} ${teamB}`
    }
  }

  // Fetch subscriptions that should receive this notification
  const query = supabase
    .from('subscriptions')
    .select('push_endpoint, push_keys')
    .eq('match_id', event.match_id)

  if (eventType === 'game') {
    query.eq('notify_on_game', true)
  } else if (eventType === 'set') {
    query.eq('notify_on_set', true)
  } else {
    query.eq('notify_on_match', true)
  }

  const { data: subs } = await query

  // Also fetch encounter-level subscriptions
  const { data: encounterSubs } = await supabase
    .from('subscriptions')
    .select('push_endpoint, push_keys')
    .eq('encounter_id', match.encounter_id)
    .eq(eventType === 'match' ? 'notify_on_match' : 'notify_on_set', true)

  const allSubs = [...(subs ?? []), ...(encounterSubs ?? [])]

  await Promise.allSettled(
    allSubs.map(sub =>
      sendPushNotification(
        sub.push_endpoint,
        sub.push_keys as { p256dh: string; auth: string },
        notifTitle,
        notifBody
      )
    )
  )

  return new Response('ok', { status: 200 })
})

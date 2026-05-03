import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json()
  const {
    endpoint,
    keys,
    matchId,
    encounterId,
    notifyOnGame = false,
    notifyOnSet = true,
    notifyOnMatch = true,
  } = body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Missing push subscription data' }, { status: 400 })
  }

  if (!matchId && !encounterId) {
    return NextResponse.json({ error: 'Provide matchId or encounterId' }, { status: 400 })
  }

  const { error } = await supabase.from('subscriptions').insert({
    user_id: user?.id ?? null,
    push_endpoint: endpoint,
    push_keys: keys,
    match_id: matchId ?? null,
    encounter_id: encounterId ?? null,
    notify_on_game: notifyOnGame,
    notify_on_set: notifyOnSet,
    notify_on_match: notifyOnMatch,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { endpoint } = await request.json()

  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  await supabase.from('subscriptions').delete().eq('push_endpoint', endpoint)

  return NextResponse.json({ ok: true })
}

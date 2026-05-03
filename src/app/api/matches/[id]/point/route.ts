import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { team, pointBefore, pointAfter } = body

  if (!team || (team !== 1 && team !== 2)) {
    return NextResponse.json({ error: 'Invalid team' }, { status: 400 })
  }

  // Verify edit rights (RLS also enforces this)
  const { data: match } = await supabase
    .from('matches')
    .select('id, edit_holder_id, status')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.edit_holder_id !== user.id) {
    return NextResponse.json({ error: 'No edit rights' }, { status: 403 })
  }
  if (match.status === 'finished' || match.status === 'cancelled') {
    return NextResponse.json({ error: 'Match is over' }, { status: 400 })
  }

  // Update match status to running if pending
  if (match.status === 'pending') {
    await supabase.from('matches').update({ status: 'running' }).eq('id', id)
  }

  // Check if match is finished after this point
  if (pointAfter?.status === 'finished') {
    await supabase.from('matches').update({
      status: 'finished',
      winner_team: pointAfter.winner,
    }).eq('id', id)
  }

  // Insert score event
  const { data: event, error } = await supabase
    .from('score_events')
    .insert({
      match_id: id,
      event_type: 'point',
      scoring_team: team,
      point_before: pointBefore,
      point_after: pointAfter,
      server_team: pointAfter?.servingTeam ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ event })
}

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

  const { data: match } = await supabase
    .from('matches')
    .select('edit_holder_id')
    .eq('id', id)
    .single()

  if (!match || match.edit_holder_id !== user.id) {
    return NextResponse.json({ error: 'No edit rights' }, { status: 403 })
  }

  const { correctedState } = await request.json()

  const { error } = await supabase
    .from('score_events')
    .insert({
      match_id: id,
      event_type: 'correction',
      point_after: correctedState,
      server_team: correctedState?.servingTeam ?? null,
      created_by: user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

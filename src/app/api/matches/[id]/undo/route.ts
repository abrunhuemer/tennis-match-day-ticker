import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify edit rights
  const { data: match } = await supabase
    .from('matches')
    .select('edit_holder_id')
    .eq('id', id)
    .single()

  if (!match || match.edit_holder_id !== user.id) {
    return NextResponse.json({ error: 'No edit rights' }, { status: 403 })
  }

  // Find the last non-undone point event
  const { data: events } = await supabase
    .from('score_events')
    .select('id, event_type, is_undone')
    .eq('match_id', id)
    .eq('is_undone', false)
    .eq('event_type', 'point')
    .order('created_at', { ascending: false })
    .limit(1)

  const lastEvent = events?.[0]
  if (!lastEvent) return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 })

  const { error } = await supabase
    .from('score_events')
    .update({ is_undone: true })
    .eq('id', lastEvent.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ undoneEventId: lastEvent.id })
}

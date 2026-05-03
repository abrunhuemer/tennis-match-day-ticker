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

  const { data: match } = await supabase
    .from('matches')
    .select('edit_holder_id')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (match.edit_holder_id === user.id) {
    return NextResponse.json({ error: 'You are already the holder' }, { status: 400 })
  }

  const { error } = await supabase
    .from('edit_requests')
    .insert({ match_id: id, requester_id: user.id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, action } = await request.json()
  if (!requestId || !['accepted', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const { data: match } = await supabase
    .from('matches')
    .select('edit_holder_id')
    .eq('id', id)
    .single()

  if (!match || match.edit_holder_id !== user.id) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 })
  }

  const { data: editRequest, error } = await supabase
    .from('edit_requests')
    .update({ status: action })
    .eq('id', requestId)
    .eq('match_id', id)
    .select('requester_id')
    .single()

  if (error || !editRequest) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  if (action === 'accepted') {
    await supabase
      .from('matches')
      .update({ edit_holder_id: editRequest.requester_id, edit_status: 'locked' })
      .eq('id', id)
  }

  return NextResponse.json({ ok: true })
}

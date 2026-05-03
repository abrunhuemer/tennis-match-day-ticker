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

  const { targetUserId } = await request.json()
  if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })

  const { data: match } = await supabase
    .from('matches')
    .select('edit_holder_id, created_by')
    .eq('id', id)
    .single()

  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isHolder = match.edit_holder_id === user.id
  const isCreator = match.created_by === user.id

  if (!isHolder && !isCreator) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 })
  }

  const { error } = await supabase
    .from('matches')
    .update({ edit_holder_id: targetUserId, edit_status: 'locked' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

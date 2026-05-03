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

  // Atomically claim: only allowed when edit_status = 'free'
  // RLS enforces that update on matches is only allowed for edit_holder or creator,
  // so we use a raw query approach with a WHERE clause check
  const { data, error } = await supabase
    .from('matches')
    .update({ edit_holder_id: user.id, edit_status: 'locked' })
    .eq('id', id)
    .eq('edit_status', 'free')   // only claim when free
    .select('id, edit_holder_id')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Match ist nicht frei oder bereits übernommen.' },
      { status: 409 }
    )
  }

  return NextResponse.json({ editHolderId: data.edit_holder_id })
}

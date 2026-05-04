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

  // Allow claiming when free, or re-claiming your own locked rights
  const { data, error } = await supabase
    .from('matches')
    .update({ edit_holder_id: user.id, edit_status: 'locked' })
    .eq('id', id)
    .or(`edit_status.eq.free,edit_holder_id.eq.${user.id}`)
    .select('id, edit_holder_id')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Match ist bereits von jemand anderem übernommen.' },
      { status: 409 }
    )
  }

  return NextResponse.json({ editHolderId: data.edit_holder_id })
}

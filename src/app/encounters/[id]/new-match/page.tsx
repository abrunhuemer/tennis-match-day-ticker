import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewMatchForm from '@/components/matches/new-match-form'

export default async function NewMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: encounter } = await supabase
    .from('encounters')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!encounter) redirect('/dashboard')

  // Get existing match count for order_index
  const { count } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('encounter_id', id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/encounters/${id}`} className="text-gray-400 hover:text-gray-600">
            ← {encounter.name}
          </Link>
          <span className="font-bold text-gray-900">Neues Spiel</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <NewMatchForm
          encounterId={id}
          userId={user.id}
          nextOrderIndex={count ?? 0}
        />
      </main>
    </div>
  )
}

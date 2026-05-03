import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewEncounterForm from '@/components/encounters/new-encounter-form'

export default async function NewEncounterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/dashboard" className="text-gray-400 hover:text-gray-600">
            ← Zurück
          </a>
          <h1 className="font-bold text-gray-900">Neue Begegnung</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <NewEncounterForm userId={user.id} />
      </main>
    </div>
  )
}

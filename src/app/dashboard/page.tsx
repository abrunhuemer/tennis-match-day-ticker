import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEncounterDate } from '@/lib/format-date'
import InviteUserForm from '@/components/auth/invite-user-form'

type EncounterWithMatches = {
  id: string
  name: string
  title: string | null
  date: string
  location: string | null
  share_token: string
  created_by: string | null
  matches: { id: string; status: string; winner_team: number | null }[]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [{ data: rawEncounters }, { data: profile }] = await Promise.all([
    supabase
      .from('encounters')
      .select(`
        id, name, title, date, location, share_token, created_by,
        matches (id, status, winner_team)
      `)
      .order('date', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .single(),
  ])

  const encounters = rawEncounters as EncounterWithMatches[] | null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎾</span>
            <span className="font-bold text-gray-900">Tennis-Ticker</span>
          </div>
          <div className="flex items-center gap-3">
            {profile?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
            )}
            <form action="/auth/signout" method="POST">
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Begegnungen</h1>
          <Link
            href="/encounters/new"
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            + Neue Begegnung
          </Link>
        </div>

        {!encounters?.length && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Noch keine Begegnungen</p>
            <p className="text-sm mt-1">Erstelle deine erste Begegnung!</p>
          </div>
        )}

        <div className="space-y-3">
          {encounters?.map(encounter => {
            const wins1 = encounter.matches?.filter(m => m.winner_team === 1).length ?? 0
            const wins2 = encounter.matches?.filter(m => m.winner_team === 2).length ?? 0
            const running = encounter.matches?.filter(m => m.status === 'running').length ?? 0

            return (
              <Link
                key={encounter.id}
                href={`/encounters/${encounter.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">{encounter.name}</span>
                      {running > 0 && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    {encounter.title && (
                      <p className="text-sm text-gray-500 mt-0.5">{encounter.title}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">{formatEncounterDate(encounter.date)}</p>
                    {encounter.location && (
                      <p className="text-xs text-gray-400">{encounter.location}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {wins1}:{wins2}
                    </div>
                    <div className="text-xs text-gray-400">Matches</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="border-t border-gray-200 pt-6">
          <InviteUserForm invitedBy={user.id} />
        </div>
      </main>
    </div>
  )
}

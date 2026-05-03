import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEncounterDate } from '@/lib/format-date'
import MatchCard from '@/components/matches/match-card'
import type { EncounterWithMatches } from '@/lib/query-types'

export default async function PublicEncounterPage({
  params,
}: {
  params: Promise<{ share_token: string }>
}) {
  const { share_token } = await params
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('encounters')
    .select(`
      id, name, title, date, location, share_token, created_by,
      matches (
        id, type, order_index, status, winner_team,
        player1_name, player2_name, player3_name, player4_name,
        num_sets, games_per_set, tiebreak_sets, match_tiebreak, no_ad,
        edit_holder_id, edit_status, created_by,
        score_events (id, event_type, scoring_team, point_before, point_after, is_undone, created_at, server_team, created_by)
      )
    `)
    .eq('share_token', share_token)
    .single()

  if (!raw) notFound()
  const encounter = raw as unknown as EncounterWithMatches

  const matches = [...encounter.matches].sort((a, b) => a.order_index - b.order_index)

  const wins1 = matches.filter(m => m.winner_team === 1).length
  const wins2 = matches.filter(m => m.winner_team === 2).length
  const running = matches.filter(m => m.status === 'running').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎾</span>
            <span className="font-bold text-gray-900">Tennis-Ticker</span>
          </div>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Anmelden
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{encounter.name}</h1>
              {encounter.title && (
                <p className="text-sm text-gray-500 mt-0.5">{encounter.title}</p>
              )}
              <p className="text-sm text-gray-400 mt-1">{formatEncounterDate(encounter.date)}</p>
              {encounter.location && (
                <p className="text-xs text-gray-400">{encounter.location}</p>
              )}
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-3xl font-bold text-gray-900">{wins1}:{wins2}</div>
              <div className="text-xs text-gray-400">Matches</div>
            </div>
          </div>

          {running > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {running} {running === 1 ? 'Spiel läuft' : 'Spiele laufen'} gerade
            </div>
          )}
        </div>

        <div className="space-y-3">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>

        {matches.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Noch keine Spiele in dieser Begegnung.
          </div>
        )}
      </main>
    </div>
  )
}

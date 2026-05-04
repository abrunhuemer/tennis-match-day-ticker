import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { formatEncounterDate } from '@/lib/format-date'
import MatchCard from '@/components/matches/match-card'
import CopyButton from '@/components/encounters/copy-button'
import FinishEncounterButton from '@/components/encounters/finish-encounter-button'
import type { EncounterWithMatches } from '@/lib/query-types'

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: raw } = await supabase
    .from('encounters')
    .select(`
      id, name, title, date, location, share_token, created_by, finished_at,
      matches (
        id, type, order_index, status, winner_team,
        player1_name, player2_name, player3_name, player4_name,
        num_sets, games_per_set, tiebreak_sets, match_tiebreak, no_ad,
        edit_holder_id, edit_status, created_by,
        score_events (id, event_type, scoring_team, point_before, point_after, is_undone, created_at, server_team, created_by)
      )
    `)
    .eq('id', id)
    .single()

  if (!raw) notFound()
  const encounter = raw as unknown as EncounterWithMatches

  const matches = [...encounter.matches].sort((a, b) => a.order_index - b.order_index)

  const wins1 = matches.filter(m => m.winner_team === 1).length
  const wins2 = matches.filter(m => m.winner_team === 2).length

  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const shareUrl = `${proto}://${host}/e/${encounter.share_token}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
            ← Zurück
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{encounter.name}</h1>
            {encounter.title && (
              <p className="text-xs text-gray-500">{encounter.title}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Encounter info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{formatEncounterDate(encounter.date)}</p>
              {encounter.location && (
                <p className="text-sm text-gray-400">{encounter.location}</p>
              )}
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{wins1}:{wins2}</div>
              <div className="text-xs text-gray-400">Matchstand</div>
            </div>
          </div>

          {/* Share link */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-1">Öffentlicher Link für Zuschauer:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-mono text-gray-600"
              />
              <CopyButton value={shareUrl} />
            </div>
          </div>
        </div>

        {/* Matches */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Spiele</h2>
          <div className="flex items-center gap-2">
            {encounter.finished_at ? (
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Abgeschlossen</span>
            ) : (
              <>
                {encounter.created_by === user.id && (
                  <FinishEncounterButton encounterId={encounter.id} />
                )}
                <Link
                  href={`/encounters/${encounter.id}/new-match`}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  + Spiel
                </Link>
              </>
            )}
          </div>
        </div>

        {matches.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            Noch keine Spiele. Füge das erste Spiel hinzu!
          </div>
        )}

        <div className="space-y-3">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} currentUserId={user.id} />
          ))}
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type MatchType = 'singles' | 'doubles'

export default function NewMatchForm({
  encounterId,
  userId,
  nextOrderIndex,
}: {
  encounterId: string
  userId: string
  nextOrderIndex: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [matchType, setMatchType] = useState<MatchType>('singles')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)

    const payload = {
      encounter_id: encounterId,
      type: matchType,
      order_index: nextOrderIndex,
      player1_name: (data.get('player1_name') as string).trim() || 'Team 1',
      player2_name: matchType === 'doubles' ? ((data.get('player2_name') as string).trim() || null) : null,
      player3_name: (data.get('player3_name') as string).trim() || 'Team 2',
      player4_name: matchType === 'doubles' ? ((data.get('player4_name') as string).trim() || null) : null,
      num_sets: parseInt(data.get('num_sets') as string),
      games_per_set: parseInt(data.get('games_per_set') as string),
      tiebreak_sets: data.get('tiebreak_sets') === 'true',
      match_tiebreak: data.get('match_tiebreak') === 'true',
      no_ad: data.get('no_ad') === 'true',
      created_by: userId,
    }

    const supabase = createClient()
    const { data: match, error: err } = await supabase
      .from('matches')
      .insert(payload)
      .select('id, encounter_id')
      .single()

    if (err || !match) {
      setError('Fehler beim Erstellen des Spiels.')
      setLoading(false)
      return
    }

    router.push(`/encounters/${match.encounter_id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {/* Match type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Spieltyp</label>
        <div className="flex gap-3">
          {(['singles', 'doubles'] as MatchType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setMatchType(t)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                matchType === t
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {t === 'singles' ? 'Einzel' : 'Doppel'}
            </button>
          ))}
        </div>
      </div>

      {/* Players */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Spieler</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Team 1 – Spieler 1 <span className="text-red-500">*</span>
            </label>
            <input
              name="player1_name"
              placeholder="Team 1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Team 2 – Spieler 1 <span className="text-red-500">*</span>
            </label>
            <input
              name="player3_name"
              placeholder="Team 2"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
            />
          </div>

          {matchType === 'doubles' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Team 1 – Spieler 2</label>
                <input
                  name="player2_name"
                  placeholder="Name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Team 2 – Spieler 2</label>
                <input
                  name="player4_name"
                  placeholder="Name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Match config */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Konfiguration</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sätze</label>
            <select
              name="num_sets"
              defaultValue="3"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none bg-white"
            >
              <option value="1">1 Satz</option>
              <option value="3">Best of 3</option>
              <option value="5">Best of 5</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Games pro Satz</label>
            <select
              name="games_per_set"
              defaultValue="6"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none bg-white"
            >
              <option value="4">4</option>
              <option value="6">6</option>
              <option value="8">8</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <ToggleField
            name="tiebreak_sets"
            label="Tiebreak im Satz"
            description="Tiebreak bei z.B. 6:6"
            defaultValue={true}
          />
          <ToggleField
            name="match_tiebreak"
            label="Match-Tiebreak"
            description="10-Punkte-Tiebreak statt letztem Satz"
            defaultValue={false}
          />
          <ToggleField
            name="no_ad"
            label="No-Ad Scoring"
            description="Kein Einstand — Entscheidungspunkt"
            defaultValue={false}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Erstelle...' : 'Spiel erstellen'}
      </button>
    </form>
  )
}

function ToggleField({
  name,
  label,
  description,
  defaultValue,
}: {
  name: string
  label: string
  description: string
  defaultValue: boolean
}) {
  const [value, setValue] = useState(defaultValue)

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <input type="hidden" name={name} value={String(value)} />
        <button
          type="button"
          onClick={() => setValue(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            value ? 'bg-green-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              value ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>
    </div>
  )
}

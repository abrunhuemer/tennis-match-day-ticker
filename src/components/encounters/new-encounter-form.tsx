'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewEncounterForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = new FormData(form)

    const supabase = createClient()
    const { data: encounter, error: err } = await supabase
      .from('encounters')
      .insert({
        name: data.get('name') as string,
        title: (data.get('title') as string) || null,
        date: data.get('date') as string,
        location: (data.get('location') as string) || null,
        created_by: userId,
      })
      .select('id')
      .single()

    if (err || !encounter) {
      setError('Fehler beim Erstellen der Begegnung.')
      setLoading(false)
      return
    }

    router.push(`/encounters/${encounter.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="z.B. TC Rot-Weiß vs. TC Blau"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Titel <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="z.B. Relegation 2025"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
          Datum <span className="text-red-500">*</span>
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().split('T')[0]}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          Ort <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="z.B. Tennisclub Musterstadt"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Erstelle...' : 'Begegnung erstellen'}
      </button>
    </form>
  )
}

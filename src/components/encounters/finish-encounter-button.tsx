'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FinishEncounterButton({ encounterId }: { encounterId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const router = useRouter()

  async function finish() {
    setLoading(true)
    try {
      await fetch(`/api/encounters/${encounterId}/finish`, { method: 'POST' })
      router.refresh()
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm"
        >
          Abbrechen
        </button>
        <button
          onClick={finish}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? '...' : 'Abschließen'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-100"
    >
      Abschließen
    </button>
  )
}

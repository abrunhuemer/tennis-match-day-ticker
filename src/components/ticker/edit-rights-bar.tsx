'use client'

import { useState } from 'react'

type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
}

type Props = {
  matchId: string
  editHolderId: string | null
  editStatus: 'free' | 'locked'
  currentUserId: string
  createdBy: string | null
  holderProfile: Profile | null
  onClaimed: (newHolderId: string) => void
  onReleased: () => void
}

export default function EditRightsBar({
  matchId,
  editHolderId,
  editStatus,
  currentUserId,
  createdBy,
  holderProfile,
  onClaimed,
  onReleased,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isHolder = editHolderId === currentUserId
  const isCreator = createdBy === currentUserId
  const isFree = editStatus === 'free' || editHolderId === null

  async function claim() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/matches/${matchId}/claim`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Fehler beim Übernehmen')
        return
      }
      onClaimed(currentUserId)
    } finally {
      setLoading(false)
    }
  }

  async function release() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/matches/${matchId}/release`, { method: 'POST' })
      if (res.ok) onReleased()
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/matches/${matchId}/release`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      if (res.ok) onReleased()
    } finally {
      setLoading(false)
    }
  }

  async function requestRights() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/matches/${matchId}/edit-requests`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Fehler beim Anfordern')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
      {isFree ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Frei – kein aktiver Ticker</p>
          <button
            onClick={claim}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '...' : 'Übernehmen'}
          </button>
        </div>
      ) : isHolder ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-700 font-medium">Du tickerst gerade</p>
          <button
            onClick={release}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? '...' : 'Freigeben'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {holderProfile?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={holderProfile.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
            )}
            <p className="text-sm text-gray-700 truncate">
              {holderProfile?.display_name ?? 'Jemand'} tickert
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isCreator && (
              <button
                onClick={revoke}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
              >
                Entziehen
              </button>
            )}
            {!isCreator && (
              <button
                onClick={requestRights}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                {loading ? '...' : 'Anfragen'}
              </button>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InviteUserForm({ invitedBy }: { invitedBy: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setInviteLink(null)
    setErrorMessage('')

    const supabase = createClient()

    // Check if already invited
    const { data: existing } = await supabase
      .from('invitations')
      .select('id, accepted_at')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      if (existing.accepted_at) {
        setErrorMessage('Diese E-Mail-Adresse ist bereits registriert.')
      } else {
        setInviteLink(`${location.origin}/invite/${existing.id}`)
        setStatus('success')
      }
      return
    }

    const { data, error } = await supabase
      .from('invitations')
      .insert({ email: email.toLowerCase(), invited_by: invitedBy })
      .select('id')
      .single()

    if (error || !data) {
      setErrorMessage('Fehler beim Erstellen der Einladung.')
      setStatus('error')
      return
    }

    setInviteLink(`${location.origin}/invite/${data.id}`)
    setEmail('')
    setStatus('success')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Jemanden einladen</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {status === 'loading' ? '...' : 'Einladen'}
        </button>
      </form>

      {status === 'success' && inviteLink && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
          <p className="text-sm text-green-800 font-medium">Einladungslink:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 rounded border border-green-300 bg-white px-2 py-1 text-xs font-mono text-gray-700"
            />
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="px-2 py-1 rounded bg-green-600 text-white text-xs"
            >
              Kopieren
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}

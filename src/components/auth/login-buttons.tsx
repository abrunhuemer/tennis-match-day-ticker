'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginButtons() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkError, setMagicLinkError] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setMagicLinkError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      setMagicLinkError('Fehler beim Senden des Links. Bitte versuche es erneut.')
    } else {
      setMagicLinkSent(true)
    }
  }

  return (
    <div className="space-y-4">
      {magicLinkSent ? (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-800 text-center space-y-1">
          <p className="font-medium">Link gesendet!</p>
          <p>Schau in dein E-Mail-Postfach und klicke auf den Link, um dich anzumelden.</p>
        </div>
      ) : (
        <form onSubmit={signInWithMagicLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail-Adresse"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {magicLinkError && (
            <p className="text-xs text-red-600">{magicLinkError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
            Magic Link senden
          </button>
        </form>
      )}
    </div>
  )
}

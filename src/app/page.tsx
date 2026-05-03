import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginButtons from '@/components/auth/login-buttons'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirected?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const showRedirectMessage = params.redirected === '1'
  const error = params.error

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎾</div>
          <h1 className="text-3xl font-bold text-gray-900">Tennis-Ticker</h1>
          <p className="mt-2 text-gray-500">Live-Ticker für euren Tennisabend</p>
        </div>

        {showRedirectMessage && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Bitte melde dich an, um fortzufahren.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error === 'not_invited'
              ? 'Du bist nicht eingeladen. Bitte bitte ein Mitglied, dich einzuladen.'
              : 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.'}
          </div>
        )}

        <LoginButtons />

        <p className="text-center text-xs text-gray-400">
          Nur für eingeladene Mitglieder
        </p>
      </div>
    </main>
  )
}

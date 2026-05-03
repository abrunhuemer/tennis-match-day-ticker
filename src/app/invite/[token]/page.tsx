import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Look up invitation by token (token = invitation id)
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('id', token)
    .single()

  if (error || !invitation) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">❌</div>
          <h1 className="text-xl font-semibold text-gray-900">Ungültige Einladung</h1>
          <p className="text-gray-500">Dieser Einladungslink ist nicht gültig oder bereits abgelaufen.</p>
          <a href="/" className="inline-block text-green-600 font-medium hover:underline">
            Zur Startseite
          </a>
        </div>
      </main>
    )
  }

  if (invitation.accepted_at) {
    // Already accepted — just go to login
    redirect('/?accepted=1')
  }

  // Mark as accepted so the auth hook allows signup
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', token)

  redirect('/?invited=1')
}

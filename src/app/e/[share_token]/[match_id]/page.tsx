import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function PublicMatchPage({
  params,
}: {
  params: Promise<{ share_token: string; match_id: string }>
}) {
  const { share_token, match_id } = await params
  const supabase = await createClient()

  // Verify encounter share_token matches the match's encounter
  const { data: encounter } = await supabase
    .from('encounters')
    .select('id, name, share_token')
    .eq('share_token', share_token)
    .single()

  if (!encounter) notFound()

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', match_id)
    .eq('encounter_id', encounter.id)
    .single()

  if (!match) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/e/${share_token}`} className="text-gray-400 hover:text-gray-600">
            ← {encounter.name}
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500">
          Öffentliche Match-Ansicht — vollständiges Score-Display in Phase 7+
        </p>
      </main>
    </div>
  )
}

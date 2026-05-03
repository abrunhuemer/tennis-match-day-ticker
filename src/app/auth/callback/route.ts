import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    // Auth hook rejected the signup (not invited)
    if (error.message.includes('invitation') || error.status === 403) {
      return NextResponse.redirect(`${origin}/?error=not_invited`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}

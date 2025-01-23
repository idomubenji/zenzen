import { createClient } from '@/lib/supabase/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('Auth callback params:', { code })

  if (!code) {
    console.error('No code found in callback')
    return new Response(null, {
      status: 303,
      headers: { Location: '/auth/auth-code-error' }
    })
  }

  const supabase = createClient()

  try {
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Code exchange error:', error)
      return new Response(null, {
        status: 303,
        headers: { Location: '/auth/auth-code-error' }
      })
    }

    // After successful verification, redirect to sign-up to complete profile
    return new Response(null, {
      status: 303,
      headers: { Location: '/auth/sign-up' }
    })
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return new Response(null, {
      status: 303,
      headers: { Location: '/auth/auth-code-error' }
    })
  }
} 
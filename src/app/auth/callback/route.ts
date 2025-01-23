import { createClient } from '@/lib/supabase/server'
import { type NextRequest } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('Auth callback params:', { code })

  const supabase = createClient()

  try {
    if (code) {
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
    }

    console.error('No code found')
    return new Response(null, {
      status: 303,
      headers: { Location: '/auth/auth-code-error' }
    })
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return new Response(null, {
      status: 303,
      headers: { Location: '/auth/auth-code-error' }
    })
  }
} 
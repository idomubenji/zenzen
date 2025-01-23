import { createClient } from '@/lib/supabase/server'
import { type NextRequest } from 'next/server'
import { UserRoles } from '@/lib/auth/config'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/'

  console.log('Auth callback params:', { code, token_hash, type })

  const supabase = createClient()

  try {
    // For email confirmation, we should only get a code
    if (code) {
      console.log('Exchanging code for session')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Code exchange error:', error)
        return new Response(null, {
          status: 303,
          headers: { Location: '/auth/auth-code-error' }
        })
      }

      // After successful verification, redirect to sign-up to create profile
      console.log('Code exchange successful, redirecting to sign-up')
      return new Response(null, {
        status: 303,
        headers: { Location: '/auth/sign-up' }
      })
    }

    console.error('No verification code found')
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
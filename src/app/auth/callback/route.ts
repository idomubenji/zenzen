import { createClient } from '@/lib/supabase/server'
import { type NextRequest } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') ?? '/'

  console.log('Auth callback params:', { code, token_hash, type })

  const supabase = createClient()
  const serviceClient = createServiceClient()

  try {
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

      // Get user metadata
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.user_metadata || !user.email) {
        console.error('No user metadata or email found')
        return new Response(null, {
          status: 303,
          headers: { Location: '/auth/auth-code-error' }
        })
      }

      const role = user.user_metadata.role as string
      const name = user.user_metadata.name as string

      if (!role || !name) {
        console.error('Missing required metadata fields')
        return new Response(null, {
          status: 303,
          headers: { Location: '/auth/auth-code-error' }
        })
      }

      // Create user record with role using service client
      const { error: userError } = await serviceClient
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          role,
          name,
          created_at: new Date().toISOString()
        })

      if (userError) {
        console.error('Error creating user record:', userError)
        return new Response(null, {
          status: 303,
          headers: { Location: '/auth/auth-code-error' }
        })
      }

      // After successful verification and user creation, redirect to sign-up to complete profile
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
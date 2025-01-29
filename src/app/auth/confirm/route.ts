import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // After successful verification, redirect to sign-up to complete profile
      return new Response(null, {
        status: 303,
        headers: { Location: '/auth/sign-up' }
      })
    }
  }

  // redirect the user to an error page with some instructions
  return new Response(null, {
    status: 303,
    headers: { Location: '/auth/auth-code-error' }
  })
} 
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
    if (token_hash && type) {
      console.log('Verifying OTP')
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      })
      if (error) {
        console.error('OTP verification error:', error)
        return redirect('/auth/auth-code-error')
      }
    } else if (code) {
      console.log('Exchanging code for session')
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Code exchange error:', error)
        return redirect('/auth/auth-code-error')
      }
    } else {
      console.error('No verification method found')
      return redirect('/auth/auth-code-error')
    }

    // Get user data to determine redirect
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.error('Get user error:', userError)
      return redirect('/auth/auth-code-error')
    }
    if (!user) {
      console.error('No user found after verification')
      return redirect('/auth/auth-code-error')
    }

    console.log('User verified:', user.id)

    // Check if user profile exists
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Get profile error:', profileError)
    }

    console.log('User profile:', userData)

    if (userData?.role) {
      // Redirect based on role
      if (userData.role === UserRoles.CUSTOMER) {
        return redirect('/dashboard-c')
      } else if (userData.role === UserRoles.WORKER || userData.role === UserRoles.ADMINISTRATOR) {
        return redirect('/dashboard-w')
      } else if (userData.role === UserRoles.PENDING_WORKER) {
        return redirect('/limbo')
      }
    }

    console.log('No profile found, redirecting to sign-up')
    // If no user profile yet, redirect to sign-up page where checkSession will handle profile creation
    return redirect('/auth/sign-up')
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return redirect('/auth/auth-code-error')
  }
} 
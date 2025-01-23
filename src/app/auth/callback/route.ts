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

  const supabase = createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })
    if (error) {
      return redirect('/auth/auth-code-error')
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return redirect('/auth/auth-code-error')
    }
  } else {
    return redirect('/auth/auth-code-error')
  }

  // Get user data to determine redirect
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/auth/auth-code-error')
  }

  // Check if user profile exists
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

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

  // If no user profile yet, redirect to sign-up page where checkSession will handle profile creation
  return redirect('/auth/sign-up')
} 
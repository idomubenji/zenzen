import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { UserRoles } from '@/lib/auth/config'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Get user data to determine redirect
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
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
    }
  }

  // If something went wrong, redirect to auth error page
  return redirect('/auth/auth-code-error')
} 
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'
import type { NextRequest } from 'next/server'
import { UserRoles } from '@/lib/auth/config'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createClient()

  // Check if we have a session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (!session) {
    // If no session, redirect to sign in for protected routes
    if (req.nextUrl.pathname.startsWith('/dashboard-') || 
        req.nextUrl.pathname.startsWith('/limbo')) {
      return NextResponse.redirect(new URL('/auth/sign-in', req.url))
    }
    return res
  }

  // Get user data for role-based access control
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  // Allow access to sign-up page even without a role (for profile creation)
  if (req.nextUrl.pathname.startsWith('/auth/sign-up')) {
    return res
  }

  if (!userData?.role) {
    // If no role assigned yet, they should complete their profile
    if (req.nextUrl.pathname.startsWith('/dashboard-') || 
        req.nextUrl.pathname.startsWith('/limbo')) {
      return NextResponse.redirect(new URL('/auth/sign-up', req.url))
    }
    return res
  }

  const path = req.nextUrl.pathname

  // /dashboard-w is only for Workers and Administrators
  if (path.startsWith('/dashboard-w')) {
    if (userData.role !== UserRoles.WORKER && userData.role !== UserRoles.ADMINISTRATOR) {
      return NextResponse.redirect(new URL('/dashboard-c', req.url))
    }
  }

  // /limbo is only for PendingWorkers
  if (path.startsWith('/limbo')) {
    if (userData.role !== UserRoles.PENDING_WORKER) {
      if (userData.role === UserRoles.WORKER || userData.role === UserRoles.ADMINISTRATOR) {
        return NextResponse.redirect(new URL('/dashboard-w', req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard-c', req.url))
      }
    }
  }

  // /dashboard-c is accessible to anyone with a session
  // No additional checks needed

  return res
}

// Add the paths that should be checked by the middleware
export const config = {
  matcher: ['/dashboard-c/:path*', '/dashboard-w/:path*', '/limbo/:path*', '/auth/sign-up']
} 
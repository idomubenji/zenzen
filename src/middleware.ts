import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'
import type { NextRequest } from 'next/server'
import { UserRoles } from '@/lib/auth/config'

export async function middleware(req: NextRequest) {
  // Skip middleware for RSC requests
  if (req.nextUrl.searchParams.has('_rsc')) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  const supabase = createClient()

  console.log('Middleware - Request details:', {
    path: req.nextUrl.pathname,
    search: req.nextUrl.search,
    referrer: req.headers.get('referer'),
    nextUrl: req.headers.get('next-url')
  })

  // Check if we have a session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  console.log('Middleware - Session check:', { 
    hasSession: !!session,
    sessionError: sessionError?.message
  })

  if (!session) {
    // If no session, redirect to sign in for protected routes
    if (req.nextUrl.pathname === '/dashboard-c' || 
        req.nextUrl.pathname === '/dashboard-w' || 
        req.nextUrl.pathname === '/limbo') {
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

  console.log('Middleware - User data:', { 
    userData,
    error: userError?.message,
    userId: session.user.id
  })

  // Allow access to sign-up page even without a role (for profile creation)
  if (req.nextUrl.pathname === '/auth/sign-up') {
    return res
  }

  // For dashboard-c, only require a session
  if (req.nextUrl.pathname === '/dashboard-c') {
    return res
  }

  if (!userData?.role) {
    // If no role assigned yet, they should complete their profile
    if (req.nextUrl.pathname === '/dashboard-w' || 
        req.nextUrl.pathname === '/limbo') {
      return NextResponse.redirect(new URL('/auth/sign-up', req.url))
    }
    return res
  }

  // /dashboard-w is only for Workers and Administrators
  if (req.nextUrl.pathname === '/dashboard-w') {
    if (userData.role !== UserRoles.WORKER && userData.role !== UserRoles.ADMINISTRATOR) {
      return NextResponse.redirect(new URL('/dashboard-c', req.url))
    }
  }

  // /limbo is only for PendingWorkers
  if (req.nextUrl.pathname === '/limbo') {
    if (userData.role !== UserRoles.PENDING_WORKER) {
      if (userData.role === UserRoles.WORKER || userData.role === UserRoles.ADMINISTRATOR) {
        return NextResponse.redirect(new URL('/dashboard-w', req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard-c', req.url))
      }
    }
  }

  return res
}

// Add the paths that should be checked by the middleware
export const config = {
  matcher: [
    '/dashboard-c',
    '/dashboard-w',
    '/limbo',
    '/auth/sign-up'
  ]
} 
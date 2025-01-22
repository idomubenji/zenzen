import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_TIMEOUT, UserRoles } from './lib/auth/config'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if it exists
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if accessing auth pages while logged in
  if (session && (req.nextUrl.pathname.startsWith('/auth/'))) {
    return NextResponse.redirect(new URL('/dashboard-c', req.url))
  }

  // Protected routes
  const protectedPaths = ['/dashboard-c', '/dashboard-w', '/tickets', '/admin']
  const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

  if (isProtectedPath) {
    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/auth/sign-in', req.url))
    }

    // Check session timeout
    const lastActivity = session.user.last_sign_in_at
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - new Date(lastActivity).getTime()
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        // Sign out user and redirect to login
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/sign-in', req.url))
      }
    }

    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // Role-based access control
    if (userData) {
      const { role } = userData
      const path = req.nextUrl.pathname

      // Redirect customer trying to access worker dashboard
      if (role === UserRoles.CUSTOMER && path.startsWith('/dashboard-w')) {
        return NextResponse.redirect(new URL('/dashboard-c', req.url))
      }

      // Redirect worker trying to access customer dashboard
      if (role === UserRoles.WORKER && path.startsWith('/dashboard-c')) {
        return NextResponse.redirect(new URL('/dashboard-w', req.url))
      }

      // Only administrators can access admin routes
      if (path.startsWith('/admin') && role !== UserRoles.ADMINISTRATOR) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    // Update last activity
    await supabase.auth.updateUser({
      data: { last_sign_in_at: new Date().toISOString() },
    })
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 
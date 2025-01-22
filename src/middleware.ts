import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_TIMEOUT } from './lib/auth/config'

export async function middleware(req: NextRequest) {
  const res = new NextResponse()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if it exists
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if accessing auth pages while logged in
  if (session && (req.nextUrl.pathname.startsWith('/auth/login') || req.nextUrl.pathname.startsWith('/auth/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Protected routes
  const protectedPaths = ['/dashboard', '/tickets', '/admin']
  const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

  if (isProtectedPath) {
    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Check session timeout
    const lastActivity = session.user.last_sign_in_at
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - new Date(lastActivity).getTime()
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        // Sign out user and redirect to login
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login', req.url))
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
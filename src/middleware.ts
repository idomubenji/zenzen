import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/dist/server/web/spec-extension/response'
import type { NextRequest } from 'next/server'
import { UserRoles } from '@/lib/auth/config'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Update edge runtime directive
export const runtime = 'experimental-edge'

export async function middleware(req: NextRequest) {
  const isRsc = req.nextUrl.searchParams.has('_rsc')
  const path = req.nextUrl.pathname
  const res = NextResponse.next()

  console.log('[Middleware] Request:', {
    path,
    isRsc,
    cookies: req.cookies.toString(),
    headers: {
      referer: req.headers.get('referer'),
      nextUrl: req.headers.get('next-url'),
      cookie: req.headers.get('cookie')
    }
  })

  // For RSC requests to dashboard-c, allow them through
  if (isRsc && path === '/dashboard-c') {
    console.log('[Middleware] Allowing RSC request to dashboard-c')
    return res
  }

  try {
    // Create a Supabase client with cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('[Middleware] Session check:', { 
      hasSession: !!session,
      sessionError: sessionError?.message,
      userId: session?.user?.id,
      cookies: req.cookies.toString()
    })

    if (!session) {
      console.log('[Middleware] No session, redirecting to sign-in')
      if (path === '/dashboard-c' || 
          path === '/dashboard-w' || 
          path === '/limbo') {
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

    console.log('[Middleware] User data:', { 
      role: userData?.role,
      error: userError?.message,
      userId: session.user.id,
      query: `SELECT role FROM users WHERE id = '${session.user.id}'`
    })

    // Allow access to sign-up page even without a role (for profile creation)
    if (path === '/auth/sign-up') {
      console.log('[Middleware] Allowing access to sign-up')
      return res
    }

    // For dashboard-c, only require a session
    if (path === '/dashboard-c') {
      console.log('[Middleware] Allowing access to dashboard-c')
      return res
    }

    if (!userData?.role) {
      console.log('[Middleware] No role, redirecting to sign-up')
      if (path === '/dashboard-w' || 
          path === '/limbo') {
        return NextResponse.redirect(new URL('/auth/sign-up', req.url))
      }
      return res
    }

    // /dashboard-w is only for Workers and Administrators
    if (path === '/dashboard-w') {
      if (userData.role !== UserRoles.WORKER && userData.role !== UserRoles.ADMINISTRATOR) {
        console.log('[Middleware] Not worker/admin, redirecting to dashboard-c')
        return NextResponse.redirect(new URL('/dashboard-c', req.url))
      }
    }

    // /limbo is only for PendingWorkers
    if (path === '/limbo') {
      if (userData.role !== UserRoles.PENDING_WORKER) {
        if (userData.role === UserRoles.WORKER || userData.role === UserRoles.ADMINISTRATOR) {
          console.log('[Middleware] Not pending worker, redirecting to dashboard-w')
          return NextResponse.redirect(new URL('/dashboard-w', req.url))
        } else {
          console.log('[Middleware] Not pending worker, redirecting to dashboard-c')
          return NextResponse.redirect(new URL('/dashboard-c', req.url))
        }
      }
    }

    console.log('[Middleware] Allowing access')
    return res
  } catch (error) {
    console.error('[Middleware] Error:', error)
    // On error, allow the request through but log the error
    return res
  }
}

// Add the paths that should be checked by the middleware
export const config = {
  matcher: [
    // Match exact paths
    '/dashboard-c',
    '/dashboard-w',
    '/limbo',
    '/auth/sign-up',
    // Match paths with trailing slash
    '/dashboard-c/',
    '/dashboard-w/',
    '/limbo/',
    '/auth/sign-up/',
    // Match paths with query parameters
    '/dashboard-c/:path*',
    '/dashboard-w/:path*',
    '/limbo/:path*',
    '/auth/sign-up/:path*'
  ]
} 
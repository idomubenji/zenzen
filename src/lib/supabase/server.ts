import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import { CookieOptions } from '@supabase/ssr'

// Environment-specific URLs and keys
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD
const DEV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321'
const PROD_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD
const DEV_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV

// Determine if we're in production
const isProd = process.env.NODE_ENV === 'production'

export const createClient = () => {
  const cookieStore = cookies()

  return createServerClient(
    isProd ? PROD_URL! : DEV_URL,
    isProd ? PROD_ANON_KEY! : DEV_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting errors in middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: -1 })
          } catch (error) {
            // Handle cookie removal errors in middleware
          }
        },
      },
    }
  )
} 
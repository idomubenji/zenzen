import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const isProd = process.env.NODE_ENV === 'production'

// Use the appropriate URL and key based on environment
const supabaseUrl = isProd 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_PROD 
  : process.env.NEXT_PUBLIC_SUPABASE_URL_DEV

const supabaseKey = isProd
  ? process.env.SUPABASE_SERVICE_ROLE_KEY_PROD
  : process.env.SUPABASE_SERVICE_ROLE_KEY_DEV

// During build time, use placeholder values
const isBuildTime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build'
const url = isBuildTime ? 'http://localhost:54321' : (supabaseUrl || 'http://localhost:54321')
const key = isBuildTime ? 'dummy-key' : (supabaseKey || 'dummy-key')

export const supabaseServer = createClient<Database>(url, key) 
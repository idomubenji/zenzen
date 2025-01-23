'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { UserRole } from '@/lib/auth/config'

export async function createProfile(data: {
  id: string
  email: string
  name: string
  role: UserRole
}) {
  const serviceClient = createServiceClient()
  
  return serviceClient
    .from('users')
    .insert({
      ...data,
      created_at: new Date().toISOString()
    })
} 
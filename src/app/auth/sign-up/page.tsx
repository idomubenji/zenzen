"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AuthForm } from "@/components/auth/auth-form"
import { AuthService } from "@/lib/auth/service"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { UserRole, UserRoles } from "@/lib/auth/config"
import { supabase } from "@/lib/supabase/client"
import { Database } from "@/types/supabase"

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [assignedRole, setAssignedRole] = useState<UserRole>()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user already has a role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userData?.role) {
        router.push('/')
        return
      }
    }

    checkSession()
  }, [router])

  const handleRoleSelection = async (role: UserRole) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/auth/sign-in')
      return
    }

    setAssignedRole(role)

    if (role === UserRoles.PENDING_WORKER) {
      // Set as PendingWorker and redirect to limbo
      const updatedRole = 'PendingWorker'
      const { data: user }: { data: Database['public']['Tables']['users']['Row'] | null } = await supabase
        .from('users')
        .update({ 
          role: updatedRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .select()
        .single();
      router.push('/limbo')
    } else if (role === UserRoles.WORKER || role === UserRoles.ADMINISTRATOR) {
      await router.push('/dashboard-w')
    } else {
      toast.error('Invalid user role')
    }
  }

  async function onSubmit(values: { 
    email: string
    password: string
    name: string
    role: UserRole
  }) {
    try {
      setIsLoading(true)

      const { data: { session }, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      })

      if (signUpError) {
        toast.error(signUpError.message)
        return
      }

      if (!session) {
        toast.error('Failed to create session')
        return
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          name: values.name,
          role: values.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)
        .select()
        .single()

      if (profileError) {
        toast.error(profileError.message)
        return
      }

      if (values.role === UserRoles.PENDING_WORKER) {
        router.push('/limbo')
      } else if (values.role === UserRoles.WORKER || values.role === UserRoles.ADMINISTRATOR) {
        router.push('/dashboard-w')
      } else {
        toast.error('Invalid user role')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="relative w-[400px] h-[400px] mx-auto mb-6">
            <Image
              src="/images/zenzen-full.png"
              alt="ZenZen Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Join ZenZen to start managing your customer support
          </p>
        </div>

        <AuthForm
          mode="sign-up"
          onSubmit={onSubmit}
          isLoading={isLoading}
        />

        <div className="text-center text-sm">
          <Link 
            href="/"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to home
          </Link>
          <div className="mt-4">
            Already have an account?{" "}
            <Link 
              href="/auth/sign-in"
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
} 
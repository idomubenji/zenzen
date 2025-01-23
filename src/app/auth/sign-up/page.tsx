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
import { Button } from "@/components/ui/button"
import { createProfile } from "../actions"

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [assignedRole, setAssignedRole] = useState<UserRole>()
  const [isSignupComplete, setIsSignupComplete] = useState(false)
  const [lastEmail, setLastEmail] = useState<string>('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      console.log('Checking session...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No session found')
        return
      }

      console.log('Session found:', session.user.id)

      // If they have a session, check if they have a role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userError) {
        console.error('Error getting user data:', userError)
      }

      console.log('User data:', userData)

      if (userData?.role) {
        console.log('User has role:', userData.role)
        // If they have a role, redirect based on role
        if (userData.role === UserRoles.CUSTOMER) {
          router.push('/dashboard-c')
        } else if (userData.role === UserRoles.WORKER || userData.role === UserRoles.ADMINISTRATOR) {
          router.push('/dashboard-w')
        } else if (userData.role === UserRoles.PENDING_WORKER) {
          router.push('/limbo')
        } else {
          router.push('/')
        }
        return
      }

      // If they have a session but no role, show the role selection form
      setIsSignupComplete(false)
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

  const handleResendEmail = async () => {
    try {
      setIsResending(true)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: lastEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        toast.error('Failed to resend verification email')
        return
      }

      toast.success('Verification email resent')
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
    } finally {
      setIsResending(false)
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
      setLastEmail(values.email)

      // Get current session to check if we're completing profile after email verification
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // We're completing profile after email verification
        const finalRole = values.role === UserRoles.WORKER ? UserRoles.PENDING_WORKER : values.role
        
        const { error: profileError } = await createProfile({ 
          id: session.user.id,
          email: session.user.email || '',
          name: values.name || '',
          role: finalRole
        })

        if (profileError) {
          toast.error(profileError.message)
          return
        }

        // Redirect based on role
        if (finalRole === UserRoles.PENDING_WORKER) {
          router.push('/limbo')
        } else if (finalRole === UserRoles.CUSTOMER) {
          router.push('/dashboard-c')
        } else if (finalRole === UserRoles.ADMINISTRATOR) {
          router.push('/dashboard-w')
        }
        return
      }

      // Initial signup - store data and send verification email
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: values.name,
            role: values.role
          }
        }
      })

      if (signUpError) {
        toast.error(signUpError.message)
        return
      }

      // Show verification email sent message
      setIsSignupComplete(true)
      toast.success('Please check your email to verify your account')
    } catch (error) {
      // Improve error handling to show actual error message
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(message)
      console.error('Signup error:', error)
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
          {isSignupComplete ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                Check Your Email
              </h1>
              <p className="text-sm text-muted-foreground mt-4">
                We've sent you an email with a verification link. Please check your inbox and click the link to verify your account.
              </p>
              <div className="mt-8 space-y-4">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Resending...
                    </div>
                  ) : (
                    'Resend Verification Email'
                  )}
                </Button>
                <Link 
                  href="/auth/sign-in"
                  className="block text-primary hover:underline"
                >
                  Return to Sign In
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Join ZenZen to start managing your customer support
              </p>
            </>
          )}
        </div>

        {!isSignupComplete && (
          <>
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
          </>
        )}
      </div>
    </main>
  )
} 
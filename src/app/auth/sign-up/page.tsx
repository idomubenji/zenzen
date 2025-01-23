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

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [assignedRole, setAssignedRole] = useState<UserRole>()
  const [isSignupComplete, setIsSignupComplete] = useState(false)
  const [lastEmail, setLastEmail] = useState<string>('')
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // If no session, allow them to stay on sign-up page
        return
      }

      // If they have a session, check if they have a role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (userData?.role) {
        // If they have a role, redirect based on role
        if (userData.role === 'Customer') {
          router.push('/dashboard-c')
        } else if (userData.role === 'Worker' || userData.role === 'Administrator') {
          router.push('/dashboard-w')
        } else if (userData.role === 'PendingWorker') {
          router.push('/limbo')
        } else {
          router.push('/')
        }
        return
      }

      // If they have a session but no role, check for pending signup data
      const signupData = localStorage.getItem('pendingSignup')
      let name = '', role = ''
      
      if (signupData) {
        const data = JSON.parse(signupData)
        name = data.name
        role = data.role
      }

      // Create user profile with either stored data or defaults
      const { error: profileError } = await supabase
        .from('users')
        .insert({ 
          id: session.user.id,
          email: session.user.email || '',
          name: name || session.user.email?.split('@')[0] || '',  // Use email prefix as name if no stored name
          role: role === UserRoles.WORKER ? UserRoles.PENDING_WORKER : (role || UserRoles.CUSTOMER),  // Default to Customer if no role
          created_at: new Date().toISOString(),
          timestamp: new Date().toISOString()
        })

      // Clear stored data if it exists
      localStorage.removeItem('pendingSignup')

      if (profileError) {
        toast.error(profileError.message)
        return
      }

      // Redirect based on role
      if (role === UserRoles.WORKER) {
        router.push('/limbo')
      } else if (role === UserRoles.CUSTOMER) {
        router.push('/dashboard-c')
      } else if (role === UserRoles.ADMINISTRATOR) {
        router.push('/dashboard-w')
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

      // Store signup data for after verification
      localStorage.setItem('pendingSignup', JSON.stringify({
        name: values.name,
        role: values.role
      }))

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signUpError) {
        toast.error(signUpError.message)
        localStorage.removeItem('pendingSignup')
        return
      }

      // If we got a session (happens in development due to skipped verification)
      if (data.session) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({ 
            id: data.session.user.id,
            email: data.session.user.email || '',
            name: values.name || '',
            role: values.role === UserRoles.WORKER ? UserRoles.PENDING_WORKER : values.role,
            created_at: new Date().toISOString(),
            timestamp: new Date().toISOString()
          })

        if (profileError) {
          toast.error(profileError.message)
          return
        }

        // Redirect based on role
        if (values.role === UserRoles.WORKER) {
          router.push('/limbo')
        } else if (values.role === UserRoles.CUSTOMER) {
          router.push('/dashboard-c')
        } else if (values.role === UserRoles.ADMINISTRATOR) {
          router.push('/dashboard-w')
        }
        return
      }

      // If no session (email verification needed - production flow)
      setIsSignupComplete(true)
      toast.success('Please check your email to verify your account')
      
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error(error)
      localStorage.removeItem('pendingSignup')
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
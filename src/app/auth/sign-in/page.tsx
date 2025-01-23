"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AuthForm } from "@/components/auth/auth-form"
import { AuthService } from "@/lib/auth/service"
import { toast } from "sonner"
import { useState } from "react"

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(values: { email: string; password: string }) {
    try {
      setIsLoading(true)
      await AuthService.signIn(values.email, values.password)
      
      // Get user role and redirect accordingly
      const role = await AuthService.getCurrentUserRole()
      
      if (role === 'Customer') {
        await router.push('/dashboard-c')
      } else if (role === 'Worker' || role === 'Administrator') {
        await router.push('/dashboard-w')
      } else if (role === 'PendingWorker') {
        await router.push('/limbo')
      } else {
        // Handle other roles or errors
        toast.error('Invalid user role')
      }
    } catch (error) {
      toast.error('Failed to sign in: ' + (error as Error).message)
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
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to your account
          </p>
        </div>

        <AuthForm
          mode="sign-in"
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
            Don't have an account?{" "}
            <Link 
              href="/auth/sign-up"
              className="text-primary hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
} 
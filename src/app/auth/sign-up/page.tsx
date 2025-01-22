"use client"

import Link from "next/link"
import Image from "next/image"
import { AuthForm } from "@/components/auth/auth-form"

export default function SignUpPage() {
  async function onSubmit(values: any) {
    console.log("Sign up values:", values)
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
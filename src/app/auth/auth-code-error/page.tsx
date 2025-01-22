"use client"

import Link from "next/link"
import Image from "next/image"

export default function AuthCodeErrorPage() {
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
          <h1 className="text-2xl font-bold tracking-tight text-red-600">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground mt-4">
            There was a problem verifying your authentication code. This could happen if:
          </p>
          <ul className="mt-4 text-sm text-muted-foreground list-disc text-left pl-4">
            <li>The verification link has expired</li>
            <li>The link has already been used</li>
            <li>The verification code is invalid</li>
          </ul>
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm">
            Please try signing in again or contact support if the problem persists.
          </p>
          <Link 
            href="/auth/sign-in"
            className="inline-block text-primary hover:underline"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </main>
  )
} 
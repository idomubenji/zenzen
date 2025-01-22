import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <div className="max-w-3xl w-full space-y-8 text-center">
        {/* Logo Section */}
        <div className="relative w-64 h-64 mx-auto">
          <Image
            src="/images/zenzen-full.png"
            alt="ZenZen Logo"
            width={256}
            height={256}
            priority
            className="object-contain"
          />
        </div>

        {/* Product Description */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to ZenZen
          </h1>
          <p className="text-xl text-muted-foreground">
            A modern customer support platform that brings harmony to your service operations.
            Streamline communication, enhance productivity, and deliver exceptional customer experiences.
          </p>
        </div>

        {/* Auth Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link href="/auth/sign-in">
            <Button size="lg" variant="default">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button size="lg" variant="outline">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
} 
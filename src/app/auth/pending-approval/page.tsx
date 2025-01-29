"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { AuthService } from "@/lib/auth/service"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function PendingApprovalPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await AuthService.signOut()
      router.push('/auth/sign-in')
    } catch (error) {
      toast.error('Failed to sign out: ' + (error as Error).message)
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
            Pending Approval
          </h1>
          <p className="text-sm text-muted-foreground mt-4">
            Your worker account is currently pending administrator approval. 
            You will receive an email once your account has been approved.
          </p>
          <div className="mt-8 space-y-4">
            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
            <Link 
              href="/"
              className="block text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
} 
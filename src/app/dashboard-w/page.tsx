"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthService } from "@/lib/auth/service"
import { toast } from "sonner"

export default function WorkerDashboard() {
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
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          You are a Valued Worker
        </h1>
        <Button 
          onClick={handleSignOut}
          variant="outline"
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </main>
  )
} 
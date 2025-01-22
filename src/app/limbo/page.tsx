"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/lib/auth/service";
import { toast } from "sonner";

export default function LimboPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      router.push("/auth/sign-in");
    } catch (error) {
      toast.error("Failed to sign out. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-2xl font-semibold">
          We Value Your Attention and Patience While Your Application is Reviewed
        </h1>
        <Button 
          onClick={handleSignOut}
          variant="outline"
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
} 
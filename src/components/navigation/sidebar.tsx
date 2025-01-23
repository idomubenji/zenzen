"use client";

import { cn } from "@/lib/utils";
import { Home, Ticket, Users, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/lib/auth/service";
import { toast } from "sonner";

const routes = [
  {
    label: "Dashboard",
    icon: Home,
    href: "/dashboard-w",
    color: "text-sky-500",
  },
  {
    label: "Tickets",
    icon: Ticket,
    href: "/dashboard-w/tickets",
    color: "text-violet-500",
  },
  {
    label: "Team",
    icon: Users,
    href: "/dashboard-w/team",
    color: "text-pink-700",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      router.push('/auth/sign-in');
    } catch (error) {
      toast.error('Failed to sign out: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard-w" className="flex items-center justify-center mb-14">
          <div className="flex items-center space-x-3 w-full px-2">
            <Image 
              src="/images/zenzen-logo.png" 
              alt="Zenzen Logo" 
              width={48} 
              height={48} 
              className="flex-shrink-0"
            />
            <Image 
              src="/images/zenzen-text.png" 
              alt="Zenzen" 
              width={140} 
              height={35} 
              className="dark:invert flex-grow"
            />
          </div>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href
                  ? "text-white bg-white/10"
                  : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <Button 
          onClick={handleSignOut} 
          variant="ghost" 
          className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
} 
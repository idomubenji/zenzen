"use client";

import { cn } from "@/lib/utils";
import { Home, Ticket, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/lib/auth/service";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const routes = [
  {
    label: "Dashboard",
    icon: Home,
    href: "/dashboard-c",
    color: "text-sky-500",
  },
  {
    label: "My Tickets",
    icon: Ticket,
    href: "/dashboard-c/tickets",
    color: "text-violet-500",
  },
];

export function CustomerSidebar() {
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
    <div className="h-full w-[240px] bg-[#111827] text-white border-r border-black">
      <div className="space-y-4 py-4 flex flex-col h-full">
        <div className="px-3 py-2 flex-1">
          <Link href="/dashboard-c" className="flex items-center mb-14">
            <div className="flex items-center space-x-3 px-2">
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
                  "flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                  pathname === route.href
                    ? "text-white bg-white/10"
                    : "text-zinc-400",
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
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              onClick={handleSignOut} 
              variant="ghost" 
              className="flex-1 font-medium cursor-pointer hover:text-white hover:bg-white/10 justify-start text-zinc-400"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
            <div className="relative">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
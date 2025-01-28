"use client";

import { cn } from "@/lib/utils";
import { Home, Ticket, Users, LogOut, FileText, Pyramid } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";
import { toast } from "sonner";
import { useSidebar } from "@/lib/hooks";
import { ThemeToggle } from "@/components/theme-toggle";

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg 
    width="15" 
    height="15" 
    viewBox="0 0 15 15" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="transform transition-transform duration-300"
    style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <rect 
      x="2" 
      y="2" 
      width="11" 
      height="11" 
      rx="2" 
      stroke="currentColor" 
      strokeWidth="1.5" 
    />
    <line 
      x1="7.5" 
      y1="3" 
      x2="7.5" 
      y2="12" 
      stroke="currentColor" 
      strokeWidth="1.5" 
    />
  </svg>
);

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
    label: "Templates",
    icon: FileText,
    href: "/dashboard-w/templates",
    color: "text-emerald-500",
  },
  {
    label: "Team",
    icon: Users,
    href: "/dashboard-w/team",
    color: "text-pink-700",
  },
  {
    label: "ZainZen",
    icon: Pyramid,
    href: "/dashboard-w/zainzen",
    color: "text-amber-500",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/sign-in');
    } catch (error) {
      toast.error('Failed to sign out: ' + (error as Error).message);
    }
  };

  return (
    <div className={cn(
      "relative h-full bg-[#111827] text-white transition-all duration-300 border-r border-black",
      isCollapsed ? "w-[80px]" : "w-[288px]"
    )}>
      <div className="absolute right-0 top-3 translate-x-1/2 z-50">
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="secondary"
          size="icon"
          className="rounded-full h-8 w-8 border border-black bg-[#E6E9F4] hover:bg-[#d8dcec] p-1.5 text-black"
        >
          <CollapseIcon collapsed={isCollapsed} />
        </Button>
      </div>
      <div className="space-y-4 py-4 flex flex-col h-full">
        <div className="px-3 py-2 flex-1">
          <Link href="/dashboard-w" className="flex items-center justify-center mb-14">
            <div className={cn(
              "flex items-center space-x-3 px-2",
              isCollapsed ? "justify-center" : "w-full"
            )}>
              <Image 
                src="/images/zenzen-logo.png" 
                alt="Zenzen Logo" 
                width={48} 
                height={48} 
                className="flex-shrink-0"
              />
              {!isCollapsed && (
                <Image 
                  src="/images/zenzen-text.png" 
                  alt="Zenzen" 
                  width={140} 
                  height={35} 
                  className="dark:invert flex-grow"
                />
              )}
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
                  isCollapsed && "justify-center px-2"
                )}
              >
                <div className={cn(
                  "flex items-center flex-1",
                  isCollapsed && "justify-center"
                )}>
                  <route.icon className={cn(
                    "h-5 w-5",
                    !isCollapsed && "mr-3",
                    route.color
                  )} />
                  {!isCollapsed && route.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-auto p-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className={cn(
                "text-zinc-400 hover:text-white hover:bg-white/10",
                isCollapsed ? "w-full justify-center" : "justify-start"
              )}
            >
              <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && "Sign Out"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
} 
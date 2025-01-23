"use client";

import { Sidebar } from "@/components/navigation/sidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarContext } from "@/lib/hooks";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="h-full relative">
        <div className="hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80]">
          <Sidebar />
        </div>
        <main className={cn(
          "h-full transition-all duration-300",
          isCollapsed ? "md:pl-[80px]" : "md:pl-[288px]"
        )}>
          <div className="h-full p-8">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
} 
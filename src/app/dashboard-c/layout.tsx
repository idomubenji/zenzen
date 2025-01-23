"use client";

import { CustomerSidebar } from "@/components/navigation/customer-sidebar";

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 z-[80]">
        <CustomerSidebar />
      </div>
      <main className="md:pl-[240px]">
        {children}
      </main>
    </div>
  );
} 
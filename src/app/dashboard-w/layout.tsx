import { Sidebar } from "@/components/navigation/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80]">
        <Sidebar />
      </div>
      <main className="md:pl-[288px] transition-all duration-300">
        <div className="h-full p-8">{children}</div>
      </main>
    </div>
  );
} 
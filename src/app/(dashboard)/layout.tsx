"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileNav from "@/components/layout/MobileNav";
import { useDashboardStore } from "@/lib/store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collapsed = useDashboardStore((s) => s.sidebarCollapsed);
  const sidebarWidth = collapsed ? "md:ml-16" : "md:ml-60";

  return (
    <>
      <TopBar />
      <Sidebar />
      <main className={`pt-16 pb-16 md:pb-0 min-h-screen transition-all duration-300 ${sidebarWidth}`}>
        <div className="px-5 lg:px-8 py-6 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      <MobileNav />
    </>
  );
}

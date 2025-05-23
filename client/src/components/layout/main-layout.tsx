import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-fairshare-background">
      {/* Sidebar - Only visible on desktop */}
      <aside className="hidden md:block w-64 shrink-0 border-r">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="w-full flex-1 pt-0 pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile Navigation - Only visible on mobile */}
      <MobileNav />
    </div>
  );
}

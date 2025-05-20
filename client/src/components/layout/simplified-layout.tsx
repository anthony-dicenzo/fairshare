import { ReactNode, useState } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Home, BarChart4, Users, Plus, User } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";

interface SimplifiedLayoutProps {
  children: ReactNode;
  pageBackground?: string;
  headerText?: string;
}

export function SimplifiedLayout({ 
  children, 
  pageBackground = "bg-fairshare-cream", 
  headerText = "Dashboard" 
}: SimplifiedLayoutProps) {
  const [location] = useLocation();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  return (
    <div className="flex flex-col min-h-screen bg-fairshare-cream">
      {/* All header area with new color #32846b for all pages */}
      <div className="bg-[#32846b]">
        {/* Status bar area (to simulate mobile device) */}
        <div className="h-8"></div>
        
        {/* Page header - kept for structure but no text shown */}
        <header className="p-4 text-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{headerText}</h1>
            
            {/* Test page link */}
            <Link href="/onboarding-test">
              <div className="bg-orange-500 text-white px-4 py-2 rounded-md flex items-center font-bold hover:bg-orange-600 active:bg-orange-700 cursor-pointer">
                Onboarding Test
              </div>
            </Link>
          </div>
        </header>
      </div>
      
      {/* Main content */}
      <main className="flex-1 pb-24">
        {children}
      </main>
      
      {/* Bottom navigation - larger buttons similar to reference image */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-fairshare-cream border-t z-50">
        <nav className="flex justify-around items-center px-2 py-4">
          <Link href="/">
            <div className="flex flex-col items-center gap-1 cursor-pointer">
              <Home className={cn("h-6 w-6", location === "/" ? "text-[#32846b]" : "text-fairshare-dark/60")} />
              <span className={`text-xs font-medium ${location === "/" ? "text-[#32846b]" : ""}`}>Home</span>
            </div>
          </Link>
          <Link href="/groups">
            <div className="flex flex-col items-center gap-1 cursor-pointer">
              <Users className={cn("h-6 w-6", location === "/groups" ? "text-[#32846b]" : "text-fairshare-dark/60")} />
              <span className={`text-xs font-medium ${location === "/groups" ? "text-[#32846b]" : ""}`}>Groups</span>
            </div>
          </Link>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-[#32846b] text-white shadow-lg -mt-8"
          >
            <Plus className="h-8 w-8" />
          </button>
          <Link href="/activity">
            <div className="flex flex-col items-center gap-1 cursor-pointer">
              <BarChart4 className={cn("h-6 w-6", location === "/activity" ? "text-[#32846b]" : "text-fairshare-dark/60")} />
              <span className={`text-xs font-medium ${location === "/activity" ? "text-[#32846b]" : ""}`}>Activity</span>
            </div>
          </Link>
          <Link href="/profile">
            <div className="flex flex-col items-center gap-1 cursor-pointer">
              <User className={cn("h-6 w-6", location === "/profile" ? "text-[#32846b]" : "text-fairshare-dark/60")} />
              <span className={`text-xs font-medium ${location === "/profile" ? "text-[#32846b]" : ""}`}>Profile</span>
            </div>
          </Link>
        </nav>
      </div>
      
      {/* Expense modal */}
      <ExpenseForm open={showExpenseModal} onOpenChange={setShowExpenseModal} />
    </div>
  );
}
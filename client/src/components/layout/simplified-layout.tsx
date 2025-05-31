import { ReactNode, useState } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Home, BarChart4, Users, Plus, User, AlertCircle } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { PersistentNotification } from "@/components/ui/persistent-notification";

interface SimplifiedLayoutProps {
  children: ReactNode;
  pageBackground?: string;
  headerText?: string;
  showExpenseNotification?: boolean;
  onDismissExpenseNotification?: () => void;
}

export function SimplifiedLayout({ 
  children, 
  pageBackground = "bg-fairshare-cream", 
  headerText = "Dashboard",
  showExpenseNotification = false,
  onDismissExpenseNotification
}: SimplifiedLayoutProps) {
  const [location] = useLocation();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Extract group ID from current location if on a group page
  const getCurrentGroupId = (): number | undefined => {
    const match = location.match(/^\/group\/(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-fairshare-cream">
      {/* All header area with new color #32846b for all pages */}
      <div className="bg-[#32846b]">
        {/* Status bar area (to simulate mobile device) */}
        <div className="h-8"></div>
        
        {/* Page header - kept for structure but no text shown */}
        <header className="p-4 text-white">
          <h1 className="text-xl font-bold">{headerText}</h1>
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
          <div className="relative">
            <button 
              onClick={() => setShowExpenseModal(true)}
              className={`flex items-center justify-center w-16 h-16 rounded-full text-white shadow-lg -mt-8 ${
                showExpenseNotification 
                ? 'animate-flash-mango' 
                : 'bg-[#32846b]'
              }`}
            >
              <Plus className="h-8 w-8" />
            </button>
            {showExpenseNotification && onDismissExpenseNotification && (
              <PersistentNotification
                message="Add your first expense"
                position="tooltip"
                variant="default"
                size="sm"
                animate={true}
                icon={<AlertCircle className="h-3 w-3 text-fairshare-primary" />}
                onDismiss={onDismissExpenseNotification}
                style={{
                  bottom: "calc(100% + 40px)",
                  right: "auto",
                  left: "-75px",
                  whiteSpace: "nowrap",
                  zIndex: 50,
                }}
              />
            )}
          </div>
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
      <ExpenseForm 
        open={showExpenseModal} 
        onOpenChange={setShowExpenseModal} 
        groupId={getCurrentGroupId()}
      />
    </div>
  );
}
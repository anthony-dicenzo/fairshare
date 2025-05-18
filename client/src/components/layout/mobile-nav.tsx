import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, BarChart4, Users, Plus, User } from "lucide-react";
import { useState, lazy, Suspense } from "react";
const ExpenseForm = lazy(() => import("../expenses/expense-form"));

export function MobileNav() {
  const [location] = useLocation();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 w-full bg-fairshare-cream border-t z-50 md:hidden">
        <nav className="flex justify-around items-center px-2 py-3">
          <Link href="/">
            <div className="flex flex-col items-center gap-0.5 cursor-pointer">
              <Home className={cn("h-5 w-5", location === "/" ? "text-fairshare-primary" : "text-fairshare-dark/60")} />
              <span className="text-xs font-medium">Home</span>
            </div>
          </Link>
          <Link href="/groups">
            <div className="flex flex-col items-center gap-0.5 cursor-pointer">
              <Users className={cn("h-5 w-5", location === "/groups" ? "text-fairshare-primary" : "text-fairshare-dark/60")} />
              <span className="text-xs font-medium">Groups</span>
            </div>
          </Link>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-fairshare-primary text-white shadow-lg -mt-6"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Link href="/activity">
            <div className="flex flex-col items-center gap-0.5 cursor-pointer">
              <BarChart4 className={cn("h-5 w-5", location === "/activity" ? "text-fairshare-primary" : "text-fairshare-dark/60")} />
              <span className="text-xs font-medium">Activity</span>
            </div>
          </Link>
          <Link href="/profile">
            <div className="flex flex-col items-center gap-0.5 cursor-pointer">
              <User className={cn("h-5 w-5", location === "/profile" ? "text-fairshare-primary" : "text-fairshare-dark/60")} />
              <span className="text-xs font-medium">Profile</span>
            </div>
          </Link>
        </nav>
      </div>
      
      {showExpenseModal && (
        <Suspense fallback={null}>
          <ExpenseForm open={showExpenseModal} onOpenChange={setShowExpenseModal} />
        </Suspense>
      )}
    </>
  );
}

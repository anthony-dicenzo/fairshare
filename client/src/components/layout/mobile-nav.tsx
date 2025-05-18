import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, BarChart4, Users, Plus, User, HelpCircle } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { useTutorial } from "@/components/tutorial/tutorial-context";

// Use dynamic imports with proper component exports
const ExpenseFormComponent = lazy(() => import("../expenses/expense-form").then(module => ({ 
  default: module.ExpenseForm 
})));
const CreateGroupDialog = lazy(() => import("../groups/create-group-dialog").then(module => module.default));

export function MobileNav() {
  const [location] = useLocation();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const { startTutorial } = useTutorial();
  
  const handleAddButtonClick = () => {
    // Show a simplified dialog with options for "New Expense" or "New Group"
    if (location.startsWith('/group/')) {
      setShowExpenseModal(true);
    } else {
      setShowGroupModal(true);
    }
  };
  
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 w-full bg-fairshare-cream border-t z-50 md:hidden mobile-nav">
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
            onClick={handleAddButtonClick}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-fairshare-primary text-white shadow-lg -mt-6 relative"
            aria-label="Add"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Link href="/activity">
            <div className="flex flex-col items-center gap-0.5 cursor-pointer">
              <BarChart4 className={cn("h-5 w-5", location === "/activity" ? "text-fairshare-primary" : "text-fairshare-dark/60")} />
              <span className="text-xs font-medium">Activity</span>
            </div>
          </Link>
          <div className="flex flex-col items-center gap-0.5">
            <button 
              onClick={startTutorial}
              className="flex items-center justify-center cursor-pointer"
              aria-label="Help"
            >
              <HelpCircle className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-medium">Help</span>
            </button>
          </div>
        </nav>
      </div>
      
      {showExpenseModal && (
        <Suspense fallback={null}>
          <ExpenseFormComponent open={showExpenseModal} onOpenChange={setShowExpenseModal} />
        </Suspense>
      )}
      
      {showGroupModal && (
        <Suspense fallback={null}>
          <CreateGroupDialog open={showGroupModal} onOpenChange={setShowGroupModal} />
        </Suspense>
      )}
    </>
  );
}

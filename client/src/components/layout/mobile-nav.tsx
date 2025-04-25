import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, BarChart4, Users, Plus, User } from "lucide-react";
import { useState } from "react";
import { ExpenseForm } from "../expenses/expense-form";

export function MobileNav() {
  const [location] = useLocation();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 md:hidden">
        <nav className="flex justify-around px-2 py-3">
          <Link href="/">
            <a className="flex flex-col items-center gap-1">
              <Home className={cn("h-5 w-5", location === "/" ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs">Home</span>
            </a>
          </Link>
          <Link href="/groups">
            <a className="flex flex-col items-center gap-1">
              <Users className={cn("h-5 w-5", location === "/groups" ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs">Groups</span>
            </a>
          </Link>
          <button 
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white shadow-lg -mt-6"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Link href="/activity">
            <a className="flex flex-col items-center gap-1">
              <BarChart4 className={cn("h-5 w-5", location === "/activity" ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs">Activity</span>
            </a>
          </Link>
          <Link href="/profile">
            <a className="flex flex-col items-center gap-1">
              <User className={cn("h-5 w-5", location === "/profile" ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs">Profile</span>
            </a>
          </Link>
        </nav>
      </div>
      
      <ExpenseForm open={showExpenseModal} onOpenChange={setShowExpenseModal} />
    </>
  );
}

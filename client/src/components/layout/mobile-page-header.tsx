import { ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MobilePageHeaderProps {
  title?: string;
  children?: ReactNode;
}

export function MobilePageHeader({ title, children }: MobilePageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-3 md:hidden bg-fairshare-cream">
      <div className="flex items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 h-9 w-9 text-fairshare-dark hover:bg-fairshare-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[250px] sm:w-[300px]">
            <Sidebar />
          </SheetContent>
        </Sheet>
        
        <span className="font-bold text-xl text-fairshare-dark">
          {title || "FairShare"}
        </span>
      </div>
      
      {children}
    </div>
  );
}
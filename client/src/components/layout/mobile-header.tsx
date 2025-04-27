import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { UserDropdown } from "./user-dropdown";
import { Button } from "@/components/ui/button";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-fairshare-cream text-fairshare-dark px-3 md:hidden">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-fairshare-dark hover:bg-fairshare-cream/80" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[250px] sm:w-[300px]">
            <Sidebar />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-xl text-fairshare-primary">FairShare</span>
      </div>
      <UserDropdown />
    </header>
  );
}

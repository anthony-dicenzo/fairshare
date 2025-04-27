import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  BarChart4,
  Home,
  PlusCircle,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { UserDropdown } from "./user-dropdown";
import { Group } from "@shared/schema";
import { useState } from "react";
import { GroupForm } from "../groups/group-form";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [showGroupModal, setShowGroupModal] = useState(false);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  return (
    <>
      <div className={cn("flex flex-col h-full bg-fairshare-cream text-fairshare-dark border-r", className)}>
        <div className="flex h-16 items-center px-4 border-b border-fairshare-cream/30">
          <Link href="/" className="flex items-center font-bold text-xl text-fairshare-dark">
            FairShare
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="flex flex-col gap-1">
            <Link href="/">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/"
                    ? "bg-fairshare-primary text-white"
                    : "text-fairshare-dark hover:bg-fairshare-dark/10"
                )}
              >
                <Home className="h-5 w-5" />
                Dashboard
              </div>
            </Link>
            <Link href="/groups">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/groups"
                    ? "bg-fairshare-primary text-white"
                    : "text-fairshare-dark hover:bg-fairshare-dark/10"
                )}
              >
                <Users className="h-5 w-5" />
                Groups
              </div>
            </Link>
            <Link href="/activity">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                  location === "/activity"
                    ? "bg-fairshare-primary text-white"
                    : "text-fairshare-dark hover:bg-fairshare-dark/10"
                )}
              >
                <BarChart4 className="h-5 w-5" />
                Activity
              </div>
            </Link>
          </nav>

          <Separator className="my-4 bg-fairshare-dark/20" />

          <div className="py-2">
            <h3 className="px-3 text-xs font-semibold text-fairshare-dark/60 uppercase tracking-wider">
              My Groups
            </h3>
            <div className="mt-2 space-y-1">
              {groups.map((group) => (
                <Link key={group.id} href={`/group/${group.id}`}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                      location === `/group/${group.id}`
                        ? "bg-fairshare-primary text-white"
                        : "text-fairshare-dark hover:bg-fairshare-dark/10"
                    )}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-fairshare-primary/90 text-white">
                      <span className="text-xs">{group.name.charAt(0)}</span>
                    </div>
                    <span>{group.name}</span>
                  </div>
                </Link>
              ))}
              <button
                onClick={() => setShowGroupModal(true)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-fairshare-dark hover:bg-fairshare-dark/10"
              >
                <PlusCircle className="h-5 w-5" />
                Create New Group
              </button>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between p-4 border-t border-fairshare-dark/10 mt-auto">
          <UserDropdown />
        </div>
      </div>

      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </>
  );
}

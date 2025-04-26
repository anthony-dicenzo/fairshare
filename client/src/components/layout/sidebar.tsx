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
      <div className={cn("flex flex-col h-full bg-[#2B3A55] text-white border-r", className)}>
        <div className="flex h-16 items-center px-4 border-b border-[#2B3A55]/30">
          <Link href="/" className="flex items-center font-bold text-xl text-white">
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
                    : "text-white/80 hover:bg-white/10"
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
                    : "text-white/80 hover:bg-white/10"
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
                    : "text-white/80 hover:bg-white/10"
                )}
              >
                <BarChart4 className="h-5 w-5" />
                Activity
              </div>
            </Link>
          </nav>

          <Separator className="my-4 bg-white/20" />

          <div className="py-2">
            <h3 className="px-3 text-xs font-semibold text-white/60 uppercase tracking-wider">
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
                        : "text-white/80 hover:bg-white/10"
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
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                <PlusCircle className="h-5 w-5" />
                Create New Group
              </button>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between p-4 border-t border-[#2B3A55]/30 mt-auto">
          <UserDropdown />
        </div>
      </div>

      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </>
  );
}

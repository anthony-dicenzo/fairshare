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
      <div className={cn("flex flex-col h-full bg-background border-r", className)}>
        <div className="flex h-16 items-center px-4 border-b">
          <Link href="/" className="flex items-center font-bold text-xl text-primary">
            FairShare
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="flex flex-col gap-1">
            <Link href="/">
              <a
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  location === "/"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Home className="h-5 w-5" />
                Dashboard
              </a>
            </Link>
            <Link href="/groups">
              <a
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  location === "/groups"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Users className="h-5 w-5" />
                Groups
              </a>
            </Link>
            <Link href="/activity">
              <a
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  location === "/activity"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <BarChart4 className="h-5 w-5" />
                Activity
              </a>
            </Link>
          </nav>

          <Separator className="my-4" />

          <div className="py-2">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              My Groups
            </h3>
            <div className="mt-2 space-y-1">
              {groups.map((group) => (
                <Link key={group.id} href={`/group/${group.id}`}>
                  <a
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      location === `/group/${group.id}`
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary">
                      <span className="text-xs">{group.name.charAt(0)}</span>
                    </div>
                    <span>{group.name}</span>
                  </a>
                </Link>
              ))}
              <button
                onClick={() => setShowGroupModal(true)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-accent"
              >
                <PlusCircle className="h-5 w-5" />
                Create New Group
              </button>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between p-4 border-t mt-auto">
          <UserDropdown />
        </div>
      </div>

      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </>
  );
}

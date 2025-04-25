import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Group } from "@shared/schema";
import { useLocation } from "wouter";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { GroupForm } from "../groups/group-form";

export function GroupsList() {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [, setLocation] = useLocation();
  
  const { data: groups, isLoading } = useQuery<(Group & { balance?: number; memberCount?: number })[]>({
    queryKey: ["/api/groups"],
  });

  if (isLoading) {
    return <GroupsListSkeleton />;
  }

  if (!groups || groups.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
          <CardTitle className="text-base sm:text-lg">Your Groups</CardTitle>
          <Button
            onClick={() => setShowGroupModal(true)}
            variant="ghost"
            className="text-xs sm:text-sm text-primary h-8 px-2"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New
          </Button>
        </CardHeader>
        <CardContent className="text-center py-4 sm:py-6 px-4">
          <p className="text-sm text-muted-foreground">
            You don't have any groups yet. Create one to get started.
          </p>
          <Button
            onClick={() => setShowGroupModal(true)}
            className="mt-4 text-xs sm:text-sm px-3 py-2"
          >
            <PlusCircle className="h-4 w-4 mr-1 sm:mr-2" />
            Create Group
          </Button>
        </CardContent>
        <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
          <CardTitle className="text-base sm:text-lg">Your Groups</CardTitle>
          <Button
            onClick={() => setShowGroupModal(true)}
            variant="ghost"
            className="text-xs sm:text-sm text-primary h-8 px-2"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {groups.map((group) => (
              <div 
                key={group.id} 
                className="hover:bg-accent transition-colors cursor-pointer" 
                onClick={() => setLocation(`/group/${group.id}`)}
              >
                <div className="px-3 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                        <span className="text-xs sm:text-sm text-primary font-medium">
                          {group.name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{group.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {group.memberCount || "..."} members
                        </p>
                      </div>
                    </div>
                    {group.balance !== undefined && (
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className={`text-xs sm:text-sm font-medium ${
                          group.balance > 0 
                            ? "text-emerald-500 dark:text-emerald-400" 
                            : "text-rose-500 dark:text-rose-400"
                        }`}>
                          {group.balance > 0 ? "+" : ""}${Math.abs(group.balance).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.balance > 0 ? "You are owed" : "You owe"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </>
  );
}

function GroupsListSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-3 sm:px-5 py-3 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-3 flex-shrink-0" />
                  <div>
                    <Skeleton className="h-4 w-20 sm:w-24 mb-2" />
                    <Skeleton className="h-3 w-14 sm:w-16" />
                  </div>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <Skeleton className="h-4 w-12 sm:w-16 mb-2" />
                  <Skeleton className="h-3 w-10 sm:w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

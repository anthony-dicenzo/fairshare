import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { GroupForm } from "@/components/groups/group-form";
import { Group } from "@shared/schema";

export default function GroupsPage() {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [, setLocation] = useLocation();
  
  const { data: groups, isLoading } = useQuery<(Group & { balance?: number; memberCount?: number })[]>({
    queryKey: ["/api/groups"],
  });

  return (
    <MainLayout>
      <div className="px-4 py-6 md:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" asChild className="mr-2">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Your Groups</h1>
          </div>
          <Button onClick={() => setShowGroupModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center">
                    <Skeleton className="w-10 h-10 rounded-full mr-3" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-6">You don't have any groups yet. Create one to get started.</p>
            <Button onClick={() => setShowGroupModal(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card 
                key={group.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/group/${group.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <span className="text-sm text-primary font-medium">
                        {group.name.charAt(0)}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {group.memberCount || "..."} members
                    </p>
                    
                    {group.balance !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium">Balance</p>
                        <p className={`text-lg font-semibold ${
                          group.balance > 0 
                            ? "text-emerald-500 dark:text-emerald-400" 
                            : group.balance < 0
                              ? "text-rose-500 dark:text-rose-400"
                              : ""
                        }`}>
                          {group.balance > 0 ? "+" : ""}${Math.abs(group.balance).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.balance > 0 
                            ? "You are owed money" 
                            : group.balance < 0 
                              ? "You owe money" 
                              : "All settled up"}
                        </p>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/group/${group.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <GroupForm open={showGroupModal} onOpenChange={setShowGroupModal} />
    </MainLayout>
  );
}
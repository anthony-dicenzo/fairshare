import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ChevronRight, LogOut, User } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  // Generate user initials for avatar
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.username.substring(0, 2).toUpperCase();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <MainLayout>
      <div className="px-4 py-6 md:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{user.name}</CardTitle>
                  <CardDescription>@{user.username}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{user.email}</p>
                </div>
                {user.createdAt && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Member since</h3>
                    <p>{format(new Date(user.createdAt), "MMMM d, yyyy")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              <button className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-3 text-muted-foreground" />
                  <div className="text-left">
                    <h3 className="font-medium">Edit Profile</h3>
                    <p className="text-sm text-muted-foreground">Update your personal information</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              
              <Separator />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors text-rose-500 dark:text-rose-400"
              >
                <div className="flex items-center">
                  <LogOut className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium">Logout</h3>
                    <p className="text-sm text-muted-foreground">Sign out of your account</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
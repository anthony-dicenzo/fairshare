import { useState } from "react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, LogOut, User } from "lucide-react";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";

// Define the User type directly here since we don't have access to the shared types
interface UserType {
  id: number;
  username: string;
  name: string;
  email: string;
  createdAt?: string | Date;
}

interface SimplifiedProfileProps {
  user: UserType;
  onLogout: () => void;
}

export function SimplifiedProfile({ user, onLogout }: SimplifiedProfileProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Generate user initials for avatar
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user.username.substring(0, 2).toUpperCase();

  return (
    <div className="px-4 py-4">
      {/* User Header Card */}
      <Card className="mb-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 bg-fairshare-primary/20">
              <AvatarFallback className="text-lg text-fairshare-primary">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-fairshare-dark">{user.name}</h2>
              <p className="text-fairshare-dark/60">@{user.username}</p>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-fairshare-dark/60">Email</h3>
              <p className="text-fairshare-dark">{user.email}</p>
            </div>
            {user.createdAt && (
              <div>
                <h3 className="text-sm font-medium text-fairshare-dark/60">Member since</h3>
                <p className="text-fairshare-dark">{format(new Date(user.createdAt), "MMMM d, yyyy")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Settings Card */}
      <Card className="bg-white rounded-lg shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <h2 className="p-4 text-lg font-bold text-fairshare-dark">Account Settings</h2>
          
          <button 
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            onClick={() => setEditDialogOpen(true)}
          >
            <div className="flex items-center">
              <User className="h-5 w-5 mr-3 text-fairshare-dark/60" />
              <div className="text-left">
                <h3 className="font-medium text-fairshare-dark">Edit Profile</h3>
                <p className="text-sm text-fairshare-dark/60">Update your personal information</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-fairshare-dark/60" />
          </button>
          
          <Separator className="my-0" />
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-rose-500"
          >
            <div className="flex items-center">
              <LogOut className="h-5 w-5 mr-3" />
              <div className="text-left">
                <h3 className="font-medium">Logout</h3>
                <p className="text-sm text-fairshare-dark/60">Sign out of your account</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-fairshare-dark/60" />
          </button>
        </CardContent>
      </Card>

      {/* Profile Edit Dialog */}
      <ProfileEditForm 
        isOpen={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
      />
    </div>
  );
}
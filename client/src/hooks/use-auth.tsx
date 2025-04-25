import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, InsertUser, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Extend the InsertUser type for registration with confirmPassword
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type RegisterData = z.infer<typeof registerSchema>;

// Type for login credentials
type LoginData = {
  username: string;
  password: string;
};

// Remove password from User type for client
type SafeUser = Omit<User, "password">;

type AuthContextType = {
  user: SafeUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SafeUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SafeUser, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SafeUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async ({queryKey}) => {
      try {
        console.log("Fetching user data...");
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        
        console.log("User data fetch status:", res.status);
        
        if (res.status === 401) {
          console.log("User not authenticated via cookies, checking localStorage...");
          
          // Check if we have auth data in localStorage
          const storedAuth = localStorage.getItem("fairshare_auth_state");
          if (storedAuth) {
            try {
              const authData = JSON.parse(storedAuth);
              console.log("Found stored auth data for user:", authData.username);
              
              // If stored auth is from less than 30 days ago, try to use it
              const loggedInAt = new Date(authData.loggedInAt);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              if (loggedInAt > thirtyDaysAgo) {
                console.log("Attempting to fetch user data using backup method...");
                // Try to fetch user data using backup method
                const userResponse = await fetch(`/api/users/${authData.userId}`, {
                  headers: {
                    'X-Session-Backup': authData.sessionId
                  }
                });
                
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  console.log("Successfully retrieved user data using backup method");
                  return userData;
                } else {
                  console.log("Backup authentication failed, clearing stored auth");
                  localStorage.removeItem("fairshare_auth_state");
                }
              } else {
                console.log("Stored auth data is too old, clearing it");
                localStorage.removeItem("fairshare_auth_state");
              }
            } catch (e) {
              console.error("Error parsing stored auth data:", e);
              localStorage.removeItem("fairshare_auth_state");
            }
          }
          
          return null;
        }
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Error fetching user data:", errorText || res.statusText);
          throw new Error(errorText || res.statusText);
        }
        
        const userData = await res.json();
        console.log("User data fetched successfully:", userData.username);
        return userData;
      } catch (error) {
        console.error("Exception fetching user data:", error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("An error occurred while fetching user data");
      }
    },
    staleTime: 1000 * 60 * 5, // Cache user data for 5 minutes
    retry: 1 // Retry once on failure
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Logging in with:", credentials.username);
      
      try {
        // Clear any existing auth cookies from localStorage
        localStorage.removeItem("fairshare_auth_state");
        
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include" // Important for cookies
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || res.statusText);
        }
        
        const userData = await res.json();
        console.log("Login successful, user data:", userData);
        
        // Save session ID to localStorage as a backup authentication method
        if (userData.sessionId) {
          localStorage.setItem("fairshare_auth_state", JSON.stringify({
            userId: userData.id,
            username: userData.username,
            sessionId: userData.sessionId,
            loggedInAt: new Date().toISOString()
          }));
        }
        
        if (userData.message) {
          console.log("Server message:", userData.message);
        }
        
        // Validate session is working by immediately checking user status
        const verifyRes = await fetch("/api/user", { 
          credentials: "include"
        });
        console.log("Verification status:", verifyRes.status);
        
        // Create a cleaned version without additional properties
        const { message, sessionId, ...cleanUserData } = userData;
        return cleanUserData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (user: SafeUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidate other queries to force refresh with new auth state
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      // Reset cached user data on login error
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: SafeUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome to FairShare, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

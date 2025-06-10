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
import { 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  UserCredential,
  Auth
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

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

// Type for password reset request
type ResetPasswordData = {
  email: string;
};

// Type for password reset confirmation
type ResetPasswordConfirmData = {
  token: string;
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
  googleSignInMutation: UseMutationResult<SafeUser, Error, void>;
  resetPasswordMutation: UseMutationResult<{ message: string }, Error, ResetPasswordData>;
  resetPasswordConfirmMutation: UseMutationResult<{ message: string }, Error, ResetPasswordConfirmData>;
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
    queryFn: async ({ queryKey }) => {
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
                  },
                  credentials: "include" // Important for cookie-based auth
                });
                
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  console.log("Successfully retrieved user data using backup method");
                  
                  // Store the current session data for use in other API calls
                  document.cookie = `fairshare_auth=${authData.sessionId}; path=/; max-age=2592000; SameSite=Lax`;
                  
                  // Force a refresh of groups data after successful backup auth
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
                  }, 1000);
                  
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
        
        // Store successful session in localStorage for backup authentication
        if (!localStorage.getItem("fairshare_auth_state")) {
          localStorage.setItem("fairshare_auth_state", JSON.stringify({
            userId: userData.id,
            username: userData.username,
            sessionId: "session_via_cookies", // A placeholder value since we don't have the actual sessionId
            loggedInAt: new Date().toISOString()
          }));
        }
        
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

  const loginMutation = useMutation<SafeUser, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      console.log("Logging in with:", credentials.username);
      
      try {
        // Clear any existing auth cookies from localStorage
        localStorage.removeItem("fairshare_auth_state");
        
        // Clear all existing cache first to ensure no data leakage between users
        queryClient.clear();
        
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include" // Important for cookies
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const errorMessage = errorData?.error || res.statusText;
          throw new Error(errorMessage);
        }
        
        const userData = await res.json();
        console.log("Login successful, user data:", userData);
        
        // Always save auth data to localStorage for mobile devices
        // This provides a fallback authentication method
        localStorage.setItem("fairshare_auth_state", JSON.stringify({
          userId: userData.id,
          username: userData.username,
          sessionId: userData.sessionId,
          loggedInAt: new Date().toISOString()
        }));
        
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
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("An error occurred during login");
      }
    },
    onSuccess: (user) => {
      // Set the user in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Force a fresh fetch of all user-specific data instead of using potentially cached data from previous users
      setTimeout(() => {
        // Small timeout to ensure state updates are complete
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      }, 500);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
    },
    onError: (error) => {
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

  const registerMutation = useMutation<SafeUser, Error, RegisterData>({
    mutationFn: async (userData) => {
      // Clear any pre-existing user data from localStorage
      localStorage.removeItem("fairshare_auth_state");
      
      // Clear all existing cache first to avoid leaking data from previous users
      queryClient.clear();
      
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: (user) => {
      // Set the user in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Store authentication data for backup auth
      localStorage.setItem("fairshare_auth_state", JSON.stringify({
        userId: user.id,
        username: user.username,
        sessionId: "initial_session",
        loggedInAt: new Date().toISOString()
      }));
      
      toast({
        title: "Registration successful",
        description: `Welcome to FairShare, ${user.name}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      // Also clear local storage backup
      localStorage.removeItem("fairshare_auth_state");
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Reset user data
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear all queries from the cache to prevent data leakage between users
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const googleSignInMutation = useMutation<SafeUser, Error, void>({
    mutationFn: async () => {
      try {
        console.log("Starting Google sign-in process");
        // Clear any existing auth data
        localStorage.removeItem("fairshare_auth_state");
        queryClient.clear();
        
        // Check if Firebase auth is initialized
        if (!auth || !googleProvider) {
          console.error("Firebase auth is not initialized correctly");
          throw new Error("Google sign-in is not available. Please try again later or use email login.");
        }
        
        // Sign in with Google using Firebase - use redirect instead of popup for better reliability
        console.log("Initiating Firebase Google auth redirect");
        // Cast is safe because we checked for null above
        try {
          // Store the fact that we're attempting auth so we can check on page load
          localStorage.setItem("fairshare_google_auth_pending", "true");
          
          // Use redirect instead of popup - this will navigate away from the page
          await signInWithRedirect(auth as Auth, googleProvider as GoogleAuthProvider);
          
          // Code below will never execute due to the redirect
          return {} as SafeUser; // This will never be reached
        } catch (redirectError) {
          console.error("Error during Google redirect:", redirectError);
          throw new Error("Failed to redirect to Google authentication. Please try again or use email login.");
        }
      } catch (error) {
        console.error("Google sign-in error:", error);
        // Check for Firebase auth errors
        if (error && typeof error === 'object' && 'code' in error) {
          const firebaseError = error as { code: string; message?: string };
          switch(firebaseError.code) {
            case 'auth/popup-blocked':
              throw new Error('The Google sign-in popup was blocked by your browser. Please allow popups for this site.');
            case 'auth/popup-closed-by-user':
              throw new Error('The Google sign-in was cancelled. Please try again.');
            case 'auth/cancelled-popup-request':
              throw new Error('Another authentication request is in progress.');
            case 'auth/network-request-failed':
              throw new Error('Network error. Please check your internet connection and try again.');
            default:
              throw new Error(`Google authentication error: ${firebaseError.message || 'Unknown error'}`);
          }
        }
        
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("An error occurred during Google sign-in");
      }
    },
    onSuccess: (user) => {
      // Set the user in cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Force a fresh fetch of all user-specific data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
        queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      }, 500);
      
      toast({
        title: "Google sign-in successful",
        description: `Welcome${user.name ? `, ${user.name}` : ''}!`,
      });
    },
    onError: (error) => {
      console.error("Google sign-in mutation error:", error);
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Google sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send reset email");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reset email sent",
        description: data.message || "Check your email for password reset instructions",
      });
    },
    onError: (error) => {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordConfirmMutation = useMutation({
    mutationFn: async (data: ResetPasswordConfirmData) => {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reset password");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset successful",
        description: data.message || "Your password has been updated. You can now sign in with your new password.",
      });
    },
    onError: (error) => {
      toast({
        title: "Password reset failed",
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
        googleSignInMutation,
        resetPasswordMutation,
        resetPasswordConfirmMutation
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

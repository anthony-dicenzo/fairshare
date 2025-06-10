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
  login: UseMutationResult<SafeUser, Error, LoginData>;
  logout: UseMutationResult<void, Error, void>;
  register: UseMutationResult<SafeUser, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Query for current user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<SafeUser | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn<SafeUser | null>,
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation<SafeUser, Error, LoginData>({
    mutationFn: async (data) => {
      const response = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid username or password");
        }
        throw new Error("Login failed. Please try again.");
      }
      
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${user.name || user.username}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Failed to log in",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest("/api/logout", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.clear();
    },
    onError: (error) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation<SafeUser, Error, RegisterData>({
    mutationFn: async (data) => {
      const response = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400) {
          throw new Error(errorData.message || "Registration failed. Please check your information.");
        }
        throw new Error("Registration failed. Please try again.");
      }
      
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome to FairShare!",
        description: `Account created successfully for ${user.name || user.username}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const contextValue: AuthContextType = {
    user: user || null,
    isLoading,
    error: error || null,
    login: loginMutation,
    logout: logoutMutation,
    register: registerMutation,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
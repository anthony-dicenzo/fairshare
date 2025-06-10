import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

// Login schema for step 1 (username/email only)
const loginStep1Schema = z.object({
  username: z.string().min(1, "Username or email is required"),
});

// Login schema for step 2 (with password)
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration schema
const registerSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginStep1Values = z.infer<typeof loginStep1Schema>;
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation, registerMutation, googleSignInMutation } = useAuth();
  const isMobile = useIsMobile();
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [loginUsername, setLoginUsername] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Redirect to returnPath or home if already logged in
  useEffect(() => {
    if (user) {
      // Check if there's a saved return path in localStorage (for invite links)
      const returnPath = localStorage.getItem('returnPath');
      if (returnPath) {
        // Clear the return path from localStorage
        localStorage.removeItem('returnPath');
        // Navigate to the saved path
        navigate(returnPath);
      } else {
        // Default to home page
        navigate("/");
      }
    }
  }, [user, navigate]);

  // Login step 1 form (username/email only)
  const loginStep1Form = useForm<LoginStep1Values>({
    resolver: zodResolver(loginStep1Schema),
    defaultValues: {
      username: "",
    },
  });

  // Login form for step 2 (with password)
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: loginUsername,
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // This function is no longer needed since we removed the form in step 1,
  // but we keep it for backward compatibility
  const onLoginStep1Submit = (data: LoginStep1Values) => {
    setLoginUsername("");
    setLoginStep(2); // Proceed to credentials screen
    
    // Reset the form for step 2
    loginForm.reset({
      username: "",
      password: ""
    });
  };

  // This handles the final login submission (username + password)
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  // Mobile-optimized login page that matches the wireframe
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-fairshare-cream">
        <div className="flex-1 flex flex-col justify-center p-6">
          {/* Logo and tagline section */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-2">
              <h1 className="text-3xl font-bold text-fairshare-primary">FairShare</h1>
            </div>
            <h2 className="text-4xl font-serif font-medium text-fairshare-dark mt-10 mb-2">
              Split Expenses,<br />Without the Drama
            </h2>
            <p className="text-fairshare-dark/80 text-lg">
              Split expenses fairly with friends.
            </p>
          </div>

          {/* Login form section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => setActiveTab(value as "login" | "register")} 
              className="w-full tabs">
              <TabsList className="hidden">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                {loginStep === 1 ? (
                  /* Step 1: Initial login option selection */
                  <div className="space-y-4">
                    {/* Continue with email button - now just directly goes to step 2 */}
                    <Button 
                      type="button"
                      onClick={() => setLoginStep(2)} 
                      className="w-full h-12 rounded-xl mt-4 bg-fairshare-primary text-white hover:bg-fairshare-primary/90"
                    >
                      Continue with email
                    </Button>

                    {/* OR Separator */}
                    <div className="relative flex items-center my-6">
                      <div className="flex-grow border-t border-gray-300"></div>
                      <span className="flex-shrink mx-4 text-gray-500 text-sm uppercase">OR</span>
                      <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {/* Google Sign-in Button */}
                    <GoogleSignInButton className="mb-6" />

                    {/* Register option */}
                    <div className="text-center">
                      <p className="text-fairshare-dark/80 mb-4">Don't have an account?</p>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl border-fairshare-dark/20 text-fairshare-dark hover:bg-fairshare-dark/5"
                        onClick={() => setActiveTab("register")}
                      >
                        Create an account
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Step 2: Enter email and password */
                  <div>
                    {/* Back button for password step */}
                    <Button 
                      variant="ghost" 
                      className="mb-4 px-0 hover:bg-transparent" 
                      onClick={() => setLoginStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    
                    <div className="mb-6">
                      <h3 className="text-xl font-medium text-fairshare-dark">Sign in with email</h3>
                      <p className="text-sm text-fairshare-dark/60 mt-1">
                        Enter your account details below
                      </p>
                    </div>
                    
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        {/* Email field */}
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="Email address" 
                                  className="h-12 rounded-xl border-fairshare-dark/20 bg-white" 
                                  autoComplete="email"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Password field */}
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Password" 
                                  className="h-12 rounded-xl border-fairshare-dark/20 bg-white" 
                                  autoComplete="current-password"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Login button */}
                        <Button 
                          type="submit" 
                          className="w-full h-12 rounded-xl mt-4 bg-fairshare-primary text-white hover:bg-fairshare-primary/90"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? "Logging in..." : "Log in"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Full Name" 
                              className="h-12 rounded-xl border-fairshare-dark/20 bg-white"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Email" 
                              className="h-12 rounded-xl border-fairshare-dark/20 bg-white"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Username" 
                              className="h-12 rounded-xl border-fairshare-dark/20 bg-white"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Password" 
                              className="h-12 rounded-xl border-fairshare-dark/20 bg-white"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Confirm Password" 
                              className="h-12 rounded-xl border-fairshare-dark/20 bg-white"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl mt-4 bg-fairshare-dark text-white hover:bg-fairshare-dark/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </Form>

                {/* OR Separator */}
                <div className="relative flex items-center my-6">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-500 text-sm uppercase">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Google Sign-in Button */}
                <GoogleSignInButton className="mb-6" />

                {/* Login option */}
                <div className="text-center">
                  <p className="text-fairshare-dark/80 mb-4">Already have an account?</p>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-fairshare-dark/20 text-fairshare-dark hover:bg-fairshare-dark/5"
                    onClick={() => setActiveTab("login")}
                  >
                    Log in
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* User Experience Features Section */}
          <div className="mt-12 mb-6">
            <h3 className="text-xl font-medium text-fairshare-dark text-center mb-6">What You Get with FairShare</h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fairshare-primary" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-fairshare-dark">Effortless Expense Tracking</h4>
                  <p className="text-fairshare-dark/70 text-sm">Log expenses and split them equally or with custom amounts</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fairshare-primary" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-fairshare-dark">Smart Group Management</h4>
                  <p className="text-fairshare-dark/70 text-sm">Create groups for roommates, trips, or events</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fairshare-primary" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-fairshare-dark">Real-time Balance Tracking</h4>
                  <p className="text-fairshare-dark/70 text-sm">See who owes what with automatic calculations</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fairshare-primary" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-fairshare-dark">Simplified Settlements</h4>
                  <p className="text-fairshare-dark/70 text-sm">Record payments and keep everyone's balances up to date</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-fairshare-primary font-medium">Free for everyone. No hidden fees.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop version remains unchanged
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <header className="flex items-center justify-between p-4 bg-background border-b">
        <div className="text-xl font-bold text-fairshare-primary">FairShare</div>
      </header>

      <div className="flex-1 grid md:grid-cols-2 gap-0">
        {/* Auth Forms */}
        <div className="flex items-center justify-center p-4 md:p-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to FairShare</CardTitle>
              <CardDescription>
                Split expenses fairly with friends, roommates, or groups — everyone gets their fair share.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value as "login" | "register")} 
                className="w-full tabs">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email or Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Email or username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Log in"}
                      </Button>
                    </form>

                    {/* OR Separator */}
                    <div className="relative flex items-center my-6">
                      <div className="flex-grow border-t border-gray-300"></div>
                      <span className="flex-shrink mx-4 text-gray-500 text-sm uppercase">OR</span>
                      <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {/* Google Sign-in Button */}
                    <GoogleSignInButton />
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create account"}
                      </Button>
                    </form>

                    {/* OR Separator */}
                    <div className="relative flex items-center my-6">
                      <div className="flex-grow border-t border-gray-300"></div>
                      <span className="flex-shrink mx-4 text-gray-500 text-sm uppercase">OR</span>
                      <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    {/* Google Sign-in Button */}
                    <GoogleSignInButton />
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Hero Section */}
        <div className="hidden md:flex flex-col items-center justify-center p-8 bg-primary/10 text-center">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold mb-6 text-fairshare-primary">Split expenses without the drama</h1>
            
            <div className="space-y-6 text-left">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-fairshare-primary font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Track shared expenses</h3>
                  <p className="text-muted-foreground">Log expenses and assign them to the right people, whether split equally or custom amounts.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-fairshare-primary font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Create groups for any occasion</h3>
                  <p className="text-muted-foreground">Organize expenses for roommates, trips, events or any shared spending situation.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-fairshare-primary font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Settle up easily</h3>
                  <p className="text-muted-foreground">See who owes what and record payments to keep your balances up to date.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

type LoginStep1Form = z.infer<typeof loginStep1Schema>;
type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const isMobile = useIsMobile();

  // Form instances
  const loginStep1Form = useForm<LoginStep1Form>({
    resolver: zodResolver(loginStep1Schema),
    defaultValues: { username: "" },
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Mutations for API calls
  const loginMutation = login;
  const registerMutation = register;

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Handle login step 1 submission (username/email check)
  const onLoginStep1Submit = (data: LoginStep1Form) => {
    loginForm.setValue("username", data.username);
    setLoginStep(2);
  };

  // Handle login submission
  const onLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  // Handle registration submission
  const onRegisterSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fairshare-secondary/20 to-fairshare-primary/10">
      {isMobile ? (
        // Mobile Layout - Scrollable single column
        <div className="flex flex-col min-h-screen">
          {/* Header Section with Logo */}
          <div className="flex-shrink-0 px-6 pt-8 pb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-fairshare-primary rounded-lg mr-3"></div>
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
                              autoComplete="name"
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
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Username" 
                              className="h-12 rounded-xl border-fairshare-dark/20 bg-white"
                              autoComplete="username"
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
                              autoComplete="new-password"
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
                              autoComplete="new-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl mt-4 bg-fairshare-primary text-white hover:bg-fairshare-primary/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </Form>

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
                  <span className="text-fairshare-primary font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-fairshare-dark">Quick expense tracking</h4>
                  <p className="text-fairshare-dark/70 text-sm">Add expenses in seconds and split them automatically with your group.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-fairshare-primary font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-fairshare-dark">Real-time balances</h4>
                  <p className="text-fairshare-dark/70 text-sm">See who owes what instantly with automatic balance calculations.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-fairshare-primary font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-fairshare-dark">Easy settlements</h4>
                  <p className="text-fairshare-dark/70 text-sm">Record payments and settle up with just a few taps.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Desktop Layout - Two columns
        <div className="flex min-h-screen">
          {/* Left column - Forms */}
          <div className="w-1/2 p-8 flex items-center justify-center">
            <Card className="w-full max-w-md border-0 shadow-none bg-transparent">
              <CardHeader className="space-y-1 px-0 pb-8">
                <div className="flex items-center mb-8">
                  <div className="w-8 h-8 bg-fairshare-primary rounded-lg mr-3"></div>
                  <CardTitle className="text-3xl font-bold text-fairshare-primary">FairShare</CardTitle>
                </div>
                <CardDescription className="text-lg text-fairshare-dark/80">
                  Split expenses fairly with friends
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
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
                                <Input placeholder="Enter your email or username" {...field} />
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
                                <Input type="password" placeholder="Enter your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                          {loginMutation.isPending ? "Logging in..." : "Log in"}
                        </Button>
                      </form>
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
                        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                          {registerMutation.isPending ? "Creating account..." : "Create account"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Hero Section */}
          <div className="w-1/2 bg-gradient-to-br from-fairshare-primary/10 to-fairshare-secondary/10 p-8 flex items-center justify-center">
            <div className="max-w-lg text-center">
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
                    <h3 className="font-semibold text-lg">Real-time balances</h3>
                    <p className="text-muted-foreground">See exactly who owes what with automatic calculations and running balance updates.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-fairshare-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-fairshare-primary font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Easy settlements</h3>
                    <p className="text-muted-foreground">Record payments and settle debts with simple, intuitive tools that keep everyone happy.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
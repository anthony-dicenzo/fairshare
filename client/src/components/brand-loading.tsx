import { useLoading } from "@/hooks/use-loading";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { DollarSign, Users, TrendingUp } from "lucide-react";

export function BrandLoading() {
  const { isLoading, progress } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
        {/* Brand Logo/Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className={cn(
              "flex items-center justify-center w-16 h-16 rounded-full",
              "bg-gradient-to-br from-primary via-accent to-secondary",
              "animate-loading-pulse"
            )}>
              <DollarSign className="w-8 h-8 text-white animate-bounce" />
            </div>
            {/* Floating icons around the main logo */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center animate-pulse">
              <Users className="w-3 h-3 text-primary" />
            </div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center animate-pulse delay-150">
              <TrendingUp className="w-3 h-3 text-primary" />
            </div>
          </div>
        </div>

        {/* Brand Text */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Fair<span className="text-primary">Share</span>
          </h2>
          <p className="text-muted-foreground text-sm animate-pulse">
            Loading your financial journey...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <Progress 
            value={progress} 
            className="h-2 bg-muted"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Syncing data</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Fun loading messages based on progress */}
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground animate-pulse">
            {progress < 25 && "Gathering your groups..."}
            {progress >= 25 && progress < 50 && "Calculating balances..."}
            {progress >= 50 && progress < 75 && "Organizing expenses..."}
            {progress >= 75 && "Almost ready!"}
          </p>
        </div>

        {/* Decorative elements */}
        <div className="flex justify-center mt-4 space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-secondary rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
}
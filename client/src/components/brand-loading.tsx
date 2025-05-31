import { useLoading } from "@/hooks/use-loading";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function BrandLoading() {
  const { isLoading, progress } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg flex items-center space-x-3 min-w-[200px]">
        {/* Spinning loader */}
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full",
          "bg-gradient-to-br from-primary to-secondary"
        )}>
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        </div>

        {/* Progress info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {progress < 25 && "Loading..."}
            {progress >= 25 && progress < 50 && "Syncing..."}
            {progress >= 50 && progress < 75 && "Processing..."}
            {progress >= 75 && "Finishing..."}
          </div>
          
          {/* Minimal progress bar */}
          <div className="w-full bg-muted rounded-full h-1 mt-1">
            <div 
              className="bg-gradient-to-r from-primary to-secondary h-1 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
import { useLoading } from "@/hooks/use-loading";
import { cn } from "@/lib/utils";

export function LoadingBar() {
  const { isLoading, progress } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Background track */}
      <div className="h-1 w-full bg-muted/30" />
      
      {/* Animated progress bar with gradient */}
      <div 
        className={cn(
          "absolute top-0 left-0 h-1 transition-all duration-300 ease-out",
          "bg-gradient-to-r from-primary via-accent to-secondary",
          "animate-shimmer"
        )}
        style={{
          width: `${progress}%`,
          backgroundSize: '200% 100%',
        }}
      />
      
      {/* Glowing effect */}
      <div 
        className={cn(
          "absolute top-0 left-0 h-1 transition-all duration-300 ease-out",
          "bg-gradient-to-r from-primary/60 via-accent/60 to-secondary/60",
          "blur-sm animate-loading-pulse"
        )}
        style={{
          width: `${Math.min(progress + 10, 100)}%`,
        }}
      />
      
      {/* Leading edge sparkle */}
      {progress > 5 && (
        <div 
          className={cn(
            "absolute top-0 h-1 w-4 transition-all duration-300 ease-out",
            "bg-gradient-to-r from-transparent via-white to-transparent",
            "animate-pulse opacity-80"
          )}
          style={{
            left: `${Math.max(0, progress - 2)}%`,
          }}
        />
      )}
    </div>
  );
}
import { useLoading } from "@/hooks/use-loading";

export function BrandLoading() {
  const { isLoading, progress } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-xs w-full mx-4">
        {/* Brand text */}
        <div className="text-center mb-4">
          <p className="text-sm font-medium text-foreground">
            Calculating Your Fair Share
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
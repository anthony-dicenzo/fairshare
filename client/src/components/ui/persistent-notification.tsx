import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const notificationVariants = cva(
  "fixed inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-white border-2 border-fairshare-primary text-fairshare-primary",
        success: "bg-emerald-100 border-2 border-emerald-500 text-emerald-800",
        info: "bg-blue-100 border-2 border-blue-500 text-blue-800",
        warning: "bg-amber-100 border-2 border-amber-500 text-amber-800",
        destructive: "bg-red-100 border-2 border-red-500 text-red-800",
      },
      position: {
        top: "top-4",
        bottom: "bottom-20", // Above navigation bar
        left: "left-4",
        right: "right-4",
        center: "top-4 left-1/2 transform -translate-x-1/2",
        custom: "", // For custom positioning
        tooltip: "absolute", // For tooltip-like positioning
      },
      size: {
        default: "px-3 py-2",
        sm: "px-2 py-1 text-xs",
        lg: "px-5 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      position: "center",
      size: "default",
    },
  }
);

export interface PersistentNotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  message: string;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  dismissable?: boolean;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function PersistentNotification({
  message,
  onDismiss,
  icon,
  dismissable = true,
  variant,
  position,
  size,
  animate = false,
  className,
  style,
  ...props
}: PersistentNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const animationClass = animate 
    ? "animate-pulse" 
    : "";

  return (
    <div
      className={cn(
        notificationVariants({ variant, position, size }),
        animationClass,
        "shadow-md",
        className
      )}
      style={style}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      <span>{message}</span>
      {dismissable && (
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
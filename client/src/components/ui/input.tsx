import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, autoFocus = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fairshare-dark placeholder:text-fairshare-dark/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairshare-secondary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        autoFocus={autoFocus}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

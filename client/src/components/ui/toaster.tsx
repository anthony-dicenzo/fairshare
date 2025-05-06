import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useEffect } from "react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  // Auto-dismiss toasts after the set delay
  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.open) {
        // This will trigger the dismiss process in the toast hook
        const timer = setTimeout(() => {
          dismiss(toast.id);
        }, 1250); // 1.25 seconds matches TOAST_REMOVE_DELAY
        
        return () => clearTimeout(timer);
      }
    });
  }, [toasts, dismiss]);

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

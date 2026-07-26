import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { haptic } from "@/lib/haptics";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// Wrap toast so success/error/warning trigger light haptic feedback.
// Preserves the original toast() call signature and all other methods.
type ToastFn = typeof sonnerToast;
const toast: ToastFn = ((...args: Parameters<ToastFn>) => sonnerToast(...args)) as ToastFn;
Object.assign(toast, sonnerToast);
toast.success = ((...args: Parameters<typeof sonnerToast.success>) => {
  haptic("success");
  return sonnerToast.success(...args);
}) as typeof sonnerToast.success;
toast.error = ((...args: Parameters<typeof sonnerToast.error>) => {
  haptic("error");
  return sonnerToast.error(...args);
}) as typeof sonnerToast.error;
toast.warning = ((...args: Parameters<typeof sonnerToast.warning>) => {
  haptic("warning");
  return sonnerToast.warning(...args);
}) as typeof sonnerToast.warning;

export { Toaster, toast };

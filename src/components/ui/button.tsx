import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";


const buttonVariants = cva(
  "tz-ripple relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-[transform,box-shadow,background-color,border-color,color,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] hover:-translate-y-px will-change-transform",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-[hsl(var(--primary)/0.92)] text-primary-foreground shadow-[0_8px_20px_-8px_hsl(var(--glow-primary)),inset_0_1px_0_hsl(var(--glass-highlight))] hover:shadow-[0_12px_28px_-8px_hsl(var(--glow-primary)),inset_0_1px_0_hsl(var(--glass-highlight))] hover:-translate-y-px hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_8px_20px_-8px_hsl(var(--destructive)/0.5)] hover:shadow-[0_12px_28px_-8px_hsl(var(--destructive)/0.6)] hover:-translate-y-px",
        outline:
          "glass-effect text-foreground hover:border-primary/50 hover:text-primary hover:shadow-[0_8px_24px_-12px_hsl(var(--glow-primary))]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-primary/10 hover:text-primary hover:backdrop-blur-md",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground hover:bg-success/90 shadow-[0_8px_20px_-8px_hsl(var(--success)/0.5)] hover:-translate-y-px",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/90 shadow-[0_8px_20px_-8px_hsl(var(--warning)/0.5)] hover:-translate-y-px",
        chat:
          "bg-chat-user-bg text-chat-user-fg hover:bg-chat-user-bg/90 shadow-[0_8px_20px_-8px_hsl(var(--glow-primary))] hover:-translate-y-px",
        "chat-option":
          "glass-effect text-card-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5",
        "chat-option-selected":
          "bg-primary/15 text-primary border border-primary/60 backdrop-blur-md shadow-[0_0_0_1px_hsl(var(--glow-primary)),0_8px_24px_-12px_hsl(var(--glow-primary))]",
        sidebar:
          "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
        glass:
          "glass-effect text-foreground hover:border-primary/50 hover:text-primary hover:-translate-y-px hover:shadow-[0_12px_30px_-12px_hsl(var(--glow-primary))]",
        "glass-primary":
          "bg-gradient-to-b from-primary/90 to-[hsl(var(--primary-glow)/0.85)] text-primary-foreground border border-[hsl(var(--primary)/0.4)] backdrop-blur-md shadow-[inset_0_1px_0_hsl(var(--glass-highlight)),0_10px_30px_-10px_hsl(var(--glow-primary))] hover:-translate-y-px hover:shadow-[inset_0_1px_0_hsl(var(--glass-highlight)),0_16px_40px_-10px_hsl(var(--glow-primary))] hover:brightness-110",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-[52px] rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-[52px] w-[52px] rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onPointerDown, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const handlePointerDown = React.useCallback(
      (e: React.PointerEvent<HTMLButtonElement>) => {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--tz-rx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty("--tz-ry", `${((e.clientY - rect.top) / rect.height) * 100}%`);
        if (!el.hasAttribute("disabled") && (el as HTMLButtonElement).getAttribute("aria-disabled") !== "true") {
          haptic("tap");
        }
        onPointerDown?.(e);
      },
      [onPointerDown]
    );
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onPointerDown={handlePointerDown as never}
        {...props}
      />
    );
  },

);
Button.displayName = "Button";

export { Button, buttonVariants };

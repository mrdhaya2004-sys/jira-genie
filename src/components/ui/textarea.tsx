import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-white/15 bg-background/40 backdrop-blur-xl px-3.5 py-2.5 text-sm text-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.06),0_1px_2px_0_hsl(0_0%_0%_/_0.08)] transition-all duration-200 placeholder:text-muted-foreground/70 hover:border-white/25 hover:bg-background/55 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:bg-background/70 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_8px_24px_-8px_hsl(var(--primary)/0.35)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

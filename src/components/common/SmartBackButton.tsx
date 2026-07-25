import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOptionalModuleNavigation, getModuleLabel } from '@/navigation/ModuleNavigationContext';

interface SmartBackButtonProps {
  className?: string;
  showBreadcrumb?: boolean;
}

/**
 * Global Smart Back navigation control.
 * iOS 26 Glass UI · 42x42 · ripple · Alt+Left keyboard support.
 * Renders a breadcrumb of the module stack beside the button.
 * Silently renders nothing when there is no previous module.
 */
const SmartBackButton: React.FC<SmartBackButtonProps> = ({ className = '', showBreadcrumb = true }) => {
  const nav = useOptionalModuleNavigation();

  if (!nav || !nav.canGoBack) return null;

  const previous = nav.stack[nav.stack.length - 2];
  const current = nav.activeModule;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Ripple
    const btn = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `position:absolute;border-radius:9999px;pointer-events:none;transform:scale(0);width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;background:radial-gradient(circle,rgba(59,130,246,0.35) 0%,rgba(59,130,246,0) 70%);animation:sbb-ripple 480ms ease-out forwards;`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
    nav.goBack();
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex items-center gap-2 min-w-0 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              aria-label="Go Back"
              className="group relative inline-flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-[14px]
                border border-white/15 bg-white/10 backdrop-blur-[35px]
                shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)]
                transition-all duration-200 ease-out
                hover:-translate-y-0.5 hover:scale-[1.03] hover:border-primary/40
                hover:bg-white/20 hover:shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.45),0_0_0_1px_hsl(var(--primary)/0.35)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
                active:scale-[0.98]
                dark:bg-white/5 dark:hover:bg-white/10"
            >
              <ArrowLeft className="h-[18px] w-[18px] text-foreground transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-primary" />
              <span className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-70" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            <span className="text-xs">Back <kbd className="ml-1 rounded bg-muted/60 px-1 py-0.5 text-[10px] text-muted-foreground">Alt ←</kbd></span>
          </TooltipContent>
        </Tooltip>

        {showBreadcrumb && previous && (
          <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 min-w-0 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => nav.goBack()}
              className="max-w-[140px] truncate rounded-md px-1.5 py-0.5 font-medium text-foreground/70 transition-colors hover:text-primary hover:bg-primary/10"
            >
              {getModuleLabel(previous)}
            </button>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
            <span className="max-w-[180px] truncate font-semibold text-foreground">{getModuleLabel(current)}</span>
          </nav>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SmartBackButton;

import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineStatusIndicatorProps {
  status: 'online' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  status,
  size = 'sm',
  className,
  showLabel = false,
}) => {
  const sizeClasses = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn(
        "rounded-full",
        sizeClasses[size],
        status === 'online'
          ? 'bg-success shadow-[0_0_6px_hsl(var(--success)/0.5)]'
          : 'bg-muted-foreground/40'
      )} />
      {showLabel && (
        <span className={cn(
          "text-xs capitalize",
          status === 'online' ? 'text-success' : 'text-muted-foreground'
        )}>
          {status}
        </span>
      )}
    </div>
  );
};

export default OnlineStatusIndicator;

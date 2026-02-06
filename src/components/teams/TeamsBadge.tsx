import React from 'react';
import { Badge } from '@/components/ui/badge';
import TeamsIcon from './TeamsIcon';
import { cn } from '@/lib/utils';

interface TeamsBadgeProps {
  className?: string;
  variant?: 'default' | 'inline';
}

const TeamsBadge: React.FC<TeamsBadgeProps> = ({ className, variant = 'default' }) => {
  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-0.5', className)}>
        <TeamsIcon className="h-3 w-3" />
      </span>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] px-1.5 py-0 h-5 border-[#5B5FC7]/30 bg-[#5B5FC7]/5 text-[#5B5FC7]',
        className
      )}
    >
      <TeamsIcon className="h-3 w-3 mr-0.5" />
      Teams
    </Badge>
  );
};

export default TeamsBadge;

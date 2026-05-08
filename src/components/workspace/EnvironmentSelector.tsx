import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ENVIRONMENTS, type Environment } from '@/types/environment';
import { cn } from '@/lib/utils';

interface EnvironmentSelectorProps {
  value: Environment | null;
  onChange: (env: Environment) => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  value,
  onChange,
  size = 'md',
  showLabel = true,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">Environment:</span>
      )}
      <Tabs value={value || ''} onValueChange={(v) => onChange(v as Environment)}>
        <TabsList className={cn('h-auto bg-card/70 backdrop-blur-sm border border-primary/20 shadow-sm', size === 'sm' ? 'p-0.5' : 'p-1')}>
          {ENVIRONMENTS.map((env) => (
            <TabsTrigger
              key={env.value}
              value={env.value}
              className={cn(
                'relative font-medium text-foreground/70 transition-all duration-300',
                'hover:text-primary hover:bg-primary/5',
                'data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-[hsl(var(--chart-2))] data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_14px_-2px_hsl(var(--primary)/0.55)]',
                'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
                size === 'sm' ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'
              )}
            >
              {env.shortLabel}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export const EnvironmentBadge: React.FC<{ env: Environment | null | undefined; className?: string }> = ({ env, className }) => {
  if (!env) return null;
  const meta = ENVIRONMENTS.find(e => e.value === env);
  if (!meta) return null;
  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold border', meta.badgeClass, className)}>
      {meta.shortLabel}
    </Badge>
  );
};

export default EnvironmentSelector;

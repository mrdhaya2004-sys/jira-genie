import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FrameworkOption } from '@/types/scenario';

interface FrameworkCardProps {
  framework: FrameworkOption;
  isSelected?: boolean;
  onClick: (id: string, name: string) => void;
}

const FrameworkCard: React.FC<FrameworkCardProps> = ({ framework, isSelected, onClick }) => {
  return (
    <Card
      className={cn(
        "menu-item-shine cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.45)] hover:border-primary/60",
        isSelected && "is-active border-primary/70"
      )}
      onClick={() => onClick(framework.id, framework.name)}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <span className="text-2xl">{framework.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{framework.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{framework.description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FrameworkCard;

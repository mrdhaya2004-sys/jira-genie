import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CODE_FRAMEWORKS, type CodeFramework } from '@/types/scenario';

interface CodeFrameworkSelectorProps {
  onSelect: (framework: CodeFramework) => void;
  selected?: CodeFramework | null;
  className?: string;
}

const CodeFrameworkSelector: React.FC<CodeFrameworkSelectorProps> = ({
  onSelect,
  selected,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
      {CODE_FRAMEWORKS.map((framework) => {
        const isSelected = selected === framework.id;
        return (
          <Card
            key={framework.id}
            className={cn(
              "glass-shine menu-item-shine cursor-pointer group",
              isSelected && "is-active border-primary/70"
            )}
            onClick={() => onSelect(framework.id)}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{framework.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-medium text-sm transition-colors",
                  isSelected ? "text-primary" : "group-hover:text-primary"
                )}>
                  {framework.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {framework.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CodeFrameworkSelector;

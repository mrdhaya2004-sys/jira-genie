import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CODE_FRAMEWORKS, type CodeFramework } from '@/types/scenario';

interface CodeFrameworkSelectorProps {
  onSelect: (framework: CodeFramework) => void;
  className?: string;
}

const CodeFrameworkSelector: React.FC<CodeFrameworkSelectorProps> = ({
  onSelect,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2", className)}>
      {CODE_FRAMEWORKS.map((framework) => (
        <Card
          key={framework.id}
          className="cursor-pointer transition-all hover:border-primary hover:shadow-md group"
          onClick={() => onSelect(framework.id)}
        >
          <CardContent className="p-3 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{framework.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                {framework.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {framework.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CodeFrameworkSelector;

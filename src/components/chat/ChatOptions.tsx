import React from 'react';
import { ChatOption } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatOptionsProps {
  options: ChatOption[];
  onSelect: (option: ChatOption) => void;
  multiSelect?: boolean;
}

const ChatOptions: React.FC<ChatOptionsProps> = ({ options, onSelect, multiSelect = false }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2 animate-fade-in">
      {options.map((option, index) => (
        <Button
          key={option.id}
          variant="chat-option"
          className={cn(
            "flex items-center gap-2 h-auto py-2 px-3 text-left transition-all duration-200",
            "hover:scale-[1.02] active:scale-[0.98]"
          )}
          onClick={() => onSelect(option)}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {option.icon && <span className="text-base">{option.icon}</span>}
          <div className="flex flex-col">
            <span className="font-medium text-sm">{option.label}</span>
            {option.description && (
              <span className="text-xs text-muted-foreground">{option.description}</span>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
};

export default ChatOptions;

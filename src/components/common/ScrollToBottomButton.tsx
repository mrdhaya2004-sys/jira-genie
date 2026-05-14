import React from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  visible: boolean;
  onClick: () => void;
  className?: string;
}

const ScrollToBottomButton: React.FC<Props> = ({ visible, onClick, className }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to latest message"
      className={cn(
        'absolute bottom-4 right-4 z-20 h-9 w-9 rounded-full',
        'bg-background/80 backdrop-blur-md border border-border shadow-lg',
        'flex items-center justify-center text-foreground',
        'transition-all duration-200 hover:bg-background hover:scale-105',
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none',
        className
      )}
    >
      <ArrowDown className="h-4 w-4" />
    </button>
  );
};

export default ScrollToBottomButton;

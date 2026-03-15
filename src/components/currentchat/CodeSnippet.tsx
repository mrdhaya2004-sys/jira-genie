import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface CodeSnippetProps {
  code: string;
  language?: string;
}

const CodeSnippet: React.FC<CodeSnippetProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-1 rounded-lg border border-border overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar-accent/30 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">
          {language || 'code'}
        </span>
        <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeSnippet;

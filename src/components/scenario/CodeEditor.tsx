import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Download, RefreshCw, Eye, Edit3, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedCode, CODE_FRAMEWORKS } from '@/types/scenario';

interface CodeEditorProps {
  generatedCode: GeneratedCode;
  onRegenerate?: (framework: string) => void;
  onAskAI?: (question: string) => void;
  className?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  generatedCode,
  onRegenerate,
  onAskAI,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [code, setCode] = useState(generatedCode.code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedCode.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageForMonaco = (language: string): string => {
    const languageMap: Record<string, string> = {
      java: 'java',
      python: 'python',
      javascript: 'javascript',
      typescript: 'typescript',
    };
    return languageMap[language] || 'plaintext';
  };

  const getFrameworkLabel = (framework: string): string => {
    const labels: Record<string, string> = {
      selenium_java: 'Selenium Java',
      selenium_python: 'Selenium Python',
      playwright_js: 'Playwright JS',
      playwright_ts: 'Playwright TS',
      cypress: 'Cypress',
      pytest: 'PyTest',
      appium_java: 'Appium Java',
      appium_python: 'Appium Python',
    };
    return labels[framework] || framework;
  };

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-muted/50 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="font-mono text-sm">{generatedCode.fileName}</span>
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {getFrameworkLabel(generatedCode.framework)}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {generatedCode.language}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReadOnly(!isReadOnly)}
              className="h-8 px-2"
              title={isReadOnly ? 'Enable editing' : 'Set read-only'}
            >
              {isReadOnly ? (
                <Eye className="h-4 w-4" />
              ) : (
                <Edit3 className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            
            {onRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRegenerate(generatedCode.framework)}
                className="h-8 px-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="border-b bg-background">
          <Editor
            height="400px"
            language={getLanguageForMonaco(generatedCode.language)}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              readOnly: isReadOnly,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 12, bottom: 12 },
              folding: true,
              bracketPairColorization: { enabled: true },
              renderLineHighlight: 'all',
            }}
          />
        </div>
        
        {generatedCode.explanation && (
          <div className="p-3 bg-muted/30 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> {generatedCode.explanation}
            </p>
          </div>
        )}

        {onAskAI && (
          <div className="p-3 border-t bg-background">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAskAI('Refactor this code to be more maintainable')}
                className="text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Refactor
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAskAI('Add more assertions and validations')}
                className="text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Add Assertions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAskAI('Explain this code step by step')}
                className="text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Explain Code
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CodeEditor;

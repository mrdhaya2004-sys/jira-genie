import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScenarioEditorProps {
  scenario: string;
  framework?: string;
  module?: string;
  className?: string;
}

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({
  scenario,
  framework,
  module,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState(scenario);

  // Sync content when scenario changes (during streaming)
  useEffect(() => {
    setContent(scenario);
  }, [scenario]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-${module || 'generated'}.feature`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFrameworkLabel = (fw: string): string => {
    const labels: Record<string, string> = {
      cucumber: '🥒 Cucumber (BDD)',
      testng: '☕ TestNG',
      playwright: '🎭 Playwright',
      pytest: '🐍 PyTest',
      custom: '⚙️ Custom',
    };
    return labels[fw] || fw;
  };

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-muted/50 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Generated Scenario</CardTitle>
            {framework && (
              <Badge variant="secondary" className="text-xs">
                {getFrameworkLabel(framework)}
              </Badge>
            )}
            {module && (
              <Badge variant="outline" className="text-xs">
                📦 {module}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
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
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Editor
          height="300px"
          language="gherkin"
          value={content}
          onChange={(value) => setContent(value || '')}
          theme="vs-dark"
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12, bottom: 12 },
            folding: true,
            renderLineHighlight: 'all',
          }}
        />
      </CardContent>
    </Card>
  );
};

export default ScenarioEditor;

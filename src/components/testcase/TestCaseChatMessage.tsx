import React from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Copy, Check, User, Download, FileSpreadsheet } from 'lucide-react';
import HiveAIAvatar from '@/components/ai/HiveAIAvatar';
import { cn } from '@/lib/utils';
import type { TestCaseChatMessage as ChatMessageType, TestCaseMode, TestCaseFormatChoice, GeneratedTestCase, ParsedExcelStructure } from '@/types/testcase';
import TestCaseGridEditor from './TestCaseGridEditor';

interface TestCaseChatMessageProps {
  message: ChatMessageType;
  onModeSelect?: (mode: TestCaseMode) => void;
  onWorkspaceSelect?: (id: string, name: string) => void;
  onDownload?: () => void;
  onFormatSelect?: (choice: TestCaseFormatChoice) => void;
  gridStructure?: ParsedExcelStructure | null;
  gridRows?: GeneratedTestCase[];
  onGridDownload?: (rows: GeneratedTestCase[]) => void;
}

const TestCaseChatMessage: React.FC<TestCaseChatMessageProps> = ({
  message,
  onModeSelect,
  onWorkspaceSelect,
  onDownload,
  onFormatSelect,
  gridStructure,
  gridRows,
  onGridDownload,
}) => {
  const [copied, setCopied] = React.useState(false);
  const isBot = message.role === 'assistant';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const sanitizeConfig = {
    ALLOWED_TAGS: ['strong', 'br', 'em'],
    ALLOWED_ATTR: [],
  };

  const formatContent = (content: string) => {
    // Strip raw JSON / code fences from assistant content — users see the editable grid instead.
    let cleaned = content;
    if (message.role === 'assistant') {
      cleaned = cleaned
        .replace(/```json[\s\S]*?```/gi, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '')
        .trim();
      if (!cleaned) cleaned = '✅ Test cases generated. Review and edit them in the table below.';
    }
    const html = cleaned
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
    return DOMPurify.sanitize(html, sanitizeConfig);
  };

  return (
    <div className={cn(
      "flex gap-3 max-w-4xl",
      isBot ? "mr-auto" : "ml-auto flex-row-reverse"
    )}>
      <Avatar className={cn(
        "h-8 w-8 flex-shrink-0",
        isBot ? "bg-primary" : "bg-muted"
      )}>
        <AvatarFallback className={isBot ? "bg-primary text-primary-foreground" : "bg-muted"}>
          {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        "flex flex-col gap-2 max-w-[85%]",
        !isBot && "items-end"
      )}>
        <Card className={cn(
          "shadow-sm",
          isBot ? "bg-card" : "bg-primary text-primary-foreground"
        )}>
          <CardContent className="p-3">
            <div 
              className={cn(
                "text-sm prose prose-sm max-w-none",
                !isBot && "text-primary-foreground prose-invert"
              )}
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />

            {/* Copy button for long content */}
            {message.content.length > 200 && isBot && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mode Selection Cards */}
        {message.type === 'mode_select' && message.options && onModeSelect && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-2">
            {message.options.map((option) => (
              <Card
                key={option.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onModeSelect(option.value as TestCaseMode)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Workspace Selection */}
        {message.type === 'workspace_select' && message.options && onWorkspaceSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onWorkspaceSelect(option.id, option.label)}
                className="text-sm"
              >
                📁 {option.label}
              </Button>
            ))}
          </div>
        )}

        {/* Excel Structure Display */}
        {message.excelStructure && (
          <Card className="mt-2 border-dashed">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Excel Structure Detected</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {message.excelStructure.columns.map((col, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-0.5 bg-muted text-xs rounded"
                  >
                    {col.header}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Format Selection Cards */}
        {message.type === 'format_select' && message.options && onFormatSelect && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full mt-2">
            {message.options.map((option) => (
              <Card
                key={option.id}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                onClick={() => onFormatSelect(option.value as TestCaseFormatChoice)}
              >
                <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                  <span className="text-2xl">{option.icon}</span>
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Inline Grid Editor */}
        {message.type === 'grid_editor' && gridStructure && onGridDownload && (
          <TestCaseGridEditor
            structure={gridStructure}
            initialRows={gridRows || []}
            onDownload={onGridDownload}
          />
        )}

        {/* Download Button */}
        {message.type === 'download' && onDownload && (
          <Button
            onClick={onDownload}
            className="mt-2"
            variant="default"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Test Case Sheet
          </Button>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default TestCaseChatMessage;

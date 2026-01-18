import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Check, Bot, User, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { XPathChatMessage as ChatMessageType, Platform, XPathType } from '@/types/xpath';
import { Badge } from '@/components/ui/badge';

interface XPathChatMessageProps {
  message: ChatMessageType;
  onWorkspaceSelect?: (id: string, name: string) => void;
  onModuleSelect?: (module: string) => void;
  onPlatformSelect?: (platform: Platform) => void;
}

interface ParsedXPath {
  type: string;
  xpath: string;
  recommended?: boolean;
}

const XPathChatMessage: React.FC<XPathChatMessageProps> = ({
  message,
  onWorkspaceSelect,
  onModuleSelect,
  onPlatformSelect,
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [copiedAll, setCopiedAll] = React.useState(false);
  const isBot = message.role === 'assistant';

  const handleCopyXPath = async (xpath: string, index: number) => {
    try {
      await navigator.clipboard.writeText(xpath);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  // Parse XPaths from content
  const parseXPaths = (content: string): { text: string; xpaths: ParsedXPath[]; recommendedXPath?: string; recommendedReason?: string }[] => {
    const sections: { text: string; xpaths: ParsedXPath[]; recommendedXPath?: string; recommendedReason?: string }[] = [];
    
    // Split by element sections
    const elementSections = content.split(/###\s*Element:/i);
    
    if (elementSections.length <= 1) {
      // Try to find table patterns directly
      const xpaths = extractXPathsFromTable(content);
      if (xpaths.length > 0) {
        sections.push({ text: content.split('|')[0], xpaths });
      }
      return sections;
    }

    elementSections.forEach((section, idx) => {
      if (idx === 0 && !section.trim()) return;
      
      const xpaths: ParsedXPath[] = [];
      let recommendedXPath: string | undefined;
      let recommendedReason: string | undefined;

      // Extract recommended XPath
      const recommendedMatch = section.match(/\*\*⭐\s*Recommended XPath:\*\*\s*```(?:xpath)?\s*([\s\S]*?)```/i);
      if (recommendedMatch) {
        recommendedXPath = recommendedMatch[1].trim();
      }

      // Extract reason
      const reasonMatch = section.match(/_Why:\s*(.*?)_/);
      if (reasonMatch) {
        recommendedReason = reasonMatch[1].trim();
      }

      // Extract table XPaths
      const tableXPaths = extractXPathsFromTable(section);
      xpaths.push(...tableXPaths);

      // Extract code block XPaths
      const codeBlockMatches = section.matchAll(/```(?:xpath)?\s*([\s\S]*?)```/g);
      for (const match of codeBlockMatches) {
        const xpath = match[1].trim();
        if (xpath && !xpaths.some(x => x.xpath === xpath) && xpath !== recommendedXPath) {
          xpaths.push({ type: 'XPath', xpath });
        }
      }

      if (xpaths.length > 0 || recommendedXPath) {
        const titleMatch = section.match(/^([^\n]+)/);
        sections.push({
          text: titleMatch ? titleMatch[1].trim() : `Element ${idx}`,
          xpaths,
          recommendedXPath,
          recommendedReason,
        });
      }
    });

    return sections;
  };

  const extractXPathsFromTable = (content: string): ParsedXPath[] => {
    const xpaths: ParsedXPath[] = [];
    
    // Match table rows: | Type | XPath |
    const tableRowPattern = /\|\s*([^|]+)\s*\|\s*`([^`]+)`\s*\|/g;
    let match;
    
    while ((match = tableRowPattern.exec(content)) !== null) {
      const type = match[1].trim();
      const xpath = match[2].trim();
      
      // Skip header rows
      if (type.toLowerCase() === 'type' || type.includes('---')) continue;
      
      xpaths.push({
        type,
        xpath,
        recommended: type.toLowerCase().includes('relative'),
      });
    }

    // Also try inline xpath patterns
    const inlinePattern = /(?:^|\n)\s*[-*]\s*(?:\*\*)?(Absolute|Relative|Chained|Following(?:-Sibling)?|Preceding(?:-Sibling)?)(?:\s*XPath)?(?:\*\*)?[:\s]+`([^`]+)`/gi;
    while ((match = inlinePattern.exec(content)) !== null) {
      const type = match[1].trim();
      const xpath = match[2].trim();
      if (!xpaths.some(x => x.xpath === xpath)) {
        xpaths.push({
          type: `${type} XPath`,
          xpath,
          recommended: type.toLowerCase() === 'relative',
        });
      }
    }

    return xpaths;
  };

  const renderXPathContent = () => {
    if (message.type !== 'xpath_result' || !message.content) {
      return (
        <div 
          className={cn(
            "text-sm prose prose-sm max-w-none",
            !isBot && "text-primary-foreground prose-invert"
          )}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
      );
    }

    const sections = parseXPaths(message.content);

    if (sections.length === 0) {
      // Fallback to formatted content
      return (
        <div className="space-y-3">
          <div 
            className="text-sm prose prose-sm max-w-none whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAll}
              className="h-7 px-2 text-xs"
            >
              {copiedAll ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="space-y-3">
            {/* Element Title */}
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {section.text}
            </h4>

            {/* Recommended XPath */}
            {section.recommendedXPath && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-semibold text-primary">Recommended XPath</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background/50 px-2 py-1.5 rounded font-mono break-all">
                    {section.recommendedXPath}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleCopyXPath(section.recommendedXPath!, -1)}
                  >
                    {copiedIndex === -1 ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                {section.recommendedReason && (
                  <p className="text-xs text-muted-foreground italic">{section.recommendedReason}</p>
                )}
              </div>
            )}

            {/* XPath Table */}
            {section.xpaths.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[140px] text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">XPath</TableHead>
                      <TableHead className="w-[50px] text-xs font-semibold">Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.xpaths.map((xp, idx) => (
                      <TableRow key={idx} className={xp.recommended ? 'bg-primary/5' : ''}>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            {xp.recommended && (
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            )}
                            <span className="text-xs font-medium">{xp.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded break-all">
                            {xp.xpath}
                          </code>
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyXPath(xp.xpath, sectionIdx * 100 + idx)}
                          >
                            {copiedIndex === sectionIdx * 100 + idx ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}

        {/* Copy All Button */}
        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="h-7 px-3 text-xs"
          >
            {copiedAll ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied All!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy All XPaths
              </>
            )}
          </Button>
        </div>
      </div>
    );
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
            {renderXPathContent()}
          </CardContent>
        </Card>

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

        {/* Module Selection */}
        {message.type === 'module_select' && message.options && onModuleSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onModuleSelect(option.value)}
                className="text-sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}

        {/* Platform Selection */}
        {message.type === 'platform_select' && message.options && onPlatformSelect && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onPlatformSelect(option.value as Platform)}
                className="text-sm flex items-center gap-2"
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default XPathChatMessage;

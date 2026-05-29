import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Star, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementAnalysis, Platform } from '@/types/xpath';

interface XPathResultCardProps {
  element: ElementAnalysis;
  platform: Platform;
  isTopRecommendation?: boolean;
}

const stabilityColor: Record<string, string> = {
  high: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  low: 'bg-red-500/15 text-red-600 border-red-500/30',
};

const elementTypeIcon: Record<string, string> = {
  button: '🔘', input: '📝', dropdown: '🔽', checkbox: '☑️', radio: '🔘',
  link: '🔗', text: '🔤', image: '🖼️', table: '📊', list: '📋',
  nav: '🧭', dialog: '💬', tab: '📑', card: '🪪', form: '📋',
  container: '📦', accessibility: '♿', unknown: '❓',
};

const CopyRow: React.FC<{ label: string; value: string | null; id: string }> = ({ label, value, id }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };
  return (
    <div className="flex items-start gap-2 group" data-locator-id={id}>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">{label}</div>
        <code className="block text-xs font-mono bg-muted/60 border border-border/40 px-2 py-1.5 rounded break-all">
          {value}
        </code>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 mt-4 shrink-0 opacity-60 group-hover:opacity-100"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
};

const XPathResultCard: React.FC<XPathResultCardProps> = ({ element, platform, isTopRecommendation }) => {
  const { locators } = element;
  const stab = stabilityColor[element.stability] || stabilityColor.medium;

  return (
    <Card
      className={cn(
        'p-4 space-y-3 border-border/60 backdrop-blur-sm bg-card/80',
        isTopRecommendation && 'border-primary/40 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-lg leading-none mt-0.5">{elementTypeIcon[element.element_type] || '❓'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isTopRecommendation && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
              <h4 className="font-semibold text-sm truncate">{element.element_name}</h4>
              <Badge variant="outline" className="text-[10px] capitalize">{element.element_type}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              <span className="font-medium">Screen:</span> {element.screen} · <span className="font-mono">{element.tag}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={cn('text-[10px] capitalize border', stab)}>
            <ShieldCheck className="h-3 w-3 mr-1" />
            {element.stability}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {element.confidence}%
          </Badge>
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
        {element.reasoning}
      </p>

      {/* Locator tabs */}
      <Tabs defaultValue="universal" className="w-full">
        <TabsList className="h-8 w-full justify-start">
          <TabsTrigger value="universal" className="text-xs h-6 px-2">XPath / CSS</TabsTrigger>
          {platform === 'android' && <TabsTrigger value="android" className="text-xs h-6 px-2">Android</TabsTrigger>}
          {platform === 'ios' && <TabsTrigger value="ios" className="text-xs h-6 px-2">iOS</TabsTrigger>}
        </TabsList>

        <TabsContent value="universal" className="mt-3 space-y-2">
          <CopyRow id="primary" label="Primary XPath ⭐" value={locators.primary_xpath} />
          <CopyRow id="alt" label="Alternative XPath" value={locators.alternative_xpath} />
          <CopyRow id="dyn" label="Dynamic XPath" value={locators.dynamic_xpath} />
          <CopyRow id="abs" label="Absolute XPath" value={locators.absolute_xpath} />
          <CopyRow id="css" label="CSS Selector" value={locators.css} />
          <CopyRow id="aid" label="Accessibility ID" value={locators.accessibility_id} />
        </TabsContent>

        {platform === 'android' && locators.android && (
          <TabsContent value="android" className="mt-3 space-y-2">
            <CopyRow id="ua" label="UIAutomator" value={locators.android.uiautomator} />
            <CopyRow id="rid" label="Resource ID" value={locators.android.resource_id} />
            <CopyRow id="cdesc" label="Content Description" value={locators.android.content_desc} />
            {!locators.android.resource_id && !locators.android.content_desc && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> No Android-specific identifiers found — use universal XPath.
              </p>
            )}
          </TabsContent>
        )}

        {platform === 'ios' && locators.ios && (
          <TabsContent value="ios" className="mt-3 space-y-2">
            <CopyRow id="pred" label="Predicate String" value={locators.ios.predicate} />
            <CopyRow id="chain" label="Class Chain" value={locators.ios.class_chain} />
            <CopyRow id="aiid" label="Accessibility Identifier" value={locators.ios.accessibility_identifier} />
            {!locators.ios.predicate && !locators.ios.class_chain && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> No iOS-specific identifiers found — use universal XPath.
              </p>
            )}
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
};

export default XPathResultCard;

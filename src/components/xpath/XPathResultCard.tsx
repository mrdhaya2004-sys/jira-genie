import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Copy, Check, Star, ShieldCheck, AlertTriangle, ChevronDown, ChevronRight, Layers, ListTree, Gauge, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ElementAnalysis, Platform, HierarchyNodeRef } from '@/types/xpath';

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

const CopyRow: React.FC<{ label: string; value: string | null; id: string; recommended?: boolean }> = ({ label, value, id, recommended }) => {
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
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1 flex items-center gap-1">
          {recommended && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
          {label}
        </div>
        <code className={cn(
          'block text-xs font-mono border px-2 py-1.5 rounded break-all',
          recommended ? 'bg-primary/10 border-primary/30' : 'bg-muted/60 border-border/40',
        )}>
          {value}
        </code>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 mt-5 shrink-0 opacity-60 group-hover:opacity-100"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
};

const HierarchyNodePill: React.FC<{ node: HierarchyNodeRef; tone?: 'parent' | 'sibling' | 'child' | 'self' }> = ({ node, tone }) => (
  <div className={cn(
    'inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border',
    tone === 'self' && 'bg-primary/15 border-primary/40 text-primary font-semibold',
    tone === 'parent' && 'bg-muted/60 border-border/60',
    tone === 'sibling' && 'bg-muted/30 border-border/40',
    tone === 'child' && 'bg-muted/40 border-border/50',
  )}>
    <span>{node.element_type ? elementTypeIcon[node.element_type] || '•' : '•'}</span>
    <span className="truncate max-w-[140px]">{node.name}</span>
    <code className="text-[10px] text-muted-foreground font-mono">{node.tag}</code>
  </div>
);

const XPathResultCard: React.FC<XPathResultCardProps> = ({ element, platform, isTopRecommendation }) => {
  const { locators, attributes, hierarchy } = element;
  const stab = stabilityColor[element.stability] || stabilityColor.medium;
  const [treeOpen, setTreeOpen] = useState(false);
  const [attrsOpen, setAttrsOpen] = useState(false);

  // Determine recommended locator priority for header summary
  const recommended =
    locators.accessibility_id ||
    locators.android?.resource_id ||
    locators.ios?.accessibility_identifier ||
    locators.primary_xpath;

  const allAttrs = attributes ? Object.entries(attributes).filter(([, v]) => v && v.length > 0) : [];

  return (
    <Card
      className={cn(
        'p-4 space-y-4 border-border/60 backdrop-blur-sm bg-card/80',
        isTopRecommendation && 'border-primary/40 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]',
      )}
    >
      {/* ─── Selected Element ─────────────────────────────── */}
      <div className="space-y-2">
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
                <span className="font-medium">Screen:</span> {element.screen}
                <span className="mx-1.5">·</span>
                <span className="font-mono">{element.tag}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <Badge className={cn('text-[10px] capitalize border', stab)}>
              <ShieldCheck className="h-3 w-3 mr-1" />
              {element.stability}
            </Badge>
            {typeof element.uniqueness === 'number' && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-mono',
                  element.uniqueness === 1
                    ? 'border-emerald-500/40 text-emerald-600'
                    : 'border-amber-500/40 text-amber-600',
                )}
                title="How many elements the primary locator matches"
              >
                matches {element.uniqueness}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] font-mono">
              {element.confidence}%
            </Badge>
          </div>
        </div>

        {/* Reasoning */}
        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
          {element.reasoning}
        </p>
      </div>

      {/* ─── Hierarchy Tree ──────────────────────────────── */}
      {hierarchy && (hierarchy.parent || hierarchy.siblings.length > 0 || hierarchy.children.length > 0) && (
        <div>
          <button
            type="button"
            onClick={() => setTreeOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {treeOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <ListTree className="h-3.5 w-3.5" />
            <span>Element Tree</span>
            <span className="text-[10px] text-muted-foreground/70 font-normal ml-1">
              {hierarchy.parent ? '1 parent · ' : ''}
              {hierarchy.siblings.length} sibling{hierarchy.siblings.length === 1 ? '' : 's'} ·{' '}
              {hierarchy.children.length} child{hierarchy.children.length === 1 ? '' : 'ren'}
            </span>
          </button>
          {treeOpen && (
            <div className="mt-2 pl-5 space-y-2 text-xs">
              {hierarchy.parent && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Parent</div>
                  <HierarchyNodePill node={hierarchy.parent} tone="parent" />
                </div>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Selected</div>
                <HierarchyNodePill
                  node={{ id: element.id, tag: element.tag, name: element.element_name, element_type: element.element_type }}
                  tone="self"
                />
              </div>
              {hierarchy.siblings.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Siblings</div>
                  <div className="flex flex-wrap gap-1.5">
                    {hierarchy.siblings.map((s) => <HierarchyNodePill key={s.id} node={s} tone="sibling" />)}
                  </div>
                </div>
              )}
              {hierarchy.children.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Children</div>
                  <div className="flex flex-wrap gap-1.5">
                    {hierarchy.children.map((c) => <HierarchyNodePill key={c.id} node={c} tone="child" />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Attributes ──────────────────────────────────── */}
      {allAttrs.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setAttrsOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {attrsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Layers className="h-3.5 w-3.5" />
            <span>Attributes</span>
            <span className="text-[10px] text-muted-foreground/70 font-normal ml-1">
              {allAttrs.length} field{allAttrs.length === 1 ? '' : 's'}
            </span>
          </button>
          {attrsOpen && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
              {allAttrs.map(([k, v]) => (
                <div key={k} className="text-[11px] flex items-baseline gap-1.5 min-w-0">
                  <code className="font-mono text-muted-foreground shrink-0">{k}:</code>
                  <code className="font-mono bg-muted/40 px-1.5 py-0.5 rounded truncate" title={v}>
                    {v}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Locator Suggestions ─────────────────────────── */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
          <Code2 className="h-3.5 w-3.5" />
          <span>Locator Suggestions</span>
        </div>
        <Tabs defaultValue="universal" className="w-full">
          <TabsList className="h-8 w-full justify-start">
            <TabsTrigger value="universal" className="text-xs h-6 px-2">XPath / CSS</TabsTrigger>
            {platform === 'android' && <TabsTrigger value="android" className="text-xs h-6 px-2">Android</TabsTrigger>}
            {platform === 'ios' && <TabsTrigger value="ios" className="text-xs h-6 px-2">iOS</TabsTrigger>}
              {platform === 'web' && <TabsTrigger value="web" className="text-xs h-6 px-2">Web</TabsTrigger>}
          </TabsList>

          <TabsContent value="universal" className="mt-3 space-y-2">
            <CopyRow id="aid" label="Accessibility ID" value={locators.accessibility_id} recommended={!!locators.accessibility_id} />
            <CopyRow id="primary" label="Primary (Relative) XPath" value={locators.primary_xpath} recommended={!locators.accessibility_id} />
            <CopyRow id="alt" label="Alternative XPath" value={locators.alternative_xpath} />
            <CopyRow id="dyn" label="Dynamic XPath" value={locators.dynamic_xpath} />
            <CopyRow id="css" label="CSS Selector" value={locators.css} />
            <CopyRow id="abs" label="Absolute XPath (avoid)" value={locators.absolute_xpath} />
          </TabsContent>

          {platform === 'android' && locators.android && (
            <TabsContent value="android" className="mt-3 space-y-2">
              <CopyRow id="rid" label="Resource ID" value={locators.android.resource_id} recommended={!!locators.android.resource_id} />
              <CopyRow id="cdesc" label="Content Description" value={locators.android.content_desc} />
              <CopyRow id="ua" label="UIAutomator" value={locators.android.uiautomator} />
              {!locators.android.resource_id && !locators.android.content_desc && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" /> No Android-specific identifiers — use universal XPath.
                </p>
              )}
            </TabsContent>
          )}

          {platform === 'ios' && locators.ios && (
            <TabsContent value="ios" className="mt-3 space-y-2">
              <CopyRow id="aiid" label="Accessibility Identifier" value={locators.ios.accessibility_identifier} recommended={!!locators.ios.accessibility_identifier} />
              <CopyRow id="pred" label="Predicate String" value={locators.ios.predicate} />
              <CopyRow id="chain" label="Class Chain" value={locators.ios.class_chain} />
              {!locators.ios.predicate && !locators.ios.class_chain && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" /> No iOS-specific identifiers — use universal XPath.
                </p>
              )}
            </TabsContent>
          )}

          {platform === 'web' && locators.web && (
            <TabsContent value="web" className="mt-3 space-y-2">
              <CopyRow id="web-css" label="CSS Selector" value={locators.web.css_selector} recommended={!!locators.web.css_selector} />
              <CopyRow id="web-pw" label="Playwright Locator" value={locators.web.playwright_locator} />
              <CopyRow id="web-tl" label="Testing Library" value={locators.web.testing_library} />
              <CopyRow id="web-aria" label="ARIA Locator" value={locators.web.aria_locator} />
              <CopyRow id="web-text" label="Text Locator" value={locators.web.text_locator} />
              {!locators.web.css_selector && !locators.web.playwright_locator && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" /> No web-specific identifiers — use universal XPath.
                </p>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ─── Confidence Analysis ─────────────────────────── */}
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span>Confidence Analysis</span>
          </div>
          <span className="text-xs font-mono">{element.confidence}/100</span>
        </div>
        <Progress value={element.confidence} className="h-1.5" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Stability: <span className="capitalize font-medium">{element.stability}</span></span>
          <span className="truncate max-w-[60%] text-right" title={String(recommended)}>
            Recommended: <code className="font-mono text-foreground/80">{
              locators.accessibility_id ? 'Accessibility ID' :
              locators.android?.resource_id ? 'Resource ID' :
              locators.ios?.accessibility_identifier ? 'Accessibility ID' :
              locators.web?.playwright_locator ? 'Playwright Locator' :
              locators.web?.css_selector ? 'CSS Selector' :
              'Relative XPath'
            }</code>
          </span>
        </div>
      </div>
    </Card>
  );
};

export default XPathResultCard;

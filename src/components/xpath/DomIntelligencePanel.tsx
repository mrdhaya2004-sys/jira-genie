import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert, EyeOff, Hash, Crosshair } from 'lucide-react';
import type { DomRisk } from '@/types/xpath';

interface DomIntelligencePanelProps {
  risks: DomRisk[];
  totalNodes: number;
  screens: string[];
}

const riskMeta: Record<DomRisk['kind'], { icon: React.ReactNode; label: string; tone: string }> = {
  duplicate_id: { icon: <Hash className="h-3.5 w-3.5" />, label: 'Duplicate IDs', tone: 'text-amber-600' },
  dynamic_id: { icon: <ShieldAlert className="h-3.5 w-3.5" />, label: 'Dynamic Identifiers', tone: 'text-red-600' },
  missing_accessibility: { icon: <EyeOff className="h-3.5 w-3.5" />, label: 'Missing Accessibility', tone: 'text-amber-600' },
  weak_selector: { icon: <Crosshair className="h-3.5 w-3.5" />, label: 'Weak Selectors', tone: 'text-amber-600' },
  index_only: { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: 'Index-Only Locators', tone: 'text-amber-600' },
};

const DomIntelligencePanel: React.FC<DomIntelligencePanelProps> = ({ risks, totalNodes, screens }) => {
  return (
    <Card className="p-3 space-y-2 bg-muted/30 border-border/60">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-xs font-semibold flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-primary" />
          DOM Intelligence
        </h5>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{totalNodes.toLocaleString()} nodes</Badge>
          <Badge variant="outline" className="text-[10px]">{screens.length} screens</Badge>
        </div>
      </div>
      {risks.length === 0 ? (
        <p className="text-xs text-muted-foreground">✅ No major locator risks detected in this DOM snapshot.</p>
      ) : (
        <ul className="space-y-1.5">
          {risks.map((r, idx) => {
            const m = riskMeta[r.kind];
            return (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <span className={m.tone}>{m.icon}</span>
                <div className="min-w-0">
                  <span className="font-medium">{m.label}:</span>{' '}
                  <span className="text-muted-foreground">{r.message}</span>
                  {r.examples && r.examples.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.examples.map((ex, i) => (
                        <code key={i} className="text-[10px] bg-background/70 border border-border/40 px-1.5 py-0.5 rounded font-mono">
                          {ex}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default DomIntelligencePanel;

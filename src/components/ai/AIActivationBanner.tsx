import React, { useEffect, useState } from 'react';
import { AlertTriangle, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIStatus } from '@/hooks/useAIStatus';

interface Props {
  /** Optional click handler to navigate to AI Configuration. */
  onOpenConfig?: () => void;
}

/**
 * Persistent bottom notification bar shown across all AI-powered modules
 * when the current user has no active AI configuration, or when their
 * provider quota is exhausted. Hidden when AI is connected or dismissed.
 *
 * Auto-reappears on page refresh if AI is still not configured.
 * Auto-disappears once AI is successfully activated.
 */
const AIActivationBanner: React.FC<Props> = ({ onOpenConfig }) => {
  const { isLoading, isActivated, status, config } = useAIStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal if status changes (e.g., user reconfigures)
  useEffect(() => {
    if (isActivated && status !== 'quota_exhausted') {
      setDismissed(false);
    }
  }, [isActivated, status]);

  if (isLoading) return null;
  if (isActivated && status !== 'quota_exhausted') return null;
  if (dismissed) return null;

  const isQuota = status === 'quota_exhausted';
  const title = isQuota ? 'AI Balance Exhausted' : 'AI Configuration Required';
  const body = isQuota
    ? 'Your AI provider has run out of available credits or quota. Top up your provider account or switch to another AI provider.'
    : config
      ? 'Your AI provider is not verified. Test the connection to activate AI-powered features.'
      : 'You have not connected an AI provider. Connect a supported provider to use AI-powered features.';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none"
      style={{ paddingRight: 'max(0px, env(safe-area-inset-right))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-card/95 supports-[backdrop-filter]:bg-card/80 p-3 sm:p-4 backdrop-blur-md shadow-lg shadow-black/10">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{body}</p>
          {onOpenConfig && (
            <div className="pt-2">
              <Button size="sm" variant="outline" onClick={onOpenConfig} className="h-8">
                <Settings2 className="mr-2 h-3.5 w-3.5" />
                {isQuota ? 'Manage AI Configuration' : 'Open AI Configuration'}
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notification"
          className="shrink-0 -mr-1 -mt-1 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AIActivationBanner;

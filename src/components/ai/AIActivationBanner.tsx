import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIStatus } from '@/hooks/useAIStatus';

interface Props {
  /** Route to open AI Configuration. Defaults to the dashboard "more" panel where AI Config lives. */
  configRoute?: string;
}

/**
 * Persistent yellow warning banner shown above every AI-powered module
 * when the current user has no active AI configuration, or when their
 * provider quota is exhausted. Hidden when AI is connected.
 */
const AIActivationBanner: React.FC<Props> = ({ configRoute = '/dashboard?view=ai-config' }) => {
  const navigate = useNavigate();
  const { isLoading, isActivated, status, config } = useAIStatus();

  if (isLoading) return null;
  if (isActivated && status !== 'quota_exhausted') return null;

  const isQuota = status === 'quota_exhausted';
  const title = isQuota ? 'AI Balance Exhausted' : 'AI Configuration Required';
  const body = isQuota
    ? 'Your AI provider has run out of available credits or quota. Top up your provider account or switch to another AI provider. AI-powered features are temporarily paused.'
    : config
      ? 'Your AI provider is not verified. Test the connection to activate AI-powered features.'
      : 'You have not connected an AI provider. Connect Gemini, OpenAI, Claude, NVIDIA, Azure OpenAI or another supported provider to use AI-powered features.';

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4">
      <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 backdrop-blur-sm">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-semibold text-foreground">⚠ {title}</h4>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate(configRoute)} className="shrink-0">
          <Settings2 className="mr-2 h-4 w-4" />
          {isQuota ? 'Manage AI Configuration' : 'Open AI Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default AIActivationBanner;

import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIStatus } from '@/hooks/useAIStatus';
import { AI_PROVIDERS } from '@/types/aiConfig';

interface Props {
  onRetry?: () => void;
  className?: string;
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

/**
 * Glassmorphism live status card for AI Configuration header.
 * Shows connected / not activated / error / verifying / quota states with
 * animated pulse dot.
 */
const AIStatusCard: React.FC<Props> = ({ onRetry, className = '' }) => {
  const { status, config, lastVerifiedAt, lastError, isLoading } = useAIStatus();

  const providerLabel = config ? (AI_PROVIDERS.find(p => p.value === config.provider)?.label ?? config.provider) : null;

  let dotColor = 'bg-yellow-400';
  let ring = 'ring-yellow-400/40';
  let Icon = AlertCircle;
  let title = 'AI Not Activated';
  let detail = 'No AI Provider Connected. Connect your AI model to enable TestZone AI features.';
  let iconClass = 'text-yellow-600 dark:text-yellow-400';

  if (isLoading) {
    dotColor = 'bg-blue-400'; ring = 'ring-blue-400/40';
    Icon = Loader2; iconClass = 'text-blue-500 animate-spin';
    title = 'Loading…'; detail = 'Checking AI configuration';
  } else if (status === 'connected' && config) {
    dotColor = 'bg-green-500'; ring = 'ring-green-500/40';
    Icon = CheckCircle2; iconClass = 'text-green-600 dark:text-green-400';
    title = 'AI Activated';
    detail = `Connected: ${providerLabel} · ${config.model_name}`;
  } else if (status === 'verifying') {
    dotColor = 'bg-blue-400'; ring = 'ring-blue-400/40';
    Icon = Wifi; iconClass = 'text-blue-500';
    title = 'Verifying connection…'; detail = providerLabel ?? '';
  } else if (status === 'quota_exhausted') {
    dotColor = 'bg-yellow-500'; ring = 'ring-yellow-500/40';
    Icon = AlertCircle; iconClass = 'text-yellow-600 dark:text-yellow-400';
    title = 'AI Balance Exhausted';
    detail = 'Provider quota or credits exhausted. Top up or switch providers.';
  } else if (status === 'error') {
    dotColor = 'bg-red-500'; ring = 'ring-red-500/40';
    Icon = XCircle; iconClass = 'text-red-500';
    title = 'Connection Failed';
    detail = lastError || 'Provider unreachable.';
  }

  return (
    <div className={`glass-shine relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl ${className}`}>
      <div className="flex items-center gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background/50">
          <Icon className={`h-6 w-6 ${iconClass}`} />
          <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ${dotColor} ring-4 ${ring} animate-pulse`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold leading-none text-foreground">{title}</h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{detail}</p>
          {(status === 'connected' || status === 'error') && (
            <p className="mt-2 text-xs text-muted-foreground/80">
              Last verified: <span className="font-medium text-foreground/80">{formatRelative(lastVerifiedAt)}</span>
            </p>
          )}
        </div>
        {status === 'error' && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
            Retry Connection
          </Button>
        )}
      </div>
    </div>
  );
};

export default AIStatusCard;

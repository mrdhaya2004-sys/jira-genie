import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Github, LinkIcon, Loader2, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useGitLabConnection } from '@/hooks/useGitLabConnection';

interface Props {
  onCancel: () => void;
}

type Provider = 'github' | 'gitlab';

function detectProvider(url: string): Provider | null {
  if (!url) return null;
  try {
    const host = new URL(url.trim()).host.toLowerCase();
    if (host === 'github.com' || host === 'www.github.com' || host === 'api.github.com') return 'github';
    if (host === 'gitlab.com' || host.startsWith('gitlab.') || host.includes('.gitlab.')) return 'gitlab';
    return null;
  } catch {
    const v = url.toLowerCase();
    if (v.includes('github.com')) return 'github';
    if (v.includes('gitlab')) return 'gitlab';
    return null;
  }
}

const GitLabConnectionGate: React.FC<Props> = ({ onCancel }) => {
  const { connect, connecting } = useGitLabConnection();
  const [provider, setProvider] = useState<Provider>('github');
  const [baseUrl, setBaseUrl] = useState('https://github.com');
  const [token, setToken] = useState('');
  const [mismatchNotice, setMismatchNotice] = useState<string | null>(null);

  const detected = useMemo(() => detectProvider(baseUrl), [baseUrl]);

  // Auto-switch provider when URL clearly indicates the other one
  useEffect(() => {
    if (detected && detected !== provider) {
      setProvider(detected);
      setMismatchNotice(
        `${detected === 'github' ? 'GitHub' : 'GitLab'} URL detected. Provider switched to ${detected === 'github' ? 'GitHub' : 'GitLab'} automatically.`
      );
      const t = setTimeout(() => setMismatchNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [detected, provider]);

  const choose = (p: Provider) => {
    setProvider(p);
    setMismatchNotice(null);
    // Reset URL to canonical when switching, unless user already typed a matching host
    if (!detected || detected !== p) {
      setBaseUrl(p === 'github' ? 'https://github.com' : 'https://gitlab.com');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await connect(baseUrl, token);
    if (ok) onCancel();
  };

  const isGitHub = provider === 'github';

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        <div className={`px-7 pt-7 pb-5 text-center bg-gradient-to-br ${isGitHub ? 'from-slate-700/10 via-slate-500/5' : 'from-orange-500/10 via-orange-400/5'} to-transparent`}>
          <div className={`mx-auto mb-3 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br ${isGitHub ? 'from-slate-800 to-slate-600' : 'from-orange-500 to-rose-500'}`}>
            {isGitHub ? <Github className="h-7 w-7 text-white" /> : <GitBranch className="h-7 w-7 text-white" />}
          </div>
          <DialogTitle className="text-lg font-semibold">Connect Source Control</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            Connect GitHub or GitLab to trigger pipelines, schedule runs, and get live status.
          </DialogDescription>
        </div>

        <form onSubmit={onSubmit} className="px-7 pb-7 space-y-4">
          {/* Provider cards */}
          <div className="grid grid-cols-2 gap-3">
            {(['github', 'gitlab'] as Provider[]).map((p) => {
              const active = provider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => choose(p)}
                  className={`group relative rounded-xl border p-3 text-left transition-all ${active ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${p === 'github' ? 'from-slate-800 to-slate-600' : 'from-orange-500 to-rose-500'}`}>
                      {p === 'github' ? <Github className="h-5 w-5" /> : <GitBranch className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-tight">{p === 'github' ? 'GitHub' : 'GitLab'}</div>
                      <div className="text-[11px] text-muted-foreground">{p === 'github' ? 'github.com or Enterprise' : 'gitlab.com or self-hosted'}</div>
                    </div>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="gl-url">{isGitHub ? 'GitHub URL' : 'GitLab URL'}</Label>
              {detected && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  Provider Detected: {detected === 'github' ? 'GitHub' : 'GitLab'}
                </Badge>
              )}
            </div>
            <Input
              id="gl-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={isGitHub ? 'https://github.com' : 'https://gitlab.com'}
              required
            />
            <div className="rounded-md bg-muted/40 border border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground leading-relaxed">
              {isGitHub ? (
                <>
                  <span className="font-medium text-foreground">Example —</span> URL: <code>https://github.com</code> · Repository: <code>owner/repository</code> · e.g. <code>mrdhaya2004-sys/web_automation</code>
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Example —</span> URL: <code>https://gitlab.com</code> · Project: <code>group/project</code> · e.g. <code>automation/web-testing</code>
                </>
              )}
            </div>
            {mismatchNotice && (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{mismatchNotice}</span>
              </div>
            )}
          </div>

          {/* Token */}
          <div className="space-y-1.5">
            <Label htmlFor="gl-token">Personal Access Token</Label>
            <Input
              id="gl-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={isGitHub ? 'github_pat_xxxxxxxxx' : 'glpat_xxxxxxxxx'}
              required
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-muted-foreground">Required {isGitHub ? 'permissions' : 'scopes'}:</span>
              {(isGitHub ? ['repo', 'workflow', 'read:user', 'user:email'] : ['api', 'read_repository', 'read_user']).map((s) => (
                <code key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{s}</code>
              ))}
            </div>
            <a
              href={isGitHub ? 'https://github.com/settings/tokens?type=beta' : 'https://gitlab.com/-/user_settings/personal_access_tokens'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Create a {isGitHub ? 'GitHub' : 'GitLab'} token
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button
              type="submit"
              disabled={connecting}
              className={`gap-2 text-white bg-gradient-to-r ${isGitHub ? 'from-slate-800 to-slate-600' : 'from-orange-500 to-rose-500'}`}
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Connect {isGitHub ? 'GitHub' : 'GitLab'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GitLabConnectionGate;

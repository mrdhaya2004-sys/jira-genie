import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitBranch, LinkIcon, Loader2, ExternalLink } from 'lucide-react';
import { useGitLabConnection } from '@/hooks/useGitLabConnection';

interface Props {
  onCancel: () => void;
}

const GitLabConnectionGate: React.FC<Props> = ({ onCancel }) => {
  const { connect, connecting } = useGitLabConnection();
  const [baseUrl, setBaseUrl] = useState('https://gitlab.com');
  const [token, setToken] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await connect(baseUrl, token);
    if (ok) onCancel();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-400/5 to-transparent px-7 pt-7 pb-5 text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg">
            <GitBranch className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-lg font-semibold">Connect GitLab or GitHub</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            Trigger pipelines, schedule executions, and get live status from chat.
          </DialogDescription>
        </div>
        <form onSubmit={onSubmit} className="px-7 pb-7 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gl-url">Repository host URL</Label>
            <Input id="gl-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://gitlab.com or https://github.com" required />
            <p className="text-[11px] text-muted-foreground">We auto-detect GitHub vs GitLab from the host. For self-hosted, use your full base URL.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gl-token">Personal Access Token</Label>
            <Input id="gl-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="glpat-… or github_pat_…" required />
            <div className="flex flex-col gap-1">
              <a href="https://gitlab.com/-/user_settings/personal_access_tokens" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                GitLab — create a token with <code className="rounded bg-muted px-1">api</code> scope
                <ExternalLink className="h-3 w-3" />
              </a>
              <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                GitHub — create a PAT with <code className="rounded bg-muted px-1">repo</code> + <code className="rounded bg-muted px-1">read:user</code>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={connecting} className="gap-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Connect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GitLabConnectionGate;

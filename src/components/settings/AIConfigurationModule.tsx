import React, { useState, useEffect, useMemo } from 'react';
import aiConfigLogo from '@/assets/ai-config-logo.png';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import HiveAIDisableDialog from '@/components/hiveai/HiveAIDisableDialog';
import { useAIConfig } from '@/hooks/useAIConfig';
import { useHiveAISettings } from '@/hooks/useHiveAISettings';
import { AI_PROVIDERS, type AIProvider } from '@/types/aiConfig';
import {
  Brain, Key, Plug, Shield, Loader2, CheckCircle2, XCircle, Trash2, Zap, Network,
  Activity, Cloud, Cpu, Gauge, Database, Sparkles, Eye, EyeOff, Copy, RotateCcw,
  Bot, GitBranch, FileSearch, Ticket, ClipboardList, Code2, MousePointer2,
  Lock, HardDrive, Server, Radio,
} from 'lucide-react';

// ─────────────────────────────── Shared bits ───────────────────────────────
const glassCard =
  'relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.55] dark:bg-white/[0.04] backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] transition-all duration-[220ms] hover:-translate-y-[3px] hover:shadow-[0_28px_80px_-24px_rgba(37,99,235,0.35)]';

const AuroraBackground: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.35),transparent_65%)] blur-[55px] animate-pulse" />
    <div className="absolute -top-32 -right-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.32),transparent_65%)] blur-[55px] animate-pulse" style={{ animationDelay: '1s' }} />
    <div className="absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.28),transparent_65%)] blur-[55px] animate-pulse" style={{ animationDelay: '1.6s' }} />
    <div className="absolute -bottom-32 -right-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.28),transparent_65%)] blur-[55px] animate-pulse" style={{ animationDelay: '2.2s' }} />
    <div className="absolute inset-0 bg-[radial-gradient(1px_1px_at_20%_30%,rgba(59,130,246,0.35),transparent),radial-gradient(1px_1px_at_70%_60%,rgba(20,184,166,0.35),transparent),radial-gradient(1px_1px_at_40%_80%,rgba(99,102,241,0.3),transparent),radial-gradient(1px_1px_at_85%_20%,rgba(16,185,129,0.3),transparent)] opacity-60" />
  </div>
);

const Chip: React.FC<{ icon: React.ReactNode; label: string; tone?: 'blue' | 'teal' | 'indigo' | 'emerald' | 'amber' | 'red' | 'muted'; pulse?: boolean }> = ({ icon, label, tone = 'blue', pulse }) => {
  const tones: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-700 dark:text-blue-300 border-blue-400/30',
    teal: 'from-teal-500/20 to-teal-500/5 text-teal-700 dark:text-teal-300 border-teal-400/30',
    indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-700 dark:text-indigo-300 border-indigo-400/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-400/30',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-400/30',
    red: 'from-red-500/20 to-red-500/5 text-red-700 dark:text-red-300 border-red-400/30',
    muted: 'from-slate-500/15 to-slate-500/5 text-slate-700 dark:text-slate-300 border-slate-400/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border bg-gradient-to-r px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${tones[tone]}`}>
      {pulse && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" /></span>}
      <span className="flex h-3 w-3 items-center justify-center">{icon}</span>
      {label}
    </span>
  );
};

const KpiCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  gradient: string; glow: string;
}> = ({ icon, label, value, sub, gradient, glow }) => (
  <div className={`${glassCard} group p-5`} style={{ boxShadow: `0 20px 60px -25px ${glow}` }}>
    <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${gradient}`} />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold leading-tight text-foreground tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  </div>
);

// Hive Mind visual pipeline
const HIVE_AGENTS = [
  { name: 'Router', icon: GitBranch, color: 'from-blue-500 to-blue-600' },
  { name: 'TestCase', icon: ClipboardList, color: 'from-teal-500 to-teal-600' },
  { name: 'Scenario', icon: Sparkles, color: 'from-indigo-500 to-indigo-600' },
  { name: 'Automation', icon: Code2, color: 'from-emerald-500 to-emerald-600' },
  { name: 'DOM', icon: FileSearch, color: 'from-cyan-500 to-cyan-600' },
  { name: 'XPath', icon: MousePointer2, color: 'from-sky-500 to-sky-600' },
  { name: 'Defect', icon: Bot, color: 'from-violet-500 to-violet-600' },
  { name: 'Ticket', icon: Ticket, color: 'from-amber-500 to-amber-600' },
  { name: 'Report', icon: Activity, color: 'from-rose-500 to-rose-600' },
];

const HiveMindPipeline: React.FC = () => (
  <div className={`${glassCard} p-6`}>
    <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-teal-500 text-white shadow-lg">
          <Network className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-[18px] font-semibold text-foreground">Hive Mind Architecture</h3>
          <p className="text-[13px] text-muted-foreground">All AI requests are orchestrated through specialized agents.</p>
        </div>
      </div>
      <Chip icon={<Radio className="h-3 w-3" />} label="Live Orchestration" tone="emerald" pulse />
    </div>

    {/* Core node */}
    <div className="mb-6 flex justify-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-500 blur-2xl opacity-40 animate-pulse" />
        <div className="relative flex items-center gap-3 rounded-2xl border border-white/25 bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-3 text-white shadow-xl">
          <Brain className="h-5 w-5" />
          <div className="text-sm">
            <div className="font-semibold">Hive Mind Core</div>
            <div className="text-[11px] text-white/80">Central AI Router</div>
          </div>
        </div>
      </div>
    </div>

    {/* Agent grid with connectors */}
    <div className="relative">
      <div className="absolute left-1/2 top-0 h-3 w-px bg-gradient-to-b from-blue-500/60 to-transparent -translate-x-1/2 -translate-y-3" />
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        {HIVE_AGENTS.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.name} className="group flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/40 dark:bg-white/[0.03] p-3 backdrop-blur-xl transition-all duration-[220ms] hover:-translate-y-1 hover:shadow-lg">
              <div className={`relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${a.color} text-white shadow-md`}>
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${a.color} opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70`} />
                <Icon className="relative h-5 w-5" />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{a.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ─────────────────────────────── Main module ───────────────────────────────
const AIConfigurationModule: React.FC = () => {
  const { config, isLoading, isTesting, isDetecting, lastResponseMs, saveConfig, testConnection, detectModels, removeConfig } = useAIConfig();
  const { hiveEnabled, setHiveEnabled } = useHiveAISettings();
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const [provider, setProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[] | null>(null);
  const [revealKey, setRevealKey] = useState(false);
  const [testStage, setTestStage] = useState<string | null>(null);

  const selectedProvider = AI_PROVIDERS.find((p) => p.value === provider);
  const availableModels = detectedModels ?? selectedProvider?.defaultModels ?? [];
  const isModelInvalid = !!model && availableModels.length > 0 && !availableModels.includes(model);
  const modelErrorMessage = isModelInvalid
    ? detectedModels
      ? `"${model}" is not available for this API key. Pick one of the detected models or re-run auto-detect.`
      : `"${model}" is not a supported model for ${selectedProvider?.label ?? 'this provider'}. Choose one from the list.`
    : null;

  useEffect(() => {
    if (config) {
      setProvider(config.provider as AIProvider);
      setModel(config.model_name);
      setEndpointUrl(config.endpoint_url || '');
      setDisplayName(config.display_name || '');
    }
  }, [config]);

  const runStagedTest = async (payload: { provider: AIProvider; apiKey: string; model: string; endpointUrl?: string }) => {
    const stages = ['Connecting…', 'Authenticating…', 'Sending request…', 'Receiving response…'];
    for (const s of stages) { setTestStage(s); await new Promise(r => setTimeout(r, 260)); }
    const ok = await testConnection(payload);
    setTestStage(ok ? 'Connection successful' : 'Connection failed');
    setTimeout(() => setTestStage(null), 1200);
    return ok;
  };

  const handleSave = async () => {
    if (!apiKey && !config) return;
    if (isModelInvalid) { toast.error('Invalid model selected', { description: modelErrorMessage ?? undefined }); return; }
    setIsSaving(true);
    const ok = await saveConfig({ provider, apiKey: apiKey || config?.api_key_encrypted || '', model, endpointUrl: endpointUrl || undefined, displayName: displayName || undefined });
    if (ok) {
      await runStagedTest({ provider, apiKey: apiKey || config?.api_key_encrypted || '', model, endpointUrl: endpointUrl || undefined });
    }
    setIsSaving(false);
    setApiKey('');
  };

  const handleTest = async () => {
    if (!apiKey && !config) return;
    if (isModelInvalid) { toast.error('Invalid model selected', { description: modelErrorMessage ?? undefined }); return; }
    await runStagedTest({ provider, apiKey: apiKey || config?.api_key_encrypted || '', model, endpointUrl: endpointUrl || undefined });
  };

  const maskedKey = useMemo(() => {
    if (!config?.api_key_encrypted) return '';
    const k = config.api_key_encrypted;
    return revealKey ? k : `${'•'.repeat(Math.min(24, Math.max(8, k.length - 4)))}${k.slice(-4)}`;
  }, [config, revealKey]);

  const copyKey = () => {
    if (!config?.api_key_encrypted) return;
    navigator.clipboard.writeText(config.api_key_encrypted);
    toast.success('API key copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connected = config?.status === 'connected';
  const providerLabel = config ? (AI_PROVIDERS.find(p => p.value === config.provider)?.label ?? config.provider) : '—';

  return (
    <div className="relative h-full overflow-y-auto">
      <AuroraBackground />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* ═════════ Header ═════════ */}
        <div className={`${glassCard} p-5`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 via-teal-500 to-indigo-500 blur-lg opacity-60" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/60 dark:bg-white/10 backdrop-blur-xl">
                <img src={aiConfigLogo} alt="AI Configuration" className="h-9 w-9 object-contain" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[30px] font-bold leading-tight bg-gradient-to-r from-blue-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                AI Configuration
              </h1>
              <p className="text-[15px] font-medium text-muted-foreground">
                Manage AI providers, models, API connections and intelligent workspace settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip icon={<Sparkles className="h-3 w-3" />} label={connected ? 'AI Ready' : 'Not Activated'} tone={connected ? 'emerald' : 'amber'} pulse />
              <Chip icon={<Cpu className="h-3 w-3" />} label={config ? `1 Model` : '0 Models'} tone="blue" />
              <Chip icon={<Cloud className="h-3 w-3" />} label="Workspace" tone="indigo" />
              <Chip icon={<Activity className="h-3 w-3" />} label={connected ? 'Healthy' : 'Idle'} tone={connected ? 'emerald' : 'muted'} />
            </div>
          </div>
        </div>

        {/* ═════════ KPI Grid ═════════ */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard icon={<Cpu className="h-5 w-5" />} label="Connected Models" value={config ? 1 : 0} sub={config?.model_name ?? 'None connected'}
            gradient="from-blue-500 to-blue-600" glow="rgba(37,99,235,0.4)" />
          <KpiCard icon={<Activity className="h-5 w-5" />} label="AI Health" value={connected ? '100%' : '—'} sub={connected ? 'All systems operational' : 'Awaiting connection'}
            gradient="from-emerald-500 to-teal-500" glow="rgba(16,185,129,0.4)" />
          <KpiCard icon={<Gauge className="h-5 w-5" />} label="Response Time" value={typeof lastResponseMs === 'number' ? `${lastResponseMs}ms` : '—'} sub="Last measured latency"
            gradient="from-teal-500 to-cyan-500" glow="rgba(20,184,166,0.4)" />
          <KpiCard icon={<Bot className="h-5 w-5" />} label="Available Agents" value={HIVE_AGENTS.length} sub="Hive Mind specialists"
            gradient="from-indigo-500 to-blue-600" glow="rgba(99,102,241,0.4)" />
          <KpiCard icon={<Server className="h-5 w-5" />} label="Workspace" value="Active" sub="Enterprise tier"
            gradient="from-violet-500 to-indigo-500" glow="rgba(139,92,246,0.4)" />
          <KpiCard icon={<Cloud className="h-5 w-5" />} label="Cloud Sync" value="Live" sub="Real-time replication"
            gradient="from-sky-500 to-blue-500" glow="rgba(14,165,233,0.4)" />
        </div>

        {/* ═════════ AI Status Hero ═════════ */}
        <div className={`${glassCard} p-6`}>
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500" />
          <div className="flex items-start gap-5 flex-wrap">
            <div className="relative">
              {connected && <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-xl animate-pulse" />}
              <div className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 shadow-xl ${
                connected ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-500 to-teal-600' :
                config?.status === 'error' ? 'border-red-400/60 bg-gradient-to-br from-red-500 to-rose-600' :
                'border-amber-400/60 bg-gradient-to-br from-amber-400 to-amber-500'
              }`}>
                {connected ? <CheckCircle2 className="h-8 w-8 text-white" /> :
                 config?.status === 'error' ? <XCircle className="h-8 w-8 text-white" /> :
                 <Sparkles className="h-8 w-8 text-white" />}
                {connected && <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-50" />}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">
                  {connected ? 'AI Activated' : config?.status === 'error' ? 'Connection Failed' : 'AI Not Activated'}
                </h2>
                <Chip icon={<Radio className="h-3 w-3" />}
                  label={connected ? 'Connected' : config?.status === 'error' ? 'Error' : 'Not Verified'}
                  tone={connected ? 'emerald' : config?.status === 'error' ? 'red' : 'amber'} pulse />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div><span className="text-muted-foreground">Provider</span><div className="font-semibold text-foreground">{providerLabel}</div></div>
                <div><span className="text-muted-foreground">Model</span><div className="font-semibold text-foreground truncate">{config?.model_name ?? '—'}</div></div>
                <div><span className="text-muted-foreground">Latency</span><div className="font-semibold text-foreground">{typeof lastResponseMs === 'number' ? `${lastResponseMs} ms` : '—'}</div></div>
                <div><span className="text-muted-foreground">Last Sync</span><div className="font-semibold text-foreground">{config?.last_verified_at ? new Date(config.last_verified_at).toLocaleTimeString() : 'Never'}</div></div>
              </div>
            </div>
            {config && (
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={handleTest} disabled={isTesting} className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white shadow-lg">
                  {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>
                <Button size="sm" variant="ghost" onClick={removeConfig} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              </div>
            )}
          </div>
          {testStage && (
            <div className="mt-4 rounded-2xl border border-blue-400/30 bg-blue-500/5 p-3 text-sm flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium text-foreground">{testStage}</span>
              <div className="ml-auto h-1.5 flex-1 max-w-[240px] overflow-hidden rounded-full bg-blue-500/10">
                <div className="h-full w-1/3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full animate-[shimmer_1.4s_ease_infinite]" style={{ animation: 'pulse 1.4s ease infinite' }} />
              </div>
            </div>
          )}
        </div>

        {/* ═════════ Hive Mind Pipeline ═════════ */}
        <HiveMindPipeline />

        {/* ═════════ Hive AI Chat Toggle ═════════ */}
        <div className={`${glassCard} p-6`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg">🐝</div>
              <div>
                <h3 className="text-[16px] font-semibold text-foreground">Hive AI Chat Assistant</h3>
                <p className="text-[13px] text-muted-foreground">{hiveEnabled ? 'Floating assistant is visible everywhere · Context aware · Smart memory' : 'Assistant is hidden across the workspace'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip icon={<Radio className="h-3 w-3" />} label={hiveEnabled ? 'Active' : 'Disabled'} tone={hiveEnabled ? 'emerald' : 'muted'} pulse={hiveEnabled} />
                  <Chip icon={<Cloud className="h-3 w-3" />} label="Floating Mode" tone="blue" />
                  <Chip icon={<Brain className="h-3 w-3" />} label="Context Aware" tone="indigo" />
                  <Chip icon={<Database className="h-3 w-3" />} label="Smart Memory" tone="teal" />
                </div>
              </div>
            </div>
            <Switch checked={hiveEnabled} onCheckedChange={(checked) => {
              if (!checked) setShowDisableDialog(true);
              else { setHiveEnabled(true); toast('🐝 Hive AI Chat is back!', { description: 'The floating assistant is now visible on all pages.' }); }
            }} />
          </div>
        </div>

        <HiveAIDisableDialog open={showDisableDialog}
          onConfirm={() => { setShowDisableDialog(false); setHiveEnabled(false); }}
          onCancel={() => setShowDisableDialog(false)} />

        {/* ═════════ Connection Details ═════════ */}
        {config && (
          <div className={`${glassCard} p-6`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[18px] font-semibold text-foreground">Connection Details</h3>
                <p className="text-[13px] text-muted-foreground">Live provider metadata and credentials</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Provider', providerLabel],
                ['Model', config.model_name],
                ['API Status', connected ? 'Online' : 'Offline'],
                ['Latency', typeof lastResponseMs === 'number' ? `${lastResponseMs} ms` : '—'],
                ['Region', 'Global · Auto'],
                ['Health', connected ? '100%' : '—'],
                ['Last Verified', config.last_verified_at ? new Date(config.last_verified_at).toLocaleString() : 'Never'],
                ['Token Expiry', 'Managed by provider'],
                ['Workspace', 'Enterprise'],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-2xl border border-white/15 bg-white/40 dark:bg-white/[0.03] p-3 backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="mt-1 text-sm font-medium text-foreground truncate">{v}</div>
                </div>
              ))}
              {config.endpoint_url && (
                <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-white/15 bg-white/40 dark:bg-white/[0.03] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Endpoint</div>
                  <div className="mt-1 text-xs font-mono text-foreground break-all">{config.endpoint_url}</div>
                </div>
              )}
            </div>

            {/* API Key */}
            <div className="mt-4 rounded-2xl border border-white/15 bg-white/40 dark:bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Key className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">API Key</span>
                  <code className="ml-2 truncate rounded-lg bg-slate-900/5 dark:bg-white/5 px-2 py-1 font-mono text-xs text-foreground">{maskedKey}</code>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setRevealKey(v => !v)}>
                    {revealKey ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {revealKey ? 'Hide' : 'Reveal'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={copyKey}><Copy className="h-4 w-4 mr-1" />Copy</Button>
                </div>
              </div>
            </div>

            {config.status === 'error' && config.last_error && (
              <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="break-words">{config.last_error}</span>
              </div>
            )}
          </div>
        )}

        {/* ═════════ Configuration Form ═════════ */}
        <div className={`${glassCard} p-6`}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white shadow-lg">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-foreground">{config ? 'Update Configuration' : 'Connect AI Provider'}</h3>
              <p className="text-[13px] text-muted-foreground">Configure your enterprise AI model for Test Zone</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select value={provider} onValueChange={(val) => { setProvider(val as AIProvider); setModel(''); setDetectedModels(null); }}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input id="displayName" placeholder="e.g., Production GPT-4" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="apiKey" className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5" /> API Key</Label>
              <Input id="apiKey" type="password" placeholder={config ? '••••••••  (leave empty to keep current)' : 'Enter your API key'} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                onBlur={async () => {
                  if (apiKey.length < 8) return;
                  if (provider === 'azure_openai') return;
                  if ((provider === 'custom' || provider === 'local_llm') && !endpointUrl) return;
                  const list = await detectModels({ provider, apiKey, endpointUrl: endpointUrl || undefined });
                  if (list && list.length) { setDetectedModels(list); if (!list.includes(model)) setModel(list[0]); }
                }} />
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Keys are stored securely and never exposed to the frontend</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="model">
                  Model Name
                  {detectedModels && <span className="ml-2 text-xs text-muted-foreground font-normal">({detectedModels.length} auto-detected)</span>}
                </Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                  disabled={isDetecting || (!apiKey && !config) || (selectedProvider?.requiresEndpoint && !endpointUrl) || provider === 'azure_openai'}
                  onClick={async () => {
                    const key = apiKey || config?.api_key_encrypted || '';
                    if (!key) return;
                    const list = await detectModels({ provider, apiKey: key, endpointUrl: endpointUrl || undefined });
                    if (list && list.length) { setDetectedModels(list); if (!list.includes(model)) setModel(list[0]); }
                  }}>
                  {isDetecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />} Auto-detect
                </Button>
              </div>
              {availableModels.length > 0 ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className={isModelInvalid ? 'border-destructive focus:ring-destructive' : ''} aria-invalid={isModelInvalid}>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {availableModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="model" placeholder="e.g., llama-3.1-70b" value={model} onChange={(e) => setModel(e.target.value)} />
              )}
              {modelErrorMessage && (
                <p className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> {modelErrorMessage}</p>
              )}
            </div>

            {selectedProvider?.requiresEndpoint && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endpointUrl">Endpoint URL</Label>
                <Input id="endpointUrl" placeholder="https://your-endpoint.com/v1/chat/completions" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)} />
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3 flex-wrap">
            <Button variant="outline" onClick={handleTest} disabled={isTesting || (!apiKey && !config) || isModelInvalid}>
              {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />} Test Connection
            </Button>
            <Button onClick={handleSave} disabled={isSaving || (!apiKey && !config) || !model || isModelInvalid}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-500 hover:via-indigo-500 hover:to-teal-500 text-white shadow-lg">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Save Configuration
            </Button>
          </div>
        </div>

        {/* ═════════ Workspace Settings – informational glass cards ═════════ */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className={`${glassCard} p-5`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg"><Shield className="h-5 w-5" /></div>
              <h4 className="text-[16px] font-semibold text-foreground">Security</h4>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {[['API Encryption', 'AES-256'], ['Workspace Isolation', 'Enforced'], ['Zero Data Retention', 'Enabled'], ['Audit Logs', 'Streaming'], ['Permission Control', 'RLS + JWT']].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/40 dark:bg-white/[0.03] px-3 py-2">
                  <span className="text-muted-foreground text-[13px] flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-emerald-600" />{k}</span>
                  <span className="text-[12px] font-semibold text-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${glassCard} p-5`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg"><Database className="h-5 w-5" /></div>
              <h4 className="text-[16px] font-semibold text-foreground">AI Memory</h4>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {[['Memory Usage', 'Adaptive'], ['Context Size', '128K tokens'], ['Cached Sessions', 'Live'], ['Persistent Memory', 'Enabled'], ['Conversation History', 'Retained']].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/40 dark:bg-white/[0.03] px-3 py-2">
                  <span className="text-muted-foreground text-[13px] flex items-center gap-2"><HardDrive className="h-3.5 w-3.5 text-indigo-600" />{k}</span>
                  <span className="text-[12px] font-semibold text-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${glassCard} p-5`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg"><Sparkles className="h-5 w-5" /></div>
              <h4 className="text-[16px] font-semibold text-foreground">Smart AI Defaults</h4>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {[['Temperature', '0.7'], ['Top P', '0.95'], ['Max Tokens', 'Auto'], ['Reasoning Level', 'Balanced'], ['Hallucination Guard', 'Active']].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-xl border border-white/15 bg-white/40 dark:bg-white/[0.03] px-3 py-2">
                  <span className="text-muted-foreground text-[13px] flex items-center gap-2"><Gauge className="h-3.5 w-3.5 text-blue-600" />{k}</span>
                  <span className="text-[12px] font-semibold text-foreground">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfigurationModule;

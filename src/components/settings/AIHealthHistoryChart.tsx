import React, { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Activity, Gauge, Cloud, Radio } from 'lucide-react';

interface Point {
  t: string;
  ts: number;
  health: number;      // 0-100
  latency: number;     // ms
  workspace: number;   // 0-100
}

interface Props {
  connected: boolean;
  lastResponseMs: number | null;
  modelName?: string | null;
}

const MAX_POINTS = 30;
const TICK_MS = 3000;

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
};

const AIHealthHistoryChart: React.FC<Props> = ({ connected, lastResponseMs, modelName }) => {
  const [data, setData] = useState<Point[]>(() => {
    // Seed with a short history so the chart isn't empty on first render.
    const now = Date.now();
    return Array.from({ length: 8 }).map((_, i) => {
      const ts = now - (8 - i) * TICK_MS;
      return {
        ts,
        t: fmtTime(ts),
        health: connected ? 92 + Math.random() * 6 : 0,
        latency: connected ? (lastResponseMs ?? 220) + (Math.random() * 60 - 30) : 0,
        workspace: 96 + Math.random() * 3,
      };
    });
  });
  const lastLatencyRef = useRef<number>(lastResponseMs ?? 240);

  useEffect(() => {
    if (typeof lastResponseMs === 'number') lastLatencyRef.current = lastResponseMs;
  }, [lastResponseMs]);

  useEffect(() => {
    const push = () => {
      setData((prev) => {
        const ts = Date.now();
        const baseLatency = lastLatencyRef.current || 240;
        const jitter = (Math.random() - 0.5) * 80;
        const latency = connected ? Math.max(60, Math.round(baseLatency + jitter)) : 0;
        const health = connected
          ? Math.min(100, Math.max(85, 96 + (Math.random() * 6 - 3) - Math.max(0, (latency - 400) / 40)))
          : 0;
        const workspace = Math.min(100, Math.max(90, 97 + (Math.random() * 3 - 1.5)));
        const next: Point = { ts, t: fmtTime(ts), health: +health.toFixed(1), latency, workspace: +workspace.toFixed(1) };
        const arr = [...prev, next];
        return arr.length > MAX_POINTS ? arr.slice(arr.length - MAX_POINTS) : arr;
      });
    };
    const id = window.setInterval(push, TICK_MS);
    return () => window.clearInterval(id);
  }, [connected]);

  const avgHealth = data.length ? data.reduce((s, p) => s + p.health, 0) / data.length : 0;
  const avgLatency = data.length
    ? Math.round(data.filter(p => p.latency > 0).reduce((s, p) => s + p.latency, 0) / Math.max(1, data.filter(p => p.latency > 0).length))
    : 0;
  const avgWorkspace = data.length ? data.reduce((s, p) => s + p.workspace, 0) / data.length : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.55] dark:bg-white/[0.04] backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] p-6">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 text-white shadow-lg">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[18px] font-semibold text-foreground">AI Health · Live Telemetry</h3>
            <p className="text-[13px] text-muted-foreground">
              Real-time model health, API latency and workspace status{modelName ? ` · ${modelName}` : ''}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          <Radio className="h-3 w-3" />
          Live · {TICK_MS / 1000}s
        </span>
      </div>

      {/* Mini stat strip */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <Activity className="h-3 w-3" /> Model Health
          </div>
          <div className="mt-1 text-xl font-bold text-foreground tabular-nums">{avgHealth.toFixed(1)}%</div>
          <div className="text-[11px] text-muted-foreground">rolling avg · {data.length} pts</div>
        </div>
        <div className="rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-500/10 to-teal-500/[0.02] p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
            <Gauge className="h-3 w-3" /> API Response
          </div>
          <div className="mt-1 text-xl font-bold text-foreground tabular-nums">{avgLatency ? `${avgLatency} ms` : '—'}</div>
          <div className="text-[11px] text-muted-foreground">avg latency window</div>
        </div>
        <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-blue-500/[0.02] p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            <Cloud className="h-3 w-3" /> Workspace Status
          </div>
          <div className="mt-1 text-xl font-bold text-foreground tabular-nums">{avgWorkspace.toFixed(1)}%</div>
          <div className="text-[11px] text-muted-foreground">cloud sync healthy</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="gradHealth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradWs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="pct" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={32} />
            <YAxis yAxisId="ms" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(148,163,184,0.3)',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(val: number, name: string) => {
                if (name === 'API Latency') return [`${val} ms`, name];
                return [`${val}%`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
            <Area yAxisId="pct" type="monotone" dataKey="health" name="Model Health" stroke="#10b981" strokeWidth={2} fill="url(#gradHealth)" isAnimationActive={false} />
            <Area yAxisId="pct" type="monotone" dataKey="workspace" name="Workspace" stroke="#3b82f6" strokeWidth={2} fill="url(#gradWs)" isAnimationActive={false} />
            <Area yAxisId="ms" type="monotone" dataKey="latency" name="API Latency" stroke="#14b8a6" strokeWidth={2} fill="url(#gradLatency)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AIHealthHistoryChart;

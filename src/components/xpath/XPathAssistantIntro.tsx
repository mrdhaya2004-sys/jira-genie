import React from 'react';
import {
  Bot, MessageSquareText, Cpu, Wand2, ShieldCheck, Download,
  Code2, Globe, ImagePlus, Smartphone, Sparkles, ArrowRight,
} from 'lucide-react';

interface XPathAssistantIntroProps {
  onPickSuggestion: (prompt: string) => void;
  platform?: 'web' | 'android' | 'ios' | null;
}

const STEPS = [
  { icon: MessageSquareText, label: 'Describe Element', tone: '#60A5FA' },
  { icon: Cpu,               label: 'AI Analysis',      tone: '#8B5CF6' },
  { icon: Wand2,             label: 'Generate XPath',   tone: '#22D3EE' },
  { icon: ShieldCheck,       label: 'Stability Check',  tone: '#34D399' },
  { icon: Download,          label: 'Export',           tone: '#F59E0B' },
];

const SUGGESTIONS = [
  'Generate XPath for Login Button',
  'Generate XPath for Username Field',
  'Generate XPath for Password Field',
  'Generate XPath for Search Box',
  'Generate XPath for Submit Button',
  'Generate XPath for Watchlist Search Icon',
  'Generate XPath for Trade Button',
  'Generate XPath for Portfolio Card',
  'Generate XPath for Logout Link',
];

const EXAMPLES = [
  'Generate XPath for Login Button',
  'Generate XPath for Username Field',
  'Generate XPath for Watchlist Search Icon',
  'Generate XPath for Trade Button',
];

const ACTIONS = [
  { icon: Code2,      label: 'Paste HTML',        hint: 'Paste raw HTML markup' },
  { icon: Globe,      label: 'Paste DOM',         hint: 'Paste live DOM snapshot' },
  { icon: ImagePlus,  label: 'Upload Screenshot', hint: 'AI reconstructs the DOM' },
  { icon: Smartphone, label: 'Mobile Inspector',  hint: 'Appium page source' },
];

const XPathAssistantIntro: React.FC<XPathAssistantIntroProps> = ({ onPickSuggestion, platform }) => {
  const platformLabel =
    platform === 'android' ? 'Android' :
    platform === 'ios' ? 'iOS' : 'Web';

  return (
    <div data-skip-anchor="true" className="space-y-5">
      {/* Assistant hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 sm:p-7">
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#3B82F6]/25 to-[#8B5CF6]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#10B981]/20 to-[#22D3EE]/15 blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] blur-lg opacity-60" />
            <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center shadow-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">AI XPath Assistant</h2>
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-emerald-500/12 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                <Sparkles className="h-2.5 w-2.5" /> {platformLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Describe the element you want to generate XPath for — or paste HTML/DOM, upload a screenshot, or drop
              Appium page source. I'll return stable, dynamic, relative, CSS, and platform-specific locators with
              stability scores.
            </p>

            {/* Examples */}
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-semibold mb-2">Examples</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => onPickSuggestion(ex)}
                    className="group flex items-center justify-between gap-2 text-left px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-[#60A5FA]/40 transition-all"
                  >
                    <span className="text-[13px] font-medium text-foreground/90 truncate">{ex}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#60A5FA] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input action shortcuts */}
        <div className="relative mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {ACTIONS.map((a) => (
            <div
              key={a.label}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <a.icon className="h-4 w-4 text-[#60A5FA]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground/90 truncate">{a.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{a.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow stepper */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-semibold mb-3">Workflow</p>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-white shadow-md shrink-0"
                  style={{ background: `linear-gradient(135deg, ${s.tone}, ${s.tone}CC)`, boxShadow: `0 6px 16px ${s.tone}55` }}
                >
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground/80 font-semibold">Step {i + 1}</div>
                  <div className="text-[12px] font-semibold text-foreground/90 whitespace-nowrap">{s.label}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Quick suggestion chips */}
      <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 font-semibold">Quick Suggestions</p>
          <span className="text-[10px] text-muted-foreground/70">Tap to prefill</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onPickSuggestion(s)}
              className="group inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/[0.05] border border-white/10 hover:border-[#60A5FA]/50 hover:bg-[#60A5FA]/10 transition-all"
            >
              <Sparkles className="h-3 w-3 text-[#60A5FA] group-hover:scale-110 transition-transform" />
              <span className="text-[12px] font-medium text-foreground/90">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default XPathAssistantIntro;

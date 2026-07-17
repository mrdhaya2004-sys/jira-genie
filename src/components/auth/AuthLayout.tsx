import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Zap,
  ScanSearch,
  Brain,
  FileCheck2,
  GitBranch,
  ShieldCheck,
  Lock,
  Cpu,
  Cloud,
  BadgeCheck,
  Check,
} from 'lucide-react';
import testzoneLogo from '@/assets/testzone-logo.png';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const TYPING_PHRASES = [
  'AI Test Case Generation',
  'AI Code Review',
  'AI Defect Intelligence',
  'Smart XPath Generation',
  'AI Test Data',
  'GitLab Automation',
];

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title = 'Test Zone',
  subtitle,
}) => {
  const features = [
    { icon: Brain, text: 'Hive AI Workspace', tint: 'from-blue-500/30 to-indigo-500/20' },
    { icon: FileCheck2, text: 'AI Test Case Generator', tint: 'from-cyan-500/30 to-blue-500/20' },
    { icon: Sparkles, text: 'Smart AI Code Review', tint: 'from-violet-500/30 to-blue-500/20' },
    { icon: ScanSearch, text: 'AI Defect Intelligence', tint: 'from-emerald-500/30 to-cyan-500/20' },
    { icon: Zap, text: 'XPath AI', tint: 'from-sky-500/30 to-indigo-500/20' },
    { icon: GitBranch, text: 'GitLab Automation', tint: 'from-orange-500/25 to-rose-500/20' },
  ];

  const trustIndicators = [
    { icon: ShieldCheck, label: 'Enterprise Security' },
    { icon: Lock, label: 'End-to-End Encryption' },
    { icon: Cpu, label: 'AI Powered' },
    { icon: Cloud, label: 'Cloud Native' },
    { icon: BadgeCheck, label: 'ISO Ready' },
  ];

  // Typing rotator
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typed, setTyped] = useState('');
  useEffect(() => {
    const target = TYPING_PHRASES[phraseIdx];
    let i = 0;
    setTyped('');
    const typer = setInterval(() => {
      i += 1;
      setTyped(target.slice(0, i));
      if (i >= target.length) clearInterval(typer);
    }, 40);
    const rotate = setTimeout(() => {
      setPhraseIdx((p) => (p + 1) % TYPING_PHRASES.length);
    }, 3000);
    return () => {
      clearInterval(typer);
      clearTimeout(rotate);
    };
  }, [phraseIdx]);

  return (
    <div className="relative min-h-[100dvh] flex bg-background overflow-hidden">
      {/* Scoped premium animations */}
      <style>{`
        @keyframes tz-float-slow { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(2%, -3%, 0) scale(1.08); } }
        @keyframes tz-float-slower { 0%,100% { transform: translate3d(0,0,0) scale(1.05); } 50% { transform: translate3d(-3%, 2%, 0) scale(1); } }
        @keyframes tz-particle { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: .8; } 90% { opacity: .6; } 100% { transform: translateY(-120vh) translateX(30px); opacity: 0; } }
        @keyframes tz-shine { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
        @keyframes tz-breathe { 0%,100% { transform: scale(1); opacity: .95; } 50% { transform: scale(1.06); opacity: 1; } }
        @keyframes tz-gradient-line { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes tz-caret { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes tz-float-card { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .tz-caret::after { content:'|'; margin-left:2px; color: hsl(var(--brand-mint)); animation: tz-caret 1s steps(1) infinite; }
        .tz-grid-mask {
          background-image:
            linear-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, hsl(0 0% 100% / 0.06) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(ellipse at 30% 40%, black 40%, transparent 75%);
        }
        .tz-gradient-line {
          background: linear-gradient(90deg, transparent, hsl(var(--brand-mint) / .9), hsl(var(--primary-glow)/.9), transparent);
          background-size: 200% 100%;
          animation: tz-gradient-line 4s ease-in-out infinite;
        }
      `}</style>

      {/* ============ LEFT PANEL — Brand + Aurora ============ */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden text-white
        bg-[linear-gradient(135deg,#0b1a3f_0%,#0f2a6b_35%,#1e40af_65%,#2563eb_100%)]">
        {/* Aurora blobs */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -top-24 -left-16 w-[520px] h-[520px] rounded-full blur-3xl opacity-70"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', animation: 'tz-float-slow 18s ease-in-out infinite' }} />
          <div className="absolute top-1/3 -right-20 w-[560px] h-[560px] rounded-full blur-3xl opacity-60"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', animation: 'tz-float-slower 22s ease-in-out infinite' }} />
          <div className="absolute bottom-[-120px] left-1/3 w-[600px] h-[600px] rounded-full blur-3xl opacity-50"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animation: 'tz-float-slow 26s ease-in-out infinite' }} />
        </div>
        {/* Subtle grid */}
        <div aria-hidden className="absolute inset-0 tz-grid-mask opacity-70" />
        {/* Floating particles */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute block w-1 h-1 rounded-full bg-white/60"
              style={{
                left: `${(i * 7 + 5) % 95}%`,
                bottom: `-10px`,
                boxShadow: '0 0 8px 2px hsl(var(--brand-mint) / 0.6)',
                animation: `tz-particle ${14 + (i % 6) * 3}s linear ${i * 0.8}s infinite`,
              }}
            />
          ))}
        </div>
        {/* Diagonal shine */}
        <div aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 rotate-12 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / .08), transparent)',
            animation: 'tz-shine 9s ease-in-out infinite',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 py-12 w-full">
          {/* Logo cluster */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-xl bg-white/40" style={{ animation: 'tz-breathe 4s ease-in-out infinite' }} />
              <div className="relative h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center overflow-hidden shadow-[0_10px_40px_rgba(59,130,246,0.35)]">
                <img src={testzoneLogo} alt="Test Zone" className="h-11 w-11 object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight leading-none">Test Zone</h1>
              <p className="text-white/70 text-xs mt-1">AI-Driven Testing Platform</p>
              <div className="mt-2 h-[2px] w-40 rounded-full tz-gradient-line" />
            </div>
          </div>

          {/* Welcome */}
          <div className="space-y-6 max-w-lg">
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                Welcome back to <span className="bg-gradient-to-r from-white via-cyan-200 to-emerald-200 bg-clip-text text-transparent">TestZone.</span>
              </h2>
              <p className="mt-4 text-lg text-white/75 leading-relaxed">
                Build, automate and deliver software quality faster with enterprise AI.
              </p>
            </div>
            {/* Typing rotator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              <span className="text-sm font-medium tz-caret">{typed || '\u00A0'}</span>
            </div>
          </div>

          {/* Feature glass cards */}
          <div className="grid grid-cols-2 gap-3 max-w-xl">
            {features.map((f, i) => (
              <div
                key={f.text}
                className="group relative p-4 rounded-3xl border border-white/15 bg-white/[0.07] backdrop-blur-xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.12] hover:border-white/25 hover:shadow-[0_20px_60px_-20px_rgba(59,130,246,0.6)]"
                style={{ animation: `tz-float-card ${8 + (i % 3)}s ease-in-out ${i * 0.2}s infinite` }}
              >
                <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl bg-gradient-to-br ${f.tint} opacity-70 group-hover:opacity-100 transition-opacity`} />
                <div className="relative flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-md">
                    <f.icon className="h-5 w-5 text-white" style={{ animation: 'tz-breathe 3.5s ease-in-out infinite' }} />
                  </div>
                  <span className="text-sm font-semibold text-white/95 leading-tight">{f.text}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer trust strip */}
          <div className="pt-6 border-t border-white/15 text-xs text-white/60">
            <span>Trusted by QA engineers building modern software.</span>
          </div>

        </div>
      </aside>

      {/* ============ RIGHT PANEL — Auth Surface ============ */}
      <main
        className="relative flex-1 flex flex-col px-4 py-6 sm:px-6 sm:py-10 lg:justify-center lg:px-10 xl:px-16 lg:py-12 overflow-hidden"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Right ambient background */}
        <div aria-hidden className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(600px 500px at 80% 10%, hsl(221 100% 92% / 0.9), transparent 70%),' +
              'radial-gradient(500px 400px at 10% 90%, hsl(160 80% 90% / 0.7), transparent 70%),' +
              'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
          }}
        />
        <div aria-hidden className="absolute -top-20 right-10 w-80 h-80 rounded-full blur-3xl opacity-60 -z-10"
          style={{ background: 'radial-gradient(circle, #93c5fd 0%, transparent 70%)', animation: 'tz-float-slow 20s ease-in-out infinite' }} />
        <div aria-hidden className="absolute bottom-10 left-0 w-72 h-72 rounded-full blur-3xl opacity-40 -z-10"
          style={{ background: 'radial-gradient(circle, #6ee7b7 0%, transparent 70%)', animation: 'tz-float-slower 24s ease-in-out infinite' }} />

        {/* Mobile header */}
        <div className="flex flex-col items-center text-center mb-6 lg:hidden">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-500 mb-3">
            <img src={testzoneLogo} alt="Test Zone" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">AI-Driven Testing Platform</p>
        </div>

        <div className="w-full max-w-md mx-auto">
          {children}

          {/* Trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {trustIndicators.map((t, i) => (
              <div
                key={t.label}
                className="group flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full border border-blue-100/80 bg-white/60 backdrop-blur-md shadow-sm text-xs font-medium text-slate-600 hover:text-blue-700 hover:border-blue-200 transition-all"
                style={{ animation: `tz-float-card ${6 + (i % 3)}s ease-in-out ${i * 0.15}s infinite` }}
              >
                <span className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 text-white flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.45)]">
                  <Check className="h-3 w-3" />
                </span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>

          {/* Professional SaaS footer */}
          <footer className="mt-8 flex flex-col items-center gap-3 text-center">
            <p className="text-[13px] font-medium text-slate-500">
              © 2026 TestZone. All rights reserved.
            </p>
            <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-medium text-slate-500">
              {[
                { label: 'Privacy Policy', href: '/legal/privacy' },
                { label: 'Terms of Service', href: '/legal/terms' },
                { label: 'Cookie Policy', href: '/legal/cookies' },
                { label: 'Security', href: '/legal/security' },
              ].map((item, idx, arr) => (
                <React.Fragment key={item.label}>
                  <a
                    href={item.href}
                    className="group relative cursor-pointer text-slate-500 transition-colors duration-200 hover:text-blue-600"
                  >
                    {item.label}
                    <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-blue-600 transition-all duration-300 group-hover:w-full" />
                  </a>
                  {idx < arr.length - 1 && (
                    <span aria-hidden className="text-slate-300 select-none">•</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </footer>

        </div>
      </main>
    </div>
  );
};

export default AuthLayout;

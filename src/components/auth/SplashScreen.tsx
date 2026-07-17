import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import testzoneLogo from '@/assets/testzone-logo.png';
import { cn } from '@/lib/utils';

const STEPS = [
  'Authenticating',
  'Restoring Session',
  'Loading AI Workspace',
  'Syncing Preferences',
  'Almost Ready',
];

interface SplashScreenProps {
  subtitle?: string;
}

/**
 * Premium iOS 26 glass splash screen shown while the app silently
 * validates the user's session. Animates through 5 stages over ~1.6s.
 */
const SplashScreen: React.FC<SplashScreenProps> = ({
  subtitle = 'Preparing your AI Workspace…',
}) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      window.setTimeout(() => setActiveStep(i + 1), 250 + i * 260),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F7F9FC] dark:bg-[#0B0D14] flex items-center justify-center">
      {/* Ambient aurora */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full blur-[80px] opacity-[0.22]"
          style={{ background: 'radial-gradient(circle,#4F46E5 0%,transparent 70%)' }}
        />
        <div
          className="absolute -top-32 -right-24 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.18]"
          style={{ background: 'radial-gradient(circle,#38BDF8 0%,transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full blur-[80px] opacity-[0.18]"
          style={{ background: 'radial-gradient(circle,#22D3EE 0%,transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-[440px] w-[440px] rounded-full blur-[80px] opacity-[0.16]"
          style={{ background: 'radial-gradient(circle,#10B981 0%,transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="rounded-[28px] border border-white/60 bg-white/[0.6] backdrop-blur-[35px] backdrop-saturate-150 shadow-[0_30px_80px_-30px_rgba(37,99,235,0.35)] p-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Logo with conic halo */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute -inset-2 rounded-3xl opacity-70 blur-lg animate-pulse"
                style={{
                  background:
                    'conic-gradient(from 0deg,#4F46E5,#2563EB,#38BDF8,#22D3EE,#10B981,#4F46E5)',
                }}
              />
              <div className="relative h-16 w-16 rounded-3xl bg-white flex items-center justify-center ring-1 ring-inset ring-white/60 shadow-[0_10px_30px_-10px_rgba(79,70,229,0.6)]">
                <img src={testzoneLogo} alt="TestZone" className="h-10 w-10 rounded-2xl" />
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight bg-gradient-to-r from-[#4F46E5] via-[#2563EB] to-[#10B981] bg-clip-text text-transparent">
              TestZone
            </h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          {/* Animated steps */}
          <ul className="mt-6 space-y-2">
            {STEPS.map((label, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              return (
                <li
                  key={label}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300',
                    done && 'bg-emerald-500/10 text-emerald-700',
                    active && 'bg-white/70 text-slate-800 shadow-sm',
                    !done && !active && 'text-slate-400',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                      done && 'border-emerald-500 bg-emerald-500 text-white',
                      active && 'border-[#4F46E5] bg-white text-[#4F46E5]',
                      !done && !active && 'border-slate-200 bg-white/50 text-slate-300',
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="font-medium">{label}</span>
                </li>
              );
            })}
          </ul>

          {/* Progress bar */}
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#2563EB] to-[#10B981] transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, (activeStep / STEPS.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;

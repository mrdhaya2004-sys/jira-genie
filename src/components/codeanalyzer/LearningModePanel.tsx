import React from 'react';
import { GraduationCap, Lightbulb, Compass, BookOpen, AlertTriangle, Workflow } from 'lucide-react';
import type { AnalysisResult } from '@/types/codeAnalyzer';
import { sanitizeStringArray, sanitizeText } from '@/lib/sanitizeText';

interface Props { result: AnalysisResult }

const Section: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
    {children}
  </div>
);

const LearningModePanel: React.FC<Props> = ({ result }) => {
  const l = result.learningMode;
  if (!l) {
    return (
      <div className="hca-glass p-8 text-center text-sm text-muted-foreground hca-rise">
        <GraduationCap className="h-5 w-5 mx-auto mb-2 text-primary" />
        Learning notes will appear after the next analysis.
      </div>
    );
  }
  const alts = sanitizeStringArray(l.alternativeApproaches);
  const mistakes = sanitizeStringArray(l.commonMistakes);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2 px-1">
        <GraduationCap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Learn from this code</h3>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section icon={<Lightbulb className="h-4 w-4" />} label="What it does">
          <p className="text-sm leading-snug">{sanitizeText(l.whatItDoes, '—')}</p>
        </Section>
        <Section icon={<Workflow className="h-4 w-4" />} label="How it works">
          <p className="text-sm leading-snug">{sanitizeText(l.howItWorks, '—')}</p>
        </Section>
        <Section icon={<Compass className="h-4 w-4" />} label="Why it's written this way">
          <p className="text-sm leading-snug">{sanitizeText(l.whyWrittenThisWay, '—')}</p>
        </Section>
        <Section icon={<BookOpen className="h-4 w-4" />} label="Industry best practice">
          <p className="text-sm leading-snug">{sanitizeText(l.industryBestPractice, '—')}</p>
        </Section>
      </div>

      {alts.length > 0 && (
        <Section icon={<Compass className="h-4 w-4" />} label="Alternative approaches">
          <ul className="space-y-1 text-sm">
            {alts.map((a, i) => <li key={i} className="flex gap-2"><span className="text-primary">→</span>{a}</li>)}
          </ul>
        </Section>
      )}

      {mistakes.length > 0 && (
        <Section icon={<AlertTriangle className="h-4 w-4" />} label="Common mistakes">
          <ul className="space-y-1 text-sm">
            {mistakes.map((a, i) => <li key={i} className="flex gap-2 text-amber-700 dark:text-amber-400"><span>!</span>{a}</li>)}
          </ul>
        </Section>
      )}
    </section>
  );
};

export default LearningModePanel;

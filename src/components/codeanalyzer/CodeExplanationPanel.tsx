import React from 'react';
import { BookOpen, Target, Shield, ClipboardCheck, Briefcase, AlertOctagon } from 'lucide-react';
import type { AnalysisResult } from '@/types/codeAnalyzer';
import { sanitizeText, sanitizeStringArray } from '@/lib/sanitizeText';

interface Props { result: AnalysisResult }

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex gap-3">
    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="text-sm leading-snug">{value}</p>
    </div>
  </div>
);

const CodeExplanationPanel: React.FC<Props> = ({ result }) => {
  const ex = result.codeExplanation;
  if (!ex) {
    return (
      <div className="hca-glass p-8 text-center text-sm text-muted-foreground hca-rise">
        <BookOpen className="h-5 w-5 mx-auto mb-2 text-primary" />
        Code explanation will appear after the next analysis.
      </div>
    );
  }
  const validations = sanitizeStringArray(ex.validations);
  const risks = sanitizeStringArray(ex.risks);

  return (
    <section className="hca-glass hca-glass-hover hca-rise p-5 space-y-5">
      <header className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Code Explanation</h3>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Row icon={<Target className="h-4 w-4" />} label="Method Purpose" value={sanitizeText(ex.purpose, '—')} />
        <Row icon={<Briefcase className="h-4 w-4" />} label="Why It Exists" value={sanitizeText(ex.rationale, '—')} />
        <Row icon={<ClipboardCheck className="h-4 w-4" />} label="Business Logic" value={sanitizeText(ex.businessLogic, '—')} />
        <Row icon={<Shield className="h-4 w-4" />} label="Testing Objective" value={sanitizeText(ex.testingObjective, '—')} />
      </div>

      {validations.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Validations Performed</div>
          <ul className="space-y-1 text-sm">
            {validations.map((v, i) => <li key={i} className="flex gap-2"><span className="text-primary">✓</span>{v}</li>)}
          </ul>
        </div>
      )}

      {risks.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 text-amber-500" /> Risks
          </div>
          <ul className="space-y-1 text-sm">
            {risks.map((v, i) => <li key={i} className="flex gap-2 text-amber-700 dark:text-amber-400"><span>!</span>{v}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CodeExplanationPanel;

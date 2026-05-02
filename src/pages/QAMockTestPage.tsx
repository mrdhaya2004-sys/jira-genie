import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Brain,
  Trophy,
  Timer,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Target,
  TrendingUp,
  Zap,
  Award,
  Flame,
  BookOpen,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface ResultDetail {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean;
  category: string;
  correct_option: string;
  explanation: string;
}

interface CompletedAttempt {
  id: string;
  score: number;
  total: number;
  time_seconds: number;
  completed: boolean;
}

interface Stats {
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  streak: number;
  categories: { category: string; correct: number; total: number; accuracy: number }[];
  weakAreas: { category: string; accuracy: number; total: number }[];
  strongAreas: { category: string; accuracy: number; total: number }[];
}

type Stage = 'entry' | 'question' | 'feedback' | 'results' | 'loading' | 'already-done';

const OPTIONS: Array<{ key: 'A' | 'B' | 'C' | 'D'; field: keyof Question }> = [
  { key: 'A', field: 'option_a' },
  { key: 'B', field: 'option_b' },
  { key: 'C', field: 'option_c' },
  { key: 'D', field: 'option_d' },
];

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const StatPill: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
    <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
    <div className="text-base font-bold">{value}</div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
  </div>
);

const QAMockTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [completedAttempt, setCompletedAttempt] = useState<CompletedAttempt | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctOption: string; explanation: string } | null>(null);
  const [answers, setAnswers] = useState<{ question_id: string; selected_option: string | null }[]>([]);
  const [results, setResults] = useState<ResultDetail[] | null>(null);
  const [score, setScore] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);
  const tickInterval = useRef<NodeJS.Timeout | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const reset = () => {
    setStage('loading');
    setQuestions([]);
    setCompletedAttempt(null);
    setCurrentIdx(0);
    setSelected(null);
    setFeedback(null);
    setAnswers([]);
    setResults(null);
    setScore(0);
    setError(null);
    setElapsed(0);
    if (tickInterval.current) clearInterval(tickInterval.current);
  };

  const loadEntry = async () => {
    setStage('loading');
    setError(null);
    try {
      const [chRes, statsRes] = await Promise.all([
        supabase.functions.invoke('qa-get-daily-challenge'),
        supabase.functions.invoke('qa-get-stats'),
      ]);

      setStats((statsRes.data as Stats) || null);

      if (chRes.error) {
        let bodyMsg = '';
        try {
          const ctx: any = (chRes.error as any).context;
          if (ctx?.json) {
            const j = await ctx.json();
            bodyMsg = j?.error || '';
          } else if (ctx?.text) {
            bodyMsg = await ctx.text();
          }
        } catch {
          // ignore
        }
        const isEmptyBank = /question bank is empty/i.test(bodyMsg);
        setQuestions([]);
        setCompletedAttempt(null);
        setError(
          isEmptyBank
            ? 'Question bank is empty. Generate questions to get started.'
            : (bodyMsg || (chRes.error as any)?.message || 'Failed to load challenge'),
        );
        setStage('entry');
        return;
      }

      const data = chRes.data as { questions: Question[]; completedAttempt: CompletedAttempt | null };
      setQuestions(data.questions || []);
      setCompletedAttempt(data.completedAttempt);
      if (!data.questions || data.questions.length === 0) {
        setError('Question bank is empty. Generate questions to get started.');
      }
      if (data.completedAttempt) setStage('already-done');
      else setStage('entry');
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load challenge');
      setStage('entry');
    }
  };

  useEffect(() => {
    reset();
    loadEntry();
    return () => {
      if (tickInterval.current) clearInterval(tickInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTest = () => {
    if (!questions.length) return;
    startedAt.current = Date.now();
    setElapsed(0);
    if (tickInterval.current) clearInterval(tickInterval.current);
    tickInterval.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    setStage('question');
  };

  const seedBank = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke('qa-seed-questions', {
        body: { target: 250 },
      });
      if (error) throw error;
      toast({
        title: 'Question bank updated',
        description: `Total questions: ${data?.newCount ?? '—'}. Run again to add more.`,
      });
      await loadEntry();
    } catch (e: any) {
      toast({ title: 'Failed to seed questions', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  const currentQ = questions[currentIdx];

  const submitSelection = (opt: string) => {
    if (!currentQ || feedback) return;
    setSelected(opt);
    revealAnswer(opt);
  };

  const revealAnswer = async (opt: string) => {
    if (!currentQ) return;
    const { data, error } = await supabase
      .from('qa_questions')
      .select('correct_option, explanation')
      .eq('id', currentQ.id)
      .maybeSingle();
    if (error || !data) {
      toast({ title: 'Could not verify answer', variant: 'destructive' });
      return;
    }
    const correct = opt === data.correct_option;
    if (correct) setScore((s) => s + 1);
    setFeedback({ correct, correctOption: data.correct_option, explanation: data.explanation });
    setAnswers((prev) => [...prev, { question_id: currentQ.id, selected_option: opt }]);
    setStage('feedback');
  };

  const nextQuestion = async () => {
    setSelected(null);
    setFeedback(null);
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setStage('question');
    } else {
      if (tickInterval.current) clearInterval(tickInterval.current);
      const totalTime = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(totalTime);
      setStage('loading');
      try {
        const { data, error } = await supabase.functions.invoke('qa-submit-attempt', {
          body: { answers, time_seconds: totalTime },
        });
        if (error) throw error;
        setResults(data.results as ResultDetail[]);
        setStage('results');
        supabase.functions.invoke('qa-get-stats').then((r) => {
          if (r.data) setStats(r.data as Stats);
        });
      } catch (e: any) {
        toast({ title: 'Submission failed', description: e?.message, variant: 'destructive' });
        setStage('results');
      }
    }
  };

  // Keyboard navigation: 1-4 to select, Enter to advance during feedback
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (stage === 'question' && currentQ && !feedback) {
        const map: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        const k = map[e.key];
        if (k) {
          e.preventDefault();
          submitSelection(k);
        }
      } else if (stage === 'feedback' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        nextQuestion();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentQ, feedback, currentIdx, questions.length, answers]);

  const progress = useMemo(
    () => ((currentIdx + (feedback ? 1 : 0)) / Math.max(1, questions.length)) * 100,
    [currentIdx, feedback, questions.length],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 h-14 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="h-full max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate('/')}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Brain className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">QA Mock Test</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Daily Skill Challenge</div>
              </div>
            </div>
          </div>
          {(stage === 'question' || stage === 'feedback') && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                {formatTime(elapsed)}
              </span>
              <span className="font-medium">
                {currentIdx + 1}/{questions.length}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparing your challenge…</p>
          </div>
        )}

        {stage === 'entry' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Today's Challenge
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Sharpen your QA skills</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                10 multiple-choice questions across testing fundamentals, automation, APIs, and more. Get instant feedback and explanations.
              </p>
            </div>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill icon={Flame} label="Streak" value={`${stats.streak}d`} />
                <StatPill icon={Trophy} label="Best" value={`${stats.bestScore}/10`} />
                <StatPill icon={TrendingUp} label="Avg" value={`${stats.avgScore}`} />
                <StatPill icon={Target} label="Done" value={`${stats.totalAttempts}`} />
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {questions.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-5 space-y-3">
                <p className="text-sm">The question bank is empty. Generate AI-powered questions to start.</p>
                <Button onClick={seedBank} disabled={seeding} className="w-full" size="lg">
                  {seeding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating questions…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Question Bank
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={startTest} size="lg" className="w-full">
                <Zap className="h-4 w-4" />
                Start Today's Challenge
              </Button>
            )}

            {stats && stats.weakAreas.length > 0 && (
              <div className="rounded-lg border border-border/60 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                  Focus areas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.weakAreas.map((w) => (
                    <span
                      key={w.category}
                      className="text-[11px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5"
                    >
                      {w.category} · {w.accuracy}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {questions.length > 0 && (
              <button
                onClick={seedBank}
                disabled={seeding}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                {seeding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Expand question bank
              </button>
            )}
          </div>
        )}

        {stage === 'already-done' && completedAttempt && (
          <div className="space-y-6 text-center">
            <div className="inline-flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">You're done for today</h1>
              <p className="text-sm text-muted-foreground mt-1">Come back tomorrow for a new set of questions.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-2xl font-bold">{completedAttempt.score}/{completedAttempt.total}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Score</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-2xl font-bold">{formatTime(completedAttempt.time_seconds)}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Time</div>
              </div>
            </div>
            {stats && (
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                <StatPill icon={Flame} label="Streak" value={`${stats.streak}d`} />
                <StatPill icon={Trophy} label="Best" value={`${stats.bestScore}/10`} />
                <StatPill icon={TrendingUp} label="Avg" value={`${stats.avgScore}`} />
              </div>
            )}
            {stats && stats.weakAreas.length > 0 && (
              <div className="rounded-lg border border-border/60 p-3 space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                  Focus areas to improve
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.weakAreas.map((w) => (
                    <span
                      key={w.category}
                      className="text-[11px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5"
                    >
                      {w.category} · {w.accuracy}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {stage === 'question' && currentQ && (
          <div className="space-y-5 animate-fade-in">
            <Progress value={progress} className="h-1" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide font-semibold rounded bg-primary/10 text-primary px-1.5 py-0.5">
                {currentQ.category}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{currentQ.difficulty}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-medium leading-relaxed">{currentQ.question}</h2>
            <div className="grid gap-3">
              {OPTIONS.map((opt, idx) => {
                const isSelected = selected === opt.key;
                const isLocked = !!selected;
                return (
                  <button
                    key={opt.key}
                    onClick={() => submitSelection(opt.key)}
                    disabled={isLocked}
                    aria-pressed={isSelected}
                    className={cn(
                      'group w-full text-left flex items-center gap-4 p-5 sm:p-6 rounded-xl border-2 transition-all min-h-[72px]',
                      !isLocked && 'hover:border-primary hover:bg-primary/5 hover:shadow-sm cursor-pointer',
                      isLocked && !isSelected && 'opacity-50 cursor-not-allowed',
                      isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold transition-colors',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-primary/15 group-hover:text-primary',
                      )}
                    >
                      {opt.key}
                    </span>
                    <span className="text-base sm:text-[15px] flex-1 leading-relaxed">{currentQ[opt.field] as string}</span>
                    <kbd className="hidden sm:inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground">
                      {idx + 1}
                    </kbd>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">1</kbd>–<kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">4</kbd> to answer
            </p>
          </div>
        )}

        {stage === 'feedback' && currentQ && feedback && (
          <div className="space-y-5 animate-fade-in">
            <Progress value={progress} className="h-1" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide font-semibold rounded bg-primary/10 text-primary px-1.5 py-0.5">
                {currentQ.category}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-medium leading-relaxed">{currentQ.question}</h2>
            <div className="space-y-2">
              {OPTIONS.map((opt) => {
                const isCorrect = opt.key === feedback.correctOption;
                const isSelected = opt.key === selected;
                return (
                  <div
                    key={opt.key}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-3.5 rounded-lg border transition-all',
                      isCorrect && 'border-green-500/60 bg-green-500/10',
                      !isCorrect && isSelected && 'border-red-500/60 bg-red-500/10',
                      !isCorrect && !isSelected && 'border-border bg-card opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                        isCorrect && 'bg-green-500 text-white',
                        !isCorrect && isSelected && 'bg-red-500 text-white',
                        !isCorrect && !isSelected && 'bg-muted',
                      )}
                    >
                      {opt.key}
                    </span>
                    <span className="text-sm pt-0.5 flex-1">{currentQ[opt.field] as string}</span>
                    {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                    {!isCorrect && isSelected && <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                'rounded-lg p-4 text-sm',
                feedback.correct
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-amber-500/10 border border-amber-500/30',
              )}
            >
              <div className="flex items-center gap-2 font-medium mb-1">
                {feedback.correct ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-400">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-700 dark:text-amber-400">
                      Correct answer: {feedback.correctOption}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feedback.explanation}</p>
            </div>

            <Button onClick={nextQuestion} className="w-full" size="lg">
              {currentIdx + 1 < questions.length ? (
                <>
                  Next Question <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  See Results <Trophy className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {stage === 'results' && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div
                className={cn(
                  'inline-flex h-16 w-16 mx-auto items-center justify-center rounded-full',
                  score >= 8 ? 'bg-amber-500/15' : 'bg-primary/10',
                )}
              >
                {score >= 8 ? <Award className="h-8 w-8 text-amber-500" /> : <Target className="h-8 w-8 text-primary" />}
              </div>
              <h1 className="text-3xl font-bold">
                {score}/{questions.length}
              </h1>
              {score >= 8 ? (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-3 py-1 text-xs font-semibold">
                    <Trophy className="h-3.5 w-3.5" /> Achievement Unlocked
                  </div>
                  <p className="text-sm text-muted-foreground">Outstanding work — you're a QA pro!</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Good effort! Review the explanations and try again tomorrow.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <Timer className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{formatTime(elapsed)}</div>
                <div className="text-[11px] text-muted-foreground">Time taken</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-lg font-bold">{Math.round((score / questions.length) * 100)}%</div>
                <div className="text-[11px] text-muted-foreground">Accuracy</div>
              </div>
            </div>

            {stats && stats.weakAreas.length > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                  Improve in these areas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.weakAreas.map((w) => (
                    <span
                      key={w.category}
                      className="text-[11px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5"
                    >
                      {w.category} · {w.accuracy}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {results && (
              <details className="rounded-lg border">
                <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium hover:bg-muted/50">
                  Review answers ({results.length})
                </summary>
                <div className="border-t divide-y max-h-[28rem] overflow-y-auto">
                  {results.map((r, i) => {
                    const q = questions.find((x) => x.id === r.question_id);
                    return (
                      <div key={r.question_id} className="p-3 text-xs space-y-1">
                        <div className="flex items-start gap-2">
                          {r.is_correct ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">
                              Q{i + 1}. {q?.question}
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Your answer: <span className="font-medium">{r.selected_option || '—'}</span> · Correct:{' '}
                              <span className="font-medium text-green-600">{r.correct_option}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
                Back to Dashboard
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  reset();
                  loadEntry();
                }}
              >
                <RotateCcw className="h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default QAMockTestPage;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  BookOpenText,
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
  Star,
  Crown,
  Rocket,
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

// Confetti effects
const fireConfetti = (variant: 'small' | 'big' | 'epic' = 'small') => {
  const palette = ['#a855f7', '#3b82f6', '#06b6d4', '#22c55e', '#facc15', '#f97316', '#ec4899'];
  if (variant === 'small') {
    confetti({
      particleCount: 40,
      spread: 60,
      startVelocity: 35,
      origin: { y: 0.65 },
      colors: palette,
      scalar: 0.8,
    });
  } else if (variant === 'big') {
    confetti({
      particleCount: 120,
      spread: 90,
      startVelocity: 45,
      origin: { y: 0.6 },
      colors: palette,
    });
  } else {
    // epic — perfect score finale
    const duration = 2500;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors: palette,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors: palette,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    setTimeout(() => {
      confetti({ particleCount: 200, spread: 160, origin: { y: 0.5 }, colors: palette });
    }, 400);
  }
};

const StatPill: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  gradient: string;
}> = ({ icon: Icon, label, value, gradient }) => (
  <div className="relative rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-3 text-center overflow-hidden group hover:scale-105 transition-transform">
    <div className={cn('absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity', gradient)} />
    <Icon className="relative h-4 w-4 mx-auto mb-1 text-foreground/80" />
    <div className="relative text-base font-bold">{value}</div>
    <div className="relative text-[11px] text-muted-foreground">{label}</div>
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
  const [combo, setCombo] = useState(0);
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
    setCombo(0);
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
    if (correct) {
      setScore((s) => s + 1);
      setCombo((c) => {
        const nc = c + 1;
        if (nc >= 3) fireConfetti('small');
        return nc;
      });
    } else {
      setCombo(0);
    }
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
        // Winning effects
        const finalScore = score; // already reflects correct answers including this one
        setTimeout(() => {
          if (finalScore === questions.length) fireConfetti('epic');
          else if (finalScore >= 8) fireConfetti('big');
          else if (finalScore >= 5) fireConfetti('small');
        }, 300);
        supabase.functions.invoke('qa-get-stats').then((r) => {
          if (r.data) setStats(r.data as Stats);
        });
      } catch (e: any) {
        toast({ title: 'Submission failed', description: e?.message, variant: 'destructive' });
        setStage('results');
      }
    }
  };

  // Keyboard navigation
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background */}
      <div className="qa-aurora-bg">
        <div className="qa-aurora-3" />
      </div>
      <div className="qa-grid-bg" />

      {/* Header */}
      <header className="relative z-20 sticky top-0 h-14 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="h-full max-w-5xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => navigate('/')}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="relative h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <BookOpenText className="h-5 w-5 text-white" />
                <span className="absolute inset-0 rounded-xl qa-pulse-ring border-2 border-purple-400/60" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight qa-gradient-text truncate">QA Mock Test</div>
                <div className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Daily Skill Challenge</div>
              </div>
            </div>
          </div>
          {(stage === 'question' || stage === 'feedback') && (
            <div className="flex items-center gap-1.5 sm:gap-3 text-xs shrink-0">
              {combo >= 2 && (
                <span className="hidden xs:flex sm:flex items-center gap-1 font-bold qa-pop">
                  <Flame className="h-4 w-4 qa-streak-flame" />
                  <span className="qa-streak-flame">x{combo}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Timer className="h-3.5 w-3.5" />
                {formatTime(elapsed)}
              </span>
              <span className="font-semibold rounded-md bg-primary/10 text-primary px-2 py-0.5">
                {currentIdx + 1}/{questions.length}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-10 pb-24 sm:pb-10">
        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="absolute inset-0 qa-pulse-ring rounded-full border-2 border-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground">Preparing your challenge…</p>
          </div>
        )}

        {stage === 'entry' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500/15 via-blue-500/15 to-cyan-500/15 border border-primary/20 px-3 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3 qa-rainbow" />
                Today's Challenge
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                <span className="qa-gradient-text">Sharpen your QA skills</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                10 multiple-choice questions across testing fundamentals, automation, APIs, and more. Get instant feedback with combo streaks and rewards.
              </p>
            </div>

            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill icon={Flame} label="Streak" value={`${stats.streak}d`} gradient="bg-gradient-to-br from-orange-400 to-red-500" />
                <StatPill icon={Trophy} label="Best" value={`${stats.bestScore}/10`} gradient="bg-gradient-to-br from-yellow-400 to-amber-500" />
                <StatPill icon={TrendingUp} label="Avg" value={`${stats.avgScore}`} gradient="bg-gradient-to-br from-emerald-400 to-teal-500" />
                <StatPill icon={Target} label="Done" value={`${stats.totalAttempts}`} gradient="bg-gradient-to-br from-purple-400 to-blue-500" />
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {questions.length === 0 ? (
              <div className="qa-card-glow rounded-xl p-5 space-y-3">
                <p className="text-sm">The question bank is empty. Generate AI-powered questions to start.</p>
                <Button onClick={seedBank} disabled={seeding} className="w-full qa-gradient-btn border-0" size="lg">
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
              <Button
                onClick={startTest}
                size="lg"
                className="w-full qa-gradient-btn border-0 text-base h-14 font-semibold"
              >
                <Rocket className="h-5 w-5" />
                Start Today's Challenge
              </Button>
            )}

            {stats && stats.weakAreas.length > 0 && (
              <div className="qa-card-glow rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                  Focus areas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.weakAreas.map((w) => (
                    <span
                      key={w.category}
                      className="text-[11px] rounded-md bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 border border-amber-500/20"
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
          <div className="space-y-6 text-center animate-fade-in">
            <div className="relative inline-flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30 qa-float-slow">
              <CheckCircle2 className="h-10 w-10 text-white" />
              <span className="absolute inset-0 rounded-full qa-pulse-ring border-2 border-emerald-400/60" />
            </div>
            <div>
              <h1 className="text-2xl font-bold qa-gradient-text">You're done for today!</h1>
              <p className="text-sm text-muted-foreground mt-1">Come back tomorrow for a fresh set of questions.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="qa-card-glow rounded-xl p-4">
                <div className="text-3xl font-extrabold qa-gradient-text">{completedAttempt.score}/{completedAttempt.total}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Score</div>
              </div>
              <div className="qa-card-glow rounded-xl p-4">
                <div className="text-3xl font-extrabold">{formatTime(completedAttempt.time_seconds)}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Time</div>
              </div>
            </div>
            {stats && (
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                <StatPill icon={Flame} label="Streak" value={`${stats.streak}d`} gradient="bg-gradient-to-br from-orange-400 to-red-500" />
                <StatPill icon={Trophy} label="Best" value={`${stats.bestScore}/10`} gradient="bg-gradient-to-br from-yellow-400 to-amber-500" />
                <StatPill icon={TrendingUp} label="Avg" value={`${stats.avgScore}`} gradient="bg-gradient-to-br from-emerald-400 to-teal-500" />
              </div>
            )}
          </div>
        )}

        {stage === 'question' && currentQ && (
          <div className="space-y-4 sm:space-y-5 animate-fade-in">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wide font-bold rounded bg-gradient-to-r from-purple-500/15 to-blue-500/15 text-primary px-2 py-0.5 border border-primary/20">
                {currentQ.category}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{currentQ.difficulty}</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-semibold leading-snug sm:leading-relaxed">{currentQ.question}</h2>
            <div className="grid gap-2.5 sm:gap-3">
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
                      'group relative w-full text-left flex items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-xl border-2 transition-all min-h-[64px] sm:min-h-[76px] qa-card-glow active:scale-[0.99] touch-manipulation',
                      !isLocked && 'hover:border-primary hover:shadow-lg hover:shadow-primary/20 sm:hover:-translate-y-0.5 cursor-pointer',
                      isLocked && !isSelected && 'opacity-50 cursor-not-allowed',
                      isSelected && 'border-primary shadow-lg shadow-primary/30 scale-[1.01]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold transition-all',
                        isSelected
                          ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md'
                          : 'bg-muted group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-blue-500 group-hover:text-white',
                      )}
                    >
                      {opt.key}
                    </span>
                    <span className="text-[15px] sm:text-base flex-1 leading-relaxed break-words">{currentQ[opt.field] as string}</span>
                    <kbd className="hidden sm:inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border border-border bg-muted/70 px-1.5 text-[10px] font-mono text-muted-foreground group-hover:border-primary/40 group-hover:text-primary transition-colors">
                      {idx + 1}
                    </kbd>
                  </button>
                );
              })}
            </div>
            <p className="hidden sm:block text-[11px] text-muted-foreground text-center">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">1</kbd>–<kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">4</kbd> to answer
            </p>
          </div>
        )}

        {stage === 'feedback' && currentQ && feedback && (
          <div className={cn('space-y-5 animate-fade-in', !feedback.correct && 'qa-shake')}>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide font-bold rounded bg-gradient-to-r from-purple-500/15 to-blue-500/15 text-primary px-2 py-0.5 border border-primary/20">
                {currentQ.category}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold leading-relaxed">{currentQ.question}</h2>
            <div className="space-y-2 sm:space-y-2.5">
              {OPTIONS.map((opt) => {
                const isCorrect = opt.key === feedback.correctOption;
                const isSelected = opt.key === selected;
                return (
                  <div
                    key={opt.key}
                    className={cn(
                      'w-full text-left flex items-start gap-3 p-3 sm:p-4 rounded-lg border-2 transition-all',
                      isCorrect && 'qa-option-correct qa-pop',
                      !isCorrect && isSelected && 'qa-option-wrong',
                      !isCorrect && !isSelected && 'border-border bg-card opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                        isCorrect && 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
                        !isCorrect && isSelected && 'bg-gradient-to-br from-red-500 to-rose-600 text-white',
                        !isCorrect && !isSelected && 'bg-muted',
                      )}
                    >
                      {opt.key}
                    </span>
                    <span className="text-sm pt-1 sm:pt-0.5 flex-1 break-words">{currentQ[opt.field] as string}</span>
                    {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}
                    {!isCorrect && isSelected && <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                'rounded-xl p-4 text-sm border-2 qa-pop',
                feedback.correct
                  ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/40'
                  : 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/40',
              )}
            >
              <div className="flex items-center gap-2 font-bold mb-1.5">
                {feedback.correct ? (
                  <>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-green-700 dark:text-green-400">
                      Correct! {combo >= 3 && <span className="qa-streak-flame ml-1">🔥 {combo} in a row</span>}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500">
                      <XCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-amber-700 dark:text-amber-400">
                      Correct answer: {feedback.correctOption}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feedback.explanation}</p>
            </div>

            <Button onClick={nextQuestion} className="w-full qa-gradient-btn border-0 h-12" size="lg">
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
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-3">
              <div
                className={cn(
                  'relative inline-flex h-24 w-24 mx-auto items-center justify-center rounded-full shadow-2xl',
                  score === questions.length
                    ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 shadow-amber-500/50'
                    : score >= 8
                      ? 'bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-blue-500/40'
                      : score >= 5
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/40'
                        : 'bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-500/30',
                )}
              >
                {score === questions.length ? (
                  <Crown className="h-12 w-12 text-white qa-trophy-bounce" />
                ) : score >= 8 ? (
                  <Trophy className="h-12 w-12 text-white qa-trophy-bounce" />
                ) : score >= 5 ? (
                  <Star className="h-12 w-12 text-white qa-trophy-bounce" />
                ) : (
                  <Target className="h-12 w-12 text-white" />
                )}
                <span className="absolute inset-0 rounded-full qa-pulse-ring border-2 border-white/40" />
              </div>
              <h1 className="text-5xl font-extrabold qa-gradient-text">
                {score}/{questions.length}
              </h1>
              {score === questions.length ? (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1.5 text-sm font-bold shadow-lg shadow-amber-500/30">
                    <Crown className="h-4 w-4" /> PERFECT SCORE!
                  </div>
                  <p className="text-sm text-muted-foreground">Flawless. You're a QA legend! 👑</p>
                </div>
              ) : score >= 8 ? (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1.5 text-sm font-bold shadow-lg shadow-blue-500/30">
                    <Award className="h-4 w-4" /> Achievement Unlocked
                  </div>
                  <p className="text-sm text-muted-foreground">Outstanding work — you're a QA pro!</p>
                </div>
              ) : score >= 5 ? (
                <p className="text-sm text-muted-foreground">Solid effort! Keep it up. ⭐</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Good try! Review the explanations and come back stronger tomorrow.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="qa-card-glow rounded-xl p-4 text-center">
                <Timer className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-xl font-extrabold">{formatTime(elapsed)}</div>
                <div className="text-[11px] text-muted-foreground">Time taken</div>
              </div>
              <div className="qa-card-glow rounded-xl p-4 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-xl font-extrabold qa-gradient-text">
                  {Math.round((score / questions.length) * 100)}%
                </div>
                <div className="text-[11px] text-muted-foreground">Accuracy</div>
              </div>
            </div>

            {stats && stats.weakAreas.length > 0 && (
              <div className="qa-card-glow rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                  Improve in these areas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.weakAreas.map((w) => (
                    <span
                      key={w.category}
                      className="text-[11px] rounded-md bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 border border-amber-500/20"
                    >
                      {w.category} · {w.accuracy}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {results && (
              <details className="qa-card-glow rounded-xl">
                <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold hover:bg-muted/30 rounded-xl">
                  Review answers ({results.length})
                </summary>
                <div className="border-t divide-y max-h-[28rem] overflow-y-auto">
                  {results.map((r, i) => {
                    const q = questions.find((x) => x.id === r.question_id);
                    return (
                      <div key={r.question_id} className="p-3 text-xs space-y-1">
                        <div className="flex items-start gap-2">
                          {r.is_correct ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
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
                className="flex-1 qa-gradient-btn border-0"
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

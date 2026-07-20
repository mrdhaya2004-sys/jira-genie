import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import {
  Search, Mic, Sparkles, Send, Bot, User as UserIcon,
  BookOpen, PlayCircle, FileText, MessageSquareText, Bug, Lightbulb,
  Users, Rocket, LifeBuoy, Github, Slack, Linkedin, Globe, Mail,
  PhoneCall, CalendarClock, MessagesSquare, ShieldCheck, Zap,
  Ticket, Timer, CheckCircle2, AlertTriangle, Activity, RefreshCw,
  ChevronDown, Pin, History, Star, Video, Code2, GitBranch, Database,
  KeyRound, Layers, ArrowUpRight, HelpCircle, Radio, ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import helpSupportLogo from '@/assets/help-support-logo.png';

/* ------------------------------------------------------------------ */
/* Types + constants                                                  */
/* ------------------------------------------------------------------ */
type Message = { role: 'user' | 'assistant'; content: string };

const GREETING =
  "Hi 👋 I'm the **Hive AI Assistant**. Ask me anything about TestZone — modules, integrations, workflows, or troubleshooting.";

const HEADER_CHIPS = [
  { label: 'AI Support', tone: 'emerald', dot: true },
  { label: 'Documentation', tone: 'blue' },
  { label: 'Support Tickets', tone: 'violet' },
  { label: 'Community', tone: 'cyan' },
  { label: 'System Status', tone: 'amber', dot: true },
] as const;

const SEARCH_EXAMPLES = [
  'How do I generate test cases?',
  'How to connect GitHub?',
  'How to configure AI?',
  'How to raise a Jira ticket?',
];

const RECENT_SEARCHES = [
  'XPath for React apps',
  'Configure custom AI provider',
  'Retry failed automation',
];

const QUICK_ACTIONS = [
  { icon: Rocket,        label: 'Getting Started',   desc: 'Set up your workspace in minutes', grad: 'from-blue-500 to-cyan-500' },
  { icon: BookOpen,      label: 'Documentation',     desc: 'Deep dives for every module',       grad: 'from-indigo-500 to-blue-500' },
  { icon: PlayCircle,    label: 'Video Tutorials',   desc: 'Watch and learn by example',        grad: 'from-violet-500 to-fuchsia-500' },
  { icon: FileText,      label: 'Release Notes',     desc: "What's new in TestZone",             grad: 'from-emerald-500 to-teal-500' },
  { icon: HelpCircle,    label: 'FAQs',              desc: 'Answers to common questions',       grad: 'from-cyan-500 to-blue-500' },
  { icon: LifeBuoy,      label: 'Contact Support',   desc: '24/7 human assistance',             grad: 'from-amber-500 to-orange-500' },
  { icon: Bug,           label: 'Report a Bug',      desc: 'File an issue with our team',       grad: 'from-rose-500 to-red-500' },
  { icon: Lightbulb,     label: 'Feature Request',   desc: 'Shape the TestZone roadmap',        grad: 'from-yellow-500 to-amber-500' },
  { icon: Users,         label: 'Community Forum',   desc: 'Learn with other QA engineers',     grad: 'from-fuchsia-500 to-purple-500' },
];

const AI_ASSISTANT_ACTIONS = [
  { label: 'Ask AI',                icon: Sparkles,      prompt: 'What can you help me with in TestZone?' },
  { label: 'Open Chat',             icon: MessagesSquare,prompt: 'Take me through TestZone module by module.' },
  { label: 'Explain a Feature',     icon: Zap,           prompt: 'Explain the Logic Scenario Creator in detail.' },
  { label: 'Generate a Guide',      icon: FileText,      prompt: 'Generate a step-by-step guide to connect GitHub.' },
  { label: 'Summarize Docs',        icon: BookOpen,      prompt: 'Summarize TestZone documentation for a new user.' },
];

const DOC_CATEGORIES = [
  { icon: Sparkles,       label: 'Hive AI',                 count: 24, grad: 'from-blue-500 to-violet-500' },
  { icon: FileText,       label: 'Test Cases',              count: 18, grad: 'from-cyan-500 to-blue-500' },
  { icon: Code2,          label: 'XPath Generator',         count: 12, grad: 'from-indigo-500 to-purple-500' },
  { icon: Layers,         label: 'Logic Scenario Creator',  count: 15, grad: 'from-violet-500 to-fuchsia-500' },
  { icon: Zap,            label: 'Automation',              count: 21, grad: 'from-emerald-500 to-teal-500' },
  { icon: Github,         label: 'GitHub',                  count: 9,  grad: 'from-slate-600 to-slate-800' },
  { icon: GitBranch,      label: 'GitLab',                  count: 8,  grad: 'from-orange-500 to-rose-500' },
  { icon: KeyRound,       label: 'API',                     count: 14, grad: 'from-amber-500 to-orange-500' },
  { icon: ShieldCheck,    label: 'Security',                count: 11, grad: 'from-emerald-500 to-green-600' },
  { icon: Database,       label: 'Workspace',               count: 10, grad: 'from-blue-500 to-indigo-500' },
];

const VIDEO_TRACKS = [
  { level: 'Beginner',       title: 'Welcome to TestZone',        duration: '4:12',  grad: 'from-emerald-500 to-teal-500' },
  { level: 'Beginner',       title: 'Your First Test Case',       duration: '6:45',  grad: 'from-cyan-500 to-blue-500' },
  { level: 'Intermediate',   title: 'Automations & GitHub',       duration: '9:20',  grad: 'from-indigo-500 to-violet-500' },
  { level: 'Advanced',       title: 'Enterprise AI Configuration',duration: '12:08', grad: 'from-violet-500 to-fuchsia-500' },
  { level: 'Best Practices', title: 'Scaling QA with AI',         duration: '7:33',  grad: 'from-amber-500 to-orange-500' },
  { level: 'AI Features',    title: 'Hive Mind Deep Dive',        duration: '10:15', grad: 'from-blue-500 to-purple-500' },
];

const SYSTEM_SERVICES = [
  { label: 'API',            status: 'operational' as const },
  { label: 'AI Services',    status: 'operational' as const },
  { label: 'GitHub',         status: 'operational' as const },
  { label: 'GitLab',         status: 'operational' as const },
  { label: 'Database',       status: 'operational' as const },
  { label: 'Authentication', status: 'operational' as const },
  { label: 'Workspace',      status: 'operational' as const },
];

const FAQS = [
  { q: 'How to connect GitHub?',          a: 'Open **AI Configuration → Integrations → GitHub**, click Connect, authorize the OAuth flow, and pick the repositories you want TestZone to access.' },
  { q: 'How to configure AI?',            a: 'Go to **AI Configuration**, choose a provider (Lovable AI, OpenAI, Anthropic, or a custom endpoint), paste your API key, and press **Test Connection**.' },
  { q: 'How to generate XPath?',          a: 'Open the **XPath Generator**, paste your HTML/DOM or upload a screenshot, then click **Generate**. Absolute, relative, dynamic, CSS and platform-specific locators are produced automatically.' },
  { q: 'How to create Test Data?',        a: 'Use the **AI Test Data Generator** — describe the entity, choose a schema, and export as JSON, CSV, or SQL.' },
  { q: 'How to raise a Jira ticket?',     a: 'From any module click **Raise Ticket**, or open the **Jira Ticket Raiser** module directly. AI drafts the summary, description, and priority for you.' },
];

const CONTACT_CHANNELS = [
  { icon: Mail,          label: 'Email Support',              desc: 'support@testzoneai.com',   grad: 'from-blue-500 to-cyan-500' },
  { icon: MessagesSquare,label: 'Live Chat',                  desc: 'Instant human handoff',    grad: 'from-emerald-500 to-teal-500' },
  { icon: CalendarClock, label: 'Book a Demo',                desc: '30-min product walkthrough',grad: 'from-violet-500 to-fuchsia-500' },
  { icon: CalendarClock, label: 'Schedule a Meeting',         desc: 'Meet your success manager',grad: 'from-indigo-500 to-blue-500' },
  { icon: PhoneCall,     label: 'Call Support',               desc: 'Priority phone line',      grad: 'from-amber-500 to-orange-500' },
  { icon: ShieldCheck,   label: 'Priority Enterprise',        desc: 'SLA-backed premium tier',  grad: 'from-emerald-500 to-green-600' },
];

const COMMUNITY_LINKS = [
  { icon: MessagesSquare, label: 'Discord',        desc: 'Chat with the community',  grad: 'from-indigo-500 to-violet-500' },
  { icon: Slack,          label: 'Slack',          desc: 'Join the QA workspace',    grad: 'from-fuchsia-500 to-pink-500' },
  { icon: Github,         label: 'GitHub',         desc: 'Open source & issues',     grad: 'from-slate-600 to-slate-900' },
  { icon: Linkedin,       label: 'LinkedIn',       desc: 'Follow product updates',   grad: 'from-blue-600 to-blue-800' },
  { icon: BookOpen,       label: 'Knowledge Base', desc: 'Long-form articles',       grad: 'from-emerald-500 to-teal-500' },
  { icon: ThumbsUp,       label: 'Feedback Portal',desc: 'Vote on the roadmap',      grad: 'from-amber-500 to-orange-500' },
];

const FEEDBACK_TYPES = ['Bug', 'Suggestion', 'Feature Request', 'UI Feedback', 'AI Feedback'] as const;
const EMOJI_RATINGS = ['😞', '😐', '🙂', '😃', '🤩'];

const RECENT_ACTIVITY = {
  docs:     ['XPath Generator — Overview', 'Connecting GitHub OAuth', 'Hive AI: Prompt patterns'],
  searches: ['configure openai key', 'jira status pill', 'flaky test debugging'],
  chats:    ['How to reset workspace?', 'Explain BDD scenarios', 'Best practices for XPath'],
  pinned:   ['Enterprise SSO setup', 'API rate limits', 'Data retention policy'],
};

/* ------------------------------------------------------------------ */
/* Small presentational primitives                                    */
/* ------------------------------------------------------------------ */
const HeaderChip: React.FC<{ label: string; tone: string; dot?: boolean }> = ({ label, tone, dot }) => {
  const toneMap: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-300',
    blue:    'from-blue-500/20 to-cyan-500/10 text-blue-700 dark:text-blue-300',
    violet:  'from-violet-500/20 to-purple-500/10 text-violet-700 dark:text-violet-300',
    cyan:    'from-cyan-500/20 to-sky-500/10 text-cyan-700 dark:text-cyan-300',
    amber:   'from-amber-500/20 to-orange-500/10 text-amber-700 dark:text-amber-300',
  };
  const dotMap: Record<string, string> = {
    emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500',
    cyan: 'bg-cyan-500', amber: 'bg-amber-500',
  };
  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
      'border border-white/40 dark:border-white/10 backdrop-blur-xl bg-gradient-to-r',
      toneMap[tone],
    )}>
      {dot && (
        <span className={cn('relative flex h-2 w-2')}>
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping', dotMap[tone])} />
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', dotMap[tone])} />
        </span>
      )}
      {label}
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ElementType; title: string; subtitle?: string; right?: React.ReactNode }> = ({ icon: Icon, title, subtitle, right }) => (
  <div className="flex items-end justify-between gap-4 mb-4">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white grid place-items-center shadow-lg shadow-blue-500/20">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-[18px] font-semibold text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {right}
  </div>
);

const GlassTile: React.FC<React.PropsWithChildren<{ className?: string; onClick?: () => void; ariaLabel?: string }>> = ({ children, className, onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={cn(
      'glass-card p-5 transition-all duration-300 text-left w-full',
      'hover:-translate-y-1',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      className,
    )}
  >
    {children}
  </button>
);

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */
const HelpSupportModule: React.FC = () => {
  /* AI chat state (mirrors HelpChatDialog behavior) */
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  /* Global search */
  const [searchValue, setSearchValue] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SEARCH_EXAMPLES.length), 3200);
    return () => clearInterval(id);
  }, []);

  /* Feedback */
  const [feedbackType, setFeedbackType] = useState<typeof FEEDBACK_TYPES[number]>('Suggestion');
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  /* System status auto-refresh */
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setLastRefreshed(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  /* Auto-scroll chat */
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsStreaming(true);
    let assistantContent = '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to use AI support.');
        setIsStreaming(false);
        return;
      }
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/help-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: updated }),
        },
      );
      if (!resp.ok || !resp.body) {
        toast.error('Failed to get AI response');
        setIsStreaming(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const upsert = (content: string) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length === updated.length + 1) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: 'assistant', content }];
        });
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const j = line.slice(6).trim();
          if (j === '[DONE]') break;
          try {
            const parsed = JSON.parse(j);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              upsert(assistantContent);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to get AI response');
    } finally {
      setIsStreaming(false);
    }
  };

  const submitFeedback = () => {
    if (!feedbackText.trim() || rating === null) {
      toast.error('Add a rating and a short note.');
      return;
    }
    toast.success('Thanks — your feedback was sent to the team.');
    setFeedbackText('');
    setRating(null);
  };

  const ticketStats = useMemo(
    () => [
      { label: 'Open Tickets',          value: 3, icon: Ticket,       grad: 'from-blue-500 to-cyan-500' },
      { label: 'Resolved',              value: 47, icon: CheckCircle2,grad: 'from-emerald-500 to-teal-500' },
      { label: 'Pending',               value: 2, icon: Timer,        grad: 'from-amber-500 to-orange-500' },
      { label: 'Avg Response Time',     value: '18m', icon: Activity, grad: 'from-violet-500 to-fuchsia-500' },
    ],
    [],
  );

  return (
    <div className="relative h-full w-full overflow-y-auto bg-background text-foreground">
      <Helmet>
        <title>Help & Support — TestZone AI Help Center</title>
        <meta name="description" content="AI-powered TestZone Help Center — documentation, tutorials, tickets, community and live support." />
      </Helmet>

      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute -top-24 right-0 h-[440px] w-[440px] rounded-full bg-cyan-400/15 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[460px] w-[460px] rounded-full bg-violet-500/15 blur-[140px]" />
        <div className="absolute -bottom-32 -right-24 h-[500px] w-[500px] rounded-full bg-emerald-400/10 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 py-8 space-y-10">
        {/* ================= HERO HEADER ================= */}
        <section className="glass-card p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-400 to-violet-500 blur-2xl opacity-40" />
                <div className="relative h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-400 to-violet-500 grid place-items-center shadow-xl shadow-blue-500/30">
                  <img src={helpSupportLogo} alt="" className="h-10 w-10 object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-[30px] font-bold leading-tight text-foreground">Help &amp; Support</h1>
                <p className="text-[15px] font-medium text-muted-foreground mt-1 max-w-xl">
                  Need assistance? Get instant AI support, documentation, tutorials and technical help.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              {HEADER_CHIPS.map((c) => (
                <HeaderChip key={c.label} {...c} />
              ))}
            </div>
          </div>

          {/* ============ GLOBAL SEARCH ============ */}
          <div className="mt-8">
            <label htmlFor="help-global-search" className="sr-only">Search TestZone help</label>
            <div className="relative group">
              <div className="absolute -inset-[2px] rounded-[28px] bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 opacity-40 group-focus-within:opacity-80 blur-md transition" />
              <div className="relative glass-panel rounded-[26px] flex items-center gap-3 pl-5 pr-3 py-3">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <Input
                  id="help-global-search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && searchValue.trim()) sendMessage(searchValue); }}
                  placeholder={`Ask anything about TestZone... e.g. "${SEARCH_EXAMPLES[placeholderIdx]}"`}
                  aria-label="Ask anything about TestZone"
                  className="flex-1 h-11 bg-transparent border-0 shadow-none text-[15px] focus-visible:ring-0 placeholder:text-muted-foreground/70"
                />
                <Button variant="ghost" size="sm" aria-label="Search by voice" className="gap-1.5 rounded-full hidden md:inline-flex focus-visible:ring-2 focus-visible:ring-blue-500">
                  <Mic className="h-4 w-4" aria-hidden="true" /> <span>Voice</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => searchValue.trim() && sendMessage(searchValue)}
                  aria-label="Ask AI assistant"
                  className="gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/30 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> <span>AI Search</span>
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Recent searches">
              <span className="text-xs font-medium text-muted-foreground mr-1">Recent:</span>
              {RECENT_SEARCHES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSearchValue(r)}
                  aria-label={`Use recent search: ${r}`}
                  className="text-xs px-2.5 py-1 rounded-full glass-panel hover:border-blue-500/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </section>



        {/* ================= QUICK ACTIONS ================= */}
        <section>
          <SectionTitle icon={Rocket} title="Quick Actions" subtitle="Jump into the most common workflows" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((a) => (
              <GlassTile key={a.label} ariaLabel={`${a.label}: ${a.desc}`}>
                <div className="flex items-start gap-4">
                  <div className={cn('h-11 w-11 rounded-xl grid place-items-center text-white shadow-lg bg-gradient-to-br', a.grad)} aria-hidden="true">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold text-foreground">{a.label}</div>
                    <div className="text-[13px] text-muted-foreground mt-0.5">{a.desc}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" aria-hidden="true" />
                </div>
              </GlassTile>
            ))}
          </div>
        </section>


        {/* ================= AI ASSISTANT ================= */}
        <section>
          <SectionTitle
            icon={Sparkles}
            title="Hive AI Assistant"
            subtitle="I'm here to help you with TestZone."
            right={
              <Badge variant="secondary" className="rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Online
              </Badge>
            }
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick prompt buttons */}
            <div className="glass-card p-5 lg:col-span-1 space-y-2.5" role="group" aria-label="Suggested prompts">
              <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground mb-1" id="try-prompts-label">Try</div>
              {AI_ASSISTANT_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => sendMessage(a.prompt)}
                  aria-label={`Send prompt: ${a.prompt}`}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 border border-white/40 dark:border-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white grid place-items-center" aria-hidden="true">
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{a.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>

            {/* Chat surface */}
            <section aria-label="Hive AI Assistant chat" className="glass-card p-0 lg:col-span-2 flex flex-col overflow-hidden min-h-[460px]">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/40 dark:border-white/10">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 grid place-items-center text-white shadow-lg shadow-blue-500/20" aria-hidden="true">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Hive AI Assistant</div>
                  <div className="text-[11px] text-muted-foreground">Streaming • Powered by TestZone AI</div>
                </div>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-4"
                role="log"
                aria-live="polite"
                aria-atomic="false"
                aria-label="Chat conversation"
              >
                {messages.map((m, i) => (
                  <article key={i} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')} aria-label={`${m.role === 'assistant' ? 'Assistant' : 'You'} said`}>
                    <div className={cn(
                      'h-8 w-8 rounded-xl grid place-items-center shrink-0',
                      m.role === 'assistant'
                        ? 'bg-gradient-to-br from-blue-500 to-violet-500 text-white'
                        : 'bg-muted text-muted-foreground',
                    )} aria-hidden="true">
                      {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      'max-w-[80%] px-4 py-3 rounded-2xl text-sm',
                      m.role === 'assistant'
                        ? 'text-foreground rounded-bl-md'
                        : 'bg-primary text-primary-foreground rounded-br-md',
                    )}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </article>
                ))}
                {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="flex gap-3" role="status" aria-label="Assistant is typing">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white grid place-items-center" aria-hidden="true">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-muted flex items-center gap-1.5" aria-hidden="true">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:120ms]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/40 dark:border-white/10 p-3 flex items-end gap-2">
                <label htmlFor="help-chat-input" className="sr-only">Ask the Hive AI Assistant</label>
                <Textarea
                  id="help-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Ask me anything about TestZone..."
                  aria-label="Ask the Hive AI Assistant"
                  rows={1}
                  className="flex-1 min-h-[44px] max-h-32 resize-none py-3 bg-white/60 dark:bg-white/5 border-white/50 dark:border-white/10"
                  disabled={isStreaming}
                />
                <Button
                  size="icon"
                  disabled={isStreaming || !input.trim()}
                  onClick={() => sendMessage(input)}
                  aria-label="Send message"
                  className="rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/30 focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </section>
          </div>
        </section>


        {/* ================= DOCUMENTATION ================= */}
        <section>
          <SectionTitle icon={BookOpen} title="Documentation" subtitle="Browse guides by product area" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {DOC_CATEGORIES.map((d) => (
              <GlassTile key={d.label}>
                <div className={cn('h-11 w-11 rounded-xl grid place-items-center text-white shadow-lg bg-gradient-to-br', d.grad)}>
                  <d.icon className="h-5 w-5" />
                </div>
                <div className="mt-4">
                  <div className="text-[15px] font-semibold text-foreground">{d.label}</div>
                  <div className="text-[12px] text-muted-foreground mt-1">{d.count} documents</div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-blue-600 dark:text-blue-400">
                  <Search className="h-3.5 w-3.5" /> Search inside
                </div>
              </GlassTile>
            ))}
          </div>
        </section>

        {/* ================= VIDEO LEARNING ================= */}
        <section>
          <SectionTitle icon={Video} title="Video Learning" subtitle="Curated tracks from Beginner to Advanced" />
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {VIDEO_TRACKS.map((v) => (
              <div key={v.title} className="glass-card p-0 overflow-hidden min-w-[280px] snap-start hover:-translate-y-1 transition">
                <div className={cn('h-32 w-full bg-gradient-to-br relative flex items-center justify-center', v.grad)}>
                  <PlayCircle className="h-12 w-12 text-white/90 drop-shadow" />
                  <span className="absolute top-2 left-2 text-[11px] font-semibold text-white px-2 py-0.5 rounded-full bg-black/30 backdrop-blur">
                    {v.level}
                  </span>
                  <span className="absolute bottom-2 right-2 text-[11px] font-semibold text-white px-2 py-0.5 rounded-full bg-black/30 backdrop-blur">
                    {v.duration}
                  </span>
                </div>
                <div className="p-4">
                  <div className="text-[15px] font-semibold text-foreground">{v.title}</div>
                  <Button size="sm" variant="outline" className="mt-3 rounded-full gap-1.5">
                    <PlayCircle className="h-4 w-4" /> Watch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SUPPORT TICKETS + SYSTEM STATUS ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SectionTitle icon={Ticket} title="Support Tickets" subtitle="Track your requests in one place"
              right={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full gap-1.5"><History className="h-4 w-4" /> History</Button>
                  <Button size="sm" className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white gap-1.5">
                    <Ticket className="h-4 w-4" /> Create Ticket
                  </Button>
                </div>
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ticketStats.map((s) => (
                <div key={s.label} className="glass-card p-4">
                  <div className={cn('h-9 w-9 rounded-lg grid place-items-center text-white bg-gradient-to-br', s.grad)}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-[24px] font-bold leading-none">{s.value}</div>
                  <div className="text-[12px] text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="glass-card p-6 mt-4 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white grid place-items-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="mt-3 text-[16px] font-semibold">You're all caught up!</div>
              <div className="text-[13px] text-muted-foreground mt-1">
                Need help? Start a conversation with Hive AI or open a new ticket.
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" variant="outline" className="rounded-full">Track Ticket</Button>
                <Button size="sm" className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                  Ask Hive AI
                </Button>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div>
            <SectionTitle icon={Radio} title="System Status"
              right={
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              }
            />
            <div className="glass-card p-2">
              {SYSTEM_SERVICES.map((s, i) => (
                <div key={s.label} className={cn(
                  'flex items-center justify-between px-3 py-3',
                  i < SYSTEM_SERVICES.length - 1 && 'border-b border-white/40 dark:border-white/5',
                )}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-[14px] font-medium">{s.label}</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Operational
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground text-center">
              Auto-refreshing every 30 seconds
            </div>
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section>
          <SectionTitle icon={HelpCircle} title="Frequently Asked Questions" subtitle="Quick answers to top questions" />
          <div className="glass-card p-2">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem key={f.q} value={`faq-${i}`} className="border-b border-white/30 dark:border-white/5 last:border-0 px-3">
                  <AccordionTrigger className="text-[15px] font-semibold hover:no-underline">
                    <span className="flex items-center gap-3 text-left">
                      <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white grid place-items-center text-[11px] font-bold">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {f.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-[14px] text-muted-foreground pl-10 pr-4 pb-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{f.a}</ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ================= CONTACT SUPPORT ================= */}
        <section>
          <SectionTitle icon={LifeBuoy} title="Contact Support" subtitle="Reach us through the channel that suits you" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONTACT_CHANNELS.map((c) => (
              <GlassTile key={c.label}>
                <div className="flex items-start gap-4">
                  <div className={cn('h-11 w-11 rounded-xl grid place-items-center text-white shadow-lg bg-gradient-to-br', c.grad)}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold">{c.label}</div>
                    <div className="text-[13px] text-muted-foreground mt-0.5">{c.desc}</div>
                  </div>
                </div>
              </GlassTile>
            ))}
          </div>
        </section>

        {/* ================= COMMUNITY ================= */}
        <section>
          <SectionTitle icon={Globe} title="Community" subtitle="Join the TestZone practitioner network" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {COMMUNITY_LINKS.map((c) => (
              <GlassTile key={c.label} className="text-center">
                <div className={cn('h-11 w-11 rounded-xl grid place-items-center text-white shadow-lg bg-gradient-to-br mx-auto', c.grad)}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-[14px] font-semibold">{c.label}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{c.desc}</div>
              </GlassTile>
            ))}
          </div>
        </section>

        {/* ================= FEEDBACK + RECENT ACTIVITY ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Feedback */}
          <div className="lg:col-span-2">
            <SectionTitle icon={MessageSquareText} title="Share Feedback" subtitle="Help us make TestZone even better" />
            <div className="glass-card p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFeedbackType(t)}
                    className={cn(
                      'text-xs font-semibold px-3 py-1.5 rounded-full border transition',
                      feedbackType === t
                        ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white border-transparent shadow-md shadow-blue-500/30'
                        : 'bg-white/50 dark:bg-white/5 border-white/40 dark:border-white/10 text-foreground hover:border-blue-500/40',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">How was your experience?</div>
                <div className="flex gap-2">
                  {EMOJI_RATINGS.map((emoji, idx) => (
                    <button
                      key={emoji}
                      onClick={() => setRating(idx)}
                      className={cn(
                        'h-12 w-12 rounded-2xl text-2xl grid place-items-center border transition',
                        rating === idx
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-transparent scale-110 shadow-lg shadow-amber-500/30'
                          : 'bg-white/50 dark:bg-white/5 border-white/40 dark:border-white/10 hover:scale-105',
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Tell us more..."
                rows={4}
                className="bg-white/60 dark:bg-white/5 border-white/50 dark:border-white/10"
              />
              <div className="flex justify-end">
                <Button
                  onClick={submitFeedback}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white gap-1.5"
                >
                  <Send className="h-4 w-4" /> Submit Feedback
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <SectionTitle icon={History} title="Recent Activity" />
            <div className="space-y-3">
              {[
                { title: 'Recently Viewed Docs', icon: BookOpen, items: RECENT_ACTIVITY.docs },
                { title: 'Recent Searches',      icon: Search,   items: RECENT_ACTIVITY.searches },
                { title: 'Recent AI Chats',      icon: Bot,      items: RECENT_ACTIVITY.chats },
                { title: 'Pinned Articles',      icon: Pin,      items: RECENT_ACTIVITY.pinned },
              ].map((group) => (
                <div key={group.title} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <group.icon className="h-4 w-4 text-blue-500" />
                    <span className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {group.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-[13px] text-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                        <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
                        <span className="truncate">{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default HelpSupportModule;

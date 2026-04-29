import React from 'react';
import { Sparkles, Brain, Cpu, Globe, Landmark, ScrollText, Layers, Zap, Quote, User, MapPin, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import cholaTemple from '@/assets/about-chola-temple.jpg';
import tamilArchitecture from '@/assets/about-tamil-architecture.jpg';
import tamilHeritage from '@/assets/about-tamil-heritage.jpg';
import testzoneLogo from '@/assets/testzone-logo.png';
import founderPhoto from '@/assets/founder.png';
import { KolamMandala, TempleSilhouette, DiyaFlame, Embers } from './HeritageDecor';

interface AboutUsModuleProps {
  onOpenFounder?: () => void;
}

const AboutUsModule: React.FC<AboutUsModuleProps> = ({ onOpenFounder }) => {
  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.35), transparent 45%), radial-gradient(circle at 80% 60%, hsl(25 95% 55% / 0.25), transparent 50%)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />

        {/* Floating heritage kolam (top-right) */}
        <KolamMandala
          className="absolute -top-16 -right-16 w-72 h-72 sm:w-96 sm:h-96 text-orange-500/30 heritage-spin-slow pointer-events-none"
        />
        {/* Subtle counter-spin kolam (bottom-left) */}
        <KolamMandala
          className="absolute -bottom-24 -left-20 w-72 h-72 text-primary/20 heritage-spin-reverse pointer-events-none hidden sm:block"
        />
        {/* Floating temple silhouette */}
        <TempleSilhouette className="absolute right-6 sm:right-16 bottom-0 w-24 sm:w-32 text-amber-600/20 heritage-float pointer-events-none" />
        {/* Glowing orb */}
        <div aria-hidden="true" className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent blur-3xl heritage-glow pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="flex items-center gap-2 mb-6">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
              <Sparkles className="h-3 w-3" />
              About Test Zone
            </Badge>
          </div>

          <div className="flex items-start gap-4 sm:gap-5 mb-6">
            <img
              src={testzoneLogo}
              alt="Test Zone"
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl shadow-lg ring-1 ring-border/50"
              width={64}
              height={64}
            />
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight text-center">
                Where heritage meets{' '}
                <span className="heritage-shimmer-text">intelligence.</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Rooted in tradition. Powered by AI.
              </p>
            </div>
          </div>

          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl leading-relaxed text-justify">
            Test Zone is a next-generation, AI-powered testing platform that brings
            intelligence, automation, and context-awareness to modern software quality.
            Built by engineers who believe that great technology - like great
            architecture - is timeless.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-10 max-w-3xl">
            {[
              { icon: Brain, label: 'Hive Mind AI' },
              { icon: Cpu, label: 'Context-Aware' },
              { icon: Zap, label: 'Automation-First' },
              { icon: Globe, label: 'Global SaaS' },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm"
              >
                <f.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TAMIL HERITAGE */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        {/* Decorative kolam corner */}
        <KolamMandala className="absolute top-6 right-4 sm:right-10 w-32 h-32 sm:w-44 sm:h-44 text-orange-500/20 heritage-spin-slow pointer-events-none" />
        <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <Badge className="mb-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/15 border-orange-500/20">
              <Landmark className="h-3 w-3 mr-1.5" />
              Tamil Heritage
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-center mb-5">
              Proudly Built from{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Tamil Nadu
              </span>
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p className="text-justify">
                Tamil is one of the <span className="text-foreground font-medium">oldest living languages</span> in
                the world — a tradition of literature, logic, and learning that has
                flourished for more than two thousand years.
              </p>
              <p className="text-justify">
                Tamil Nadu has long been a crucible of human achievement: in
                mathematics, astronomy, metallurgy, philosophy, and architecture.
                The land that gave the world the <span className="text-foreground font-medium">Chola Empire</span>{' '}
                also gave it temples that still stand as monuments to precision
                engineering - geometry, acoustics, and structural design centuries
                ahead of their time.
              </p>
              <p>
                We carry that lineage forward. Every line of code we write is
                informed by a culture that has always believed: build for beauty,
                build for purpose, build to last.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              {[
                { value: '2000+', label: 'Years of heritage' },
                { value: '∞', label: 'Cultural depth' },
                { value: '1', label: 'Vision forward' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border/60 bg-card/40 p-3 text-center">
                  <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-4 bg-gradient-to-tr from-orange-500/20 via-amber-500/10 to-transparent rounded-3xl blur-2xl heritage-glow pointer-events-none" />
            {/* Floating diya lamp */}
            <div aria-hidden="true" className="absolute -top-6 -left-6 sm:-top-8 sm:-left-8 z-10 w-14 h-20 sm:w-16 sm:h-24 heritage-float drop-shadow-[0_0_20px_rgba(255,140,40,0.45)] pointer-events-none">
              <DiyaFlame className="w-full h-full" />
            </div>
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-border/60 shadow-2xl">
              <img
                src={cholaTemple}
                alt="Ancient Chola dynasty temple in Tamil Nadu"
                loading="lazy"
                width={1024}
                height={1280}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <p className="text-white/90 text-xs sm:text-sm font-medium">
                  Chola architecture&nbsp; engineering wisdom carved in stone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cultural visual gallery */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mt-10 sm:mt-14">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-border/60 group">
            <img
              src={tamilArchitecture}
              alt="Intricate Tamil temple stone carvings"
              loading="lazy"
              width={1024}
              height={768}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white/95 text-sm font-semibold">Precision in stone</p>
              <p className="text-sm text-muted-foreground leading-relaxed text-justify">Precision in stone{"\n\n"}Dravidian craftsmanship is&nbsp; every detail intentional.</p>
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-border/60 group">
            <img
              src={tamilHeritage}
              alt="Traditional Tamil brass lamp and kolam"
              loading="lazy"
              width={1024}
              height={768}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white/95 text-sm font-semibold">Light & geometry</p>
              <p className="text-sm text-muted-foreground leading-relaxed text-justify">Kolam patterns a algorithms drawn at dawn.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT THE FOUNDER (short) */}
      <section className="relative border-t border-border/40 overflow-hidden">
        <KolamMandala
          aria-hidden="true"
          className="absolute -top-20 -left-24 w-72 h-72 text-orange-500/15 heritage-spin-slow pointer-events-none"
        />
        <KolamMandala
          aria-hidden="true"
          className="absolute -bottom-24 -right-24 w-80 h-80 text-primary/10 heritage-spin-reverse pointer-events-none hidden sm:block"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 right-1/4 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent blur-3xl heritage-glow pointer-events-none"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-3xl mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-primary/20">
              <User className="h-3 w-3 mr-1.5" />
              About the Founder
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-center sm:text-5xl">
              The mind behind{' '}
              <span className="heritage-shimmer-text">Test Zone</span>
            </h2>
          </div>

          <Card className="relative p-6 sm:p-8 bg-gradient-to-br from-card to-card/40 border-border/60">
            <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3">
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-2 bg-gradient-to-tr from-orange-500/25 via-amber-500/15 to-primary/15 rounded-full blur-xl heritage-glow pointer-events-none"
                  />
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden ring-1 ring-border/60 shadow-lg bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-primary/20">
                    <img
                      src={founderPhoto}
                      alt="Dhayanand A P, Founder of Test Zone"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <div className="sm:mt-1">
                  <p className="font-semibold text-sm sm:text-base">Dhayanand A P</p>
                  <p className="text-xs text-muted-foreground">Founder, Test Zone</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 text-orange-500" />
                    <span>Tamil Nadu, India</span>
                  </div>
                </div>
              </div>

              <div>
                <Quote className="h-5 w-5 text-primary/40 mb-2" />
                <p className="text-sm sm:text-base leading-relaxed text-foreground/90 text-justify">
                  From a small village with limited internet to building an
                  AI-powered testing platform — Dhayanand's journey is shaped by
                  curiosity, resilience, and a belief that great technology
                  should solve real problems. After years as an automation
                  tester, he set out to make software testing intelligent,
                  context-aware, and effortless. That vision became Test Zone.
                </p>
                <Button
                  onClick={onOpenFounder}
                  className="mt-5 group"
                  size="sm"
                >
                  Read Full Story
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* HERITAGE → TECHNOLOGY BRIDGE */}
      <section className="relative border-y border-border/40 bg-muted/30 overflow-hidden">
        {/* Centered ambient kolam behind heading */}
        <KolamMandala className="absolute top-4 left-1/2 -translate-x-1/2 w-[420px] h-[420px] text-orange-500/10 heritage-spin-reverse pointer-events-none" />
        <TempleSilhouette className="absolute -bottom-4 -left-6 w-28 sm:w-36 text-amber-700/15 heritage-float pointer-events-none" />
        <TempleSilhouette className="absolute -bottom-4 -right-6 w-28 sm:w-36 text-amber-700/15 heritage-float pointer-events-none" style={{ animationDelay: '2s' } as React.CSSProperties} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <Badge variant="outline" className="mb-4">
              <Layers className="h-3 w-3 mr-1.5" />
              Heritage × Technology
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              From temple architecture to system architecture
            </h2>
            <p className="text-muted-foreground mt-3 text-sm sm:text-base">
              The same principles that shaped a civilization shape our platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Landmark,
                title: 'Chola architecture → System architecture',
                body: 'Modular, monumental, and built to endure. Our systems are designed with the same discipline of structure and proportion.',
              },
              {
                icon: ScrollText,
                title: 'Ancient intelligence → AI intelligence',
                body: 'Centuries of logic, mathematics, and observation become the foundation of context-aware machine reasoning.',
              },
              {
                icon: Sparkles,
                title: 'Continuity of innovation',
                body: 'A single thread of curiosity running from palm-leaf manuscripts to neural networks. We are simply the next chapter.',
              },
            ].map((c) => (
              <Card key={c.title} className="p-5 sm:p-6 bg-card/60 backdrop-blur-sm border-border/60 hover:border-primary/40 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-orange-500/15 flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg leading-snug mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TEST ZONE AI BRANDING */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <Badge variant="secondary" className="mb-4">
            <Brain className="h-3 w-3 mr-1.5" />
            The Intelligence
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            An AI built to think like your best engineer
          </h2>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Test Zone is engineered around four pillars of advanced intelligence.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            {
              icon: Brain,
              title: 'Hive Mind Intelligence',
              body: 'A multi-agent orchestration layer where specialized AI minds collaborate to solve testing challenges in parallel.',
              accent: 'from-primary/20 to-blue-500/10',
            },
            {
              icon: Cpu,
              title: 'Context-Aware Testing',
              body: 'The platform understands your stories, screens, APIs and intent - generating tests that fit your product, not generic templates.',
              accent: 'from-violet-500/20 to-fuchsia-500/10',
            },
            {
              icon: Zap,
              title: 'AI-Driven Automation',
              body: 'From scenario design to executable code in seconds - across Selenium, Playwright, Cypress, and more.',
              accent: 'from-amber-500/20 to-orange-500/10',
            },
            {
              icon: Sparkles,
              title: 'Human-Like Test Generation',
              body: 'Functional, negative, and edge-case suites written with the nuance of a senior QA - at machine scale.',
              accent: 'from-emerald-500/20 to-teal-500/10',
            },
          ].map((p) => (
            <Card key={p.title} className="relative p-5 sm:p-6 overflow-hidden border-border/60 hover:border-primary/40 transition-colors">
              <div className={`absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br ${p.accent} blur-2xl pointer-events-none`} />
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-card border border-border/60 flex items-center justify-center mb-4 shadow-sm">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* TAGLINE / POSITIONING */}
      <section className="relative border-t border-border/40 bg-gradient-to-br from-background via-muted/30 to-background overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.4),transparent_60%)] pointer-events-none" />
        {/* Animated kolam halo */}
        <KolamMandala className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] sm:w-[680px] sm:h-[680px] text-orange-500/15 heritage-spin-slow pointer-events-none" />
        <KolamMandala className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] text-primary/10 heritage-spin-reverse pointer-events-none" />
        {/* Rising embers */}
        <Embers count={18} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div aria-hidden="true" className="inline-flex h-14 w-14 items-center justify-center mb-5 pointer-events-none">
            <DiyaFlame className="w-12 h-16 drop-shadow-[0_0_18px_rgba(255,140,40,0.55)]" />
          </div>
          <Quote className="h-6 w-6 text-primary/50 mx-auto mb-4" />
          <p className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
            “From <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Tamil Nadu</span> to the world -
            A next-generation AI testing platform where{' '}
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">tradition meets technology</span>.”
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <Badge variant="outline" className="text-xs">Rooted in tradition</Badge>
            <span className="text-muted-foreground text-xs">•</span>
            <Badge variant="outline" className="text-xs">Powered by AI</Badge>
            <span className="text-muted-foreground text-xs">•</span>
            <Badge variant="outline" className="text-xs">Built for the world</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-10">
            © {new Date().getFullYear()} Test Zone - Crafted with pride in Tamil Nadu, India.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutUsModule;

import React from 'react';
import { ArrowLeft, MapPin, Quote, User, Smartphone, GraduationCap, Cog, Brain, Lightbulb, Rocket, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KolamMandala, TempleSilhouette, DiyaFlame } from './HeritageDecor';

interface FounderPageProps {
  onBack: () => void;
}

const FounderPage: React.FC<FounderPageProps> = ({ onBack }) => {
  const steps = [
    {
      icon: Smartphone,
      title: 'A first window into technology',
      body:
        "My mother is a Computer Science professor, and my father — though he studied only up to high school — had a deep interest in technology. At a time when mobile phones were rare in our village, my father owned one. That became my first window into the world of technology.",
    },
    {
      icon: GraduationCap,
      title: 'Curiosity over grades',
      body:
        "I wasn't a topper in school. I struggled academically in the early stages. But what I lacked in grades, I made up for with curiosity — spending hours exploring mobile phones, understanding how they worked, and breaking down their structure. A turning point came in 10th standard, inspired by someone who believed in me and gave me the space to grow.",
    },
    {
      icon: Cog,
      title: 'Engineering systems thinking',
      body:
        "In college, I chose Electronics and Communication — drawn to hardware, circuits, and embedded systems. That's where I started understanding how systems work at a deeper level: how devices, architecture, and logic come together.",
    },
    {
      icon: Brain,
      title: 'Starting from scratch with AI',
      body:
        'As AI began to evolve, I realized something important — while I understood hardware systems, AI was a completely different world. So I started from scratch again: learning, researching, and slowly immersing myself into AI.',
    },
    {
      icon: Lightbulb,
      title: 'Seeing the real problem',
      body:
        "My first professional role as an Automation Tester changed everything. That's where I saw the problem clearly: software testing was heavily repetitive, time-consuming, and dependent on manual effort. The question kept returning — what if AI could handle testing intelligently? Not just automation, but understanding systems, generating test cases, and reducing human effort.",
    },
    {
      icon: Rocket,
      title: 'That idea became Test Zone',
      body:
        'Today, Test Zone is an AI-powered testing platform built to simplify and transform how testing is done — making it smarter, faster, and more efficient. Coming from a place where even internet access was limited, building an AI product today — especially from Tamil Nadu — is something I take great pride in.',
    },
  ];

  // Founder image: optional. If user adds src/assets/founder.jpg, it will load.
  // Until then, we render a stylized initials avatar.
  let founderImage: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    founderImage = new URL('../../assets/founder.jpg', import.meta.url).href;
  } catch {
    founderImage = undefined;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* TOP / HERO */}
      <section className="relative overflow-hidden border-b border-border/40">
        {/* Ambient decor */}
        <KolamMandala
          aria-hidden="true"
          className="absolute -top-20 -right-24 w-72 h-72 sm:w-96 sm:h-96 text-orange-500/25 heritage-spin-slow pointer-events-none"
        />
        <KolamMandala
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-72 h-72 text-primary/15 heritage-spin-reverse pointer-events-none hidden sm:block"
        />
        <TempleSilhouette
          aria-hidden="true"
          className="absolute right-6 sm:right-16 bottom-0 w-24 sm:w-32 text-amber-600/20 heritage-float pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent blur-3xl heritage-glow pointer-events-none"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to About Us
          </Button>

          <div className="grid lg:grid-cols-[auto_1fr] gap-8 sm:gap-12 items-center">
            {/* Founder image */}
            <div className="flex flex-col items-center lg:items-start">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 bg-gradient-to-tr from-orange-500/30 via-amber-500/20 to-primary/20 rounded-full blur-2xl heritage-glow pointer-events-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute -top-3 -left-3 w-12 h-16 heritage-float drop-shadow-[0_0_18px_rgba(255,140,40,0.5)] pointer-events-none"
                >
                  <DiyaFlame className="w-full h-full" />
                </div>
                <div className="relative h-44 w-44 sm:h-56 sm:w-56 rounded-full overflow-hidden ring-2 ring-border/60 shadow-2xl bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-primary/20">
                  {founderImage ? (
                    <img
                      src={founderImage}
                      alt="Dhayanand A P, Founder of Test Zone"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        DAP
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-5 text-lg sm:text-xl font-semibold tracking-tight text-center lg:text-left">
                Dhayanand A P
              </p>
              <p className="text-sm text-muted-foreground text-center lg:text-left">
                Founder, Test Zone
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 text-orange-500" />
                <span>Tamil Nadu, India</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15 border-primary/20">
                <User className="h-3 w-3 mr-1.5" />
                Founder Story
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
                The story behind{' '}
                <span className="heritage-shimmer-text">Test Zone</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                A personal journey — from a small village with limited connectivity
                to building an AI-powered testing platform from Tamil Nadu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OPENING QUOTE */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        <Card className="relative p-6 sm:p-8 bg-gradient-to-br from-card to-card/40 border-border/60">
          <Quote className="h-7 w-7 text-primary/40 mb-3" />
          <p className="text-lg sm:text-xl leading-relaxed text-foreground/90 italic">
            “I come from a small village where even basic internet connectivity
            was a challenge. Technology wasn't easily accessible — but
            curiosity always was.”
          </p>
        </Card>
      </section>

      {/* TIMELINE */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-orange-500/40 via-primary/30 to-transparent"
          />
          <ol className="space-y-8 sm:space-y-10">
            {steps.map((step, idx) => (
              <li key={step.title} className="relative pl-14">
                <div className="absolute left-0 top-0 h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-orange-500/15 border border-border/60 flex items-center justify-center shadow-sm">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono text-muted-foreground tracking-wider">
                    0{idx + 1}
                  </span>
                  <h2 className="font-semibold text-lg sm:text-xl leading-snug">
                    {step.title}
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CLOSING */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-primary/10 to-transparent rounded-2xl blur-2xl pointer-events-none"
          />
          <div className="relative rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 sm:p-8 flex items-start gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-primary/20 flex items-center justify-center shrink-0">
              <Compass className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
                “From a small village to building an AI platform —{' '}
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  the journey continues.
                </span>
                ”
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-3">
                Built with curiosity. Driven by purpose. Grounded in roots.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                — Dhayanand A P, Founder of Test Zone
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FounderPage;

import React from 'react';
import { Sparkles, Zap, Shield, CheckCircle } from 'lucide-react';
import testzoneLogo from '@/assets/testzone-logo.png';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title = "Test Zone",
  subtitle = "Welcome back! Let's build great things together."
}) => {
  const features = [
    { icon: CheckCircle, text: 'Enterprise-grade security' },
    { icon: Sparkles, text: 'AI-powered ticket creation' },
    { icon: Zap, text: 'Smart duplicate detection' },
    { icon: Shield, text: 'Auto-classification & assignment' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-accent relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-foreground rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-primary-foreground">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="h-16 w-16 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/30 overflow-hidden">
              <img src={testzoneLogo} alt="Test Zone" className="h-12 w-12 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-primary-foreground/80 text-sm">IT Cloud Team Portal</p>
            </div>
          </div>

          {/* Main Headline */}
          <div className="space-y-6 mb-12">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              {subtitle}
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Streamline your workflow with AI-powered ticket creation. 
              Just describe your issue and let us handle the rest.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 p-4 rounded-xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 animate-slide-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-primary-foreground font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-primary-foreground/20">
            <p className="text-sm text-primary-foreground/60">
              © 2024 Test Zone. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Mobile Logo */}
        <div className="flex justify-center mb-8 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-soft-lg overflow-hidden">
              <img src={testzoneLogo} alt="Test Zone" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">IT Cloud Team</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot, Shield, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';

const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !employeeId) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      await login(email, employeeId);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error('Invalid credentials. Please try again.');
    }
  };

  const features = [
    { icon: Bot, text: 'AI-powered ticket creation' },
    { icon: Sparkles, text: 'Smart duplicate detection' },
    { icon: Zap, text: 'Auto-classification & assignment' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col space-y-8 p-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-soft-lg">
              <Bot className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">TicketBot</h1>
              <p className="text-sm text-muted-foreground">AI Jira Assistant</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-foreground leading-tight">
              Create Jira tickets
              <br />
              <span className="text-primary">with AI assistance</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Skip the manual forms. Just describe your issue naturally and let AI handle the rest.
            </p>
          </div>
          
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border shadow-soft animate-slide-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-foreground font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-soft-lg border-border/50">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="h-14 w-14 rounded-xl bg-primary flex items-center justify-center shadow-soft-lg">
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in with your company credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="EMP001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
              
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Demo credentials
                  </span>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Email: <code className="bg-muted px-1 py-0.5 rounded text-xs">john.doe@company.com</code></p>
                <p>Employee ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">EMP001</code></p>
              </div>
            </form>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span>Secured by enterprise SSO</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;

import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from './AuthLayout';
import PasswordInput from './PasswordInput';
import SocialLoginButtons from './SocialLoginButtons';
import OtpVerificationScreen from './OtpVerificationScreen';

const fireWelcomeConfetti = () => {
  const duration = 1500;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'],
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };

  // Initial big burst from center
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'],
    startVelocity: 35,
  });

  frame();
};

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const pendingPasswordRef = useRef('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const handleSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    
    try {
      // Check if 2FA is enabled BEFORE signing in
      const { data: totpData } = await supabase.functions.invoke('totp-check', {
        body: { email: data.email },
      });

      if (totpData?.enabled) {
        // 2FA is enabled — do NOT sign in yet, show OTP screen first
        pendingPasswordRef.current = data.password;
        setPendingEmail(data.email);
        setShow2FA(true);
        return;
      }

      // No 2FA — sign in directly
      const { error } = await signIn(data.email, data.password, data.rememberMe ?? true);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before logging in');
        } else if (error.message.includes('User not found')) {
          toast.error('Account not found. Please sign up first.');
        } else {
          toast.error(error.message || 'Login failed. Please try again.');
        }
      } else {
        toast.success('🎉 Welcome back!');
        fireWelcomeConfetti();
        navigate('/');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FAVerified = async () => {
    // OTP verified — now sign in with stored credentials
    const remember = form.getValues('rememberMe') ?? true;
    const { error } = await signIn(pendingEmail, pendingPasswordRef.current, remember);
    pendingPasswordRef.current = '';
    if (!error) {
      toast.success('🎉 Welcome back!');
      fireWelcomeConfetti();
      navigate('/');
    } else {
      toast.error('Login failed after verification. Please try again.');
      setShow2FA(false);
    }
  };

  const handleBack2FA = () => {
    setShow2FA(false);
    setPendingEmail('');
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        const msg = result.error.message || '';
        if (msg.includes('Popup was blocked')) {
          toast.error('Pop-up blocked! Please allow pop-ups for this site and try again.', {
            description: 'Go to your browser settings → Pop-ups → Allow for this site.',
            duration: 8000,
          });
        } else if (msg.includes('cancelled')) {
          toast.info('Google sign-in was cancelled.');
        } else if (msg.includes('not supported in Preview')) {
          toast.error('Google sign-in is not available in Preview mode. Please open the app in a new tab.', { duration: 6000 });
        } else {
          toast.error('Google login failed. Please try again.');
        }
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('Popup was blocked')) {
        toast.error('Pop-up blocked! Please allow pop-ups for this site and try again.', {
          description: 'Go to your browser settings → Pop-ups → Allow for this site.',
          duration: 8000,
        });
      } else if (msg.includes('cancelled')) {
        toast.info('Google sign-in was cancelled.');
      } else {
        toast.error('Google login failed. Please try again.');
      }
    }
  };

  const handleMicrosoftLogin = () => {
    toast.info('Microsoft login coming soon!');
  };

  const isFormLoading = isLoading || isSubmitting;

  if (show2FA) {
    return (
      <AuthLayout title="Test Zone" subtitle="Two-factor verification required.">
        <OtpVerificationScreen
          email={pendingEmail}
          onVerified={handle2FAVerified}
          onBack={handleBack2FA}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Test Zone" 
      subtitle="Welcome back! Let's build great things together."
    >
      <Card className="border-0 shadow-none sm:border sm:border-border/50 sm:shadow-soft-lg">
        <CardHeader className="space-y-1 text-center px-0 sm:px-6 pb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold">Sign in</CardTitle>
          <CardDescription className="text-sm">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-0 sm:px-6">
          {/* Social Login */}
          <SocialLoginButtons
            onGoogleClick={handleGoogleLogin}
            onMicrosoftClick={handleMicrosoftLogin}
            isLoading={isFormLoading}
            mode="login"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email ID or Chatbot ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@company.com"
                        type="email"
                        disabled={isFormLoading}
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/auth/forgot-password"
                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput
                        placeholder="Enter your password"
                        disabled={isFormLoading}
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={isFormLoading}
              >
                {isFormLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-6 px-0 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              to="/auth/signup"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};

export default LoginForm;

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from './AuthLayout';
import OtpVerificationScreen from './OtpVerificationScreen';
import { cn } from '@/lib/utils';

const fireWelcomeConfetti = () => {
  const duration = 1500;
  const end = Date.now() + duration;
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ['#22c55e', '#3b82f6', '#06b6d4', '#a855f7'] });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ['#22c55e', '#3b82f6', '#06b6d4', '#a855f7'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.5 }, colors: ['#22c55e', '#3b82f6', '#06b6d4', '#a855f7'], startVelocity: 35 });
  frame();
};

// ---------- Floating Glass Input ----------
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
  error?: string;
  rightSlot?: React.ReactNode;
}
const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, icon, error, rightSlot, className, id, value, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
    const active = focused || !!value;
    return (
      <div className="space-y-1.5">
        <div
          className={cn(
            'group relative flex items-center rounded-[18px] h-14 px-4 gap-3',
            'bg-white/70 backdrop-blur-xl border transition-all duration-300',
            focused
              ? 'border-blue-400/70 shadow-[0_0_0_4px_rgba(59,130,246,0.15),0_10px_30px_-10px_rgba(37,99,235,0.35)]'
              : 'border-slate-200/80 hover:border-slate-300',
            error && !focused && 'border-red-300 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
          )}
        >
          <span className={cn('flex items-center justify-center h-5 w-5 transition-colors', focused ? 'text-blue-600' : 'text-slate-400')}>
            {icon}
          </span>
          <div className="relative flex-1 h-full">
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-0 pointer-events-none transition-all duration-200 origin-left',
                active
                  ? 'top-1.5 text-[11px] font-semibold text-blue-600'
                  : 'top-1/2 -translate-y-1/2 text-sm text-slate-400',
              )}
            >
              {label}
            </label>
            <input
              id={inputId}
              ref={ref}
              value={value}
              onFocus={(e) => { setFocused(true); onFocus?.(e); }}
              onBlur={(e) => { setFocused(false); onBlur?.(e); }}
              className={cn(
                'w-full h-full bg-transparent outline-none text-[15px] text-slate-900 placeholder-transparent pt-4',
                className,
              )}
              {...props}
            />
          </div>
          {rightSlot}
        </div>
        {error && (
          <p className="flex items-center gap-1 text-xs text-red-600 pl-1 animate-fade-in">
            <ShieldAlert className="h-3 w-3" /> {error}
          </p>
        )}
      </div>
    );
  },
);
FloatingInput.displayName = 'FloatingInput';

// ---------- Social provider button ----------
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);
const MicrosoftIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
);
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-slate-900"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.57.1.78-.25.78-.55v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.76.4-1.28.74-1.57-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.15v3.19c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z"/></svg>
);
const GitlabIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#E24329" d="M12 21.4 8.6 10.9H15.4z"/><path fill="#FC6D26" d="M12 21.4 15.4 10.9h4.77z"/><path fill="#FCA326" d="m20.17 10.9 1.03 3.17a.7.7 0 0 1-.25.78L12 21.4z"/><path fill="#E24329" d="m20.17 10.9-2.17-6.67a.36.36 0 0 0-.68 0L15.4 10.9z"/><path fill="#FC6D26" d="M12 21.4 8.6 10.9H3.83z"/><path fill="#FCA326" d="m3.83 10.9-1.03 3.17a.7.7 0 0 0 .25.78L12 21.4z"/><path fill="#E24329" d="m3.83 10.9 2.17-6.67a.36.36 0 0 1 .68 0L8.6 10.9z"/></svg>
);

const SocialButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; soon?: boolean; }>= ({ icon, label, onClick, disabled, soon }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={`Continue with ${label}`}
    className={cn(
      'group relative h-12 rounded-2xl border border-white/60 bg-white/60 backdrop-blur-xl',
      'shadow-[0_4px_20px_-8px_rgba(37,99,235,0.25)] transition-all duration-300',
      'hover:-translate-y-0.5 hover:bg-white/80 hover:border-blue-200 hover:shadow-[0_10px_30px_-10px_rgba(37,99,235,0.4)]',
      'disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-2',
    )}
  >
    {icon}
    <span className="text-sm font-medium text-slate-700 hidden sm:inline">{label}</span>
    {soon && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-900 text-white">SOON</span>}
  </button>
);

// ---------- Main Component ----------
const LOADING_STEPS = [
  'Authenticating…',
  'Loading Workspace…',
  'Connecting AI Engine…',
  'Preparing Intelligence Hub…',
  'Welcome back!',
];

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const pendingPasswordRef = useRef('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const passwordValue = form.watch('password');
  const passwordStrength = React.useMemo(() => {
    let s = 0;
    if (passwordValue?.length >= 8) s++;
    if (/[A-Z]/.test(passwordValue || '')) s++;
    if (/[0-9]/.test(passwordValue || '')) s++;
    if (/[^A-Za-z0-9]/.test(passwordValue || '')) s++;
    return s; // 0..4
  }, [passwordValue]);

  useEffect(() => {
    if (!isSubmitting) { setLoadingStep(0); return; }
    const t = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 700);
    return () => clearInterval(t);
  }, [isSubmitting]);

  const handleSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const { data: totpData } = await supabase.functions.invoke('totp-check', { body: { email: data.email } });
      if (totpData?.enabled) {
        pendingPasswordRef.current = data.password;
        setPendingEmail(data.email);
        setShow2FA(true);
        return;
      }
      const { error } = await signIn(data.email, data.password, data.rememberMe ?? true);
      if (error) {
        if (error.message.includes('Invalid login credentials')) toast.error('Invalid email or password');
        else if (error.message.includes('Email not confirmed')) toast.error('Please verify your email before logging in');
        else if (error.message.includes('User not found')) toast.error('Account not found. Please sign up first.');
        else toast.error(error.message || 'Login failed. Please try again.');
      } else {
        toast.success('🎉 Welcome back!');
        fireWelcomeConfetti();
        navigate('/');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FAVerified = async () => {
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

  const handleGoogleLogin = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (result?.error) toast.error(result.error.message || 'Google login failed. Please try again.');
    } catch (error: any) {
      toast.error(error?.message || 'Google login failed. Please try again.');
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  if (show2FA) {
    return (
      <AuthLayout title="Test Zone" subtitle="Two-factor verification required.">
        <OtpVerificationScreen email={pendingEmail} onVerified={handle2FAVerified} onBack={() => setShow2FA(false)} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Test Zone">
      <style>{`
        @keyframes tz-ripple { 0% { transform: scale(0); opacity: .5; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes tz-card-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .tz-login-card { animation: tz-card-float 8s ease-in-out infinite; }
        .tz-login-card:hover { transform: translateY(-4px); }
      `}</style>

      <div
        className="tz-login-card relative rounded-[32px] p-7 sm:p-8 transition-all duration-500 hover:shadow-[0_40px_100px_-20px_rgba(37,99,235,0.35)]"
        style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(45px) saturate(180%)',
          WebkitBackdropFilter: 'blur(45px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 30px 80px rgba(15, 42, 107, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-700 mb-3">
            <Sparkles className="h-3 w-3" /> ENTERPRISE AI SIGN-IN
          </div>
          <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">Sign in to TestZone</h2>
          <p className="text-sm text-slate-500 mt-1">Enter your credentials to access your workspace</p>
        </div>

        {/* Social row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <SocialButton icon={<GoogleIcon />} label="Google" onClick={handleGoogleLogin} disabled={isFormLoading} />
          <SocialButton icon={<MicrosoftIcon />} label="Microsoft" onClick={() => toast.info('Microsoft login coming soon!')} soon />
          <SocialButton icon={<GithubIcon />} label="GitHub" onClick={() => toast.info('GitHub login coming soon!')} soon />
          <SocialButton icon={<GitlabIcon />} label="GitLab" onClick={() => toast.info('GitLab login coming soon!')} soon />
        </div>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" /></div>
          <div className="relative flex justify-center"><span className="bg-white/80 backdrop-blur px-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">or continue with email</span></div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FloatingInput
                    label="Email ID or Chatbot ID"
                    icon={<Mail className="h-5 w-5" />}
                    type="email"
                    autoComplete="email"
                    disabled={isFormLoading}
                    error={fieldState.error?.message}
                    {...field}
                  />
                  <FormMessage className="sr-only" />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FloatingInput
                    label="Password"
                    icon={<Lock className="h-5 w-5" />}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isFormLoading}
                    error={fieldState.error?.message}
                    onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                    onKeyDown={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                    rightSlot={
                      <div className="flex items-center gap-2">
                        {capsOn && (
                          <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded-md">
                            <ShieldAlert className="h-3 w-3" /> CAPS
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    }
                    {...field}
                  />
                  {passwordValue && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            i < passwordStrength
                              ? passwordStrength <= 1
                                ? 'bg-red-400'
                                : passwordStrength === 2
                                ? 'bg-amber-400'
                                : passwordStrength === 3
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                              : 'bg-slate-200',
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <FormMessage className="sr-only" />
                </FormItem>
              )}
            />

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <span
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300',
                        field.value ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_12px_rgba(37,99,235,0.5)]' : 'bg-slate-200',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={isFormLoading}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 flex items-center justify-center',
                          field.value ? 'translate-x-[18px]' : 'translate-x-0.5',
                        )}
                      >
                        {field.value && <Check className="h-3 w-3 text-blue-600" />}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Remember me for 24 hours</span>
                  </label>
                )}
              />
              <Link to="/auth/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isFormLoading}
              className={cn(
                'relative w-full h-14 rounded-[18px] overflow-hidden group border-0 text-white font-semibold text-[15px]',
                'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]',
                'shadow-[0_10px_30px_-10px_rgba(37,99,235,0.7)] transition-all duration-300',
                'hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-10px_rgba(37,99,235,0.85)]',
                'active:translate-y-0 disabled:opacity-90 disabled:hover:translate-y-0',
              )}
            >
              {/* shine */}
              <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                {isFormLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{LOADING_STEPS[loadingStep]}</span>
                  </>
                ) : (
                  <>
                    <span>Sign in securely</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </Button>
          </form>
        </Form>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/auth/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Create your workspace
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginForm;

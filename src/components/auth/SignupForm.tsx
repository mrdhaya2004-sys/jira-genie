import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { signupSchema, SignupFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from './AuthLayout';
import PasswordInput from './PasswordInput';
import SocialLoginButtons from './SocialLoginButtons';
import AvatarUpload from './AvatarUpload';

const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      dateOfBirth: '',
      mobileNumber: '',
      email: '',
      employeeId: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        employeeId: data.employeeId,
        mobileNumber: data.mobileNumber || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          toast.error('This email is already registered. Please sign in.');
        } else if (error.message.includes('employee_id')) {
          toast.error('This Employee ID is already in use.');
        } else {
          toast.error(error.message || 'Sign up failed. Please try again.');
        }
      } else {
        toast.success('Account created successfully! Welcome to Test Zone.');
        navigate('/');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Google signup failed. Please try again.');
    }
  };

  const handleMicrosoftSignup = () => {
    toast.info('Microsoft signup coming soon!');
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <AuthLayout 
      title="Test Zone" 
      subtitle="Join us and streamline your workflow today."
    >
      <Card className="shadow-soft-lg border-border/50">
        <CardHeader className="space-y-1 text-center pb-4">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Fill in your details to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Social Signup */}
          <SocialLoginButtons
            onGoogleClick={handleGoogleSignup}
            onMicrosoftClick={handleMicrosoftSignup}
            isLoading={isFormLoading}
            mode="signup"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or fill in your details
              </span>
            </div>
          </div>

          {/* Avatar Upload */}
          <AvatarUpload
            value={avatarUrl || undefined}
            onChange={(url) => setAvatarUrl(url)}
            disabled={isFormLoading}
          />

          {/* Signup Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        disabled={isFormLoading}
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Date of Birth */}
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isFormLoading}
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mobile Number */}
                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 234 567 890"
                          type="tel"
                          disabled={isFormLoading}
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Working Email ID *</FormLabel>
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

              {/* Employee ID */}
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee / Chatbot ID *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="EMP001 or CB-123"
                        disabled={isFormLoading}
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Create a strong password"
                        disabled={isFormLoading}
                        className="h-11"
                        showStrength={true}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Confirm your password"
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
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};

export default SignupForm;

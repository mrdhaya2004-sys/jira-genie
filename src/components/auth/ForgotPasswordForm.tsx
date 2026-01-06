import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from './AuthLayout';

const ForgotPasswordForm: React.FC = () => {
  const { resetPassword, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await resetPassword(data.email);
      
      if (error) {
        toast.error(error.message || 'Failed to send reset email. Please try again.');
      } else {
        setSubmittedEmail(data.email);
        setIsEmailSent(true);
        toast.success('Password reset email sent!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  if (isEmailSent) {
    return (
      <AuthLayout 
        title="Testzone" 
        subtitle="Check your email to reset your password."
      >
        <Card className="shadow-soft-lg border-border/50">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a password reset link to
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium text-foreground">{submittedEmail}</p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Click the link in the email to reset your password.</p>
              <p>If you don't see it, check your spam folder.</p>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-11"
              onClick={() => {
                setIsEmailSent(false);
                form.reset();
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Try a different email
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-6">
            <Link
              to="/auth/login"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Testzone" 
      subtitle="Forgot your password? No worries!"
    >
      <Card className="shadow-soft-lg border-border/50">
        <CardHeader className="space-y-1 text-center pb-4">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your registered email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered Email Address</FormLabel>
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

              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={isFormLoading}
              >
                {isFormLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-6">
          <Link
            to="/auth/login"
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};

export default ForgotPasswordForm;

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { resetPasswordSchema, ResetPasswordFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import AuthLayout from './AuthLayout';
import PasswordInput from './PasswordInput';

const ResetPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, isLoading, session } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Check if user came from a valid reset link
  useEffect(() => {
    if (!session) {
      // If no session, redirect to forgot password
      toast.error('Invalid or expired reset link. Please request a new one.');
      navigate('/auth/forgot-password');
    }
  }, [session, navigate]);

  const handleSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await updatePassword(data.password);
      
      if (error) {
        toast.error(error.message || 'Failed to reset password. Please try again.');
      } else {
        setIsPasswordReset(true);
        toast.success('Password reset successfully!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  if (isPasswordReset) {
    return (
      <AuthLayout 
        title="Test Zone" 
        subtitle="Your password has been reset successfully!"
      >
        <Card className="shadow-soft-lg border-border/50">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password has been successfully updated.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <p className="text-sm text-muted-foreground">
              You can now use your new password to sign in to your account.
            </p>

            <Button 
              className="w-full h-11"
              onClick={() => navigate('/auth/login')}
            >
              Continue to Sign In
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Test Zone" 
      subtitle="Create a new secure password."
    >
      <Card className="shadow-soft-lg border-border/50">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create New Password</CardTitle>
          <CardDescription>
            Enter a new strong password for your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Enter your new password"
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Confirm your new password"
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
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
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

export default ResetPasswordForm;

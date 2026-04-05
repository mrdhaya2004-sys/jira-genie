import React, { useState } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OtpVerificationScreenProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({ email, onVerified, onBack }) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('totp-login-verify', {
        body: { email, otp },
      });

      if (fnError || !data?.valid) {
        setError('Invalid OTP. Please try again.');
        setOtp('');
        toast.error('Invalid OTP. Please try again.');
        return;
      }

      onVerified();
    } catch {
      setError('An unexpected error occurred');
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-soft-lg border-border/50">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="flex justify-center mb-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Two-Factor Verification</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={(val) => { setOtp(val); setError(''); }} autoFocus>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          className="w-full h-11"
          onClick={handleVerify}
          disabled={otp.length !== 6 || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full gap-2 text-muted-foreground"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Button>
      </CardContent>
    </Card>
  );
};

export default OtpVerificationScreen;

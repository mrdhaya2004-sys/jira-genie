import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import PasswordInput from '@/components/auth/PasswordInput';
import { Loader2, Shield, CheckCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => void;
}

type SetupStep = 'password' | 'qr' | 'success';

const TwoFactorSetupDialog: React.FC<TwoFactorSetupDialogProps> = ({ open, onOpenChange, onEnabled }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<SetupStep>('password');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [otp, setOtp] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setStep('password');
    setPassword('');
    setQrCodeUrl('');
    setManualKey('');
    setOtp('');
    setError('');
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('totp-setup', {
        body: { password },
      });

      if (fnError || data?.error) {
        setError(data?.error || 'Failed to setup 2FA');
        return;
      }

      setQrCodeUrl(data.qrCodeUrl);
      setManualKey(data.secret);
      setStep('qr');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('totp-verify', {
        body: { otp, action: 'enable' },
      });

      if (fnError || data?.error) {
        setError(data?.error || 'Invalid OTP. Please try again.');
        setOtp('');
        return;
      }

      setStep('success');
      onEnabled();
      toast.success('Two-factor authentication enabled successfully!');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(manualKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {step === 'success' ? '2FA Enabled' : 'Enable Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {step === 'password' && 'Confirm your password to continue.'}
            {step === 'qr' && 'Scan the QR code with Google Authenticator.'}
            {step === 'success' && 'Your account is now protected with 2FA.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'password' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Account Password</Label>
              <PasswordInput
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handlePasswordSubmit} disabled={!password || isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Verifying...</> : 'Continue'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'qr' && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-lg">
                <img src={qrCodeUrl} alt="QR Code for 2FA" className="w-48 h-48" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Scan this QR code with Google Authenticator
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Manual Setup Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-xs font-mono break-all select-all">
                  {manualKey}
                </code>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={copyKey}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Enter 6-digit verification code</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
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
              {error && <p className="text-xs text-destructive text-center">{error}</p>}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleVerifyOtp} disabled={otp.length !== 6 || isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Verifying...</> : 'Verify & Enable'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Two-factor authentication has been enabled. You'll need to enter a code from your authenticator app each time you sign in.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorSetupDialog;

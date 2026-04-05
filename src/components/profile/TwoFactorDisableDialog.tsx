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
import { Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

interface TwoFactorDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisabled: () => void;
}

const TwoFactorDisableDialog: React.FC<TwoFactorDisableDialogProps> = ({ open, onOpenChange, onDisabled }) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setOtp('');
    setError('');
    onOpenChange(false);
  };

  const handleDisable = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('totp-verify', {
        body: { otp, action: 'disable' },
      });

      if (fnError || data?.error) {
        setError(data?.error || 'Invalid OTP. Please try again.');
        setOtp('');
        return;
      }

      onDisabled();
      toast.success('Two-factor authentication has been disabled.');
      handleClose();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter a code from your authenticator app to disable 2FA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
            <Button variant="destructive" onClick={handleDisable} disabled={otp.length !== 6 || isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Disabling...</> : 'Disable 2FA'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorDisableDialog;

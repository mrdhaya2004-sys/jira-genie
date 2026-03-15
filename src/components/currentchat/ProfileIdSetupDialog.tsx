import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, AtSign } from 'lucide-react';
import { useProfileId } from '@/hooks/useProfileId';
import { cn } from '@/lib/utils';

interface ProfileIdSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const ProfileIdSetupDialog: React.FC<ProfileIdSetupDialogProps> = ({
  open,
  onOpenChange,
  onComplete,
}) => {
  const { checkAvailability, saveProfileId, isChecking, isSaving } = useProfileId();
  const [input, setInput] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const formatProfileId = (value: string): string => {
    // Remove @ prefix for processing, add it back
    let clean = value.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length > 20) clean = clean.slice(0, 20);
    return clean;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = formatProfileId(e.target.value);
    setInput(cleaned);
    setIsAvailable(null);
    setValidationError(null);
  };

  useEffect(() => {
    if (input.length < 3) {
      setIsAvailable(null);
      if (input.length > 0) {
        setValidationError('Must be at least 3 characters');
      }
      return;
    }

    setValidationError(null);
    const timer = setTimeout(async () => {
      const profileId = `@${input}`;
      const available = await checkAvailability(profileId);
      setIsAvailable(available);
    }, 500);

    return () => clearTimeout(timer);
  }, [input, checkAvailability]);

  const handleSubmit = async () => {
    if (!isAvailable || input.length < 3) return;
    
    const success = await saveProfileId(`@${input}`);
    if (success) {
      onComplete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5 text-primary" />
            Create Your Profile ID
          </DialogTitle>
          <DialogDescription>
            Choose a unique profile ID so other team members can find and chat with you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="profileId">Profile ID</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">@</span>
              <Input
                id="profileId"
                placeholder="your_profile_id"
                value={input}
                onChange={handleInputChange}
                className="pl-8 pr-10"
                maxLength={20}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!isChecking && isAvailable === true && (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
                {!isChecking && isAvailable === false && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-destructive">{validationError}</p>
            )}
            {isAvailable === false && !isChecking && (
              <p className="text-xs text-destructive">This profile ID already exists. Please choose another.</p>
            )}
            {isAvailable === true && !isChecking && (
              <p className="text-xs text-success">Profile ID is available!</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Rules:</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">Starts with @</Badge>
              <Badge variant="secondary" className="text-xs">Lowercase only</Badge>
              <Badge variant="secondary" className="text-xs">3–20 characters</Badge>
              <Badge variant="secondary" className="text-xs">Letters, numbers, underscores</Badge>
            </div>
          </div>

          {input && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Your profile ID will be:</p>
              <p className={cn(
                "text-lg font-semibold",
                isAvailable ? "text-primary" : "text-foreground"
              )}>
                @{input}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Later
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isAvailable || isSaving || input.length < 3}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Profile ID'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileIdSetupDialog;

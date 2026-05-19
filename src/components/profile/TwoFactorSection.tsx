import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Loader2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TwoFactorSetupDialog from './TwoFactorSetupDialog';
import TwoFactorDisableDialog from './TwoFactorDisableDialog';

const CACHE_KEY = 'tz_2fa_enabled';

const readCache = (userId?: string): boolean | null => {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}:${userId}`);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch { /* ignore */ }
  return null;
};

const writeCache = (userId: string, enabled: boolean) => {
  try { sessionStorage.setItem(`${CACHE_KEY}:${userId}`, enabled ? '1' : '0'); } catch { /* ignore */ }
};

const TwoFactorSection: React.FC = () => {
  const { user } = useAuth();
  const cached = readCache(user?.id);
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean>(cached ?? false);
  // Only show loading spinner if we have no cached value (first visit)
  const [isLoading, setIsLoading] = useState(cached === null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase
          .from('user_totp')
          .select('is_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;
        const enabled = data?.is_enabled === true;
        setIs2FAEnabled(enabled);
        writeCache(user.id, enabled);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const handleEnabled = () => {
    setIs2FAEnabled(true);
    if (user) writeCache(user.id, true);
  };
  const handleDisabled = () => {
    setIs2FAEnabled(false);
    if (user) writeCache(user.id, false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">2FA Info</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px] text-xs">
                  Two-Factor Authentication can only be enabled using Google Authenticator.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : is2FAEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <ShieldOff className="h-5 w-5 text-destructive" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Authenticator App</p>
                  {!isLoading && (
                    <Badge
                      variant={is2FAEnabled ? 'default' : 'destructive'}
                      className={is2FAEnabled
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100'
                        : ''
                      }
                    >
                      {is2FAEnabled ? '● LIVE' : 'Disabled'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {is2FAEnabled
                    ? 'Your account is protected with an authenticator app'
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
            </div>
            {!isLoading && (
              <Button
                variant={is2FAEnabled ? 'outline' : 'default'}
                size="sm"
                onClick={() => is2FAEnabled ? setShowDisable(true) : setShowSetup(true)}
              >
                {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TwoFactorSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        onEnabled={() => { setIs2FAEnabled(true); }}
      />
      <TwoFactorDisableDialog
        open={showDisable}
        onOpenChange={setShowDisable}
        onDisabled={() => { setIs2FAEnabled(false); }}
      />
    </>
  );
};

export default TwoFactorSection;

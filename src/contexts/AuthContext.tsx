import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sessionHistoryService } from '@/lib/sessionHistory';
import {
  markLogin,
  markActive,
  getLastActive,
  getLoginAt,
  clearSessionMeta,
  broadcastLogout,
  shouldPurgeSessionOnBoot,
  LOGOUT_STORAGE_KEY,
  getDeviceId,
} from '@/lib/sessionMeta';

// Inactivity timeout (30 min) and absolute session lifetime (24 h) when
// Remember Me is enabled. Both apply on top of Supabase's own token refresh.
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const ABSOLUTE_SESSION_MS = 24 * 60 * 60 * 1000;

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  employee_id: string;
  mobile_number?: string;
  date_of_birth?: string;
  avatar_url?: string;
  profile_id?: string | null;
  created_at: string;
  updated_at: string;
}


interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  expiredReason: 'inactivity' | 'expired' | null;
  deviceId: string;
  loginAt: number;
  lastActive: number;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signOut: (opts?: { silent?: boolean }) => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  dismissSessionExpired: () => void;
  expireSessionNow: (reason?: 'inactivity' | 'expired') => Promise<void>;
  touchActivity: () => void;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  employeeId: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); // v3

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [expiredReason, setExpiredReason] = useState<'inactivity' | 'expired' | null>(null);
  const [loginAt, setLoginAt] = useState<number>(() => getLoginAt());
  const [lastActive, setLastActive] = useState<number>(() => getLastActive());
  const deviceIdRef = useRef<string>(getDeviceId());

  const fetchProfile = useCallback(async (userId: string) => {
    // Email is no longer readable from profiles by RLS/column grants; pull it from the auth session instead.
    const { data: authData } = await supabase.auth.getUser();
    const authEmail = authData?.user?.email ?? '';

    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, avatar_url, profile_id, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      return;
    }

    // Merge in private PII fields (owner-only)
    const { data: priv } = await (supabase as any)
      .from('profiles_private')
      .select('mobile_number, date_of_birth, employee_id')
      .eq('user_id', userId)
      .maybeSingle();

    setProfile({
      ...(data as any),
      email: authEmail,
      employee_id: priv?.employee_id ?? '',
      mobile_number: priv?.mobile_number ?? undefined,
      date_of_birth: priv?.date_of_birth ?? undefined,
    } as UserProfile);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        // Handle token refresh or session updates
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (event === 'SIGNED_IN') {
            sessionHistoryService.startSession();
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          sessionHistoryService.clearSession();
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
        
        // Defer profile fetch with setTimeout to prevent deadlock
        if (currentSession?.user) {
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session and refresh if needed
    const initializeAuth = async () => {
      try {
        // If the previous session was "Remember Me off" and the browser was
        // closed/reopened, purge it before we hand a stale session to the app.
        if (shouldPurgeSessionOnBoot()) {
          await supabase.auth.signOut();
          clearSessionMeta();
          setIsLoading(false);
          return;
        }

        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any stale session data
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        // If no session exists, we're done
        if (!existingSession) {
          setIsLoading(false);
          return;
        }

        // Enforce inactivity + absolute-lifetime limits on top of Supabase's own token refresh
        const now = Date.now();
        const last = getLastActive();
        const loggedInAt = getLoginAt();
        if (last && now - last > INACTIVITY_TIMEOUT_MS) {
          await supabase.auth.signOut();
          clearSessionMeta();
          setExpiredReason('inactivity');
          setSessionExpired(true);
          setIsLoading(false);
          return;
        }
        if (loggedInAt && now - loggedInAt > ABSOLUTE_SESSION_MS) {
          await supabase.auth.signOut();
          clearSessionMeta();
          setExpiredReason('expired');
          setSessionExpired(true);
          setIsLoading(false);
          return;
        }

        // Check if token is expired or expiring soon
        const expiresAt = existingSession.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        // If token is already expired, force sign out and re-authenticate
        if (expiresAt && expiresAt < now) {
          console.log('Session expired, signing out...');
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
        
        // If token expires within 5 minutes, try to refresh it proactively
        if (expiresAt && expiresAt - now < 300) {
          console.log('Session expiring soon, refreshing...');
          const { data: { session: refreshedSession }, error: refreshError } = 
            await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Error refreshing session:', refreshError);
            // Session is invalid, sign out
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }
          
          if (refreshedSession) {
            setSession(refreshedSession);
            setUser(refreshedSession.user ?? null);
            
            if (refreshedSession.user) {
              fetchProfile(refreshedSession.user.id);
            }
          }
        } else {
          setSession(existingSession);
          setUser(existingSession.user ?? null);
          
          if (existingSession.user) {
            fetchProfile(existingSession.user.id);
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Auth initialization error:', err);
        // On any error, clear session to prevent stuck state
        await supabase.auth.signOut();
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up periodic token refresh check (every 4 minutes)
    const refreshInterval = setInterval(async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        const expiresAt = currentSession.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        if (expiresAt && expiresAt - now < 300) {
          console.log('Periodic refresh: Session expiring soon, refreshing...');
          await supabase.auth.refreshSession();
        }
      }
    }, 4 * 60 * 1000); // Every 4 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (!error) {
      markLogin(rememberMe);
      setLoginAt(Date.now());
      setLastActive(Date.now());
      setSessionExpired(false);
      setExpiredReason(null);
    }
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (data: SignUpData) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.toLowerCase().trim(),
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: data.fullName,
          employee_id: data.employeeId,
        },
      },
    });

    if (authError) {
      return { error: authError as Error };
    }

    // Create profile if user was created
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: data.fullName,
        email: data.email.toLowerCase().trim(),
        avatar_url: data.avatarUrl || null,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { error: profileError as Error };
      }

      // Store private PII separately (owner-only RLS)
      const { error: privError } = await (supabase as any)
        .from('profiles_private')
        .insert({
          user_id: authData.user.id,
          employee_id: data.employeeId,
          mobile_number: data.mobileNumber || null,
          date_of_birth: data.dateOfBirth || null,
        });

      if (privError) {
        console.error('Private profile creation error:', privError);
      }
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async (opts?: { silent?: boolean }) => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    clearSessionMeta();
    if (!opts?.silent) {
      broadcastLogout();
    }
  }, []);

  const expireSessionNow = useCallback(async (reason: 'inactivity' | 'expired' = 'expired') => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    clearSessionMeta();
    setExpiredReason(reason);
    setSessionExpired(true);
    broadcastLogout();
  }, []);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false);
    setExpiredReason(null);
  }, []);

  const touchActivity = useCallback(() => {
    markActive();
    setLastActive(Date.now());
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );
    return { error: error as Error | null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error as Error | null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error: error as Error | null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAuthenticated: !!user,
        isLoading,
        sessionExpired,
        expiredReason,
        deviceId: deviceIdRef.current,
        loginAt,
        lastActive,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        signInWithGoogle,
        refreshProfile,
        dismissSessionExpired,
        expireSessionNow,
        touchActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

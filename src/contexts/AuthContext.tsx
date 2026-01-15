import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  employee_id: string;
  mobile_number?: string;
  date_of_birth?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setProfile(data as UserProfile);
    }
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
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
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

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
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
        employee_id: data.employeeId,
        mobile_number: data.mobileNumber || null,
        date_of_birth: data.dateOfBirth || null,
        avatar_url: data.avatarUrl || null,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { error: profileError as Error };
      }
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        signInWithGoogle,
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

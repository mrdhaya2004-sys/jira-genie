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
          setIsLoading(false);
          return;
        }

        // If session exists but might be expired, try to refresh it
        if (existingSession) {
          const expiresAt = existingSession.expires_at;
          const now = Math.floor(Date.now() / 1000);
          
          // If token expires within 60 seconds, refresh it
          if (expiresAt && expiresAt - now < 60) {
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
            
            setSession(refreshedSession);
            setUser(refreshedSession?.user ?? null);
            
            if (refreshedSession?.user) {
              fetchProfile(refreshedSession.user.id);
            }
          } else {
            setSession(existingSession);
            setUser(existingSession?.user ?? null);
            
            if (existingSession?.user) {
              fetchProfile(existingSession.user.id);
            }
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Auth initialization error:', err);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'investor' | 'demo';
  account_balance: number;
  phone?: string | null;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for demo mode first
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    if (isDemoMode) {
      const demoUser = localStorage.getItem('demo_user');
      const demoProfile = localStorage.getItem('demo_profile');
      
      if (demoUser && demoProfile) {
        setUser(JSON.parse(demoUser));
        setProfile(JSON.parse(demoProfile));
        setLoading(false);
        return;
      }
    }

    // Set up auth state listener for regular users
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't override demo mode
      if (localStorage.getItem('demo_mode') === 'true') return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch user profile (defer Supabase calls)
        setTimeout(() => {
          void (async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (error) {
                console.warn('Profile fetch error:', error.message);
                setProfile(null);
              } else {
                setProfile(profileData ?? null);
              }
            } catch (err: any) {
              console.warn('Profile fetch error:', err?.message ?? String(err));
              setProfile(null);
            } finally {
              setLoading(false);
            }
          })();
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Get initial session for regular users
    if (!isDemoMode) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            void (async () => {
              try {
                const { data: profileData, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .maybeSingle();

                if (error) {
                  console.warn('Profile fetch error:', error.message);
                  setProfile(null);
                } else {
                  setProfile(profileData ?? null);
                }
              } catch (err: any) {
                console.warn('Profile fetch error:', err?.message ?? String(err));
                setProfile(null);
              } finally {
                setLoading(false);
              }
            })();
          }, 0);
        } else {
          setLoading(false);
        }
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: name ? { name } : undefined
      }
    });
    return { error };
  };

  const signOut = async () => {
    // Clear demo state
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_profile');
    
    // Clear state
    setUser(null);
    setProfile(null);
    setSession(null);
    
    // Trigger demo mode off in DemoContext
    window.dispatchEvent(new CustomEvent('demo-mode-changed', { detail: { isDemoMode: false } }));
    
    // Sign out from Supabase (this will also clear regular auth)
    await supabase.auth.signOut();
  };

  const signInDemo = () => {
    // Create a mock demo user and session
    const demoUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@gaveagro.com',
      created_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { name: 'Usuario Demo' },
      app_metadata: {},
      aud: 'authenticated',
    } as User;

    const demoProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@gaveagro.com',
      name: 'Usuario Demo',
      role: 'demo' as const,
      account_balance: 500000,
      phone: '+52 555 123 4567',
      created_at: new Date().toISOString(),
    };

    // Store demo state in localStorage for persistence
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('demo_user', JSON.stringify(demoUser));
    localStorage.setItem('demo_profile', JSON.stringify(demoProfile));

    setUser(demoUser);
    setProfile(demoProfile);
    setLoading(false);
    
    // Trigger demo mode in DemoContext
    window.dispatchEvent(new CustomEvent('demo-mode-changed', { detail: { isDemoMode: true } }));
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    signInDemo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
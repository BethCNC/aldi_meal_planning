// src/SupabaseProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

interface SupabaseContextType {
  supabase: typeof supabase;
  session: Session | null;
  user: User | null;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If running in single-user dev mode, short-circuit auth and inject a fixed user.
    const SINGLE_USER_ID = (import.meta.env.VITE_SINGLE_USER_ID as string) || '';
    if (SINGLE_USER_ID) {
      const fakeUser = ({
        id: SINGLE_USER_ID,
        email: (import.meta.env.VITE_SINGLE_USER_EMAIL as string) || 'local@localhost',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown) as User;

      const fakeSession = ({ user: fakeUser } as unknown) as Session;
      setUser(fakeUser);
      setSession(fakeSession);
      setLoading(false);
      return;
    }

    // Default behaviour: use Supabase client auth state.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    supabase,
    session,
    user,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {!loading && children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

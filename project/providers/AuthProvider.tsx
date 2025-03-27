import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { Session } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthContextType = {
  user: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, profileImage: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  session: any; // Added the session property
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const response = await fetch(`http://localhost:5000/api/profile/${session.user.id}`);
          if (!response.ok) throw new Error('Failed to fetch profile');
          const profile = await response.json();

          setUser(profile);
          if (!profile?.age) {
            router.replace('/onboarding');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          setUser(null);
          router.replace('/(auth)');
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const response = await fetch(`http://localhost:5000/api/profile/${session.user.id}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        const profile = await response.json();

        setUser(profile);
        if (!profile?.age) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(auth)');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.replace('/(auth)');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string, profileImage: string) => {
    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          profile_image_url: profileImage,
        },
      },
    });

    if (signUpError) throw signUpError;

    if (!data.user) {
      throw new Error('User creation failed');
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthContextType = {
  user: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, profileImage: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata.full_name || 'User',
                profile_image_url: session.user.user_metadata.profile_image_url,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              await supabase.auth.signOut();
              setUser(null);
              router.replace('/(auth)');
              return;
            }

            setUser(newProfile);
            router.replace('/onboarding');
          } else if (profileError) {
            console.error('Error fetching profile:', profileError);
            setUser(null);
            router.replace('/(auth)');
          } else {
            setUser(profile);
            if (!profile?.age) {
              router.replace('/onboarding');
            } else {
              router.replace('/(tabs)');
            }
          }
        } else {
          setUser(null);
          router.replace('/(auth)');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata.full_name || 'User',
              profile_image_url: session.user.user_metadata.profile_image_url,
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            await supabase.auth.signOut();
            setUser(null);
            router.replace('/(auth)');
            return;
          }

          setUser(newProfile);
          router.replace('/onboarding');
        } else if (profileError) {
          console.error('Error fetching profile:', profileError);
          setUser(null);
          router.replace('/(auth)');
        } else {
          setUser(profile);
          if (!profile?.age) {
            router.replace('/onboarding');
          } else {
            router.replace('/(tabs)');
          }
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
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
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
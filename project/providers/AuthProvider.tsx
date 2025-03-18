import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
};

type AuthContextType = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [_, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: 'YOUR_GOOGLE_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    // Implement your sign in logic here
    // For demo, we'll just set a mock user
    const mockUser = {
      id: '1',
      email,
      name: 'John Doe',
    };
    await AsyncStorage.setItem('user', JSON.stringify(mockUser));
    setUser(mockUser);
    router.replace('/(tabs)');
  };

  const signUp = async (email: string, password: string, name: string) => {
    // Implement your sign up logic here
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
    };
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    router.replace('/onboarding');
  };

  const signInWithGoogle = async () => {
    try {
      await googlePromptAsync();
      if (googleResponse?.type === 'success') {
        // Handle successful Google sign in
        // For demo, we'll just set a mock user
        const mockUser = {
          id: '2',
          email: 'google@example.com',
          name: 'Google User',
        };
        await AsyncStorage.setItem('user', JSON.stringify(mockUser));
        setUser(mockUser);
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('user');
    setUser(null);
    router.replace('/(auth)');
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, signInWithGoogle, loading }}>
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
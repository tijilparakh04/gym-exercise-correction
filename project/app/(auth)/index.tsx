import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';  // Updated import path
import { Colors } from '@/constants/Colors';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react-native';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: '',
  });
  const { signIn } = useAuth();

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      general: '',
    };

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      setErrors(prev => ({
        ...prev,
        general: error.message || 'An error occurred during sign in',
      }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500' }}
          style={styles.logo}
        />
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
      </View>

      <View style={styles.form}>
        {errors.general ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        ) : null}

        <View>
          <View style={[
            styles.inputContainer,
            errors.email && styles.inputError
          ]}>
            <Mail size={20} color={Colors.secondary.charcoal} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.background.lightGray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
        </View>

        <View>
          <View style={[
            styles.inputContainer,
            errors.password && styles.inputError
          ]}>
            <Lock size={20} color={Colors.secondary.charcoal} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.background.lightGray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color={Colors.secondary.charcoal} />
              ) : (
                <Eye size={20} color={Colors.secondary.charcoal} />
              )}
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.signInButton}
          onPress={handleSignIn}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
          <ArrowRight size={20} color="white" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/signup" style={styles.signUpLink}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background.offWhite,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 28,
    color: Colors.secondary.charcoal,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  errorContainer: {
    backgroundColor: Colors.accent.peach,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.accent.peach,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  fieldError: {
    color: Colors.accent.peach,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  signInButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: Colors.primary.blue,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    color: Colors.background.lightGray,
  },
  signUpLink: {
    padding: 4,
  },
  signUpText: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary.blue,
  },
});
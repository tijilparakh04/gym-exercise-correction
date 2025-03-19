import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Colors } from '@/constants/Colors';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, Camera, CircleAlert as AlertCircle } from 'lucide-react-native';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function SignUp() {
  const colorScheme = useColorScheme();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    profileImage: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    name: '',
    profileImage: '',
    general: '',
  });

  const { signUp } = useAuth();

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      name: '',
      profileImage: '',
      general: '',
    };

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.profileImage) {
      newErrors.profileImage = 'Profile image is required';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      await signUp(formData.email, formData.password, formData.name, formData.profileImage);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: error instanceof Error ? error.message : 'An error occurred during sign up',
      }));
    }
  };

  // For demo purposes, we'll use a random Unsplash avatar
  const selectRandomAvatar = () => {
    const avatarIds = [
      'rDEOVtE7vOs',
      'mEZ3PoFGs_k',
      'QXevDflbl8A',
      'O3ymvT7Wf9U',
      'X6Uj51n5CE8',
    ];
    const randomId = avatarIds[Math.floor(Math.random() * avatarIds.length)];
    setFormData(prev => ({
      ...prev,
      profileImage: `https://images.unsplash.com/photo-${randomId}?w=400`,
    }));
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: Colors.background.offWhite }]}
      contentContainerStyle={styles.contentContainer}
    >
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: Colors.background.lightGray }]}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={Colors.secondary.charcoal} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.secondary.charcoal }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: Colors.background.lightGray }]}>
          Start your fitness journey today
        </Text>
      </View>

      {errors.general ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color="white" />
          <Text style={styles.errorText}>{errors.general}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <TouchableOpacity 
          style={[styles.imageSelector, { backgroundColor: Colors.background.lightGray }]} 
          onPress={selectRandomAvatar}
        >
          {formData.profileImage ? (
            <Image 
              source={{ uri: formData.profileImage }} 
              style={styles.profileImage} 
            />
          ) : (
            <Camera size={32} color={Colors.secondary.charcoal} />
          )}
          <Text style={[styles.imageSelectorText, { color: Colors.secondary.charcoal }]}>
            {formData.profileImage ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
        {errors.profileImage ? <Text style={styles.fieldError}>{errors.profileImage}</Text> : null}

        <View>
          <View style={[
            styles.inputContainer,
            { backgroundColor: Colors.background.lightGray },
            errors.name && styles.inputError
          ]}>
            <User size={20} color={Colors.secondary.charcoal} />
            <TextInput
              style={[styles.input, { color: Colors.secondary.charcoal }]}
              placeholder="Full Name"
              placeholderTextColor={Colors.background.lightGray}
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              autoCapitalize="words"
            />
          </View>
          {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}
        </View>

        <View>
          <View style={[
            styles.inputContainer,
            { backgroundColor: Colors.background.lightGray },
            errors.email && styles.inputError
          ]}>
            <Mail size={20} color={Colors.secondary.charcoal} />
            <TextInput
              style={[styles.input, { color: Colors.secondary.charcoal }]}
              placeholder="Email"
              placeholderTextColor={Colors.background.lightGray}
              value={formData.email}
              onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
        </View>

        <View>
          <View style={[
            styles.inputContainer,
            { backgroundColor: Colors.background.lightGray },
            errors.password && styles.inputError
          ]}>
            <Lock size={20} color={Colors.secondary.charcoal} />
            <TextInput
              style={[styles.input, { color: Colors.secondary.charcoal }]}
              placeholder="Password"
              placeholderTextColor={Colors.background.lightGray}
              value={formData.password}
              onChangeText={(value) => setFormData(prev => ({ ...prev, password: value }))}
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
          style={[styles.signUpButton, { backgroundColor: Colors.primary.blue }]}
          onPress={handleSignUp}
        >
          <Text style={styles.signUpButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  form: {
    gap: 20,
  },
  imageSelector: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageSelectorText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.accent.peach,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: Colors.accent.peach,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: 'white',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    flex: 1,
  },
  fieldError: {
    color: Colors.accent.peach,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  signUpButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  link: {
    fontFamily: 'Inter-SemiBold',
  },
});
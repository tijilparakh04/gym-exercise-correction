import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { 
  GoogleSignin, 
  GoogleSigninButton, 
  statusCodes 
} from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, ArrowRight, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Colors } from '@/constants/Colors';
import { Session } from '@supabase/supabase-js';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const DIET_PREFERENCES = [
  'vegan', 'vegetarian', 'pescatarian', 'eggetarian', 'non_vegetarian'
];

const ACTIVITY_LEVELS = [
  'sedentary', 'very_low', 'low', 'moderate', 'high'
];

const FITNESS_GOALS = [
  'weight_loss', 'muscle_gain', 'maintenance', 'endurance'
];


export default function SignUp() {
  // Auth state
  const [authStep, setAuthStep] = useState('initial'); // 'initial', 'verifyOtp', 'profileSetup'
  const [authMethod, setAuthMethod] = useState('email');
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    profileImage: '',
    profileImageUrl: '', // Add this field to store the Supabase public URL
    phone: '',
    age: '',
    height_cm: '',
    current_weight_kg: '',
    target_weight_kg: '',
    activity_level: '',
    diet_preference: '',
    fitness_goal: '',
  });
  
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    name: '',
    profileImage: '',
    phone: '',
    otp: '',
    general: '',
  });

  // Configure Google Sign-In on component mount
  useEffect(() => {
    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'], 
      webClientId: '604282748092-7gkf403qvckfsn1jh154darek97oedq2.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log("Google Sign-In successful:", userInfo);
      
      if (userInfo?.data?.idToken) {  // Note: changed from userInfo?.data?.idToken
        // Sign in with Supabase using Google ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.data.idToken,  // Note: changed from userInfo.data.idToken
        });

        if (error) throw error;

        // Automatically populate form with Google profile info
        setFormData(prev => ({
          ...prev,
          email: userInfo.data.user.email,  // Note: changed from userInfo.data.user.email
          name: userInfo.data.user.name || '',  // Note: changed from userInfo.data.user.name
          profileImage: userInfo.data.user.photo || '',  // Note: changed from userInfo.data.user.photo
        }));

        // Move to profile setup step
        setAuthStep('profileSetup');
      } else {
        throw new Error('No ID token present');
      }
    } catch (error: any) {
      // Rest of the error handling remains the same
      // Handle different types of errors
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
        Alert.alert('Sign-in Cancelled', 'You cancelled the Google sign-in');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation is already in progress
        Alert.alert('Sign-in in Progress', 'Google sign-in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // Play services not available or outdated
        Alert.alert('Google Play Services', 'Google Play services are not available');
      } else {
        // Some other error happened
        console.error('Google Sign-In Error:', error);
        setErrors(prev => ({
          ...prev,
          general: error.message || 'Google sign-in failed',
        }));
      }
    }
  };

  const validateDietPreference = () => {
    if (!formData.diet_preference) {
      setErrors(prev => ({ ...prev, general: 'Please select a dietary preference' }));
      return false;
    }
    return true;
  };

  const validateActivityLevel = () => {
    if (!formData.activity_level) {
      setErrors(prev => ({ ...prev, general: 'Please select an activity level' }));
      return false;
    }
    return true;
  };

  const validatePhysicalInfo = () => {
    const newErrors = { ...errors };
    clearErrors();

    if (!formData.age || isNaN(Number(formData.age))) {
      newErrors.general = 'Please enter a valid age';
    } else if (!formData.height_cm || isNaN(Number(formData.height_cm))) {
      newErrors.general = 'Please enter a valid height';
    } else if (!formData.current_weight_kg || isNaN(Number(formData.current_weight_kg))) {
      newErrors.general = 'Please enter a valid current weight';
    } else if (!formData.target_weight_kg || isNaN(Number(formData.target_weight_kg))) {
      newErrors.general = 'Please enter a valid target weight';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const validateFitnessGoal = () => {
    if (!formData.fitness_goal) {
      setErrors(prev => ({ ...prev, general: 'Please select a fitness goal' }));
      return false;
    }
    return true;
  };

  const clearErrors = () => {
    setErrors({
      email: '',
      password: '',
      name: '',
      profileImage: '',
      phone: '',
      otp: '',
      general: '',
    });
  };

  const validateInitialForm = () => {
    const newErrors = { ...errors };
    clearErrors();

    if (authMethod === 'email') {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }
    } else if (authMethod === 'phone') {
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const validateProfileForm = () => {
    const newErrors = { ...errors };
    clearErrors();

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character';
    }
    
    if (!formData.profileImage) {
      newErrors.profileImage = 'Profile image is required';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const formatToE164 = (phoneNumber: string): string => {
      // Remove any non-digit characters
      let digits = phoneNumber.replace(/\D/g, '');
      
      // Add the plus sign if not present
      if (!digits.startsWith('+')) {
        // If the number doesn't have a country code, assume it's US/Canada (+1)
        // You can modify this logic based on your target audience
        if (digits.length === 10) {
          digits = '1' + digits;
        }
        digits = '+' + digits;
      }
      
      return digits;
    };
  
  const handleInitialSignUp = async () => {
    if (!validateInitialForm()) return;

    try {
      console.log('Auth method:', authMethod);
      
      if (authMethod === 'email') {
        console.log('Attempting email OTP with:', formData.email);
        const { data, error } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            // Set to false to prevent automatic user creation
            shouldCreateUser: true,
          },
        });
        
        console.log('Email OTP response:', { data, error });
        if (error) throw error;
        setAuthStep('verifyOtp');
        
      } else if (authMethod === 'phone') {
        // Format phone number to E.164 format for Twilio
        const formattedPhone = formatToE164(formData.phone);
        
        console.log('Attempting phone OTP with E.164 format:', formattedPhone);
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        
        console.log('Phone OTP response:', { data, error });
        if (error) throw error;
        
        // Update the formData with the formatted phone number
        setFormData(prev => ({ ...prev, phone: formattedPhone }));
        setAuthStep('verifyOtp');
      }
      
      Alert.alert("Verification code sent", "Please check your email or phone for the verification code.");
      
    } catch (error) {
      console.error('SignUp error:', error);
      setErrors(prev => ({
        ...prev,
        general: error instanceof Error ? error.message : 'An error occurred during sign up',
      }));
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setErrors(prev => ({ ...prev, otp: 'Please enter the verification code' }));
      return;
    }

    try {
      // Create the correct parameter object based on auth method
      let verifyParams;
      
      if (authMethod === 'phone') {
        verifyParams = {
          phone: formData.phone,
          token: otp,
          type: 'sms' as const,
        };
      } else {
        verifyParams = {
          email: formData.email,
          token: otp,
          type: 'email' as const, // Changed from 'signup' to 'email'
        };
      }

      const { data, error } = await supabase.auth.verifyOtp(verifyParams);

      if (error) throw error;
      
      // Set the user ID from the session
      if (data?.session?.user) {
        setSession(data.session);
        setUserId(data.session.user.id);
        
        // Log the successful login
        console.log('User successfully logged in:', data.session.user);
      }

      setAuthStep('profileSetup'); // Move to profile setup step
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        otp: error instanceof Error ? error.message : 'Invalid verification code',
      }));
    }
  };
  
  const pickImage = async () => {
    setErrors(prev => ({ ...prev, profileImage: '' }));
    
    try {
      console.log('Starting image picker...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission denied for media library');
        setErrors(prev => ({ ...prev, profileImage: 'Permission to access media library is required' }));
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3, // Reduced quality for smaller file size
        base64: true, // Request base64 data
      });
  
      console.log('Image picker result:', result.canceled ? 'Canceled' : 'Image selected');
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('Selected image:', file.uri);
        
        // Set local image immediately for preview
        setFormData(prev => ({ ...prev, profileImage: file.uri }));
        
        try {
          // Check if base64 is available
          if (!file.base64) {
            console.error('Base64 data not available');
            Alert.alert('Upload Notice', 'Using local image only. Changes may not be saved permanently.');
            return;
          }
  
          // Create a unique filename
          const fileExt = file.uri.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `profiles/${fileName}`;
  
          console.log('Preparing to upload image:', { fileExt, fileName, filePath });
  
          // Convert base64 to ArrayBuffer using decode
          const base64FileData = file.base64;
          const fileData = decode(base64FileData);
  
          console.log('Starting upload to Supabase user_images bucket...');
          // Upload to Supabase using the decoded ArrayBuffer
          const { data, error } = await supabase.storage
            .from('user_images')
            .upload(filePath, fileData, {
              contentType: `image/${fileExt}`,
              upsert: true
            });
            
          if (error) {
            console.error('Supabase upload error:', error);
            // Keep using the local image but show an alert
            Alert.alert('Upload Warning', 'Image uploaded locally only. It may not be saved permanently.');
            return;
          }
          
          console.log('Upload successful, getting public URL...');
          
          // Store just the file path in the database, not the full URL with token
          setFormData(prev => ({ 
            ...prev, 
            // Keep using local URI for display
            profileImage: file.uri,
            // Store just the file path for database storage
            profileImageUrl: filePath 
          }));
          
          console.log('Image path stored for database:', filePath);
          
        } catch (error) {
          console.error('Upload error:', error);
          // Keep using the local image but show an alert
          Alert.alert('Upload Notice', 'Using local image. Changes may not be saved permanently.');
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setErrors(prev => ({ 
        ...prev, 
        profileImage: error instanceof Error ? error.message : 'Image selection failed' 
      }));
      setFormData(prev => ({ ...prev, profileImage: '' }));
    }
  };

  const completeProfileSetup = async () => {
    if (!validateProfileForm()) return;
    
    try {
      console.log('Profile setup validated, moving to diet preferences');
      
      // Update user's password if they signed in with OTP
      if (authMethod !== 'google') {
        console.log('Updating password for non-Google auth user');
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password
        });
        
        if (passwordError) {
          console.error('Password update error:', passwordError);
          throw passwordError;
        }
      }
      
      // Move to diet preference selection instead of completing signup
      setAuthStep('dietPreference');
      
    } catch (error) {
      console.error('Profile setup error:', error);
      setErrors(prev => ({
        ...prev,
        general: error instanceof Error ? error.message : 'Failed to complete profile setup',
      }));
      
      Alert.alert(
        'Profile Setup Failed',
        'There was a problem completing your profile setup. Please try again.'
      );
    }
  };

  const finalizeSignup = async () => {
    try {
      console.log('Finalizing signup with complete data:', {
        userId,
        name: formData.name,
        email: formData.email || session?.user?.email,
        diet: formData.diet_preference,
        activity: formData.activity_level,
        age: formData.age,
        height: formData.height_cm,
        weight: formData.current_weight_kg,
        target: formData.target_weight_kg,
        goal: formData.fitness_goal,
        profileImagePath: formData.profileImageUrl
      });
      
      // Check if we have a valid user ID
      if (!userId) {
        console.error('No user ID available for profile creation');
        throw new Error('User ID is missing. Please try signing in again.');
      }
      
      // Store all user information in the profiles table
      console.log('Inserting complete user profile data into profiles table');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: formData.email || session?.user?.email,
          full_name: formData.name,
          phone: formData.phone,
          profile_image_url: formData.profileImageUrl,
          age: parseInt(formData.age),
          height_cm: parseFloat(formData.height_cm),
          current_weight_kg: parseFloat(formData.current_weight_kg),
          target_weight_kg: parseFloat(formData.target_weight_kg),
          activity_level: formData.activity_level,
          diet_preference: formData.diet_preference,
          fitness_goal: formData.fitness_goal
        });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }
      
      console.log('Profile setup completed successfully');
      // Navigate to the home screen or onboarding
      router.replace('/(tabs)/profile');
      
    } catch (error) {
      console.error('Final signup error:', error);
      setErrors(prev => ({
        ...prev,
        general: error instanceof Error ? error.message : 'Failed to complete profile setup',
      }));
      
      Alert.alert(
        'Profile Setup Failed',
        'There was a problem completing your profile setup. Please try again.'
      );
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
    >
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          if (authStep === 'initial') {
            router.back();
          } else if (authStep === 'dietPreference') {
            setAuthStep('profileSetup');
          } else if (authStep === 'activityLevel') {
            setAuthStep('dietPreference');
          } else if (authStep === 'physicalInfo') {
            setAuthStep('activityLevel');
          } else if (authStep === 'fitnessGoal') {
            setAuthStep('physicalInfo');
          } else {
            setAuthStep('initial');
          }
          clearErrors();
        }}
      >
        <ArrowLeft size={24} color={Colors.secondary.charcoal} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          {authStep === 'initial' ? 'Start your fitness journey today' : 
           authStep === 'verifyOtp' ? 'Verify your identity' : 
           authStep === 'profileSetup' ? 'Complete your profile' :
           authStep === 'dietPreference' ? 'What do you eat?' :
           authStep === 'activityLevel' ? 'How active are you?' :
           authStep === 'physicalInfo' ? 'Your physical details' :
           'What are your fitness goals?'}
        </Text>
      </View>

      {errors.general ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.general}</Text>
        </View>
      ) : null}

      {/* Step 1: Initial Auth Method Selection */}
      {authStep === 'initial' && (
        <View style={styles.form}>
          <View style={styles.authMethodContainer}>
            <TouchableOpacity 
              style={[styles.authMethodButton, authMethod === 'email' && styles.selectedAuthMethod]} 
              onPress={() => setAuthMethod('email')}
            >
              <Mail size={20} color={authMethod === 'email' ? Colors.primary.blue : Colors.secondary.charcoal} />
              <Text style={authMethod === 'email' ? styles.selectedAuthMethodText : styles.authMethodText}>
                Email
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.authMethodButton, authMethod === 'phone' && styles.selectedAuthMethod]} 
              onPress={() => setAuthMethod('phone')}
            >
              <User size={20} color={authMethod === 'phone' ? Colors.primary.blue : Colors.secondary.charcoal} />
              <Text style={authMethod === 'phone' ? styles.selectedAuthMethodText : styles.authMethodText}>
                Phone
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.authMethodButton, styles.googleButton]} 
              onPress={handleGoogleSignIn}
            >
              <Text style={styles.authMethodText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>

          {authMethod === 'email' && (
            <View>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Mail size={20} color={Colors.secondary.charcoal} />
                <TextInput
                  style={styles.input}
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
          )}

          {authMethod === 'phone' && (
            <View>
              <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                <Text style={styles.phonePrefix}>+</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={Colors.background.lightGray}
                  value={formData.phone}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
            </View>
          )}

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleInitialSignUp}
          >
            <Text style={styles.actionButtonText}>Continue</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: OTP Verification */}
      {authStep === 'verifyOtp' && (
        <View style={styles.form}>
          <Text style={styles.verificationText}>
            Enter the verification code sent to your {authMethod === 'email' ? 'email' : 'phone'}
          </Text>
          
          <View style={[styles.inputContainer, errors.otp && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="Verification Code"
              placeholderTextColor={Colors.background.lightGray}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
            />
          </View>
          {errors.otp ? <Text style={styles.fieldError}>{errors.otp}</Text> : null}
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleVerifyOtp}
          >
            <Text style={styles.actionButtonText}>Verify</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.resendButton} 
            onPress={handleInitialSignUp}
          >
            <Text style={styles.resendButtonText}>Resend Code</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: Profile Setup */}
      {authStep === 'profileSetup' && (
        <View style={styles.form}>
          <View style={styles.photoContainer}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {formData.profileImage === 'uploading' ? (
                <View style={[styles.profileImage, styles.uploadingContainer]}>
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : formData.profileImage ? (
                <Image 
                  source={{ uri: formData.profileImage }} 
                  style={styles.profileImage} 
                  onError={() => {
                    console.log('Image failed to load');
                    setFormData(prev => ({ ...prev, profileImage: '' }));
                    setErrors(prev => ({ ...prev, profileImage: 'Failed to load image' }));
                  }}
                />
              ) : (
                <View style={[styles.profileImage, styles.emptyImage]}>
                  <ImageIcon size={40} color={Colors.background.lightGray} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.profileImage ? <Text style={styles.fieldError}>{errors.profileImage}</Text> : null}
          </View>

          <View>
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <User size={20} color={Colors.secondary.charcoal} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.background.lightGray}
                value={formData.name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
                autoCapitalize="words"
              />
            </View>
            {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}
          </View>

          {authMethod !== 'google' && (
            <View>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Lock size={20} color={Colors.secondary.charcoal} />
                <TextInput
                  style={styles.input}
                  placeholder="Create Password"
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
          )}

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={completeProfileSetup}
          >
            <Text style={styles.actionButtonText}>Complete Sign Up</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 4: Diet Preference */}
      {authStep === 'dietPreference' && (
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Select your dietary preference:</Text>
          
          <View style={styles.optionsContainer}>
            {DIET_PREFERENCES.map((diet) => (
              <TouchableOpacity
                key={diet}
                style={[
                  styles.optionButton,
                  formData.diet_preference === diet && styles.selectedOption
                ]}
                onPress={() => setFormData(prev => ({ ...prev, diet_preference: diet }))}
              >
                <Text 
                  style={[
                    styles.optionText,
                    formData.diet_preference === diet && styles.selectedOptionText
                  ]}
                >
                  {diet.charAt(0).toUpperCase() + diet.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              if (validateDietPreference()) {
                setAuthStep('activityLevel');
              }
            }}
          >
            <Text style={styles.actionButtonText}>Continue</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 5: Activity Level */}
      {authStep === 'activityLevel' && (
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>How active are you on a daily basis?</Text>
          
          <View style={styles.optionsContainer}>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  formData.activity_level === level && styles.selectedOption
                ]}
                onPress={() => setFormData(prev => ({ ...prev, activity_level: level }))}
              >
                <Text 
                  style={[
                    styles.optionText,
                    formData.activity_level === level && styles.selectedOptionText
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              if (validateActivityLevel()) {
                setAuthStep('physicalInfo');
              }
            }}
          >
            <Text style={styles.actionButtonText}>Continue</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 6: Physical Information */}
      {authStep === 'physicalInfo' && (
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Tell us about yourself:</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Age (years)"
              placeholderTextColor={Colors.background.lightGray}
              value={formData.age}
              onChangeText={(value) => setFormData(prev => ({ ...prev, age: value }))}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Height (cm)"
              placeholderTextColor={Colors.background.lightGray}
              value={formData.height_cm}
              onChangeText={(value) => setFormData(prev => ({ ...prev, height_cm: value }))}
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Current Weight (kg)"
              placeholderTextColor={Colors.background.lightGray}
              value={formData.current_weight_kg}
              onChangeText={(value) => setFormData(prev => ({ ...prev, current_weight_kg: value }))}
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Target Weight (kg)"
              placeholderTextColor={Colors.background.lightGray}
              value={formData.target_weight_kg}
              onChangeText={(value) => setFormData(prev => ({ ...prev, target_weight_kg: value }))}
              keyboardType="decimal-pad"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              if (validatePhysicalInfo()) {
                setAuthStep('fitnessGoal');
              }
            }}
          >
            <Text style={styles.actionButtonText}>Continue</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 7: Fitness Goal */}
      {authStep === 'fitnessGoal' && (
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>What's your primary fitness goal?</Text>
          
          <View style={styles.optionsContainer}>
            {FITNESS_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.optionButton,
                  formData.fitness_goal === goal && styles.selectedOption
                ]}
                onPress={() => setFormData(prev => ({ ...prev, fitness_goal: goal }))}
              >
                <Text 
                  style={[
                    styles.optionText,
                    formData.fitness_goal === goal && styles.selectedOptionText
                  ]}
                >
                  {goal.charAt(0).toUpperCase() + goal.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              if (validateFitnessGoal()) {
                finalizeSignup();
              }
            }}
          >
            <Text style={styles.actionButtonText}>Complete Sign Up</Text>
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background.offWhite 
  },
  contentContainer: { 
    padding: 20, 
    paddingTop: 60 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
    marginBottom: 16,
  },
  errorText: { 
    color: 'white', 
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  authMethodContainer: {
    gap: 12,
    marginBottom: 8,
  },
  authMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'white',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedAuthMethod: {
    backgroundColor: Colors.primary.blue + '10', // 10% opacity
    borderWidth: 1,
    borderColor: Colors.primary.blue,
  },
  authMethodText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  selectedAuthMethodText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.primary.blue,
  },
  googleButton: {
    backgroundColor: 'white',
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 12, 
    padding: 16, 
    gap: 12, 
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
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
  phonePrefix: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  actionButton: { 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: Colors.primary.blue,
  },
  actionButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontFamily: 'Inter-SemiBold',
  },
  resendButton: {
    alignItems: 'center',
    padding: 10,
  },
  resendButtonText: {
    fontFamily: 'Inter-Regular',
    color: Colors.primary.blue,
    fontSize: 16,
  },
  verificationText: {
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 10,
  },
  fieldError: { 
    color: Colors.accent.peach, 
    fontSize: 12, 
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    marginLeft: 4,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary.blue,
  },
  imagePicker: { 
    alignItems: 'center', 
    marginBottom: 10 
  },
  emptyImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  uploadingText: {
    color: Colors.secondary.charcoal,
    fontFamily: 'Inter-Regular',
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedOption: {
    backgroundColor: Colors.primary.blue + '10', // 10% opacity
    borderWidth: 1,
    borderColor: Colors.primary.blue,
  },
  optionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    textAlign: 'center',
  },
  selectedOptionText: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary.blue,
  },
  addPhotoText: {
    marginTop: 8,
    color: Colors.background.lightGray,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  }
});
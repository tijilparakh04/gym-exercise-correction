import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// Make sure this component is exported as default
export default function EditProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    height_cm: '',
    current_weight_kg: '',
    target_weight_kg: '',
    activity_level: '',
    diet_preference: '',
    fitness_goal: ''
  });

  const ACTIVITY_LEVELS = [
    'sedentary', 'very_low', 'low', 'moderate', 'high'
  ];

  const DIET_PREFERENCES = [
    'vegan', 'vegetarian', 'pescatarian', 'eggetarian', 'non_vegetarian'
  ];

  const FITNESS_GOALS = [
    'weight_loss', 'muscle_gain', 'maintenance', 'endurance'
  ];

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  async function fetchUserProfile() {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      setFormData({
        full_name: data.full_name || '',
        age: data.age ? data.age.toString() : '',
        height_cm: data.height_cm ? data.height_cm.toString() : '',
        current_weight_kg: data.current_weight_kg ? data.current_weight_kg.toString() : '',
        target_weight_kg: data.target_weight_kg ? data.target_weight_kg.toString() : '',
        activity_level: data.activity_level || '',
        diet_preference: data.diet_preference || '',
        fitness_goal: data.fitness_goal || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          age: formData.age ? parseInt(formData.age) : null,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
          current_weight_kg: formData.current_weight_kg ? parseFloat(formData.current_weight_kg) : null,
          target_weight_kg: formData.target_weight_kg ? parseFloat(formData.target_weight_kg) : null,
          activity_level: formData.activity_level,
          diet_preference: formData.diet_preference,
          fitness_goal: formData.fitness_goal
        })
        .eq('id', user.id);

      if (error) throw error;
      
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatLabel = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1).replace('_', ' ');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.secondary.charcoal} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, full_name: value }))}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.background.lightGray}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Age (years)</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(value) => setFormData(prev => ({ ...prev, age: value }))}
              placeholder="Enter your age"
              placeholderTextColor={Colors.background.lightGray}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.height_cm}
              onChangeText={(value) => setFormData(prev => ({ ...prev, height_cm: value }))}
              placeholder="Enter your height"
              placeholderTextColor={Colors.background.lightGray}
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.current_weight_kg}
              onChangeText={(value) => setFormData(prev => ({ ...prev, current_weight_kg: value }))}
              placeholder="Enter your current weight"
              placeholderTextColor={Colors.background.lightGray}
              keyboardType="decimal-pad"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Target Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.target_weight_kg}
              onChangeText={(value) => setFormData(prev => ({ ...prev, target_weight_kg: value }))}
              placeholder="Enter your target weight"
              placeholderTextColor={Colors.background.lightGray}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <Text style={styles.optionLabel}>Activity Level</Text>
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
                  {formatLabel(level)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.optionLabel}>Diet Preference</Text>
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
                  {formatLabel(diet)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.optionLabel}>Fitness Goal</Text>
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
                  {formatLabel(goal)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.offWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.offWhite,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    marginTop: 10,
    color: Colors.secondary.charcoal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  form: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    padding: 0,
  },
  optionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 12,
    marginTop: 8,
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
});
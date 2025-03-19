import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

type ActivityLevel = 'sedentary' | 'very_low' | 'low' | 'moderate' | 'high';
type DietType = 'vegan' | 'vegetarian' | 'pescatarian' | 'eggetarian' | 'non_vegetarian';
type FitnessGoal = 'weight_loss' | 'muscle_gain' | 'maintenance' | 'endurance';

interface FormData {
  height: string;
  weight: string;
  targetWeight: string;
  age: string;
  dietType: DietType | '';
  fitnessGoal: FitnessGoal | '';
  activityLevel: ActivityLevel | '';
}

export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    height: '',
    weight: '',
    targetWeight: '',
    age: '',
    dietType: '',
    fitnessGoal: '',
    activityLevel: '',
  });
  const [errors, setErrors] = useState<Record<keyof FormData, string | undefined>>({
    height: undefined,
    weight: undefined,
    targetWeight: undefined,
    age: undefined,
    dietType: undefined,
    fitnessGoal: undefined,
    activityLevel: undefined,
  });

  const validateStep = () => {
    const newErrors: Record<keyof FormData, string | undefined> = {
      height: undefined,
      weight: undefined,
      targetWeight: undefined,
      age: undefined,
      dietType: undefined,
      fitnessGoal: undefined,
      activityLevel: undefined,
    };

    switch (step) {
      case 1:
        if (!formData.age) newErrors.age = 'Age is required';
        if (!formData.height) newErrors.height = 'Height is required';
        if (!formData.weight) newErrors.weight = 'Weight is required';
        if (!formData.targetWeight) newErrors.targetWeight = 'Target weight is required';
        break;
      case 2:
        if (!formData.dietType) newErrors.dietType = 'Diet type is required';
        break;
      case 3:
        if (!formData.fitnessGoal) newErrors.fitnessGoal = 'Fitness goal is required';
        break;
      case 4:
        if (!formData.activityLevel) newErrors.activityLevel = 'Activity level is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step < 4) {
      setStep(step + 1);
    } else {
      try {
        if (!user?.id) throw new Error('User not found');

        const { error } = await supabase
          .from('profiles')
          .update({
            age: parseInt(formData.age),
            height_cm: parseFloat(formData.height),
            current_weight_kg: parseFloat(formData.weight),
            target_weight_kg: parseFloat(formData.targetWeight),
            diet_preference: formData.dietType,
            fitness_goal: formData.fitnessGoal,
            activity_level: formData.activityLevel,
          })
          .eq('id', user.id);

        if (error) throw error;
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Error saving profile:', error);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepDescription}>Let's get to know you better</Text>
      
      <View style={styles.inputGroup}>
        <View>
          <TextInput
            style={[styles.input, errors.age && styles.inputError]}
            placeholder="Age"
            value={formData.age}
            onChangeText={(value) => setFormData(prev => ({ ...prev, age: value }))}
            keyboardType="numeric"
          />
          {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
        </View>

        <View>
          <TextInput
            style={[styles.input, errors.height && styles.inputError]}
            placeholder="Height (cm)"
            value={formData.height}
            onChangeText={(value) => setFormData(prev => ({ ...prev, height: value }))}
            keyboardType="numeric"
          />
          {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
        </View>

        <View>
          <TextInput
            style={[styles.input, errors.weight && styles.inputError]}
            placeholder="Current Weight (kg)"
            value={formData.weight}
            onChangeText={(value) => setFormData(prev => ({ ...prev, weight: value }))}
            keyboardType="numeric"
          />
          {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
        </View>

        <View>
          <TextInput
            style={[styles.input, errors.targetWeight && styles.inputError]}
            placeholder="Target Weight (kg)"
            value={formData.targetWeight}
            onChangeText={(value) => setFormData(prev => ({ ...prev, targetWeight: value }))}
            keyboardType="numeric"
          />
          {errors.targetWeight && <Text style={styles.errorText}>{errors.targetWeight}</Text>}
        </View>
      </View>
    </View>
  );

  const renderDietPreferences = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Diet Preferences</Text>
      <Text style={styles.stepDescription}>Choose your preferred diet type</Text>
      
      <View style={styles.optionsContainer}>
        {(['vegan', 'vegetarian', 'pescatarian', 'eggetarian', 'non_vegetarian'] as DietType[]).map((diet) => (
          <TouchableOpacity
            key={diet}
            style={[
              styles.optionButton,
              formData.dietType === diet && styles.optionButtonSelected
            ]}
            onPress={() => setFormData(prev => ({ ...prev, dietType: diet }))}
          >
            <Text style={[
              styles.optionText,
              formData.dietType === diet && styles.optionTextSelected
            ]}>
              {diet.charAt(0).toUpperCase() + diet.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.dietType && <Text style={styles.errorText}>{errors.dietType}</Text>}
    </View>
  );

  const renderFitnessGoals = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Fitness Goals</Text>
      <Text style={styles.stepDescription}>What do you want to achieve?</Text>
      
      <View style={styles.optionsContainer}>
        {(['weight_loss', 'muscle_gain', 'maintenance', 'endurance'] as FitnessGoal[]).map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[
              styles.optionButton,
              formData.fitnessGoal === goal && styles.optionButtonSelected
            ]}
            onPress={() => setFormData(prev => ({ ...prev, fitnessGoal: goal }))}
          >
            <Text style={[
              styles.optionText,
              formData.fitnessGoal === goal && styles.optionTextSelected
            ]}>
              {goal.charAt(0).toUpperCase() + goal.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.fitnessGoal && <Text style={styles.errorText}>{errors.fitnessGoal}</Text>}
    </View>
  );

  const renderActivityLevel = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Activity Level</Text>
      <Text style={styles.stepDescription}>How active are you?</Text>
      
      <View style={styles.optionsContainer}>
        {(['sedentary', 'very_low', 'low', 'moderate', 'high'] as ActivityLevel[]).map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.optionButton,
              formData.activityLevel === level && styles.optionButtonSelected
            ]}
            onPress={() => setFormData(prev => ({ ...prev, activityLevel: level }))}
          >
            <Text style={[
              styles.optionText,
              formData.activityLevel === level && styles.optionTextSelected
            ]}>
              {level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.activityLevel && <Text style={styles.errorText}>{errors.activityLevel}</Text>}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderDietPreferences();
      case 3:
        return renderFitnessGoals();
      case 4:
        return renderActivityLevel();
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.progress}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i <= step ? Colors.primary.blue : Colors.secondary.taupe }
            ]}
          />
        ))}
      </View>

      {renderStep()}

      <View style={styles.navigationButtons}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={20} color={Colors.secondary.charcoal} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {step === 4 ? 'Get Started' : 'Next'}
          </Text>
          <ChevronRight size={20} color="white" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.offWhite,
    padding: 20,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 60,
    marginBottom: 40,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  stepDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
    marginBottom: 32,
  },
  inputGroup: {
    width: '100%',
    gap: 16,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.accent.peach,
  },
  errorText: {
    color: Colors.accent.peach,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionButtonSelected: {
    backgroundColor: Colors.primary.blue,
  },
  optionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  optionTextSelected: {
    color: 'white',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  backButtonText: {
    color: Colors.secondary.charcoal,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  nextButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 16,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ChevronRight } from 'lucide-react-native';

type DietType = 'vegan' | 'vegetarian' | 'keto' | 'paleo' | 'balanced';
type FitnessGoal = 'weight-loss' | 'muscle-gain' | 'maintenance' | 'endurance';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    age: '',
    dietType: '' as DietType,
    fitnessGoal: '' as FitnessGoal,
    activityLevel: '',
  });

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Save user preferences and redirect to main app
      router.replace('/(tabs)');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.stepDescription}>Let's get to know you better</Text>
            
            {/* Basic info inputs */}
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Diet Preferences</Text>
            <Text style={styles.stepDescription}>Choose your preferred diet type</Text>
            
            {/* Diet type selection */}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Fitness Goals</Text>
            <Text style={styles.stepDescription}>What do you want to achieve?</Text>
            
            {/* Fitness goals selection */}
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Activity Level</Text>
            <Text style={styles.stepDescription}>How active are you?</Text>
            
            {/* Activity level selection */}
          </View>
        );
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

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {step === 4 ? 'Get Started' : 'Next'}
        </Text>
        <ChevronRight size={20} color="white" />
      </TouchableOpacity>
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
  nextButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
});
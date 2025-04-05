import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Plus, Minus, Save, Sparkles } from 'lucide-react-native';
import api from '@/lib/api';

// Focus areas for different workout days
const focusAreaOptions = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 
  'Core', 'Full Body', 'Cardio', 'HIIT', 'Rest Day'
];

export default function CreateWorkoutPlanScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const planId = params.id as string;
  const isEditing = !!planId;

  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [workoutDays, setWorkoutDays] = useState<Array<{day: number, focusArea: string, id?: string}>>([]);
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    if (isEditing && planId) {
      fetchPlanDetails();
    } else {
      // Initialize default workout days
      initializeWorkoutDays(daysPerWeek);
    }
  }, [isEditing, planId]);

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .single();
        
      if (planError) throw planError;
      
      setPlanName(planData.name);
      setDescription(planData.description || '');
      setDaysPerWeek(planData.days_per_week);
      setAiPrompt(planData.ai_prompt || '');
      
      const { data: daysData, error: daysError } = await supabase
        .from('workout_plan_days')
        .select('*')
        .eq('plan_id', planId)
        .order('day_number', { ascending: true });
        
      if (daysError) throw daysError;
      
      if (daysData) {
        setWorkoutDays(daysData.map(day => ({
          day: day.day_number,
          focusArea: day.focus_area,
          id: day.id
        })));
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
      Alert.alert('Error', 'Failed to load workout plan details');
    } finally {
      setLoading(false);
    }
  };

  const initializeWorkoutDays = (days: number) => {
    const defaultFocusAreas = ['Chest', 'Back', 'Legs'];
    const newWorkoutDays = Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      focusArea: defaultFocusAreas[i % defaultFocusAreas.length]
    }));
    setWorkoutDays(newWorkoutDays);
  };

  const handleDaysChange = (increment: boolean) => {
    let newDaysCount = increment ? daysPerWeek + 1 : daysPerWeek - 1;
    
    // Ensure days are between 1 and 7
    newDaysCount = Math.max(1, Math.min(7, newDaysCount));
    
    if (newDaysCount !== daysPerWeek) {
      setDaysPerWeek(newDaysCount);
      
      if (newDaysCount > workoutDays.length) {
        // Add new days
        const newDays = Array.from(
          { length: newDaysCount - workoutDays.length }, 
          (_, i) => ({
            day: workoutDays.length + i + 1,
            focusArea: 'Full Body'
          })
        );
        setWorkoutDays([...workoutDays, ...newDays]);
      } else {
        // Remove days
        setWorkoutDays(workoutDays.slice(0, newDaysCount));
      }
    }
  };

  const updateFocusArea = (index: number, focusArea: string) => {
    const updatedDays = [...workoutDays];
    updatedDays[index] = { ...updatedDays[index], focusArea };
    setWorkoutDays(updatedDays);
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Please enter a name for your workout plan');
      return;
    }

    try {
      setSavingPlan(true);
      
      if (isEditing) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from('workout_plans')
          .update({
            name: planName,
            description,
            days_per_week: daysPerWeek,
            updated_at: new Date().toISOString()
          })
          .eq('id', planId);
          
        if (updateError) throw updateError;
        
        // Update or create workout days
        for (const day of workoutDays) {
          if ('id' in day) {
            // Update existing day
            const { error } = await supabase
              .from('workout_plan_days')
              .update({
                focus_area: day.focusArea,
                updated_at: new Date().toISOString()
              })
              .eq('id', day.id);
              
            if (error) throw error;
          } else {
            // Create new day
            const { error } = await supabase
              .from('workout_plan_days')
              .insert({
                plan_id: planId,
                day_number: day.day,
                focus_area: day.focusArea
              });
              
            if (error) throw error;
          }
        }
      } else {
        // Create new plan
        const { data: planData, error: planError } = await supabase
          .from('workout_plans')
          .insert({
            user_id: user?.id,
            name: planName,
            description,
            days_per_week: daysPerWeek
          })
          .select()
          .single();
          
        if (planError) throw planError;
        
        // Create workout days
        const daysToInsert = workoutDays.map(day => ({
          plan_id: planData.id,
          day_number: day.day,
          focus_area: day.focusArea
        }));
        
        const { error: daysError } = await supabase
          .from('workout_plan_days')
          .insert(daysToInsert);
          
        if (daysError) throw daysError;
      }
      
      Alert.alert(
        'Success', 
        `Workout plan ${isEditing ? 'updated' : 'created'} successfully`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving workout plan:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} workout plan`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleGenerateAIPlan = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt for the AI');
      return;
    }

    try {
      console.log('Starting AI plan generation with prompt:', aiPrompt);
      setGenerating(true);
      
      // Get user profile data to include in the request
      console.log('Fetching user profile data...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile data:', profileError);
      } else {
        console.log('Profile data fetched successfully:', profileData);
      }
      
      // Prepare the current workout structure to send to the backend
      const currentWorkoutStructure = {
        daysPerWeek,
        workoutDays: workoutDays.map(day => ({
          day: day.day,
          focusArea: day.focusArea
        }))
      };
      
      console.log('Current workout structure:', currentWorkoutStructure);
      console.log('Attempting to call API at:', api.defaults.baseURL);
      
      try {
        const response = await api.post('/api/workout-plan/generate-plan', {
          prompt: aiPrompt,
          profileData,
          workoutStructure: currentWorkoutStructure
        });
        
        console.log('API response data:', response.data);
        
        if (response.data && response.data.plan) {
          console.log('Successfully received plan from API');
          // Update the UI with the generated plan
          setPlanName(response.data.plan.name);
          setDescription(response.data.plan.description);
          setDaysPerWeek(response.data.plan.daysPerWeek);
          setWorkoutDays(response.data.plan.workoutDays);
          
          // Save the generated plan to Supabase
          await saveGeneratedPlan(response.data.plan, aiPrompt);
        } else {
          console.error('Invalid response format from API');
          throw new Error('Invalid response format from API');
        }
      } catch (apiError: any) {
        console.error('API error:', apiError.response?.status, apiError.response?.data || apiError.message);
        
        // For testing on phone, generate mock data if API fails
        if (__DEV__) {
          console.log('Generating mock workout plan for development');
          const mockPlan = {
            name: `${aiPrompt.substring(0, 20)}... Plan`,
            description: `Workout plan based on: ${aiPrompt}`,
            daysPerWeek: daysPerWeek,
            workoutDays: workoutDays.map(day => ({
              day: day.day,
              focusArea: day.focusArea
            }))
          };
          
          setPlanName(mockPlan.name);
          setDescription(mockPlan.description);
          
          // Save the mock plan
          await saveGeneratedPlan(mockPlan, aiPrompt);
          return;
        }
        
        Alert.alert('Error', `Failed to generate workout plan: ${apiError.message}`);
      }
    } catch (err) {
      console.error('Error generating workout plan:', err);
      Alert.alert('Error', 'Failed to generate workout plan');
    } finally {
      setGenerating(false);
    }
  };
    // Define interfaces for our data structures
    interface Exercise {
        name: string;
        sets: number;
        reps: number;
        weight: number;
        notes: string;
      }
    
      interface WorkoutDay {
        day: number;
        focusArea: string;
        id?: string;
      }
    
      interface WorkoutPlan {
        name: string;
        description: string;
        daysPerWeek: number;
        workoutDays: WorkoutDay[];
      }
    
      // Update the saveGeneratedPlan function with proper types
      // Update the saveGeneratedPlan function to match the existing schema
  const saveGeneratedPlan = async (plan: WorkoutPlan, promptText: string) => {
    try {
      console.log('Saving generated plan to Supabase...');
      setSavingPlan(true);
      
      // 1. Insert the workout plan
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user?.id,
          name: plan.name,
          description: plan.description,
          days_per_week: plan.daysPerWeek
        })
        .select()
        .single();
        
      if (planError) {
        console.error('Error saving workout plan:', planError);
        throw planError;
      }
      
      console.log('Workout plan saved with ID:', planData.id);
      
      // 2. Insert workout days - store AI prompt in workout_plan_days
      const daysToInsert = plan.workoutDays.map(day => ({
        plan_id: planData.id,
        day_number: day.day,
        focus_area: day.focusArea,
        ai_prompt: promptText
      }));
      
      const { error: daysError } = await supabase
        .from('workout_plan_days')
        .insert(daysToInsert);
        
      if (daysError) {
        console.error('Error saving workout days:', daysError);
        throw daysError;
      }
      
      console.log('Workout days saved successfully');
      
      // 3. Generate and save workouts for each day
      for (const day of plan.workoutDays) {
        if (day.focusArea !== 'Rest Day') {
          // Create a workout for this day - remove fields that don't exist in schema
          const workoutName = `${day.focusArea} Workout`;
          const { data: workoutData, error: workoutError } = await supabase
            .from('workouts')
            .insert({
              user_id: user?.id,
              name: workoutName,
              // Removed: plan_id and focus_area as they don't exist in schema
              duration_minutes: 45, // Default duration
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (workoutError) {
            console.error('Error creating workout:', workoutError);
            continue; // Continue with other days even if one fails
          }
          
          console.log(`Created workout for ${day.focusArea} with ID:`, workoutData.id);
          
          // Update the workout_plan_days to link to this workout
          const { error: updateError } = await supabase
            .from('workout_plan_days')
            .update({ workout_id: workoutData.id })
            .eq('plan_id', planData.id)
            .eq('day_number', day.day);
            
          if (updateError) {
            console.error('Error linking workout to plan day:', updateError);
          }
          
          // Generate exercises based on the focus area
          const exercises = generateExercisesForFocusArea(day.focusArea);
          
          // Insert exercises
          if (exercises.length > 0) {
            const exercisesToInsert = exercises.map(ex => ({
              workout_id: workoutData.id,
              exercise_name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight_kg: ex.weight || null,
              notes: ex.notes || ''
            }));
            
            const { error: exercisesError } = await supabase
              .from('workout_exercises')
              .insert(exercisesToInsert);
              
            if (exercisesError) {
              console.error('Error creating exercises:', exercisesError);
            } else {
              console.log(`Created ${exercises.length} exercises for ${day.focusArea} workout`);
            }
          }
        }
      }
      
      // Show success message and navigate back to workout tab
      Alert.alert(
        'Success', 
        'Workout plan generated and saved successfully!',
        [
          { 
            text: 'View Plan', 
            onPress: () => router.replace('/(tabs)/workout')
          }
        ]
      );
      
    } catch (error) {
      console.error('Error saving generated plan:', error);
      Alert.alert('Error', 'Plan was generated but could not be saved to database');
    } finally {
      setSavingPlan(false);
    }
  };
  
  // Helper function to generate exercises based on focus area
  const generateExercisesForFocusArea = (focusArea: string): Exercise[] => {
    const exercisesByArea: Record<string, Exercise[]> = {
      'Chest': [
        { name: 'Bench Press', sets: 4, reps: 8, weight: 0, notes: 'Focus on full range of motion' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 0, notes: 'Keep elbows at 45 degrees' },
        { name: 'Chest Flyes', sets: 3, reps: 12, weight: 0, notes: 'Squeeze at the top' },
        { name: 'Push-ups', sets: 3, reps: 15, weight: 0, notes: 'Body weight exercise' }
      ],
      'Back': [
        { name: 'Pull-ups', sets: 4, reps: 8, weight: 0, notes: 'Body weight exercise' },
        { name: 'Bent Over Rows', sets: 3, reps: 10, weight: 0, notes: 'Keep back straight' },
        { name: 'Lat Pulldowns', sets: 3, reps: 12, weight: 0, notes: 'Pull to upper chest' },
        { name: 'Seated Cable Rows', sets: 3, reps: 12, weight: 0, notes: 'Squeeze shoulder blades together' }
      ],
      'Legs': [
        { name: 'Squats', sets: 4, reps: 8, weight: 0, notes: 'Go below parallel' },
        { name: 'Deadlifts', sets: 3, reps: 8, weight: 0, notes: 'Keep back straight' },
        { name: 'Lunges', sets: 3, reps: 10, weight: 0, notes: 'Each leg' },
        { name: 'Leg Press', sets: 3, reps: 12, weight: 0, notes: 'Don\'t lock knees at top' }
      ],
      'Shoulders': [
        { name: 'Overhead Press', sets: 4, reps: 8, weight: 0, notes: 'Press straight up' },
        { name: 'Lateral Raises', sets: 3, reps: 12, weight: 0, notes: 'Keep slight bend in elbows' },
        { name: 'Front Raises', sets: 3, reps: 12, weight: 0, notes: 'Alternate arms' },
        { name: 'Face Pulls', sets: 3, reps: 15, weight: 0, notes: 'Pull towards forehead' }
      ],
      'Arms': [
        { name: 'Bicep Curls', sets: 4, reps: 10, weight: 0, notes: 'Strict form' },
        { name: 'Tricep Pushdowns', sets: 3, reps: 12, weight: 0, notes: 'Keep elbows tucked' },
        { name: 'Hammer Curls', sets: 3, reps: 10, weight: 0, notes: 'Neutral grip' },
        { name: 'Skull Crushers', sets: 3, reps: 12, weight: 0, notes: 'Keep upper arms still' }
      ],
      'Core': [
        { name: 'Planks', sets: 3, reps: 0, weight: 0, notes: 'Hold for 45-60 seconds' },
        { name: 'Russian Twists', sets: 3, reps: 20, weight: 0, notes: 'Each side' },
        { name: 'Leg Raises', sets: 3, reps: 15, weight: 0, notes: 'Keep lower back pressed down' },
        { name: 'Ab Rollouts', sets: 3, reps: 10, weight: 0, notes: 'Extend as far as possible' }
      ],
      'Full Body': [
        { name: 'Burpees', sets: 3, reps: 15, weight: 0, notes: 'Full range of motion' },
        { name: 'Kettlebell Swings', sets: 3, reps: 15, weight: 0, notes: 'Hip hinge movement' },
        { name: 'Thrusters', sets: 3, reps: 12, weight: 0, notes: 'Squat to overhead press' },
        { name: 'Mountain Climbers', sets: 3, reps: 30, weight: 0, notes: 'Each leg, fast pace' }
      ],
      'Cardio': [
        { name: 'Running', sets: 1, reps: 0, weight: 0, notes: '20-30 minutes steady state' },
        { name: 'Cycling', sets: 1, reps: 0, weight: 0, notes: '20-30 minutes moderate intensity' },
        { name: 'Jumping Rope', sets: 3, reps: 0, weight: 0, notes: '3 minutes per set' },
        { name: 'Stair Climber', sets: 1, reps: 0, weight: 0, notes: '15-20 minutes' }
      ],
      'HIIT': [
        { name: 'Sprint Intervals', sets: 8, reps: 0, weight: 0, notes: '30 sec sprint, 90 sec rest' },
        { name: 'Battle Ropes', sets: 4, reps: 0, weight: 0, notes: '30 seconds work, 30 seconds rest' },
        { name: 'Box Jumps', sets: 4, reps: 12, weight: 0, notes: 'Explosive movement' },
        { name: 'Burpee to Push-up', sets: 4, reps: 10, weight: 0, notes: 'Full body movement' }
      ]
    };
    
    // Return exercises for the given focus area, or a default set if not found
    return exercisesByArea[focusArea] || exercisesByArea['Full Body'];
  };
  
  const generateSamplePlan = (prompt: string, profileData: any): WorkoutPlan => {
      // This is a placeholder for the AI-generated plan
      // In a real app, this would come from an AI service
      
      const promptLower = prompt.toLowerCase();
      
      // Determine plan type based on prompt
      let planType = 'balanced';
      if (promptLower.includes('strength') || promptLower.includes('muscle') || promptLower.includes('build')) {
        planType = 'strength';
      } else if (promptLower.includes('cardio') || promptLower.includes('endurance') || promptLower.includes('stamina')) {
        planType = 'cardio';
      } else if (promptLower.includes('weight loss') || promptLower.includes('fat loss') || promptLower.includes('slim')) {
        planType = 'weight loss';
      }
      
      // Determine days per week based on prompt
      let days = 3; // default
      if (promptLower.includes('5 day') || promptLower.includes('5-day') || promptLower.includes('five day')) {
        days = 5;
      } else if (promptLower.includes('4 day') || promptLower.includes('4-day') || promptLower.includes('four day')) {
        days = 4;
      } else if (promptLower.includes('3 day') || promptLower.includes('3-day') || promptLower.includes('three day')) {
        days = 3;
      } else if (promptLower.includes('2 day') || promptLower.includes('2-day') || promptLower.includes('two day')) {
        days = 2;
      } else if (promptLower.includes('6 day') || promptLower.includes('6-day') || promptLower.includes('six day')) {
        days = 6;
      }
      
      // Generate plan name
      let name = '';
      if (planType === 'strength') {
        name = `${days}-Day Strength Building Plan`;
      } else if (planType === 'cardio') {
        name = `${days}-Day Cardio & Endurance Plan`;
      } else if (planType === 'weight loss') {
        name = `${days}-Day Weight Loss Program`;
      } else {
        name = `${days}-Day Balanced Fitness Plan`;
      }
      
      // Generate description
      let description = '';
      if (planType === 'strength') {
        description = `A ${days}-day workout plan focused on building strength and muscle mass. This plan incorporates progressive overload principles with compound movements for maximum muscle growth.`;
      } else if (planType === 'cardio') {
        description = `A ${days}-day cardio and endurance plan designed to improve your stamina and cardiovascular health. This plan includes a mix of steady-state cardio and high-intensity interval training.`;
      } else if (planType === 'weight loss') {
        description = `A ${days}-day weight loss program combining resistance training and cardio to maximize calorie burn and preserve lean muscle mass. This plan is designed to create a caloric deficit while keeping your metabolism high.`;
      } else {
        description = `A balanced ${days}-day workout plan targeting all major muscle groups for overall fitness improvement. This plan provides a good mix of strength, cardio, and flexibility training.`;
      }
      
      // Generate workout days based on plan type
      let workoutDays = [];
      
      if (planType === 'strength') {
        // Strength-focused plan
        if (days <= 3) {
          workoutDays = [
            { day: 1, focusArea: 'Full Body' },
            { day: 2, focusArea: 'Rest Day' },
            { day: 3, focusArea: 'Full Body' },
          ];
        } else if (days <= 4) {
          workoutDays = [
            { day: 1, focusArea: 'Chest' },
            { day: 2, focusArea: 'Back' },
            { day: 3, focusArea: 'Legs' },
            { day: 4, focusArea: 'Shoulders' },
          ];
        } else {
          workoutDays = [
            { day: 1, focusArea: 'Chest' },
            { day: 2, focusArea: 'Back' },
            { day: 3, focusArea: 'Legs' },
            { day: 4, focusArea: 'Shoulders' },
            { day: 5, focusArea: 'Arms' },
          ];
          if (days >= 6) {
            workoutDays.push({ day: 6, focusArea: 'Core' });
          }
          if (days >= 7) {
            workoutDays.push({ day: 7, focusArea: 'Rest Day' });
          }
        }
      } else if (planType === 'cardio') {
        // Cardio-focused plan
        if (days <= 3) {
          workoutDays = [
            { day: 1, focusArea: 'HIIT' },
            { day: 2, focusArea: 'Cardio' },
            { day: 3, focusArea: 'HIIT' },
          ];
        } else {
          workoutDays = [
            { day: 1, focusArea: 'HIIT' },
            { day: 2, focusArea: 'Cardio' },
            { day: 3, focusArea: 'HIIT' },
            { day: 4, focusArea: 'Cardio' },
          ];
          if (days >= 5) {
            workoutDays.push({ day: 5, focusArea: 'HIIT' });
          }
          if (days >= 6) {
            workoutDays.push({ day: 6, focusArea: 'Cardio' });
          }
          if (days >= 7) {
            workoutDays.push({ day: 7, focusArea: 'Rest Day' });
          }
        }
      } else if (planType === 'weight loss') {
        // Weight loss plan
        if (days <= 3) {
          workoutDays = [
            { day: 1, focusArea: 'Full Body' },
            { day: 2, focusArea: 'HIIT' },
            { day: 3, focusArea: 'Full Body' },
          ];
        } else {
          workoutDays = [
            { day: 1, focusArea: 'Full Body' },
            { day: 2, focusArea: 'HIIT' },
            { day: 3, focusArea: 'Legs' },
            { day: 4, focusArea: 'Cardio' },
          ];
          if (days >= 5) {
            workoutDays.push({ day: 5, focusArea: 'Full Body' });
          }
          if (days >= 6) {
            workoutDays.push({ day: 6, focusArea: 'HIIT' });
          }
          if (days >= 7) {
            workoutDays.push({ day: 7, focusArea: 'Rest Day' });
          }
        }
      } else {
        // Balanced plan
        if (days <= 3) {
          workoutDays = [
            { day: 1, focusArea: 'Upper Body' },
            { day: 2, focusArea: 'Lower Body' },
            { day: 3, focusArea: 'Full Body' },
          ];
        } else {
          workoutDays = [
            { day: 1, focusArea: 'Chest' },
            { day: 2, focusArea: 'Back' },
            { day: 3, focusArea: 'Legs' },
            { day: 4, focusArea: 'Cardio' },
          ];
          if (days >= 5) {
            workoutDays.push({ day: 5, focusArea: 'Shoulders' });
          }
          if (days >= 6) {
            workoutDays.push({ day: 6, focusArea: 'Arms' });
          }
          if (days >= 7) {
            workoutDays.push({ day: 7, focusArea: 'Rest Day' });
          }
        }
      }
      
      // Trim to the requested number of days
      workoutDays = workoutDays.slice(0, days);
      
      return {
        name,
        description,
        daysPerWeek: days,
        workoutDays
      };
    };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading plan details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: isEditing ? 'Edit Workout Plan' : 'Create Workout Plan',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.secondary.charcoal} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleSavePlan}
              disabled={savingPlan}
            >
              {savingPlan ? (
                <ActivityIndicator size="small" color={Colors.primary.blue} />
              ) : (
                <Save size={24} color={Colors.primary.blue} />
              )}
            </TouchableOpacity>
          )
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        {/* AI Plan Generator */}
        <View style={styles.aiSection}>
          <Text style={styles.aiTitle}>Generate with AI</Text>
          <Text style={styles.aiDescription}>
            Describe your fitness goals and preferences, and our AI will create a personalized workout plan for you.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={aiPrompt}
            onChangeText={(text) => setAiPrompt(text)}
            placeholder="e.g., I want a 4-day strength training plan focused on upper body with limited equipment"
            placeholderTextColor={Colors.background.lightGray}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={handleGenerateAIPlan}
            disabled={generating || !aiPrompt.trim()}
          >
            {generating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Sparkles size={20} color="white" />
                <Text style={styles.generateButtonText}>Generate Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.label}>Plan Name</Text>
          <TextInput
            style={styles.input}
            value={planName}
            onChangeText={setPlanName}
            placeholder="e.g., 3-Day Split, Full Body Plan"
            placeholderTextColor={Colors.background.lightGray}
          />
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your workout plan"
            placeholderTextColor={Colors.background.lightGray}
            multiline
            numberOfLines={4}
          />
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.label}>Days Per Week</Text>
          <View style={styles.daysSelector}>
            <TouchableOpacity 
              style={styles.dayButton}
              onPress={() => handleDaysChange(false)}
              disabled={daysPerWeek <= 1}
            >
              <Minus size={20} color={daysPerWeek <= 1 ? Colors.background.lightGray : Colors.secondary.charcoal} />
            </TouchableOpacity>
            <Text style={styles.daysCount}>{daysPerWeek}</Text>
            <TouchableOpacity 
              style={styles.dayButton}
              onPress={() => handleDaysChange(true)}
              disabled={daysPerWeek >= 7}
            >
              <Plus size={20} color={daysPerWeek >= 7 ? Colors.background.lightGray : Colors.secondary.charcoal} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.label}>Workout Days</Text>
          {workoutDays.map((day, index) => (
            <View key={index} style={styles.dayItem}>
              <Text style={styles.dayNumber}>Day {day.day}</Text>
              <View style={styles.focusAreaContainer}>
                <Text style={styles.focusAreaLabel}>Focus:</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.focusAreaOptions}
                >
                  {focusAreaOptions.map((area) => (
                    <TouchableOpacity
                      key={area}
                      style={[
                        styles.focusAreaButton,
                        day.focusArea === area && styles.focusAreaButtonSelected
                      ]}
                      onPress={() => updateFocusArea(index, area)}
                    >
                      <Text 
                        style={[
                          styles.focusAreaButtonText,
                          day.focusArea === area && styles.focusAreaButtonTextSelected
                        ]}
                      >
                        {area}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.offWhite,
  },
  scrollView: {
    flex: 1,
    padding: 20,
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
  // New styles for AI section
  aiSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  aiTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  aiDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  generateButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
  // Existing styles
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  daysSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.background.offWhite,
  },
  daysCount: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
  },
  dayItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  dayNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 12,
  },
  focusAreaContainer: {
    gap: 8,
  },
  focusAreaLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  focusAreaOptions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
  },
  focusAreaButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background.offWhite,
  },
  focusAreaButtonSelected: {
    backgroundColor: Colors.primary.blue,
  },
  focusAreaButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.secondary.charcoal,
  },
  focusAreaButtonTextSelected: {
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save, Sparkles, Plus, Trash } from 'lucide-react-native';

export default function EditWorkoutDayScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const dayId = params.dayId as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dayData, setDayData] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [exercises, setExercises] = useState<Array<{
    name: string;
    sets: string;
    reps: string;
    weight: string;
    notes: string;
  }>>([]);

  useEffect(() => {
    if (dayId) {
      fetchDayData();
    }
  }, [dayId]);

  const fetchDayData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('workout_plan_days')
        .select('*, workout_plans(*)')
        .eq('id', dayId)
        .single();
        
      if (error) throw error;
      
      setDayData(data);
      setAiPrompt(data.ai_prompt || '');
      
      // If there's an AI-generated workout, parse it
      if (data.ai_generated_workout) {
        const generatedExercises = data.ai_generated_workout.exercises || [];
        setExercises(generatedExercises.map((ex: any) => ({
          name: ex.name || '',
          sets: ex.sets?.toString() || '',
          reps: ex.reps?.toString() || '',
          weight: ex.weight?.toString() || '',
          notes: ex.notes || ''
        })));
      } else if (data.workout_id) {
        // If there's a linked workout, fetch its exercises
        const { data: workoutExercises, error: exercisesError } = await supabase
          .from('workout_exercises')
          .select('*')
          .eq('workout_id', data.workout_id);
          
        if (!exercisesError && workoutExercises) {
          setExercises(workoutExercises.map((ex: any) => ({
            name: ex.exercise_name || '',
            sets: ex.sets?.toString() || '',
            reps: ex.reps?.toString() || '',
            weight: ex.weight_kg?.toString() || '',
            notes: ex.notes || ''
          })));
        }
      } else {
        // Initialize with empty exercises
        setExercises([{ name: '', sets: '', reps: '', weight: '', notes: '' }]);
      }
      
    } catch (error) {
      console.error('Error fetching day data:', error);
      Alert.alert('Error', 'Failed to load workout day details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkout = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt for the AI');
      return;
    }
    
    try {
      setGenerating(true);
      
      // Get user profile data to include in the request
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile data:', profileError);
      }
      
      // Call the backend API to generate a workout
      console.log('Calling API at: http://192.168.1.25:5000/api/workout-plan/generate');
      const response = await fetch('http://192.168.1.25:5000/api/workout-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          focusArea: dayData.focus_area,
          preferences: aiPrompt,
          profileData,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      if (!data.exercises || !Array.isArray(data.exercises)) {
        throw new Error('Invalid response format from API');
      }
      
      // Format the exercises for our app
      const formattedExercises = data.exercises.map((ex: any) => ({
        name: ex.name || '',
        sets: ex.sets?.toString() || '',
        reps: ex.reps?.toString() || '',
        weight: ex.weight?.toString() || '',
        notes: ex.notes || ''
      }));
      
      setExercises(formattedExercises);
      
      // Save the AI-generated workout
      const aiGeneratedWorkout = {
        prompt: aiPrompt,
        focus_area: dayData.focus_area,
        exercises: formattedExercises,
        generated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('workout_plan_days')
        .update({
          ai_prompt: aiPrompt,
          ai_generated_workout: aiGeneratedWorkout,
          updated_at: new Date().toISOString()
        })
        .eq('id', dayId);
        
      if (error) throw error;
      
    } catch (error) {
      console.error('Error generating workout:', error);
      Alert.alert('Error', 'Failed to generate workout');
      
      // Fallback to the sample workout generator if API fails
      const sampleExercises = generateSampleWorkout(dayData.focus_area, aiPrompt);
      setExercises(sampleExercises);
    } finally {
      setGenerating(false);
    }
  };

  // Keep this as a fallback in case the API call fails
  const generateSampleWorkout = (focusArea: string, prompt: string) => {
    // This is a placeholder for the AI-generated workout
    // In a real app, this would come from an AI service
    
    const isQuick = prompt.toLowerCase().includes('quick') || prompt.toLowerCase().includes('short');
    const isIntense = prompt.toLowerCase().includes('intense') || prompt.toLowerCase().includes('hard');
    
    let exercises = [];
    
    switch (focusArea.toLowerCase()) {
      case 'chest':
        exercises = [
          { name: 'Bench Press', sets: isQuick ? '3' : '4', reps: isIntense ? '6-8' : '10-12', weight: '', notes: '' },
          { name: 'Incline Dumbbell Press', sets: isQuick ? '3' : '4', reps: '10-12', weight: '', notes: '' },
          { name: 'Chest Flyes', sets: '3', reps: '12-15', weight: '', notes: '' },
        ];
        if (!isQuick) {
          exercises.push({ name: 'Push-ups', sets: '3', reps: 'To failure', weight: '', notes: '' });
          exercises.push({ name: 'Cable Crossovers', sets: '3', reps: '15-20', weight: '', notes: '' });
        }
        break;
        
      case 'back':
        exercises = [
          { name: 'Pull-ups', sets: isQuick ? '3' : '4', reps: isIntense ? '6-8' : '8-10', weight: '', notes: '' },
          { name: 'Bent Over Rows', sets: isQuick ? '3' : '4', reps: '10-12', weight: '', notes: '' },
          { name: 'Lat Pulldowns', sets: '3', reps: '12-15', weight: '', notes: '' },
        ];
        if (!isQuick) {
          exercises.push({ name: 'Seated Cable Rows', sets: '3', reps: '10-12', weight: '', notes: '' });
          exercises.push({ name: 'Face Pulls', sets: '3', reps: '15-20', weight: '', notes: '' });
        }
        break;
        
      case 'legs':
        exercises = [
          { name: 'Squats', sets: isQuick ? '3' : '4', reps: isIntense ? '6-8' : '10-12', weight: '', notes: '' },
          { name: 'Romanian Deadlifts', sets: isQuick ? '3' : '4', reps: '10-12', weight: '', notes: '' },
          { name: 'Leg Press', sets: '3', reps: '12-15', weight: '', notes: '' },
        ];
        if (!isQuick) {
          exercises.push({ name: 'Walking Lunges', sets: '3', reps: '10 each leg', weight: '', notes: '' });
          exercises.push({ name: 'Calf Raises', sets: '4', reps: '15-20', weight: '', notes: '' });
        }
        break;
        
      default:
        exercises = [
          { name: 'Push-ups', sets: '3', reps: '10-15', weight: '', notes: '' },
          { name: 'Bodyweight Squats', sets: '3', reps: '15-20', weight: '', notes: '' },
          { name: 'Plank', sets: '3', reps: '30-60 sec', weight: '', notes: '' },
        ];
    }
    
    return exercises;
  };

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: '', reps: '', weight: '', notes: '' }]);
  };

  const removeExercise = (index: number) => {
    const updatedExercises = [...exercises];
    updatedExercises.splice(index, 1);
    setExercises(updatedExercises);
  };

  const updateExercise = (index: number, field: string, value: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
  };

  const handleSaveWorkout = async () => {
    try {
      setSaving(true);
      
      // Validate exercises
      if (exercises.length === 0 || !exercises[0].name) {
        Alert.alert('Error', 'Please add at least one exercise');
        setSaving(false);
        return;
      }
      
      // Create or update the workout
      let workoutId = dayData.workout_id;
      
      if (!workoutId) {
        // Create a new workout
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: dayData.workout_plans.user_id,
            name: `${dayData.focus_area} Workout`,
            duration_minutes: 45, // Default duration
            completed_at: null, // Not completed yet
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (workoutError) throw workoutError;
        
        workoutId = workoutData.id;
        
        // Update the day with the workout ID
        const { error: dayUpdateError } = await supabase
          .from('workout_plan_days')
          .update({
            workout_id: workoutId,
            updated_at: new Date().toISOString()
          })
          .eq('id', dayId);
          
        if (dayUpdateError) throw dayUpdateError;
      } else {
        // Delete existing exercises for this workout
        const { error: deleteError } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', workoutId);
          
        if (deleteError) throw deleteError;
      }
      
      // Insert the exercises
      const exercisesToInsert = exercises.map(ex => ({
        workout_id: workoutId,
        exercise_name: ex.name,
        sets: parseInt(ex.sets) || 3,
        reps: parseInt(ex.reps) || 10,
        weight_kg: parseFloat(ex.weight) || null,
        notes: ex.notes
      }));
      
      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert);
        
      if (exercisesError) throw exercisesError;
      
      Alert.alert(
        'Success', 
        'Workout saved successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading workout details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: `Edit ${dayData?.focus_area || 'Workout'} Day`,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.secondary.charcoal} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleSaveWorkout}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary.blue} />
              ) : (
                <Save size={24} color={Colors.primary.blue} />
              )}
            </TouchableOpacity>
          )
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Workout Generator</Text>
          <Text style={styles.sectionDescription}>
            Describe what kind of workout you want for this day, and our AI will generate it for you.
          </Text>
          
          <View style={styles.promptContainer}>
            <TextInput
              style={styles.promptInput}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder="e.g., I want a quick 30-minute chest workout with minimal equipment"
              placeholderTextColor={Colors.background.lightGray}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={handleGenerateWorkout}
              disabled={generating || !aiPrompt.trim()}
            >
              {generating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Sparkles size={18} color="white" />
                  <Text style={styles.generateButtonText}>Generate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addExercise}
            >
              <Plus size={20} color={Colors.primary.blue} />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
          
          {exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>Exercise {index + 1}</Text>
                <TouchableOpacity 
                  onPress={() => removeExercise(index)}
                  disabled={exercises.length === 1}
                >
                  <Trash 
                    size={20} 
                    color={exercises.length === 1 ? Colors.background.lightGray : Colors.accent.peach} 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Exercise Name</Text>
                <TextInput
                  style={styles.input}
                  value={exercise.name}
                  onChangeText={(value) => updateExercise(index, 'name', value)}
                  placeholder="e.g., Bench Press, Squats"
                  placeholderTextColor={Colors.background.lightGray}
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Sets</Text>
                  <TextInput
                    style={styles.input}
                    value={exercise.sets}
                    onChangeText={(value) => updateExercise(index, 'sets', value)}
                    placeholder="3"
                    placeholderTextColor={Colors.background.lightGray}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Reps</Text>
                  <TextInput
                    style={styles.input}
                    value={exercise.reps}
                    onChangeText={(value) => updateExercise(index, 'reps', value)}
                    placeholder="10-12"
                    placeholderTextColor={Colors.background.lightGray}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={exercise.weight}
                    onChangeText={(value) => updateExercise(index, 'weight', value)}
                    placeholder="Optional"
                    placeholderTextColor={Colors.background.lightGray}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={exercise.notes}
                  onChangeText={(value) => updateExercise(index, 'notes', value)}
                  placeholder="Any additional instructions or notes"
                  placeholderTextColor={Colors.background.lightGray}
                  multiline
                />
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  promptInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  generateButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.primary.blue,
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background.offWhite,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
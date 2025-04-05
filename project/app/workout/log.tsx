import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Save, Clock, Dumbbell, CheckCircle2, X } from 'lucide-react-native';

export default function LogWorkoutScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const workoutId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<Array<{
    id?: string;
    name: string;
    sets: Array<{
      reps: string;
      weight: string;
      completed: boolean;
    }>;
    notes: string;
  }>>([]);
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (workoutId) {
      fetchWorkoutDetails();
    }
  }, [workoutId]);

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();
        
      if (workoutError) throw workoutError;
      
      setWorkout(workoutData);
      setDuration(workoutData.duration_minutes?.toString() || '45');
      setNotes(workoutData.notes || '');
      
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('created_at', { ascending: true });
        
      if (exercisesError) throw exercisesError;
      
      if (exercisesData && exercisesData.length > 0) {
        const formattedExercises = exercisesData.map(ex => ({
          id: ex.id,
          name: ex.exercise_name,
          sets: Array.from({ length: ex.sets || 3 }, () => ({
            reps: ex.reps?.toString() || '10',
            weight: ex.weight_kg?.toString() || '',
            completed: false
          })),
          notes: ex.notes || ''
        }));
        setExercises(formattedExercises);
      } else {
        // Initialize with empty exercise if none exist
        setExercises([{
          name: '',
          sets: Array.from({ length: 3 }, () => ({
            reps: '10',
            weight: '',
            completed: false
          })),
          notes: ''
        }]);
      }
      
    } catch (error) {
      console.error('Error fetching workout details:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = () => {
    setExercises([...exercises, {
      name: '',
      sets: Array.from({ length: 3 }, () => ({
        reps: '10',
        weight: '',
        completed: false
      })),
      notes: ''
    }]);
  };

  const handleRemoveExercise = (index: number) => {
    const updatedExercises = [...exercises];
    updatedExercises.splice(index, 1);
    setExercises(updatedExercises);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.push({
      reps: '10',
      weight: '',
      completed: false
    });
    setExercises(updatedExercises);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    setExercises(updatedExercises);
  };

  const updateExerciseName = (index: number, name: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[index].name = name;
    setExercises(updatedExercises);
  };

  const updateExerciseNotes = (index: number, notes: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[index].notes = notes;
    setExercises(updatedExercises);
  };

  const updateSetValue = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updatedExercises);
  };

  const toggleSetCompletion = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex].completed = 
      !updatedExercises[exerciseIndex].sets[setIndex].completed;
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
      
      // Calculate completion percentage
      const totalSets = exercises.reduce((total, ex) => total + ex.sets.length, 0);
      const completedSets = exercises.reduce((total, ex) => 
        total + ex.sets.filter(set => set.completed).length, 0);
      
      const completionPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
      const isFullyCompleted = completionPercentage === 100;
      
      // Update the workout
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({
          duration_minutes: parseInt(duration) || 45,
          notes: notes,
          completed_at: isFullyCompleted ? new Date().toISOString() : null,
          completion_percentage: Math.round(completionPercentage),
          updated_at: new Date().toISOString()
        })
        .eq('id', workoutId);
        
      if (workoutError) throw workoutError;
      
      // Delete existing exercises
      const { error: deleteError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);
        
      if (deleteError) throw deleteError;
      
      // Insert updated exercises
      const exercisesToInsert = exercises.map(ex => ({
        workout_id: workoutId,
        exercise_name: ex.name,
        sets: ex.sets.length,
        reps: parseInt(ex.sets[0]?.reps) || 10,
        weight_kg: parseFloat(ex.sets[0]?.weight) || null,
        notes: ex.notes,
        completed_sets: ex.sets.filter(set => set.completed).length
      }));
      
      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert);
        
      if (exercisesError) throw exercisesError;
      
      // Save detailed set data to a separate table if needed
      // This would be useful for tracking progress over time
      
      Alert.alert(
        'Success', 
        isFullyCompleted 
          ? 'Workout completed and saved successfully!' 
          : 'Workout progress saved successfully!',
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
          title: 'Log Workout',
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
        <View style={styles.header}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          
          <View style={styles.durationContainer}>
            <Clock size={20} color={Colors.primary.blue} />
            <TextInput
              style={styles.durationInput}
              value={duration}
              onChangeText={setDuration}
              placeholder="Duration (minutes)"
              placeholderTextColor={Colors.background.lightGray}
              keyboardType="number-pad"
            />
            <Text style={styles.durationLabel}>minutes</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddExercise}
            >
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
          
          {exercises.map((exercise, exerciseIndex) => (
            <View key={exerciseIndex} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNameContainer}>
                  <Dumbbell size={20} color={Colors.primary.blue} />
                  <TextInput
                    style={styles.exerciseNameInput}
                    value={exercise.name}
                    onChangeText={(text) => updateExerciseName(exerciseIndex, text)}
                    placeholder="Exercise name"
                    placeholderTextColor={Colors.background.lightGray}
                  />
                </View>
                
                {exercises.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => handleRemoveExercise(exerciseIndex)}
                    style={styles.removeButton}
                  >
                    <X size={18} color={Colors.accent.peach} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.setsContainer}>
                <View style={styles.setHeader}>
                  <Text style={styles.setHeaderText}>Set</Text>
                  <Text style={styles.setHeaderText}>Reps</Text>
                  <Text style={styles.setHeaderText}>Weight (kg)</Text>
                  <Text style={styles.setHeaderText}>Done</Text>
                </View>
                
                {exercise.sets.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setRow}>
                    <View style={styles.setNumberContainer}>
                      <Text style={styles.setNumber}>{setIndex + 1}</Text>
                      {exercise.sets.length > 1 && (
                        <TouchableOpacity 
                          onPress={() => handleRemoveSet(exerciseIndex, setIndex)}
                          style={styles.removeSetButton}
                        >
                          <X size={14} color={Colors.background.lightGray} />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <TextInput
                      style={styles.setInput}
                      value={set.reps}
                      onChangeText={(text) => updateSetValue(exerciseIndex, setIndex, 'reps', text)}
                      placeholder="10"
                      placeholderTextColor={Colors.background.lightGray}
                      keyboardType="number-pad"
                    />
                    
                    <TextInput
                      style={styles.setInput}
                      value={set.weight}
                      onChangeText={(text) => updateSetValue(exerciseIndex, setIndex, 'weight', text)}
                      placeholder="0"
                      placeholderTextColor={Colors.background.lightGray}
                      keyboardType="decimal-pad"
                    />
                    
                    <TouchableOpacity 
                      style={[
                        styles.completionButton,
                        set.completed && styles.completionButtonActive
                      ]}
                      onPress={() => toggleSetCompletion(exerciseIndex, setIndex)}
                    >
                      <CheckCircle2 
                        size={20} 
                        color={set.completed ? 'white' : Colors.background.lightGray} 
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity 
                  style={styles.addSetButton}
                  onPress={() => handleAddSet(exerciseIndex)}
                >
                  <Text style={styles.addSetButtonText}>Add Set</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.notesInput}
                value={exercise.notes}
                onChangeText={(text) => updateExerciseNotes(exerciseIndex, text)}
                placeholder="Notes (optional)"
                placeholderTextColor={Colors.background.lightGray}
                multiline
              />
            </View>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Notes</Text>
          <TextInput
            style={styles.workoutNotesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this workout session (optional)"
            placeholderTextColor={Colors.background.lightGray}
            multiline
            numberOfLines={4}
          />
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
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.offWhite,
  },
  workoutName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationInput: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.lightGray,
  },
  durationLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
    marginLeft: 8,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
  },
  addButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'white',
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
  exerciseNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseNameInput: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginLeft: 8,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  setsContainer: {
    marginBottom: 16,
  },
  setHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  setHeaderText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
  },
  setNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginRight: 8,
  },
  removeSetButton: {
    padding: 4,
  },
  setInput: {
    flex: 1,
    backgroundColor: Colors.background.offWhite,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    textAlign: 'center',
  },
  completionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  completionButtonActive: {
    backgroundColor: Colors.primary.green,
  },
  addSetButton: {
    backgroundColor: Colors.background.offWhite,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addSetButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.primary.blue,
  },
  notesInput: {
    backgroundColor: Colors.background.offWhite,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.secondary.charcoal,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  workoutNotesInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Clock, Flame, Dumbbell, CheckCircle2, Calendar } from 'lucide-react-native';
import { format } from 'date-fns';

interface CompletedExercise {
  id: string;
  exercise_name: string;
  sets_data: Array<{
    reps: string;
    weight: string;
    completed: boolean;
  }>;
  notes: string;
}

interface CompletedWorkout {
  id: string;
  workout_id: string;
  user_id: string;
  completed_at: string;
  duration_minutes: number;
  calories_burned: number;
  notes: string;
  workout_name: string;
  exercises: CompletedExercise[];
}

export default function CompletedWorkoutScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const completedWorkoutId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<CompletedWorkout | null>(null);

  useEffect(() => {
    if (completedWorkoutId) {
      fetchCompletedWorkout();
    }
  }, [completedWorkoutId]);

  const fetchCompletedWorkout = async () => {
    try {
      setLoading(true);
      
      // Fetch the completed workout
      const { data: completedData, error: completedError } = await supabase
        .from('completed_workouts')
        .select('*')
        .eq('id', completedWorkoutId)
        .single();
        
      if (completedError) throw completedError;
      
      // Use workout_name from completed_workouts if available, otherwise fetch from workouts table
      let workoutName = completedData.workout_name;
      
      if (!workoutName) {
        // Fetch the workout name only if not already in completed_workouts
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .select('name')
          .eq('id', completedData.workout_id)
          .single();
          
        if (workoutError && workoutError.code !== 'PGRST116') {
          // PGRST116 is "Row not found" - we can handle this by using a default name
          throw workoutError;
        }
        
        workoutName = workoutData?.name || 'Custom Workout';
      }
      
      // Fetch the exercises for this completed workout
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('completed_workout_exercises')
        .select('*')
        .eq('completed_workout_id', completedWorkoutId)
        .order('created_at', { ascending: true });
        
      if (exercisesError) throw exercisesError;
      
      // Format the exercises data
      const formattedExercises = exercisesData.map(ex => ({
        id: ex.id,
        exercise_name: ex.exercise_name,
        sets_data: typeof ex.sets_data === 'string' ? JSON.parse(ex.sets_data) : ex.sets_data,
        notes: ex.notes
      }));
      
      // Combine all the data
      setWorkout({
        ...completedData,
        workout_name: workoutName, // Use the workout_name from the database or the one we fetched
        exercises: formattedExercises
      });
      
    } catch (error) {
      console.error('Error fetching completed workout:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy • h:mm a');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading workout details...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Workout not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Completed Workout',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.secondary.charcoal} />
            </TouchableOpacity>
          )
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.workoutName}>{workout.workout_name}</Text>
          
          <View style={styles.dateContainer}>
            <Calendar size={18} color={Colors.background.lightGray} />
            <Text style={styles.dateText}>{formatDate(workout.completed_at)}</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Clock size={20} color={Colors.primary.blue} />
              <Text style={styles.statValue}>{workout.duration_minutes}</Text>
              <Text style={styles.statLabel}>minutes</Text>
            </View>
            
            <View style={styles.statItem}>
              <Flame size={20} color={Colors.accent.peach} />
              <Text style={styles.statValue}>{workout.calories_burned}</Text>
              <Text style={styles.statLabel}>calories</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          
          {workout.exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNameContainer}>
                  <Dumbbell size={20} color={Colors.primary.blue} />
                  <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                </View>
              </View>
              
              <View style={styles.setsContainer}>
                <View style={styles.setHeader}>
                  <Text style={styles.setHeaderText}>Set</Text>
                  <Text style={styles.setHeaderText}>Reps</Text>
                  <Text style={styles.setHeaderText}>Weight (kg)</Text>
                  <Text style={styles.setHeaderText}>Completed</Text>
                </View>
                
                {exercise.sets_data.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setRow}>
                    <Text style={styles.setNumber}>{setIndex + 1}</Text>
                    <Text style={styles.setValue}>{set.reps}</Text>
                    <Text style={styles.setValue}>{set.weight || '0'}</Text>
                    <View style={styles.completionIndicator}>
                      <CheckCircle2 
                        size={20} 
                        color={set.completed ? Colors.primary.green : Colors.background.lightGray} 
                      />
                    </View>
                  </View>
                ))}
              </View>
              
              {exercise.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{exercise.notes}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        
        {workout.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.workoutNotesText}>{workout.notes}</Text>
            </View>
          </View>
        )}
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
  errorText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
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
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginLeft: 8,
    marginRight: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
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
  },
  exerciseName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginLeft: 8,
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
    paddingHorizontal: 8,
  },
  setNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    width: 30,
  },
  setValue: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    textAlign: 'center',
  },
  completionIndicator: {
    width: 40,
    alignItems: 'center',
  },
  notesContainer: {
    backgroundColor: Colors.background.offWhite,
    borderRadius: 8,
    padding: 12,
  },
  notesLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  notesText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.secondary.charcoal,
  },
  notesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  workoutNotesText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
});
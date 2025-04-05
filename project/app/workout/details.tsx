import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Clock, Flame, Edit, CheckCircle, Dumbbell } from 'lucide-react-native';

export default function WorkoutDetailsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const workoutId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);

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
      
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('created_at', { ascending: true });
        
      if (exercisesError) throw exercisesError;
      
      setExercises(exercisesData || []);
      
    } catch (error) {
      console.error('Error fetching workout details:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWorkout = async () => {
    try {
      setCompleting(true);
      
      // Calculate calories burned (simplified formula)
      // In a real app, this would be more sophisticated based on user's weight, workout intensity, etc.
      const caloriesBurned = Math.round((workout.duration_minutes * 7) + (exercises.length * 10));
      
      // Instead of updating the workout, create a new completed_workout record
      const { data, error } = await supabase
        .from('completed_workouts')
        .insert({
          workout_id: workoutId,
          user_id: user?.id,
          duration_minutes: workout.duration_minutes,
          calories_burned: caloriesBurned,
          notes: workout.notes
        })
        .select()
        .single();
        
      if (error) throw error;
      
      Alert.alert(
        'Workout Completed!', 
        `Great job! You burned approximately ${caloriesBurned} calories.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error completing workout:', error);
      Alert.alert('Error', 'Failed to mark workout as completed');
    } finally {
      setCompleting(false);
    }
  };

  const handleEditWorkout = () => {
    // Find the workout plan day that contains this workout
    router.push({
      pathname: '/workout/log',
      params: { id: workoutId }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading workout details...</Text>
      </View>
    );
  }

  const isCompleted = !!workout.completed_at;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Workout Details',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={Colors.secondary.charcoal} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            !isCompleted && (
              <TouchableOpacity onPress={handleEditWorkout}>
                <Edit size={24} color={Colors.primary.blue} />
              </TouchableOpacity>
            )
          )
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Clock size={20} color={Colors.primary.blue} />
              <Text style={styles.statValue}>{workout.duration_minutes} min</Text>
            </View>
            
            {isCompleted && (
              <View style={styles.stat}>
                <Flame size={20} color={Colors.accent.peach} />
                <Text style={styles.statValue}>{workout.calories_burned || 0} cal</Text>
              </View>
            )}
          </View>
          
          {isCompleted ? (
            <View style={styles.completedBadge}>
              <CheckCircle size={16} color="white" />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleCompleteWorkout}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <CheckCircle size={20} color="white" />
                  <Text style={styles.completeButtonText}>Complete Workout</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          
          {exercises.length > 0 ? (
            exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Dumbbell size={20} color={Colors.primary.blue} />
                  <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                </View>
                
                <View style={styles.exerciseDetails}>
                  <View style={styles.exerciseDetail}>
                    <Text style={styles.detailLabel}>Sets</Text>
                    <Text style={styles.detailValue}>{exercise.sets}</Text>
                  </View>
                  
                  <View style={styles.exerciseDetail}>
                    <Text style={styles.detailLabel}>Reps</Text>
                    <Text style={styles.detailValue}>{exercise.reps}</Text>
                  </View>
                  
                  {exercise.weight_kg && (
                    <View style={styles.exerciseDetail}>
                      <Text style={styles.detailLabel}>Weight</Text>
                      <Text style={styles.detailValue}>{exercise.weight_kg} kg</Text>
                    </View>
                  )}
                </View>
                
                {exercise.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{exercise.notes}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No exercises found for this workout</Text>
            </View>
          )}
        </View>
        
        {workout.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.workoutNotes}>{workout.notes}</Text>
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
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  statValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginLeft: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.green,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  completedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'white',
  },
  completeButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  completeButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
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
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exerciseName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  exerciseDetail: {
    marginRight: 24,
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  detailValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.background.offWhite,
    paddingTop: 12,
  },
  notesLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.background.lightGray,
    marginBottom: 4,
  },
  notesText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.secondary.charcoal,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
  },
  notesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  workoutNotes: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
});
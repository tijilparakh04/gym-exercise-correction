import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Dumbbell, Clock, Flame, ChevronRight, Calendar, Plus, Edit } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

// Define types for our data structures
interface WorkoutPlanDay {
  id: string;
  day_number: number;
  focus_area: string;
  workout_id?: string;
  ai_generated_workout?: any;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  days_per_week: number;
  workout_plan_days: WorkoutPlanDay[];
}

interface TodaysWorkout {
  id?: string;
  name: string;
  duration_minutes?: number;
  calories_burned?: number;
  ai_generated?: boolean;
  planDay: WorkoutPlanDay;
}

interface RecentWorkout {
  id: string;
  workoutId?: string;  // Add workoutId property
  name: string;
  duration: string;
  calories: string;
  date: string;
  completedWorkoutId?: string; // Add completedWorkoutId property
}


export default function WorkoutScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('Strength Training');
  const [loading, setLoading] = useState(true);
  const [todaysWorkout, setTodaysWorkout] = useState<TodaysWorkout | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    if (user) {
      fetchWorkoutData();
    }
  }, [user]);

  // Update the fetchWorkoutData function to fetch completed workouts
  const fetchWorkoutData = async () => {
    try {
      setLoading(true);
      
      // Get today's day of the week (0 = Sunday, 1 = Monday, etc.)
      const today = new Date().getDay();
      // Convert to 1-7 format where 1 = Monday, 7 = Sunday
      const dayNumber = today === 0 ? 7 : today;
      
      // Fetch user's active workout plan
      const { data: planData, error: planError } = await supabase
        .from('workout_plans')
        .select('*, workout_plan_days(*)')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (planError) throw planError;
      
      if (planData && planData.length > 0) {
        setWorkoutPlan(planData[0] as WorkoutPlan);
        
        // Find today's workout from the plan
        const todaysPlanDay = planData[0].workout_plan_days.find(
          (day: WorkoutPlanDay) => day.day_number === dayNumber
        );
        
        if (todaysPlanDay) {
          if (todaysPlanDay.workout_id) {
            // Fetch the linked workout if it exists
            const { data: workoutData, error: workoutError } = await supabase
              .from('workouts')
              .select('*')
              .eq('id', todaysPlanDay.workout_id)
              .single();
              
            if (!workoutError && workoutData) {
              setTodaysWorkout({
                ...workoutData,
                planDay: todaysPlanDay
              });
            }
          } else if (todaysPlanDay.ai_generated_workout) {
            // Use the AI generated workout
            setTodaysWorkout({
              name: `${todaysPlanDay.focus_area} Workout`,
              ai_generated: true,
              planDay: todaysPlanDay,
              ...todaysPlanDay.ai_generated_workout
            });
          }
        }
      }
      
      // Fetch recent completed workouts instead of all workouts
      const { data: recentData, error: recentError } = await supabase
        .from('completed_workouts')
        .select(`
          id,
          workout_id,
          duration_minutes,
          calories_burned,
          completed_at
        `)
        .eq('user_id', user?.id || '')
        .order('completed_at', { ascending: false })
        .limit(5);
        
      if (recentError) throw recentError;
      
      if (recentData) {
        const transformedData = await Promise.all(recentData.map(async (item) => {
          // Fetch workout name in a separate query
          let workoutName = 'Unknown Workout';
          
          if (item.workout_id) {
            const { data: workoutData } = await supabase
              .from('workouts')
              .select('name')
              .eq('id', item.workout_id)
              .single();
              
            if (workoutData) {
              workoutName = workoutData.name;
            }
          }
          
          return {
            id: item.workout_id,
            name: workoutName,
            duration: `${item.duration_minutes} min`,
            calories: item.calories_burned?.toString() || '0',
            date: formatDate(item.completed_at),
            completedWorkoutId: item.id
          };
        }));
        
        setRecentWorkouts(transformedData);
      }
      
    } catch (error) {
      console.error('Error fetching workout data:', error);
      Alert.alert('Error', 'Failed to load workout data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const completed = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (completed.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (completed.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      // Format as "X days ago" if within the last week
      const diffTime = Math.abs(today.getTime() - completed.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        return `${diffDays} days ago`;
      } else {
        // Format as MM/DD/YYYY for older dates
        return completed.toLocaleDateString();
      }
    }
  };

  const handleCreateWorkoutPlan = () => {
    // Navigate to workout plan creation screen
    router.push('/workout/create-plan');
  };

  const handleEditTodaysWorkout = () => {
    if (todaysWorkout?.planDay) {
      router.push({
        pathname: '/workout/edit-day',
        params: { dayId: todaysWorkout.planDay.id }
      });
    } else {
      // If no today's workout, navigate to log workout screen
      router.push('/workout/log');
    }
  };

  // Add a function to handle logging a workout
  const handleLogWorkout = () => {
    router.push('/workout/log');
  };

  const handleViewWorkout = (workoutId: string, completedWorkoutId?: string) => {
      if (completedWorkoutId) {
        router.push({
          pathname: '/workout/completed',
          params: { id: completedWorkoutId }
        });
      } else if (workoutId) {
        router.push({
          pathname: '/workout/details',
          params: { id: workoutId }
        });
      }
    };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading workouts...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
      </View>


      {/* Workout Plan Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Workout Plan</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCreateWorkoutPlan}
          >
            {workoutPlan ? (
              <Edit size={20} color={Colors.primary.blue} />
            ) : (
              <Plus size={20} color={Colors.primary.blue} />
            )}
          </TouchableOpacity>
        </View>
        
        {workoutPlan ? (
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{workoutPlan.name}</Text>
              <Text style={styles.planSubtitle}>{workoutPlan.days_per_week} days per week</Text>
            </View>
            <Text style={styles.planDescription}>{workoutPlan.description}</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.createPlanCard}
            onPress={handleCreateWorkoutPlan}
          >
            <Calendar size={24} color={Colors.primary.blue} />
            <Text style={styles.createPlanText}>Create a Workout Plan</Text>
            <Text style={styles.createPlanSubtext}>
              Get AI-generated workouts tailored to your goals
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Today's Workout Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Workout</Text>
          {todaysWorkout && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleEditTodaysWorkout}
            >
              <Edit size={20} color={Colors.primary.blue} />
            </TouchableOpacity>
          )}
        </View>
        
        {todaysWorkout ? (
          <TouchableOpacity 
            style={styles.todaysWorkoutCard}
            onPress={() => todaysWorkout.id && handleViewWorkout(todaysWorkout.id)}
          >
            <View style={styles.todaysWorkoutContent}>
              <Text style={styles.todaysWorkoutTitle}>{todaysWorkout.name}</Text>
              <Text style={styles.todaysWorkoutSubtitle}>
                {todaysWorkout.duration_minutes || 45} min • {todaysWorkout.planDay.focus_area}
              </Text>
              {todaysWorkout.ai_generated && (
                <View style={styles.aiGeneratedBadge}>
                  <Text style={styles.aiGeneratedText}>AI Generated</Text>
                </View>
              )}
            </View>
            <ChevronRight size={24} color={Colors.primary.blue} />
          </TouchableOpacity>
        ) : workoutPlan ? (
          <TouchableOpacity 
            style={styles.createTodaysWorkoutCard}
            onPress={handleLogWorkout}
          >
            <Plus size={24} color={Colors.primary.blue} />
            <Text style={styles.createTodaysWorkoutText}>Log Today's Workout</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noWorkoutCard}>
            <Text style={styles.noWorkoutText}>
              Create a workout plan to see your daily workouts
            </Text>
          </View>
        )}
      </View>

      {/* Current Workout Plan Workouts Section */}
      {workoutPlan && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Plan Workouts</Text>
          {workoutPlan.workout_plan_days.length > 0 ? (
            workoutPlan.workout_plan_days.map((day, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.planWorkoutCard}
                onPress={() => day.workout_id && handleViewWorkout(day.workout_id)}
              >
                <View style={styles.planWorkoutInfo}>
                  <Text style={styles.planWorkoutTitle}>
                    Day {day.day_number}: {day.focus_area}
                  </Text>
                  <Text style={styles.planWorkoutSubtitle}>
                    {day.workout_id ? 'Workout Ready' : 'No workout created yet'}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.primary.blue} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noWorkoutCard}>
              <Text style={styles.noWorkoutText}>
                No workouts in your current plan
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Recent Workouts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.map((workout, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.recentCard}
              onPress={() => handleViewWorkout(workout.workoutId || '', workout.completedWorkoutId)}
            >
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{workout.name}</Text>
                <Text style={styles.recentSubtitle}>{workout.date}</Text>
              </View>
              <View style={styles.recentStats}>
                <View style={styles.stat}>
                  <Clock size={16} color={Colors.background.lightGray} />
                  <Text style={styles.statText}>{workout.duration}</Text>
                </View>
                <View style={styles.stat}>
                  <Flame size={16} color={Colors.background.lightGray} />
                  <Text style={styles.statText}>{workout.calories} cal</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noWorkoutCard}>
            <Text style={styles.noWorkoutText}>
              You haven't completed any workouts yet
            </Text>
          </View>
        )}
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
    paddingTop: 100,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    marginTop: 10,
    color: Colors.secondary.charcoal,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 32,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
  },
  categories: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  categoryName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.secondary.charcoal,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: 'white',
  },
  section: {
    padding: 20,
    paddingTop: 0,
    marginBottom: 10,
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
    marginBottom: 16,
  },
  actionButton: {
    padding: 8,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
  },
  planHeader: {
    marginBottom: 10,
  },
  planName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
  },
  planSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  planDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.secondary.charcoal,
  },
  createPlanCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  createPlanText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  createPlanSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    textAlign: 'center',
  },
  todaysWorkoutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todaysWorkoutContent: {
    gap: 4,
  },
  todaysWorkoutTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
  },
  todaysWorkoutSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  aiGeneratedBadge: {
    backgroundColor: Colors.primary.blue + '20', // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  aiGeneratedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.primary.blue,
  },
  createTodaysWorkoutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  createTodaysWorkoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  noWorkoutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  noWorkoutText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    textAlign: 'center',
  },
  recentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  recentInfo: {
    marginBottom: 12,
  },
  recentTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  recentSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  recentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  planWorkoutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planWorkoutInfo: {
    flex: 1,
  },
  planWorkoutTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  planWorkoutSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
});
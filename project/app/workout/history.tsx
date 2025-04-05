import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, Flame, CheckCircle, ArrowRight } from 'lucide-react-native';
import { format } from 'date-fns';


export default function WorkoutHistoryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalMinutes: 0,
    totalCalories: 0,
    completionRate: 0
  });

  useEffect(() => {
    if (user) {
      fetchWorkoutHistory();
    }
  }, [user]);

  const fetchWorkoutHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch completed workouts instead of all workouts
      const { data, error } = await supabase
        .from('completed_workouts')
        .select(`
          id,
          workout_id,
          duration_minutes,
          calories_burned,
          completed_at,
          notes,
          workouts:workout_id (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false });
        
      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedData = data?.map(item => ({
        id: item.workout_id,
        name: Array.isArray(item.workouts) && item.workouts[0]?.name || 'Unknown Workout',
        duration_minutes: item.duration_minutes,
        calories_burned: item.calories_burned,
        completed_at: item.completed_at,
        notes: item.notes,
        completedWorkoutId: item.id
      })) || [];
      
      setWorkouts(transformedData);
      
      // Calculate stats
      if (data && data.length > 0) {
        const totalMinutes = data.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
        const totalCalories = data.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
        
        setStats({
          totalWorkouts: data.length,
          totalMinutes,
          totalCalories,
          completionRate: 100 // All workouts in this table are completed
        });
      }
      
    } catch (error) {
      console.error('Error fetching workout history:', error);
      Alert.alert('Error', 'Failed to load workout history');
    } finally {
      setLoading(false);
    }
  };

  const renderWorkoutItem = ({ item }: { item: any }) => {
    const formattedDate = format(new Date(item.completed_at), 'MMM d, yyyy');
    
    return (
      <TouchableOpacity 
        style={styles.workoutCard}
        onPress={() => router.push({
          pathname: '/workout/details',
          params: { id: item.id }
        })}
      >
        <View style={styles.workoutCardContent}>
          <View>
            <Text style={styles.workoutName}>{item.name}</Text>
            <View style={styles.workoutDate}>
              <Calendar size={14} color={Colors.background.lightGray} />
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
          </View>
          
          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <Clock size={14} color={Colors.primary.blue} />
              <Text style={styles.statText}>{item.duration_minutes || 0} min</Text>
            </View>
            
            <View style={styles.statItem}>
              <Flame size={14} color={Colors.accent.peach} />
              <Text style={styles.statText}>{item.calories_burned || 0} cal</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.workoutCardFooter}>
          <View style={styles.completedBadge}>
            <CheckCircle size={14} color="white" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
          
          <ArrowRight size={18} color={Colors.primary.blue} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Workout History',
        }}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <Text style={styles.loadingText}>Loading workout history...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalMinutes}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalCalories}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.completionRate}%</Text>
              <Text style={styles.statLabel}>Completion</Text>
            </View>
          </View>
          
          <FlatList
            data={workouts}
            renderItem={renderWorkoutItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No workouts yet</Text>
                <Text style={styles.emptyStateText}>
                  Start tracking your workouts to see your history here.
                </Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => router.push('/workout')}
                >
                  <Text style={styles.createButtonText}>Go to Workouts</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      )}
    </View>
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
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    marginTop: 10,
    color: Colors.secondary.charcoal,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  statValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.background.lightGray,
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  workoutCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  workoutCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  workoutDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.background.lightGray,
    marginLeft: 4,
  },
  workoutStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.secondary.charcoal,
    marginLeft: 4,
  },
  workoutCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.background.offWhite,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.green,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  completedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  incompleteBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  incompleteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.background.lightGray,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'white',
  },
});
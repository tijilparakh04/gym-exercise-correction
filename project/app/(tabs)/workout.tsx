import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Dumbbell, Clock, Flame, ChevronRight } from 'lucide-react-native';

const workoutCategories = [
  { name: 'Strength Training', icon: Dumbbell, color: Colors.primary.blue },
  { name: 'Cardio', icon: Flame, color: Colors.accent.peach },
  { name: 'HIIT', icon: Clock, color: Colors.primary.green },
];

const recentWorkouts = [
  { name: 'Full Body Workout', duration: '45 min', calories: '320', date: 'Yesterday' },
  { name: 'Upper Body Focus', duration: '30 min', calories: '250', date: '2 days ago' },
];

export default function WorkoutScreen() {
  const [selectedCategory, setSelectedCategory] = useState('Strength Training');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.subtitle}>Choose your workout type</Text>
      </View>

      <View style={styles.categories}>
        {workoutCategories.map(({ name, icon: Icon, color }) => (
          <TouchableOpacity
            key={name}
            style={[
              styles.categoryCard,
              selectedCategory === name && { backgroundColor: color },
            ]}
            onPress={() => setSelectedCategory(name)}
          >
            <Icon
              size={24}
              color={selectedCategory === name ? 'white' : color}
            />
            <Text
              style={[
                styles.categoryName,
                selectedCategory === name && styles.categoryNameSelected,
              ]}
            >
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Workouts</Text>
        <View style={styles.featuredContainer}>
          <TouchableOpacity style={styles.featuredCard}>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>Full Body Challenge</Text>
              <Text style={styles.featuredSubtitle}>45 min • Intermediate</Text>
            </View>
            <ChevronRight size={24} color={Colors.primary.blue} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.featuredCard}>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>Core Strength</Text>
              <Text style={styles.featuredSubtitle}>30 min • Beginner</Text>
            </View>
            <ChevronRight size={24} color={Colors.primary.blue} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {recentWorkouts.map((workout, index) => (
          <TouchableOpacity key={index} style={styles.recentCard}>
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
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.offWhite,
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
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  featuredContainer: {
    gap: 12,
  },
  featuredCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredContent: {
    gap: 4,
  },
  featuredTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
  },
  featuredSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
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
});
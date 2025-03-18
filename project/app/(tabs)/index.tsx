import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Play, TrendingUp, Clock, ChevronRight } from 'lucide-react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400' }}
          style={styles.profileImage}
        />
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>John Doe</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startWorkoutCard}>
        <View style={styles.startWorkoutContent}>
          <Play size={24} color="white" />
          <View style={styles.startWorkoutText}>
            <Text style={styles.startWorkoutTitle}>Start Workout</Text>
            <Text style={styles.startWorkoutSubtitle}>Continue your fitness journey</Text>
          </View>
        </View>
        <ChevronRight size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <TrendingUp size={20} color={Colors.primary.blue} />
          <Text style={styles.statValue}>75%</Text>
          <Text style={styles.statLabel}>Weekly Goal</Text>
        </View>
        <View style={styles.statCard}>
          <Clock size={20} color={Colors.primary.green} />
          <Text style={styles.statValue}>12.5h</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Diet Plan</Text>
          <Link href="/diet" style={styles.sectionLink}>
            <Text style={styles.sectionLinkText}>View All</Text>
          </Link>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealContainer}>
          {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
            <View key={meal} style={styles.mealCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
                style={styles.mealImage}
              />
              <Text style={styles.mealTitle}>{meal}</Text>
              <Text style={styles.mealTime}>9:00 AM</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friends Activity</Text>
          <Link href="/social" style={styles.sectionLink}>
            <Text style={styles.sectionLinkText}>See All</Text>
          </Link>
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={styles.activityCard}>
            <Image
              source={{ uri: `https://images.unsplash.com/photo-${i === 1 ? '1494790108377-be9c29b29330' : '1527980965255-d3b416303d12'}?w=400` }}
              style={styles.activityUserImage}
            />
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Sarah Johnson</Text>
              <Text style={styles.activityText}>Completed a 45min workout</Text>
            </View>
            <Text style={styles.activityTime}>2h ago</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  greeting: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  name: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
  },
  startWorkoutCard: {
    backgroundColor: Colors.primary.blue,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  startWorkoutText: {
    gap: 4,
  },
  startWorkoutTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: 'white',
  },
  startWorkoutSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
  },
  sectionLink: {
    padding: 4,
  },
  sectionLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.primary.blue,
  },
  mealContainer: {
    paddingLeft: 20,
  },
  mealCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
    width: 160,
  },
  mealImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 12,
  },
  mealTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  mealTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  activityUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.secondary.charcoal,
  },
  activityText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.background.lightGray,
  },
  activityTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.background.lightGray,
  },
});
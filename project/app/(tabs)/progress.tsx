import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { LineChart } from 'react-native-chart-kit';
import { Calendar, TrendingUp, Scale, Target } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: 'white',
  backgroundGradientTo: 'white',
  color: (opacity = 1) => `rgba(90, 156, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
};

const weightData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [60, 62, 62, 64, 65, 65],
      color: (opacity = 1) => `rgba(90, 156, 255, ${opacity})`,
      strokeWidth: 2,
    },
  ],
};

const strengthData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [60, 65, 67,69,70,72],
      color: (opacity = 1) => `rgba(136, 192, 164, ${opacity})`,
      strokeWidth: 2,
    },
  ],
};

export default function ProgressScreen() {
  const [activeMetric, setActiveMetric] = useState<'weight' | 'strength'>('weight');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>Track your fitness journey</Text>
      </View>

      <View style={styles.metricsContainer}>
        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: Colors.primary.blue }]}
          onPress={() => setActiveMetric('weight')}
        >
          <Scale size={24} color="white" />
          <View>
            <Text style={styles.metricLabel}>Current Weight</Text>
            <Text style={styles.metricValue}>65 kg</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: Colors.primary.green }]}
          onPress={() => setActiveMetric('strength')}
        >
          <TrendingUp size={24} color="white" />
          <View>
            <Text style={styles.metricLabel}>Strength Progress</Text>
            <Text style={styles.metricValue}>+25%</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {activeMetric === 'weight' ? 'Weight Progress' : 'Strength Progress'}
        </Text>
        <LineChart
          data={activeMetric === 'weight' ? weightData : strengthData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.goalsContainer}>
        <Text style={styles.sectionTitle}>Current Goals</Text>
        <View style={styles.goalCard}>
          <Target size={24} color={Colors.primary.blue} />
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>Weight Goal</Text>
            <Text style={styles.goalProgress}>75 kg (10 kg to go)</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '80%' }]} />
          </View>
        </View>

        <View style={styles.goalCard}>
          <Calendar size={24} color={Colors.primary.green} />
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>Workout Frequency</Text>
            <Text style={styles.goalProgress}>4/5 workouts this week</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '80%', backgroundColor: Colors.primary.green }]} />
          </View>
        </View>
      </View>

      <View style={styles.achievementsContainer}>
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsList}>
          {['Consistent Tracker'].map((achievement, index) => (
            <View key={index} style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <TrendingUp size={24} color={Colors.primary.blue} />
              </View>
              <Text style={styles.achievementTitle}>{achievement}</Text>
              <Text style={styles.achievementDate}>Earned Jun 2023</Text>
            </View>
          ))}
        </ScrollView>
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
  metricsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  metricLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
  },
  metricValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: 'white',
  },
  chartContainer: {
    padding: 20,
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
  },
  chartTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  goalsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  goalInfo: {
    marginVertical: 8,
  },
  goalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  goalProgress: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.background.softGray,
    borderRadius: 2,
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary.blue,
    borderRadius: 2,
  },
  achievementsContainer: {
    padding: 20,
  },
  achievementsList: {
    paddingBottom: 20,
  },
  achievementCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 160,
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    textAlign: 'center',
  },
});
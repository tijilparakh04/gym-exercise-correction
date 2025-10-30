import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { LineChart } from 'react-native-chart-kit';
import { Calendar, TrendingUp, Scale, Target, Trophy, Award } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: 'white',
  backgroundGradientTo: 'white',
  color: (opacity = 1) => `rgba(90, 156, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
};

interface ProgressSummary {
  workouts: {
    total: number;
    this_week: number;
    this_month: number;
    total_duration_minutes: number;
    total_calories_burned: number;
    total_weight_lifted_kg: number;
  };
  weight: {
    current_kg: number | null;
    starting_kg: number | null;
    change_kg: number;
    logs_count: number;
  };
  achievements: {
    badges_earned: number;
  };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: string;
  points: number;
  rarity: string;
  earned_at: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: (opacity?: number) => string;
    strokeWidth: number;
  }>;
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const [activeMetric, setActiveMetric] = useState<'weight' | 'workouts'>('weight');
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user, activeMetric]);

  const loadProgressData = async () => {
    try {
      setLoading(true);

      // Load progress summary from API
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/progress/${user?.id}/summary`);
      if (response.ok) {
        const summary = await response.json();
        setProgressSummary(summary);
      } else {
        console.error('Error loading progress summary');
      }

      // Load badges from API
      const badgesResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/profile/${user?.id}/badges`);
      if (badgesResponse.ok) {
        const badgesData = await badgesResponse.json();
        const formattedBadges: Badge[] = badgesData.map((item: any) => ({
          id: item.id,
          name: item.badges?.name || 'Unknown Badge',
          description: item.badges?.description || '',
          icon_url: item.badges?.icon_url,
          category: item.badges?.category || '',
          points: item.badges?.points || 0,
          rarity: item.badges?.rarity || 'common',
          earned_at: item.earned_at,
        }));
        setBadges(formattedBadges);
      } else {
        console.error('Error loading badges');
      }

      // Load chart data from API
      const chartResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/progress/${user?.id}/chart/${activeMetric}`);
      if (chartResponse.ok) {
        const chartDataResponse = await chartResponse.json();
        const labels = chartDataResponse.map((item: any) => item.date);
        const values = chartDataResponse.map((item: any) => item.value);

        setChartData({
          labels,
          datasets: [{
            data: values,
            color: (opacity = 1) => activeMetric === 'weight'
              ? `rgba(90, 156, 255, ${opacity})`
              : `rgba(136, 192, 164, ${opacity})`,
            strokeWidth: 2,
          }],
        });
      } else {
        console.error('Error loading chart data');
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={{ marginTop: 16, fontFamily: 'Inter-Regular', color: Colors.secondary.charcoal }}>
          Loading progress data...
        </Text>
      </View>
    );
  }

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
            <Text style={styles.metricValue}>
              {progressSummary?.weight.current_kg ? `${progressSummary.weight.current_kg} kg` : 'Not set'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: Colors.primary.green }]}
          onPress={() => setActiveMetric('workouts')}
        >
          <TrendingUp size={24} color="white" />
          <View>
            <Text style={styles.metricLabel}>Workouts This Week</Text>
            <Text style={styles.metricValue}>{progressSummary?.workouts.this_week || 0}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {activeMetric === 'weight' ? 'Weight Progress' : 'Workout Progress'}
        </Text>
        {chartData && chartData.datasets[0].data.length > 0 ? (
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        ) : (
          <View style={[styles.chart, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontFamily: 'Inter-Regular', color: Colors.background.lightGray }}>
              No data available yet. Start logging your {activeMetric === 'weight' ? 'weight' : 'workouts'}!
            </Text>
          </View>
        )}
      </View>

      <View style={styles.goalsContainer}>
        <Text style={styles.sectionTitle}>Current Stats</Text>
        <View style={styles.goalCard}>
          <Target size={24} color={Colors.primary.blue} />
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>Total Workouts</Text>
            <Text style={styles.goalProgress}>{progressSummary?.workouts.total || 0} completed</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
        </View>

        <View style={styles.goalCard}>
          <Calendar size={24} color={Colors.primary.green} />
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>This Month</Text>
            <Text style={styles.goalProgress}>{progressSummary?.workouts.this_month || 0} workouts</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((progressSummary?.workouts.this_month || 0) / 12 * 100, 100)}%`, backgroundColor: Colors.primary.green }]} />
          </View>
        </View>

        <View style={styles.goalCard}>
          <TrendingUp size={24} color="#FF9500" />
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>Weight Change</Text>
            <Text style={styles.goalProgress}>
              {progressSummary?.weight.change_kg ? `${progressSummary.weight.change_kg > 0 ? '+' : ''}${progressSummary.weight.change_kg} kg` : 'No change'}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%', backgroundColor: '#FF9500' }]} />
          </View>
        </View>
      </View>

      <View style={styles.achievementsContainer}>
        <Text style={styles.sectionTitle}>Recent Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsList}>
          {badges.length > 0 ? badges.slice(0, 5).map((badge, index) => (
            <View key={badge.id} style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Award size={24} color={
                  badge.rarity === 'legendary' ? '#FFD700' :
                  badge.rarity === 'epic' ? '#9370DB' :
                  badge.rarity === 'rare' ? '#4169E1' :
                  Colors.primary.blue
                } />
              </View>
              <Text style={styles.achievementTitle}>{badge.name}</Text>
              <Text style={styles.achievementDate}>
                {new Date(badge.earned_at).toLocaleDateString()}
              </Text>
            </View>
          )) : (
            <View style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Trophy size={24} color={Colors.background.lightGray} />
              </View>
              <Text style={styles.achievementTitle}>No badges yet</Text>
              <Text style={styles.achievementDate}>Keep working out!</Text>
            </View>
          )}
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
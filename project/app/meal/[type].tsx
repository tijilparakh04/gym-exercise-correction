import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { ArrowLeft } from 'lucide-react-native';

// Define meal type interface
interface MealData {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  image: string;
}

export default function MealDetailScreen() {
  const { type } = useLocalSearchParams();
  const { user } = useAuth();
  const [mealData, setMealData] = useState<MealData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const screenWidth = Dimensions.get('window').width;
  
  // Map meal type to time
  const mealTimes = {
    breakfast: '9:00 AM',
    lunch: '2:00 PM',
    dinner: '8:00 PM',
    snacks: 'Throughout the day'
  };
  
  // Map meal type to image
  const mealImages = {
    breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400',
    lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    dinner: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400',
    snacks: 'https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=400'
  };

  useEffect(() => {
    fetchMealData();
  }, [type, user]);

  const fetchMealData = async () => {
    if (!user || !type) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) {
        console.error('Error fetching meal data:', error);
        return;
      }
      
      if (data) {
        const mealType = String(type).toLowerCase();
        let mealData: MealData = {
          food: data[`${mealType}_food`] || 'No meal data available',
          calories: data[`${mealType}_calories`] || 0,
          protein: data[`${mealType}_protein`] || 0,
          carbs: data[`${mealType}_carbs`] || 0,
          fat: data[`${mealType}_fat`] || 0,
          time: mealTimes[mealType as keyof typeof mealTimes] || '12:00 PM',
          image: mealImages[mealType as keyof typeof mealImages] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
        };
        
        setMealData(mealData);
      }
    } catch (err) {
      console.error('Error in fetchMealData:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!mealData) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            headerShown: false,
          }}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.secondary.charcoal} />
          </TouchableOpacity>
          <Text style={styles.title}>{type ? String(type).charAt(0).toUpperCase() + String(type).slice(1) : 'Meal'}</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.loadingText}>No meal data available</Text>
      </View>
    );
  }

  // Prepare data for pie chart
  const chartData = [
    {
      name: 'g Protein',
      population: mealData.protein,
      color: '#FF6384',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'g Carbs',
      population: mealData.carbs,
      color: '#36A2EB',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'g Fat',
      population: mealData.fat,
      color: '#FFCE56',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      
      <Image source={{ uri: mealData.image }} style={styles.mealImage} />
      
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.secondary.charcoal} />
          </TouchableOpacity>
          <Text style={styles.title}>{type ? String(type).charAt(0).toUpperCase() + String(type).slice(1) : 'Meal'}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{mealData.time}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.foodDescription}>{mealData.food}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionValue}>{mealData.calories}</Text>
          </View>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>{mealData.protein}g</Text>
          </View>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionValue}>{mealData.carbs}g</Text>
          </View>
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionValue}>{mealData.fat}g</Text>
          </View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Macronutrient Distribution</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={chartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.offWhite,
  },
  mealImage: {
    width: '100%',
    height: 250,
  },
  contentContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: Colors.background.offWhite,
    marginTop: -30,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.primary.blue,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 12,
  },
  foodDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    lineHeight: 24,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  nutritionLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  nutritionValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.primary.blue,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    textAlign: 'center',
    marginTop: 40,
  },
});
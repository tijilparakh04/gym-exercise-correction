import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { router, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react-native';

interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
}

interface MealData {
  food: string;
  calories: number;
  macros: MacroNutrients;
}

interface DietPlan {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  preferences: string;
  breakfast_food: string;
  breakfast_calories: number;
  breakfast_protein: number;
  breakfast_carbs: number;
  breakfast_fat: number;
  lunch_food: string;
  lunch_calories: number;
  lunch_protein: number;
  lunch_carbs: number;
  lunch_fat: number;
  dinner_food: string;
  dinner_calories: number;
  dinner_protein: number;
  dinner_carbs: number;
  dinner_fat: number;
}

export default function DietPlanScreen() {
  const { user } = useAuth();
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    fetchDietPlan();
  }, [user]);

  const fetchDietPlan = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching diet plan:', error);
        return;
      }
      
      if (data) {
        setDietPlan(data);
        setPreferences(data.preferences || '');
      }
    } catch (err) {
      console.error('Error in fetchDietPlan:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateDietPlan = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      
      // In a real app, you would call your backend API here
      // For demo purposes, we'll simulate an API call with a timeout
      const response = await generateDietPlanFromOpenAI(preferences);
      
      if (!response) {
        Alert.alert('Error', 'Failed to generate diet plan');
        return;
      }
      
      const { breakfast, lunch, dinner } = response;
      
      const { data, error } = await supabase
        .from('diet_plans')
        .insert({
          user_id: user.id,
          preferences,
          breakfast_food: breakfast.food,
          breakfast_calories: breakfast.calories,
          breakfast_protein: breakfast.macros.protein,
          breakfast_carbs: breakfast.macros.carbs,
          breakfast_fat: breakfast.macros.fat,
          lunch_food: lunch.food,
          lunch_calories: lunch.calories,
          lunch_protein: lunch.macros.protein,
          lunch_carbs: lunch.macros.carbs,
          lunch_fat: lunch.macros.fat,
          dinner_food: dinner.food,
          dinner_calories: dinner.calories,
          dinner_protein: dinner.macros.protein,
          dinner_carbs: dinner.macros.carbs,
          dinner_fat: dinner.macros.fat
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error saving diet plan:', error);
        Alert.alert('Error', 'Failed to save diet plan');
        return;
      }
      
      setDietPlan(data);
      setShowPreferences(false);
    } catch (err) {
      console.error('Error generating diet plan:', err);
      Alert.alert('Error', 'Failed to generate diet plan');
    } finally {
      setRefreshing(false);
    }
  };

  // This function will call your backend API to generate a diet plan
  const generateDietPlanFromOpenAI = async (userPreferences: string) => {
    try {
      // Get user profile data to include in the request
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      console.log('Profile data:', profileData);
      
      // Call your backend API
      console.log('Calling API at: http://192.168.1.15:5000/api/diet-plan/generate');
      const response = await fetch('http://192.168.1.15:5000/api/diet-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: userPreferences,
          profileData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        throw new Error(`Failed to generate diet plan: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('Error calling diet plan API:', error);
      return null;
    }
  };

  const renderMealCard = (
    title: string, 
    food: string, 
    calories: number, 
    protein: number, 
    carbs: number, 
    fat: number
  ) => {
    return (
      <View style={styles.mealCard}>
        <Text style={styles.mealTitle}>{title}</Text>
        <Text style={styles.foodDescription}>{food}</Text>
        <View style={styles.macrosContainer}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{calories}</Text>
            <Text style={styles.macroLabel}>Calories</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{fat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading diet plan...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.secondary.charcoal} />
        </TouchableOpacity>
        <Text style={styles.title}>Diet Plan</Text>
        <TouchableOpacity 
          onPress={() => setShowPreferences(true)} 
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={Colors.primary.blue} />
          ) : (
            <RefreshCw size={24} color={Colors.primary.blue} />
          )}
        </TouchableOpacity>
      </View>

      {showPreferences ? (
        <View style={styles.preferencesContainer}>
          <Text style={styles.preferencesTitle}>What would you like to eat today?</Text>
          <TextInput
            style={styles.preferencesInput}
            placeholder="E.g., I prefer vegetarian meals with high protein"
            value={preferences}
            onChangeText={setPreferences}
            multiline
          />
          <TouchableOpacity 
            style={styles.generateButton} 
            onPress={generateDietPlan}
            disabled={refreshing}
          >
            <Text style={styles.generateButtonText}>Generate Diet Plan</Text>
          </TouchableOpacity>
        </View>
      ) : dietPlan ? (
        <View style={styles.dietPlanContainer}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          
          {renderMealCard(
            'Breakfast', 
            dietPlan.breakfast_food, 
            dietPlan.breakfast_calories, 
            dietPlan.breakfast_protein, 
            dietPlan.breakfast_carbs, 
            dietPlan.breakfast_fat
          )}
          
          {renderMealCard(
            'Lunch', 
            dietPlan.lunch_food, 
            dietPlan.lunch_calories, 
            dietPlan.lunch_protein, 
            dietPlan.lunch_carbs, 
            dietPlan.lunch_fat
          )}
          
          {renderMealCard(
            'Dinner', 
            dietPlan.dinner_food, 
            dietPlan.dinner_calories, 
            dietPlan.dinner_protein, 
            dietPlan.dinner_carbs, 
            dietPlan.dinner_fat
          )}
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalTitle}>Daily Total</Text>
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <Text style={styles.totalValue}>
                  {dietPlan.breakfast_calories + dietPlan.lunch_calories + dietPlan.dinner_calories}
                </Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.totalValue}>
                  {dietPlan.breakfast_protein + dietPlan.lunch_protein + dietPlan.dinner_protein}g
                </Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.totalValue}>
                  {dietPlan.breakfast_carbs + dietPlan.lunch_carbs + dietPlan.dinner_carbs}g
                </Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.totalValue}>
                  {dietPlan.breakfast_fat + dietPlan.lunch_fat + dietPlan.dinner_fat}g
                </Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No diet plan yet</Text>
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={() => setShowPreferences(true)}
          >
            <Plus size={20} color="white" />
            <Text style={styles.createButtonText}>Create Diet Plan</Text>
          </TouchableOpacity>
        </View>
      )}
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
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    marginTop: 10,
    color: Colors.secondary.charcoal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
  },
  refreshButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 100,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.blue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  preferencesContainer: {
    padding: 20,
  },
  preferencesTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  preferencesInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  dietPlanContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  mealTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  foodDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 16,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  macroLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.background.lightGray,
  },
  totalContainer: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 16,
    padding: 16,
  },
  totalTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: 'white',
    marginBottom: 16,
  },
  totalValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: 'white',
  },
});
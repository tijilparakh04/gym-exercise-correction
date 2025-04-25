import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Play, TrendingUp, Clock, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    full_name: 'Fitness User',
    profile_image_url: null
  });
  const [profileImageUrl, setProfileImageUrl] = useState('https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400');
  const [hasSnacks, setHasSnacks] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      checkForSnacks();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, profile_image_url')
        .eq('id', user?.id)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        setProfile({
          full_name: data.full_name || 'Fitness User',
          profile_image_url: data.profile_image_url
        });
        
        // If profile image URL exists
        if (data.profile_image_url) {
          // If it's already a full URL (like from Unsplash), use it directly
          if (data.profile_image_url.startsWith('http')) {
            setProfileImageUrl(data.profile_image_url);
          } else {
            // Otherwise, get the public URL from Supabase storage
            try {
              const { data: publicUrlData } = supabase.storage
                .from('user_images')
                .getPublicUrl(data.profile_image_url);
                
              if (publicUrlData && publicUrlData.publicUrl) {
                console.log('Generated image URL:', publicUrlData.publicUrl);
                setProfileImageUrl(publicUrlData.publicUrl);
              }
            } catch (urlError) {
              console.error('Error getting image URL:', urlError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const checkForSnacks = async () => {
    try {
      const { data, error } = await supabase
        .from('diet_plans')
        .select('snacks_food')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking for snacks:', error);
        return;
      }
      
      setHasSnacks(data?.snacks_food ? true : false);
    } catch (error) {
      console.error('Error in checkForSnacks:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: profileImageUrl }}
          style={styles.profileImage}
        />
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{profile.full_name}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.startWorkoutCard}
        onPress={() => router.push('./form-check/form-detection')}
      >
        <View style={styles.startWorkoutContent}>
          <Play size={24} color="white" />
          <View style={styles.startWorkoutText}>
            <Text style={styles.startWorkoutTitle}>Check form in Real Time!</Text>
            <Text style={styles.startWorkoutSubtitle}>Continue your fitness journey</Text>
          </View>
        </View>
        <ChevronRight size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Diet Plan</Text>
          <Link href="/diet" asChild>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit/Create</Text>
            </TouchableOpacity>
          </Link>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealContainer} contentContainerStyle={styles.mealContentContainer}>
          {[
            { name: 'Breakfast', time: '9:00 AM', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400' },
            { name: 'Lunch', time: '2:00 PM', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
            { name: 'Dinner', time: '8:00 PM', image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400' },
            ...(hasSnacks ? [{ name: 'Snacks', time: 'Throughout the day', image: 'https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=400' }] : [])
          ].map((meal) => (
            <Link 
              href={{
                pathname: '/meal/[type]',
                params: { type: meal.name.toLowerCase() }
              }} 
              key={meal.name} 
              asChild
            >
              <TouchableOpacity style={styles.mealCard}>
                <Image
                  source={{ uri: meal.image }}
                  style={styles.mealImage}
                />
                <Text style={styles.mealTitle}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </TouchableOpacity>
            </Link>
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
  mealContentContainer: {
    paddingRight: 20, // Add padding to the right to prevent the last card from being cut off
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
  // Add these missing styles
  editButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'white',
  },
});
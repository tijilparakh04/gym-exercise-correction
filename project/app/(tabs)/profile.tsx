import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Settings, CreditCard as Edit2, Bell, Shield, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

const profileSections = [
  {
    title: 'Account',
    items: [
      { icon: Edit2, label: 'Edit Profile', link: '/profile/edit' },
      { icon: Bell, label: 'Notifications', link: '/profile/notifications' },
      { icon: Shield, label: 'Privacy', link: '/profile/privacy' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Settings, label: 'App Settings', link: '/profile/settings' },
    ],
  },
];

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  interface ProfileData {
    id: string;
    full_name?: string;
    email?: string;
    profile_image_url?: string;
    age?: number;
    height_cm?: number;
    current_weight_kg?: number;
    target_weight_kg?: number;
    activity_level?: string;
    diet_preference?: string;
    fitness_goal?: string;
  }

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  async function fetchUserProfile() {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      setProfileData(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const handleImageUpload = async () => {
    try {
      setUploadingImage(true);
      
      // For demo purposes, we'll use a random Unsplash image
      // In a real app, you would use expo-image-picker here
      const imageUrls = [
        'rDEOVtE7vOs',
        'mEZ3PoFGs_k',
        'QXevDflbl8A',
        'O3ymvT7Wf9U',
        'X6Uj51n5CE8',
      ];
      const randomId = imageUrls[Math.floor(Math.random() * imageUrls.length)];
      const imageUrl = `https://images.unsplash.com/photo-${randomId}?w=400`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: imageUrl })
        .eq('id', user?.id || '');

      if (updateError) throw updateError;
      
      await fetchUserProfile();
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to update profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileSection}>
        <Image
          source={{ uri: profileData?.profile_image_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400' }}
          style={styles.profileImage}
        />
        <TouchableOpacity 
          style={[styles.editImageButton, uploadingImage && styles.editImageButtonDisabled]}
          onPress={handleImageUpload}
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Edit2 size={20} color="white" />
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{profileData?.full_name || 'User'}</Text>
        <Text style={styles.email}>{profileData?.email}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>156</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>32</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8.5k</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>
      </View>

      <View style={styles.bioSection}>
        <Text style={styles.sectionTitle}>Fitness Profile</Text>
        <View style={styles.bioContent}>
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Age</Text>
            <Text style={styles.bioValue}>{profileData?.age} years</Text>
          </View>
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Height</Text>
            <Text style={styles.bioValue}>{profileData?.height_cm} cm</Text>
          </View>
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Current Weight</Text>
            <Text style={styles.bioValue}>{profileData?.current_weight_kg} kg</Text>
          </View>
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Target Weight</Text>
            <Text style={styles.bioValue}>{profileData?.target_weight_kg} kg</Text>
          </View>
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Activity Level</Text>
            <Text style={styles.bioValue}>{formatActivityLevel(profileData?.activity_level)}</Text>
          </View>
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Diet</Text>
            <Text style={styles.bioValue}>{formatDietPreference(profileData?.diet_preference)}</Text>
          </View>
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Goal</Text>
            <Text style={styles.bioValue}>{formatFitnessGoal(profileData?.fitness_goal)}</Text>
          </View>
        </View>
      </View>

      {profileSections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity key={itemIndex} style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <Icon size={20} color={Colors.secondary.charcoal} />
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.background.lightGray} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <LogOut size={20} color={Colors.accent.peach} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatActivityLevel(level: string | undefined) {
  if (!level) return 'Not set';
  return level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ');
}

function formatDietPreference(preference: string | undefined) {
  if (!preference) return 'Not set';
  return preference.charAt(0).toUpperCase() + preference.slice(1).replace('_', ' ');
}

function formatFitnessGoal(goal: string | undefined) {
  if (!goal) return 'Not set';
  return goal.charAt(0).toUpperCase() + goal.slice(1).replace('_', ' ');
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.offWhite,
  },
  errorText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.accent.peach,
  },
  errorSubtext: {
    fontFamily: 'Inter-Regular',
    color: Colors.secondary.charcoal,
    marginTop: 8,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 32,
    color: Colors.secondary.charcoal,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  editImageButton: {
    position: 'absolute',
    top: 100,
    right: '50%',
    marginRight: -70,
    backgroundColor: Colors.primary.blue,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background.offWhite,
  },
  editImageButtonDisabled: {
    opacity: 0.7,
  },
  name: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  email: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.background.softGray,
  },
  statValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  bioSection: {
    padding: 20,
  },
  bioContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  bioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.softGray,
  },
  bioLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: Colors.background.lightGray,
  },
  bioValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.softGray,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 20,
  },
  logoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.accent.peach,
  },
});
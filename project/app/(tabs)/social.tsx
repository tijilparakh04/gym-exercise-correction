import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Search, UserPlus, X, Check, Users, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type FriendRequest = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  friend?: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  };
  requester?: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  };
};

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  profile_image_url: string | null;
  age?: number;
  height_cm?: number;
  current_weight_kg?: number;
  activity_level?: string;
  fitness_goal?: string;
};

export default function SocialScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      fetchFriendData();
    }
  }, [user]);

  const fetchFriendData = async () => {
    try {
      setLoading(true);
      
      // Fetch incoming friend requests
      const { data: incomingData, error: incomingError } = await supabase
        .from('friend_connections')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          requester:user_id(id, full_name, profile_image_url)
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'pending');

      if (incomingError) throw incomingError;
      
      // Fetch outgoing friend requests
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('friend_connections')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          friend:friend_id(id, full_name, profile_image_url)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'pending');

      if (outgoingError) throw outgoingError;
      
      // Fetch accepted friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friend_connections')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          friend:friend_id(id, full_name, profile_image_url)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;
      
      // Fetch friends where user is the friend_id
      const { data: friendsData2, error: friendsError2 } = await supabase
        .from('friend_connections')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          friend:user_id(id, full_name, profile_image_url)
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'accepted');

      if (friendsError2) throw friendsError2;
      
      setIncomingRequests((incomingData?.map(request => ({
        ...request,
        requester: Array.isArray(request.requester) ? request.requester[0] : request.requester
      })) || []) as FriendRequest[]);
      setOutgoingRequests((outgoingData?.map(request => ({
        ...request,
        friend: Array.isArray(request.friend) ? request.friend[0] : request.friend
      })) || []) as FriendRequest[]);
      setFriends([
        ...(friendsData?.map(request => ({
          ...request,
          friend: Array.isArray(request.friend) ? request.friend[0] : request.friend
        })) || []),
        ...(friendsData2?.map(request => ({
          ...request,
          friend: Array.isArray(request.friend) ? request.friend[0] : request.friend
        })) || [])
      ] as FriendRequest[]);
    } catch (error) {
      console.error('Error fetching friend data:', error);
      Alert.alert('Error', 'Failed to load friend data');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path: string | undefined) => {
    if (!path) return 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400';
    
    // If it's already a full URL (like from Unsplash), return it directly
    if (path.startsWith('http')) {
      return path;
    }
    
    // Otherwise, construct the Supabase storage URL with a fresh token
    try {
      const { data } = supabase.storage
        .from('user_images')
        .getPublicUrl(path);
      return data?.publicUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400';
    } catch (error) {
      console.error('Error getting public URL:', error);
      return 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400';
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      
      // Use a more permissive query that should work with RLS
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .neq('id', user?.id); // Don't show the current user

      if (error) {
        console.error('Search error:', error);
        throw error;
      }
      
      console.log('Search results:', data);
      
      // Filter out users who are already friends or have pending requests
      const allConnections = [...friends, ...incomingRequests, ...outgoingRequests];
      const connectedUserIds = new Set(
        allConnections.map(conn => 
          conn.user_id === user?.id ? conn.friend_id : conn.user_id
        )
      );
      
      const filteredResults = (data || []).filter(
        profile => !connectedUserIds.has(profile.id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching for users:', error);
      Alert.alert('Error', 'Failed to search for users');
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .insert({ 
          user_id: user?.id, 
          friend_id: friendId, 
          status: 'pending' 
        });

      if (error) throw error;
      
      Alert.alert('Success', 'Friend request sent');
      setSearchResults(prev => prev.filter(profile => profile.id !== friendId));
      fetchFriendData();
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      
      Alert.alert(
        'Success', 
        status === 'accepted' ? 'Friend request accepted' : 'Friend request rejected'
      );
      fetchFriendData();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      Alert.alert('Error', 'Failed to respond to friend request');
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      
      Alert.alert('Success', 'Friend request cancelled');
      fetchFriendData();
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request');
    }
  };

  const viewFriendProfile = async (friendId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId)
        .single();

      if (error) throw error;
      
      setSelectedFriend(data);
    } catch (error) {
      console.error('Error fetching friend profile:', error);
      Alert.alert('Error', 'Failed to load friend profile');
    }
  };

  const renderFriendProfile = () => {
    if (!selectedFriend) return null;
    
    return (
      <View style={styles.friendProfileContainer}>
        <View style={styles.friendProfileHeader}>
          <TouchableOpacity 
            onPress={() => setSelectedFriend(null)}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.secondary.charcoal} />
          </TouchableOpacity>
          <Text style={styles.friendProfileTitle}>Friend Profile</Text>
        </View>
        
        <View style={styles.friendProfileCard}>
          <Image 
            source={{ 
              uri: getImageUrl(selectedFriend.profile_image_url || undefined)
            }}
            style={styles.friendProfileImage}
            resizeMode="cover"
          />
          <Text style={styles.friendProfileName}>{selectedFriend.full_name}</Text>
          
          <View style={styles.friendProfileDetails}>
            <View style={styles.friendProfileDetail}>
              <Text style={styles.friendProfileLabel}>Age</Text>
              <Text style={styles.friendProfileValue}>{selectedFriend.age || 'Not specified'}</Text>
            </View>
            
            <View style={styles.friendProfileDetail}>
              <Text style={styles.friendProfileLabel}>Height</Text>
              <Text style={styles.friendProfileValue}>
                {selectedFriend.height_cm ? `${selectedFriend.height_cm} cm` : 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.friendProfileDetail}>
              <Text style={styles.friendProfileLabel}>Weight</Text>
              <Text style={styles.friendProfileValue}>
                {selectedFriend.current_weight_kg ? `${selectedFriend.current_weight_kg} kg` : 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.friendProfileDetail}>
              <Text style={styles.friendProfileLabel}>Activity Level</Text>
              <Text style={styles.friendProfileValue}>
                {selectedFriend.activity_level || 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.friendProfileDetail}>
              <Text style={styles.friendProfileLabel}>Fitness Goal</Text>
              <Text style={styles.friendProfileValue}>
                {selectedFriend.fitness_goal || 'Not specified'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (selectedFriend) {
    return renderFriendProfile();
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.blue} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for friends..."
            placeholderTextColor={Colors.background.lightGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Search size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Users size={20} color={activeTab === 'friends' ? 'white' : Colors.background.lightGray} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <UserPlus size={20} color={activeTab === 'requests' ? 'white' : Colors.background.lightGray} />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsTitle}>Search Results</Text>
            <TouchableOpacity onPress={() => setSearchResults([])}>
              <X size={20} color={Colors.background.lightGray} />
            </TouchableOpacity>
          </View>
          
          {searchResults.map((profile) => (
            <View key={profile.id} style={styles.userCard}>
              <Image 
                source={{ 
                  uri: getImageUrl(profile.profile_image_url || undefined)
                }}
                style={styles.userImage} 
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{profile.full_name}</Text>
                <Text style={styles.userEmail}>{profile.email}</Text>
              </View>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => sendFriendRequest(profile.id)}
              >
                <UserPlus size={20} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <View style={styles.friendsContainer}>
          {friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>You don't have any friends yet</Text>
              <TouchableOpacity 
                style={styles.findFriendsButton}
                onPress={() => setActiveTab('requests')}
              >
                <UserPlus size={20} color="white" />
                <Text style={styles.findFriendsButtonText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            friends.map((connection) => {
              const friendData = connection.friend;
              if (!friendData) return null;
              
              return (
                <TouchableOpacity 
                  key={connection.id} 
                  style={styles.userCard}
                  onPress={() => viewFriendProfile(friendData.id)}
                >
                  <Image 
                    source={{ 
                      uri: getImageUrl(friendData.profile_image_url || undefined)
                    }}
                    style={styles.userImage} 
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{friendData.full_name}</Text>
                    <Text style={styles.userStatus}>Friend</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <View style={styles.requestsContainer}>
          {incomingRequests.length > 0 && (
            <View style={styles.requestsSection}>
              <Text style={styles.requestsSectionTitle}>Incoming Requests</Text>
              {incomingRequests.map((request) => {
                const requesterData = request.requester;
                if (!requesterData) return null;
                
                return (
                  <View key={request.id} style={styles.userCard}>
                    <Image 
                      source={{ 
                        uri: getImageUrl(requesterData.profile_image_url || undefined)
                          
                      }}
                      style={styles.userImage} 
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{requesterData.full_name}</Text>
                      <Text style={styles.userStatus}>Wants to be your friend</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={() => respondToRequest(request.id, 'accepted')}
                      >
                        <Check size={20} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={() => respondToRequest(request.id, 'rejected')}
                      >
                        <X size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          
          {outgoingRequests.length > 0 && (
            <View style={styles.requestsSection}>
              <Text style={styles.requestsSectionTitle}>Outgoing Requests</Text>
              {outgoingRequests.map((request) => {
                const friendData = request.friend;
                if (!friendData) return null;
                
                return (
                  <View key={request.id} style={styles.userCard}>
                    <Image 
                      source={{ 
                        uri: getImageUrl(friendData.profile_image_url || undefined)
                      }}
                      style={styles.userImage} 
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{friendData.full_name}</Text>
                      <Text style={styles.userStatus}>Request pending</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => cancelRequest(request.id)}
                    >
                      <X size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
          
          {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No friend requests</Text>
              <Text style={styles.emptyStateSubtext}>
                Search for users to send friend requests
              </Text>
            </View>
          )}
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
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 32,
    color: Colors.secondary.charcoal,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  searchButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary.blue,
  },
  tabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  activeTabText: {
    color: 'white',
  },
  searchResultsContainer: {
    padding: 20,
    gap: 12,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchResultsTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  userStatus: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  addButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    padding: 8,
  },
  friendsContainer: {
    padding: 20,
  },
  requestsContainer: {
    padding: 20,
  },
  requestsSection: {
    marginBottom: 24,
  },
  requestsSectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.secondary.charcoal,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: Colors.primary.green,
    borderRadius: 8,
    padding: 8,
  },
  rejectButton: {
    backgroundColor: '#FF5252', 
    borderRadius: 8,
    padding: 8,
  },
  cancelButton: {
    backgroundColor: '#FF5252',
    borderRadius: 8,
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
    marginBottom: 20,
    textAlign: 'center',
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.blue,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  findFriendsButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  friendProfileContainer: {
    flex: 1,
    backgroundColor: Colors.background.offWhite,
    padding: 20,
    paddingTop: 60,
  },
  friendProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  friendProfileTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
    marginLeft: 16,
  },
  friendProfileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  friendProfileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.primary.blue,
  },
  friendProfileName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: Colors.secondary.charcoal,
    marginBottom: 24,
  },
  friendProfileDetails: {
    width: '100%',
    gap: 16,
  },
  friendProfileDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.softGray,
  },
  friendProfileLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
  },
  friendProfileValue: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.background.lightGray,
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Search, UserPlus, Trophy, MessageSquare, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; email: string; profile_image_url: string }[]>([]);
  const [friendRequests, setFriendRequests] = useState<{ id: string; user_id: string; friend_id: string; status: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ id: string; full_name: string; profile_image_url: string; points: number }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
      } else {
        setUserId(data?.user?.id || null);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchLeaderboard();
      fetchFriendRequests();
    }
  }, [userId]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url, points')
        .order('points', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_connections')
        .select('id, user_id, friend_id, status')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;
      setFriendRequests(data || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .ilike('full_name', `%${searchQuery}%`);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching for users:', error);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .insert({ user_id: userId, friend_id: friendId, status: 'pending' });

      if (error) throw error;
      fetchFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('friend_connections')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
      fetchFriendRequests();
    } catch (error) {
      console.error('Error responding to friend request:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.background.lightGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor={Colors.background.lightGray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Trophy size={20} color={activeTab === 'leaderboard' ? Colors.primary.blue : Colors.background.lightGray} />
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Users size={20} color={activeTab === 'friends' ? Colors.primary.blue : Colors.background.lightGray} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'leaderboard' ? (
        <View style={styles.leaderboardContainer}>
          {leaderboard.map((user, index) => (
            <View key={user.id} style={styles.leaderboardCard}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <Image source={{ uri: user.profile_image_url }} style={styles.userImage} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.points}>{user.points} points</Text>
              </View>
              <TouchableOpacity style={styles.messageButton}>
                <MessageSquare size={20} color={Colors.primary.blue} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.friendsContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            {friendRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <Text style={styles.requestText}>
                  {request.status === 'pending'
                    ? 'Pending Request'
                    : request.status === 'accepted'
                    ? 'Friend'
                    : 'Rejected'}
                </Text>
                <TouchableOpacity onPress={() => respondToRequest(request.id, 'accepted')}>
                  <Text>Accept</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.addFriendsButton}>
            <UserPlus size={20} color="white" />
            <Text style={styles.addFriendsText}>Find More Friends</Text>
          </TouchableOpacity>
        </View>
      )}

      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.map((user) => (
            <View key={user.id} style={styles.searchResultCard}>
              <Image source={{ uri: user.profile_image_url }} style={styles.userImage} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.addFriendButton}
                onPress={() => sendFriendRequest(user.id)}
              >
                <UserPlus size={20} color="white" />
              </TouchableOpacity>
            </View>
          ))}
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
  leaderboardContainer: {
    padding: 20,
    gap: 12,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  rank: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: Colors.primary.blue,
    width: 40,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  points: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  messageButton: {
    padding: 8,
  },
  friendsContainer: {
    padding: 20,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: Colors.secondary.charcoal,
    marginBottom: 8,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  requestImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.secondary.charcoal,
    marginBottom: 4,
  },
  mutualFriends: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  acceptButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'white',
  },
  declineButton: {
    backgroundColor: Colors.background.softGray,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  declineButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.blue,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  addFriendsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
  },
  searchResults: {
    padding: 20,
    gap: 12,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  userEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
  addFriendButton: {
    backgroundColor: Colors.primary.blue,
    borderRadius: 8,
    padding: 8,
  },
  requestText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.background.lightGray,
  },
});
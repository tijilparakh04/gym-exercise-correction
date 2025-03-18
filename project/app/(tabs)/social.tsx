import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Search, UserPlus, Trophy, MessageSquare, Users } from 'lucide-react-native';

const leaderboard = [
  {
    id: '1',
    name: 'Sarah Johnson',
    points: 2500,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    rank: 1,
  },
  {
    id: '2',
    name: 'Michael Chen',
    points: 2350,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    rank: 2,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    points: 2200,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    rank: 3,
  },
];

const friendRequests = [
  {
    id: '4',
    name: 'David Kim',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    mutualFriends: 4,
  },
  {
    id: '5',
    name: 'Lisa Wang',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    mutualFriends: 2,
  },
];

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends'>('leaderboard');

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
          {leaderboard.map((user) => (
            <View key={user.id} style={styles.leaderboardCard}>
              <Text style={styles.rank}>#{user.rank}</Text>
              <Image source={{ uri: user.image }} style={styles.userImage} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
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
                <Image source={{ uri: request.image }} style={styles.requestImage} />
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.name}</Text>
                  <Text style={styles.mutualFriends}>{request.mutualFriends} mutual friends</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity style={styles.acceptButton}>
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineButton}>
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.addFriendsButton}>
            <UserPlus size={20} color="white" />
            <Text style={styles.addFriendsText}>Find More Friends</Text>
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
});
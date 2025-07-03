import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, Alert, Share, Clipboard } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from '../components/Icon';
import { useApp } from '../context/AppContext';
import { getGroupMembers, GroupMember, generateInviteLink, leaveGroup, deleteGroup, getGroupInviteCode } from '../services/groupService';

const GroupSettingsScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const groupId = route.params?.groupId;
  
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState<string | null>(null);
  const [loadingInviteCode, setLoadingInviteCode] = useState(false);

  const handleInviteViaLink = async () => {
    if (!group?.id || !currentUser?.id) {
      Alert.alert('Error', 'Group or user information not available');
      return;
    }

    setGeneratingInvite(true);

    try {
      // Generate invite link from backend
      const inviteData = await generateInviteLink(String(group.id), String(currentUser.id));
      
      // Create share message
      const shareMessage = `Join my WeSplit group "${inviteData.groupName}"! Use this link to join: ${inviteData.inviteLink}`;

      // Share the link
      const result = await Share.share({
        message: shareMessage,
        title: 'Join WeSplit Group',
      });

      if (result.action === Share.sharedAction) {
        console.log('Invite link shared successfully');
        Alert.alert('Success', 'Invite link shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing invite link:', error);
      Alert.alert('Error', 'Failed to generate or share invite link. Please try again.');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const getCurrentInviteCode = async () => {
    if (!group?.id || !currentUser?.id) {
      Alert.alert('Error', 'Group or user information not available');
      return;
    }

    setLoadingInviteCode(true);
    try {
      const inviteData = await getGroupInviteCode(String(group.id), String(currentUser.id));
      setCurrentInviteCode(inviteData.inviteCode);
      console.log('Successfully got invite code:', inviteData.inviteCode);
    } catch (error) {
      console.error('Error getting invite code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get invite code.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoadingInviteCode(false);
    }
  };

  const copyInviteCode = () => {
    if (currentInviteCode) {
      Clipboard.setString(currentInviteCode);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const handleLeaveGroup = () => {
    // Check if user is the only member
    if (members.length === 1) {
      Alert.alert(
        'Cannot Leave Group',
        'You are the only member of this group. To remove yourself, you must delete the group instead.',
        [
          {
            text: 'Delete Group',
            style: 'destructive',
            onPress: handleDeleteGroup,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will lose access to all group expenses.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!group?.id || !currentUser?.id) {
              Alert.alert('Error', 'Group or user information not available');
              return;
            }

            setLeavingGroup(true);
            try {
              await leaveGroup(String(group.id), String(currentUser.id));
              Alert.alert(
                'Group Left',
                'You have successfully left the group.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Dashboard'),
                  },
                ]
              );
            } catch (error) {
              console.error('Error leaving group:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to leave group. Please try again.';
              Alert.alert('Error', errorMessage);
            } finally {
              setLeavingGroup(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone and will permanently remove all group data including expenses.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!group?.id || !currentUser?.id) {
              Alert.alert('Error', 'Group or user information not available');
              return;
            }

            setDeletingGroup(true);
            try {
              await deleteGroup(String(group.id), String(currentUser.id));
              Alert.alert(
                'Group Deleted',
                'The group has been successfully deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Dashboard'),
                  },
                ]
              );
            } catch (error) {
              console.error('Error deleting group:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to delete group. Please try again.';
              Alert.alert('Error', errorMessage);
            } finally {
              setDeletingGroup(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!groupId) {
        setError('No group ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get group members
        const groupMembers = await getGroupMembers(groupId);
        setMembers(groupMembers);
        
        // For now, we'll use a simple group object with the data we have
        // In a real app, you might want to fetch the full group details
        setGroup({
          id: groupId,
          name: 'Group', // We'll get this from the group details later
          category: 'general',
          member_count: groupMembers.length,
          created_by: currentUser?.id // Add creator info
        });
        
        // Automatically load the invite code
        try {
          const inviteData = await getGroupInviteCode(String(groupId), String(currentUser?.id));
          setCurrentInviteCode(inviteData.inviteCode);
        } catch (error) {
          console.error('Error auto-loading invite code:', error);
          // Don't show alert for auto-load, just log the error
        }
        
      } catch (err) {
        console.error('Error fetching group data:', err);
        setError('Failed to load group data');
      } finally {
        setLoading(false);
  }
    };

    fetchGroupData();
  }, [groupId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading group settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Group not found'}</Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        <View style={styles.groupInfo}>
          <View style={[styles.iconWrap, { backgroundColor: group.category === 'travel' ? '#A5A6F622' : '#FF6B6B22' }]}>
          <Icon name={group.category === 'travel' ? 'map-pin' : 'users'} color={group.category === 'travel' ? '#A5A6F6' : '#FF6B6B'} size={28} />
        </View>
        <Text style={styles.groupName}>{String(group.name)}</Text>
      </View>
      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('AddMembers', { groupId: group.id })}>
        <Icon name="user-plus" size={20} color={colors.primary} />
        <Text style={styles.linkText}>Add new members</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.linkRow, generatingInvite && styles.linkRowDisabled]} 
        onPress={handleInviteViaLink}
        disabled={generatingInvite}
      >
        <Icon name="link" size={20} color={colors.primary} />
        <Text style={styles.linkText}>
          {generatingInvite ? 'Generating link...' : 'Invite via link'}
        </Text>
        {generatingInvite && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>

      {/* Current Invite Code Section */}
      <Text style={styles.sectionTitle}>Current Invite Code</Text>
      
      {currentInviteCode ? (
        <TouchableOpacity style={styles.inviteCodeRow} onPress={copyInviteCode}>
          <View style={styles.inviteCodeContainer}>
            <Text style={styles.inviteCodeLabel}>Invite Code:</Text>
            <Text style={styles.inviteCodeText}>{currentInviteCode}</Text>
          </View>
          <Icon name="copy" size={20} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.linkRow, loadingInviteCode && styles.linkRowDisabled]} 
          onPress={getCurrentInviteCode}
          disabled={loadingInviteCode}
        >
          <Icon name="hash" size={20} color={colors.primary} />
          <Text style={styles.linkText}>
            {loadingInviteCode ? 'Loading code...' : 'Get current invite code'}
          </Text>
          {loadingInviteCode && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      )}
      <Text style={styles.sectionTitle}>{members.length} Members</Text>
      {members.map((member: GroupMember, idx: number) => (
        <View key={member.id + '-' + idx} style={styles.memberRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
              <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
          <Text style={styles.memberBalance}>
            Member since {new Date(member.joined_at).toLocaleDateString()}
              </Text>
            </View>
      ))}
      {/* Defensive fallback to prevent stray arrays/objects in JSX */}
      {false && <Text>{JSON.stringify(group)}</Text>}
        <TouchableOpacity 
          style={[styles.leaveBtn, leavingGroup && styles.leaveBtnDisabled]} 
          onPress={handleLeaveGroup}
          disabled={leavingGroup}
        >
          {leavingGroup ? (
            <ActivityIndicator size="small" color="#A5EA15" />
          ) : (
        <Text style={styles.leaveBtnText}>Leave Group</Text>
          )}
      </TouchableOpacity>
        {/* Only show delete button if user is the group creator */}
        {group.created_by === currentUser?.id && (
          <TouchableOpacity 
            style={[styles.deleteBtn, deletingGroup && styles.deleteBtnDisabled]} 
            onPress={handleDeleteGroup}
            disabled={deletingGroup}
          >
            {deletingGroup ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
        <Text style={styles.deleteBtnText}>Delete Group</Text>
            )}
      </TouchableOpacity>
        )}
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#212121',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: '#A5EA1522',
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 2,
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  linkText: {
    color: '#A5EA15',
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 12,
  },
  linkRowDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#A89B9B',
    marginTop: 32,
    marginBottom: 16,
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: '#A5EA15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 12,
    color: '#A89B9B',
    marginTop: 2,
  },
  memberBalance: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 16,
    color: '#A89B9B',
  },
  leaveBtn: {
    backgroundColor: '#212121',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#A5EA15',
  },
  leaveBtnText: {
    color: '#A5EA15',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaveBtnDisabled: {
    opacity: 0.6,
  },
  deleteBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtnDisabled: {
    opacity: 0.6,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  inviteCodeContainer: {
    flex: 1,
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#A89B9B',
    marginBottom: 4,
  },
  inviteCodeText: {
    fontSize: 18,
    color: '#A5EA15',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  inviteCodeDisplay: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#212121',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#212121',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  avatarText: {
    color: '#212121',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GroupSettingsScreen; 
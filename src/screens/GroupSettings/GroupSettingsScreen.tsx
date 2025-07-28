import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, SafeAreaView, Share, ActivityIndicator, Platform, Modal, Image } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';
import Icon from '../../components/Icon';
import GroupIcon from '../../components/GroupIcon';
import QRCodeModal from '../../components/QRCodeModal';
import { useApp } from '../../context/AppContext';
import { useGroupData } from '../../hooks/useGroupData';
import { GroupMember, Expense } from '../../types';
import { firebaseDataService } from '../../services/firebaseDataService';
import { colors } from '../../theme';
import { styles } from './styles';

const GroupSettingsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const { state, getGroupBalances, updateGroup, deleteGroup, leaveGroup } = useApp();
  const { currentUser } = state;

  // Use the efficient hook that provides cached data and smart loading
  const { 
    group, 
    loading, 
    error, 
    refresh,
    memberCount 
  } = useGroupData(groupId);

  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupCategory, setEditGroupCategory] = useState('');
  const [editGroupIcon, setEditGroupIcon] = useState('people');
  const [editGroupColor, setEditGroupColor] = useState('#A5EA15');

  // State for real members data
  const [realMembers, setRealMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  console.log('🔄 GroupSettingsScreen: Group data:', {
    groupId,
    groupExists: !!group,
    groupName: group?.name,
    groupMembers: group?.members?.length || 0,
    realMembersLength: realMembers.length,
    loading,
    error
  });

  // Check if current user is admin (group creator)
  const isAdmin = group?.created_by === currentUser?.id;

  // Load real member data from backend
  useEffect(() => {
    const loadRealMembers = async () => {
      if (!groupId) return;
      
      setLoadingMembers(true);
      try {
        console.log('🔄 GroupSettingsScreen: Loading members for group:', groupId);
        // Use the hybrid service instead of direct API call
        const members = await firebaseDataService.group.getGroupMembers(groupId.toString(), false, currentUser?.id ? String(currentUser.id) : undefined);
        console.log('🔄 GroupSettingsScreen: Loaded members:', members.length, members.map(m => ({ id: m.id, name: m.name, email: m.email })));
        setRealMembers(members);
        
      } catch (error) {
        console.error('❌ GroupSettingsScreen: Error loading members:', error);
        setRealMembers(group?.members || []);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadRealMembers();
  }, [groupId, group, currentUser]);

  // Get computed values from real member data
  const members = realMembers;
  const expenses = group?.expenses || [];
  
  // Generate invite link when group data is available
  useEffect(() => {
    const generateInvite = async () => {
      if (group?.id && currentUser?.id) {
        try {
          // Use the hybrid service instead of the old groupService
          const inviteData = await firebaseDataService.group.generateInviteLink(group.id.toString(), currentUser.id.toString());
          setInviteLink(inviteData.inviteLink);
        } catch (error) {
          console.error('❌ GroupSettingsScreen: Error generating invite link for QR:', error);
          setInviteLink(`wesplit://join/${group.id}`);
        }
      }
    };

    generateInvite();
  }, [group?.id, currentUser?.id, group?.name]);

  // Predefined icon and color options
  const iconOptions = [
    'people', 'restaurant', 'car', 'home', 'airplane', 'business', 
    'school', 'fitness-center', 'local-movies', 'shopping-cart', 
    'beach-access', 'pets', 'sports-soccer', 'music-note'
  ];

  const colorOptions = [
    '#A5EA15', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    'FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
  ];



  // Handle sharing invite link with native apps
  const handleShareInviteLink = async () => {
    if (!currentUser?.id || !group?.id) {
      Alert.alert('Error', 'Cannot generate invite link');
      return;
    }

    try {
      // Generate invite link using the hybrid service
      const inviteData = await firebaseDataService.group.generateInviteLink(group.id.toString(), currentUser.id.toString());
      
      const shareMessage = `Join my WeSplit group "${group.name}"!

💰 Split expenses easily
📱 Track balances in real-time
🔗 Click this link: ${inviteData.inviteLink}`;

      await Share.share({
        message: shareMessage,
        title: `Join ${group.name} on WeSplit`,
        url: inviteData.inviteLink,
      });

    } catch (error) {
      console.error('❌ GroupSettingsScreen: Error sharing invite link:', error);
      Alert.alert('Error', 'Failed to generate invite link. Please try again.');
    }
  };

  // Handle removing a member from the group (admin only)
  const handleRemoveMember = async (memberId: string | number, memberName: string) => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only group admin can remove members');
      return;
    }

    if (String(memberId) === String(currentUser?.id)) {
      Alert.alert('Error', 'You cannot remove yourself. Use "Leave Group" instead.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
      
              
              // Remove member from Firebase using leaveGroup for the target user
              // Note: This is a simplified approach - in a real app, you'd have a proper removeMember function
              Alert.alert('Info', 'Member removal functionality will be implemented in a future update.');
              
              // For now, just refresh the members list
              const updatedMembers = await firebaseDataService.group.getGroupMembers(
                groupId.toString(), 
                false, 
                currentUser?.id ? String(currentUser.id) : undefined
              );
              setRealMembers(updatedMembers);
              
            } catch (error) {
              console.error('❌ GroupSettingsScreen: Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = async () => {
    try {
      if (!currentUser?.id || !group?.id) {
        Alert.alert('Error', 'Cannot leave group');
        return;
      }

      const groupId = String(group.id);
      const isOnlyMember = members.length === 1;




      if (isOnlyMember) {
        // If user is the only member, delete the group
        await deleteGroup(groupId);
        Alert.alert('Success', 'Group deleted (you were the only member)');
      } else {
        // Leave the group
        await leaveGroup(groupId);
        Alert.alert('Success', 'You have left the group');
      }

      // Navigate back to groups list
      navigation.navigate('GroupsList');
    } catch (error) {
      console.error('❌ GroupSettingsScreen: Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave group. Please try again.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only group admin can delete the group');
      return;
    }

    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentUser?.id || !group?.id) {
                Alert.alert('Error', 'Cannot delete group');
                return;
              }

              const groupId = String(group.id);

              // Delete the group
              await deleteGroup(groupId);
              Alert.alert('Success', 'Group deleted successfully');

              // Navigate back to groups list
              navigation.navigate('GroupsList');
            } catch (error) {
              console.error('❌ GroupSettingsScreen: Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditGroup = () => {
    if (!isAdmin) {
      Alert.alert('Error', 'Only group admin can edit group settings');
      return;
    }

    setEditGroupName(group?.name || '');
    setEditGroupCategory(group?.category || '');
    setEditGroupIcon(group?.icon || 'people');
    setEditGroupColor(group?.color || '#A5EA15');
    setShowEditModal(true);
  };

  const handleSaveGroupChanges = async () => {
    if (!currentUser?.id || !group?.id) {
      Alert.alert('Error', 'User or group information not available');
      return;
    }

    if (!isAdmin) {
      Alert.alert('Error', 'Only group admin can edit group settings');
      return;
    }

    if (!editGroupName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    try {
      setUpdating(true);

      await updateGroup(groupId, {
        name: editGroupName.trim(),
        category: editGroupCategory.trim() || 'general',
        icon: editGroupIcon,
        color: editGroupColor
      });

      // Refresh group data to get the latest updates
      await refresh();

      setShowEditModal(false);
      Alert.alert('Success', 'Group updated successfully');
    } catch (error) {
      console.error('❌ GroupSettingsScreen: Error updating group:', error);
      Alert.alert('Error', 'Failed to update group. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditGroupName('');
    setEditGroupCategory('');
    setEditGroupIcon('people');
    setEditGroupColor('#A5EA15');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Same as NotificationsScreen */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group settings</Text>
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => setShowQRModal(true)}
        >
          <Image
            source={require('../../../assets/qr-code-scan.png')}
            style={styles.qrIcon}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Group Info Card */}
        <View style={styles.groupInfoCard}>
          <GroupIcon
            category={group?.category || 'trip'}
            color={group?.color || '#A5EA15'}
            size={48}
          />
          <View style={styles.groupInfoContent}>
            <Text style={styles.groupName}>{group?.name}</Text>
            <Text style={styles.groupCategory}>{group?.category}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditGroup}>
            <Image
              source={require('../../../assets/icon-edit-white70.png')}
              style={styles.iconWrapper}
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddMembers', { groupId })}
        >
          <Image
            source={require('../../../assets/person-add.png')}
            style={[styles.iconWrapper, { tintColor: '#A5EA15' }]}
          />
          <Text style={styles.actionButtonText}>Add new members</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleShareInviteLink}
        >
          <Icon name="link" size={20} color="#A5EA15" />
          <Text style={styles.actionButtonText}>Invite via link</Text>
        </TouchableOpacity>

        {/* Members Section */}
        <Text style={styles.membersTitle}>{members.length} Members</Text>
        
        {loadingMembers ? (
          <View style={styles.memberItem}>
            <ActivityIndicator size="small" color="#A5EA15" />
            <Text style={styles.memberEmail}>Loading members...</Text>
          </View>
        ) : (
          members.map((member: GroupMember, index: number) => {

            const isInvited = member.invitation_status === 'pending';
            const isCurrentUser = String(member.id) === String(currentUser?.id);
            const canRemoveMember = isAdmin && !isCurrentUser && !isInvited;
            
            console.log('🔄 GroupSettingsScreen: Rendering member:', { 
              id: member.id, 
              name: member.name, 
              email: member.email, 
              isInvited, 
              isCurrentUser, 
              canRemoveMember 
            });
            
            return (
              <View key={`member-${member.id}-${index}`} style={[
                styles.memberItem,
                isInvited && styles.memberItemInvited
              ]}>
                <View style={[
                  styles.memberAvatar,
                  isInvited && styles.memberAvatarInvited
                ]}>
                  {isInvited && (
                    <Icon name="clock" size={16} color="#A89B9B" />
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[
                    styles.memberName,
                    isInvited && styles.memberNameInvited
                  ]}>
                    {isInvited ? 'Invited User' : member.name}
                    {isCurrentUser && ' (You)'}
                    {isAdmin && String(member.id) === String(group?.created_by) && ' (Admin)'}
                  </Text>
                  <Text style={[
                    styles.memberEmail,
                    isInvited && styles.memberEmailInvited
                  ]}>
                    {isInvited ? 'Pending invitation' : member.email}
                  </Text>
                  {!isInvited && member.wallet_address && (
                    <Text style={styles.memberWallet} numberOfLines={1} ellipsizeMode="middle">
                      {member.wallet_address}
                    </Text>
                  )}
                </View>
                {!isInvited && (
                  <View style={styles.memberBalance}>
                    {String(member.id) === String(group?.created_by) ? (
                      <Text style={styles.memberBalancePositive}>Owner</Text>
                    ) : String(member.id) !== String(currentUser?.id) ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member.id, member.name)}
                      >
                        <Text style={styles.memberBalanceNegative}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                {isInvited && (
                  <View style={styles.memberInviteStatus}>
                    <Text style={styles.memberInviteStatusText}>Invited</Text>
                  </View>
                )}
                {canRemoveMember && (
                  <TouchableOpacity
                    style={styles.removeMemberButton}
                    onPress={() => handleRemoveMember(member.id, member.name)}
                  >
                    <Icon name="remove-circle" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {/* Bottom Action Buttons */}
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.deleteButton, 
            group?.created_by !== currentUser?.id && styles.disabledButton
          ]} 
          onPress={handleDeleteGroup}
          disabled={group?.created_by !== currentUser?.id}
        >
          <Text style={[
            styles.deleteButtonText,
            group?.created_by !== currentUser?.id && { opacity: 0.6 }
          ]}>
            {group?.created_by === currentUser?.id ? 'Delete Group' : 'Only creator can delete'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* QR Code Modal */}
      <QRCodeModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrValue={inviteLink || `wesplit://join/${groupId?.toString()}?name=${encodeURIComponent(group?.name || 'Group')}`}
        title="Show QR code to your friend"
        displayName={group?.name || 'Group'}
        displayIcon={group?.category || 'trip'}
        displayColor={group?.color || '#A5EA15'}
        isGroup={true}
      />

      {/* Edit Group Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Group</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Icon name="close" size={24} color="#A89B9B" />
              </TouchableOpacity>
            </View>
            
            {/* Group Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Group Name</Text>
              <TextInput
                style={styles.textInput}
                value={editGroupName}
                onChangeText={setEditGroupName}
                placeholder="Enter group name"
                placeholderTextColor="#A89B9B"
                maxLength={50}
                editable={!updating}
              />
            </View>
            
            {/* Category Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.textInput}
                value={editGroupCategory}
                onChangeText={setEditGroupCategory}
                placeholder="Enter category (e.g., travel, food, general)"
                placeholderTextColor="#A89B9B"
                maxLength={30}
                editable={!updating}
              />
            </View>
            
            {/* Icon Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Icon</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.iconScrollContainer}
                contentContainerStyle={styles.iconScrollContent}
              >
                {iconOptions.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      { backgroundColor: editGroupColor },
                      editGroupIcon === iconName && styles.selectedIconOption
                    ]}
                    onPress={() => setEditGroupIcon(iconName)}
                    disabled={updating}
                  >
                    <Icon name={iconName} size={20} color="#212121" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Color Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Color</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.colorScrollContainer}
                contentContainerStyle={styles.colorScrollContent}
              >
                {colorOptions.map((colorValue) => (
                  <TouchableOpacity
                    key={colorValue}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorValue },
                      editGroupColor === colorValue && styles.selectedColorOption
                    ]}
                    onPress={() => setEditGroupColor(colorValue)}
                    disabled={updating}
                  />
                ))}
              </ScrollView>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.editModalActions}>
              <TouchableOpacity 
                style={[styles.editCancelButton, updating && styles.disabledButton]}
                onPress={handleCancelEdit}
                disabled={updating}
              >
                <Text style={styles.editCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.editSaveButton, updating && styles.disabledButton]}
                onPress={handleSaveGroupChanges}
                disabled={updating || !editGroupName.trim()}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#212121" />
                ) : (
                  <Text style={styles.editSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default GroupSettingsScreen; 
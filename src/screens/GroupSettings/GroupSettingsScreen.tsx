import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, SafeAreaView, Share, ActivityIndicator, Platform } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';
import Icon from '../../components/Icon';
import { useApp } from '../../context/AppContext';
import { useGroupData } from '../../hooks/useGroupData';
import { generateInviteLink, updateGroup, leaveGroup, deleteGroup } from '../../services/groupService';
import { GroupMember, Expense } from '../../types';
import { styles } from './styles';

const GroupSettingsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const { state, getGroupBalances } = useApp();
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

  // Load real member data from backend
  useEffect(() => {
    const loadRealMembers = async () => {
      if (!groupId) return;
      
      setLoadingMembers(true);
      try {
        const response = await fetch(`http://192.168.1.75:4000/api/groups/${groupId}/members`);
        const members = await response.json();
        console.log(`Group Settings - Loaded ${members.length} real members:`, members.map((m: any) => m.name));
        setRealMembers(members);
      } catch (error) {
        console.error('Error loading members in Group Settings:', error);
        setRealMembers(group?.members || []);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadRealMembers();
  }, [groupId]);

  // Get computed values from real member data
  const members = realMembers;
  const expenses = group?.expenses || [];

  // Generate invite link when group data is available
  useEffect(() => {
    const generateInvite = async () => {
      if (group?.id && currentUser?.id) {
        try {
          const inviteData = await generateInviteLink(group.id.toString(), currentUser.id.toString());
          setInviteLink(inviteData.inviteLink);
        } catch (error) {
          console.error('Error generating invite link for QR:', error);
          setInviteLink(`wesplit://join/${group.id}?name=${encodeURIComponent(group.name || 'Group')}`);
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
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
  ];

  // Calculate member balance based on real expense data
  // REPLACED: Now using centralized getGroupBalances for multi-currency support
  const groupBalances = getGroupBalances(groupId);

  // Get member balance display data using centralized calculations
  const getMemberBalance = (memberId: number) => {
    const balance = groupBalances.find(b => b.userId === memberId);
    if (!balance) return { type: 'settled', amount: 0, currency: 'SOL' };

    const currentUserId = Number(currentUser?.id);
    
    if (balance.status === 'settled') {
      return { type: 'settled', amount: 0, currency: balance.currency };
    } else if (balance.status === 'gets_back') {
      // Member is owed money
      if (memberId === currentUserId) {
        return { type: 'you_get_back', amount: balance.amount, currency: balance.currency };
      } else {
        return { type: 'gets_back', amount: balance.amount, currency: balance.currency };
      }
    } else {
      // Member owes money (status === 'owes')
      if (memberId === currentUserId) {
        return { type: 'you_owe', amount: Math.abs(balance.amount), currency: balance.currency };
      } else {
        return { type: 'owes', amount: Math.abs(balance.amount), currency: balance.currency };
      }
    }
  };

  // Handle sharing invite link with native apps
  const handleShareInviteLink = async () => {
    if (!currentUser?.id || !group?.id) {
      Alert.alert('Error', 'Cannot generate invite link');
      return;
    }

    try {
      // Generate invite link using the service
      const inviteData = await generateInviteLink(group.id.toString(), currentUser.id.toString());
      
      const shareMessage = `Join my WeSplit group "${group.name}"!

💰 Split expenses easily
📱 Track balances in real-time
🔗 Invite code: ${inviteData.inviteCode}

Or click this link: ${inviteData.inviteLink}`;

      await Share.share({
        message: shareMessage,
        title: `Join ${group.name} on WeSplit`,
        url: inviteData.inviteLink,
      });

    } catch (error) {
      console.error('Error sharing invite link:', error);
      Alert.alert('Error', 'Failed to generate invite link. Please try again.');
    }
  };

  const handleLeaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await leaveGroup(groupId.toString(), currentUser?.id?.toString() || '');
              Alert.alert('Success', result.message || 'You have left the group successfully');
              navigation.navigate('Dashboard');
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', (error as Error).message || 'Failed to leave group. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteGroup = async () => {
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
              const result = await deleteGroup(groupId.toString(), currentUser?.id?.toString() || '');
              Alert.alert('Success', result.message || 'Group deleted successfully');
              navigation.navigate('Dashboard');
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', (error as Error).message || 'Failed to delete group. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditGroup = () => {
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

    if (!editGroupName.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      
      const result = await updateGroup(
        group.id.toString(),
        currentUser.id.toString(),
        {
          name: editGroupName.trim(),
          category: editGroupCategory.trim() || 'general',
          icon: editGroupIcon,
          color: editGroupColor
        }
      );

      // Refresh group data to get the latest updates
      await refresh();

      setShowEditModal(false);
      Alert.alert('Success', 'Group updated successfully');
    } catch (error) {
      console.error('Error updating group:', error);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group settings</Text>
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => setShowQRModal(true)}
        >
          <Icon name="qr-code" size={24} color="#A5EA15" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Group Info Card */}
        <View style={styles.groupInfoCard}>
          <View style={[styles.groupIconContainer, { backgroundColor: group?.color || '#A5EA15' }]}>
            <Icon name={group?.icon || 'people'} size={24} color="#212121" />
          </View>
          <View style={styles.groupInfoContent}>
            <Text style={styles.groupName}>{group?.name}</Text>
            <Text style={styles.groupCategory}>{group?.category}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditGroup}>
            <Icon name="create" size={20} color="#A89B9B" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddMembers', { groupId })}
        >
          <Icon name="person-add" size={20} color="#A5EA15" />
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
          members.map((member) => {
            const balance = getMemberBalance(member.id);
            return (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberAvatar} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  <Text style={styles.memberWallet} numberOfLines={1} ellipsizeMode="middle">
                    {member.wallet_address}
                  </Text>
                </View>
                <View style={styles.memberBalance}>
                  <Text style={[
                    styles.memberBalanceText,
                    (balance.type === 'gets_back' || balance.type === 'you_get_back') ? styles.memberBalancePositive :
                    (balance.type === 'you_owe' || balance.type === 'owes') ? styles.memberBalanceNegative : styles.memberBalanceNeutral
                  ]}>
                    {balance.type === 'gets_back' ? 'gets back' : 
                     balance.type === 'you_get_back' ? 'you get back' :
                     balance.type === 'you_owe' ? 'you owe' : 
                     balance.type === 'owes' ? 'owes' : 'settled'}
                  </Text>
                  <Text style={[
                    styles.memberBalanceAmount,
                    balance.type === 'gets_back' ? styles.memberBalancePositive :
                    balance.type === 'you_owe' ? styles.memberBalanceNegative : styles.memberBalanceNeutral
                  ]}>
                    {balance.amount > 0 ? `${balance.currency} ${balance.amount.toFixed(2)}` : ''}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Bottom Action Buttons */}
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteGroup}>
          <Text style={styles.deleteButtonText}>Delete Group</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalContainer}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Icon name="close" size={24} color="#A89B9B" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.qrModalTitle}>Show QR code to your friend</Text>
            
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={inviteLink || `wesplit://join/${groupId}?name=${encodeURIComponent(group?.name || 'Group')}`}
                size={200}
                color="#212121"
                backgroundColor="transparent"
                logoSize={30}
                logoBackgroundColor='transparent'
              />
            </View>
            
            <View style={styles.qrGroupInfo}>
              <View style={[styles.qrGroupIcon, { backgroundColor: group?.color || '#A5EA15' }]}>
                <Icon name={group?.icon || 'people'} size={16} color="#212121" />
              </View>
              <Text style={styles.qrGroupName}>{group?.name}</Text>
            </View>
            
            <View style={styles.qrModalActions}>
              <TouchableOpacity style={styles.qrShareButton} onPress={handleShareInviteLink}>
                <Icon name="share" size={16} color="#A5EA15" />
                <Text style={styles.qrShareButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.qrDoneButton} onPress={() => setShowQRModal(false)}>
                <Text style={styles.qrDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
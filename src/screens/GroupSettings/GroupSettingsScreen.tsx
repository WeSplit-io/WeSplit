import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Share,
  TextInput,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';

import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { colors } from '../../theme';
import { styles } from './styles';
import QRCodeModal from '../../components/QRCodeModal';
import NavBar from '../../components/NavBar';
import Icon from '../../components/Icon';
import GroupIcon from '../../components/GroupIcon';
import { useGroupData } from '../../hooks/useGroupData';

import { GroupMember, Expense } from '../../types';
import { hashWalletAddress } from '../../utils/cryptoUtils';

const GroupSettingsScreen: React.FC<any> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const { state, getGroupBalances, updateGroup, deleteGroup, leaveGroup, startGroupListener, stopGroupListener } = useApp();
  const { currentUser } = state;

  // Animation refs for edit modal
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [editGroupCategory, setEditGroupCategory] = useState('trip');
  const [editGroupColor, setEditGroupColor] = useState('#A5EA15');

  // State for real members data
  const [realMembers, setRealMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [profileImages, setProfileImages] = useState<{ [key: string]: string }>({});

  console.log('🔄 GroupSettingsScreen: Group data:', {
    groupId,
    groupExists: !!group,
    groupName: group?.name,
    groupCategory: group?.category,
    groupColor: group?.color,
    groupIcon: group?.icon,
    groupMembers: group?.members?.length || 0,
    realMembersLength: realMembers.length,
    loading,
    error
  });

  // Debug logging for real-time updates
  useEffect(() => {
    if (group) {
      console.log('🔄 GroupSettingsScreen: Group data updated via real-time listener:', {
        name: group.name,
        category: group.category,
        color: group.color,
        icon: group.icon
      });
    }
  }, [group?.name, group?.category, group?.color, group?.icon]);

  // Check if current user is admin (group creator)
  const isAdmin = group?.created_by === currentUser?.id;

  // Start group listener when component mounts
  useEffect(() => {
    if (groupId) {
      console.log('🔄 GroupSettingsScreen: Starting group listener for:', groupId);
      startGroupListener(groupId.toString());
      
      // Cleanup function to stop listener when component unmounts
      return () => {
        console.log('🔄 GroupSettingsScreen: Stopping group listener for:', groupId);
        stopGroupListener(groupId.toString());
      };
    }
  }, [groupId, startGroupListener, stopGroupListener]);

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
        
        // Fetch profile images for members from database
        const imagePromises = members.map(async (member) => {
          if (member.id) {
            try {
              // Get user profile from database
              const userProfile = await firebaseDataService.user.getCurrentUser(member.id.toString());
              if (userProfile?.avatar) {
                return { id: member.id, url: userProfile.avatar };
              }
            } catch (error) {
              console.error('❌ GroupSettingsScreen: Error fetching profile image for member:', member.id, error);
            }
          }
          return null;
        });
        
        const imageResults = await Promise.all(imagePromises);
        const imagesMap: { [key: string]: string } = {};
        imageResults.forEach(result => {
          if (result) {
            imagesMap[result.id] = result.url;
          }
        });
        setProfileImages(imagesMap);
        
      } catch (error) {
        console.error('❌ GroupSettingsScreen: Error loading members:', error);
        setRealMembers(group?.members || []);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadRealMembers();
  }, [groupId, currentUser?.id]); // Removed 'group' from dependencies to prevent infinite loading

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
          console.log('✅ GroupSettingsScreen: Generated invite link:', inviteData.inviteLink);
        } catch (error) {
          console.error('❌ GroupSettingsScreen: Error generating invite link for QR:', error);
          // Don't set a fallback link - let the QR code show empty if generation fails
          setInviteLink('');
        }
      }
    };

    generateInvite();
  }, [group?.id, currentUser?.id, group?.name]);

  // Category options matching CreateGroupScreen
  const CATEGORIES = [
    { id: 'trip', imageKey: 'trip' },
    { id: 'food', imageKey: 'food' },
    { id: 'home', imageKey: 'home' },
    { id: 'event', imageKey: 'event' },
    { id: 'rocket', imageKey: 'rocket' }
  ];

  // Image mapping for static require calls
  const CATEGORY_IMAGES: { [key: string]: any } = {
    trip: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftrip-icon-black.png?alt=media&token=3afeb768-566f-4fd7-a550-a19c5c4f5caf' },
    food: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffood-icon-black.png?alt=media&token=ef382697-bf78-49e6-b3b3-f669378ebd36' },
    home: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhouse-icon-black.png?alt=media&token=03406723-1c5b-45fd-a20b-dda8c49a2f83' },
    event: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fevent-icon-black.png?alt=media&token=b11d12c2-c4d9-4029-be12-0ddde31ad0d1' },
    rocket: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Frocket-icon-black.png?alt=media&token=90fabb5a-8110-4fd9-9753-9c785fa953a4' },
    };

  // Color options matching CreateGroupScreen - all green shades
  const COLORS = [
    '#A5EA15', '#4CAF50', '#66BB6A', '#C0F05B', '#D3F48A', '#E4F8B8'
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

      // Check if user has outstanding balances
      let hasOutstandingBalance = false;
      let userBalance = 0;
      let balanceDetails = '';
      let owesMoney = false;

      try {
        console.log('🔄 GroupSettingsScreen: Checking balances before leaving group...');
        
        // Get group balances to check if user owes money or is owed money
        const balances = await getGroupBalances(groupId);
        console.log('🔄 GroupSettingsScreen: Retrieved balances:', balances);
        
        if (balances && Array.isArray(balances)) {
          const userBalanceData = balances.find(balance => 
            String(balance.userId) === String(currentUser.id)
          );
          
          console.log('🔄 GroupSettingsScreen: User balance data:', userBalanceData);
          
          if (userBalanceData) {
            userBalance = userBalanceData.amount || 0;
            owesMoney = userBalance < -0.01; // User owes money if balance is negative
            hasOutstandingBalance = Math.abs(userBalance) > 0.01; // Check if balance is significant
            
            console.log('🔄 GroupSettingsScreen: Balance analysis:', {
              userBalance,
              owesMoney,
              hasOutstandingBalance,
              currentUserId: currentUser.id
            });
            
            if (hasOutstandingBalance) {
              if (userBalance > 0) {
                balanceDetails = `You are owed $${userBalance.toFixed(2)}`;
              } else {
                balanceDetails = `You owe $${Math.abs(userBalance).toFixed(2)}`;
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ GroupSettingsScreen: Error checking balances:', error);
        // Continue with leave process even if balance check fails
      }

      // If user owes money, prevent leaving and force settlement
      if (owesMoney) {
        Alert.alert(
          'Cannot Leave Group',
          `You owe $${Math.abs(userBalance).toFixed(2)} to other members.\n\nYou must settle all outstanding balances before leaving the group.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settle Now',
              style: 'default',
              onPress: () => {
                // Navigate to group details with settle up modal open
                navigation.navigate('GroupDetails', { 
                  groupId,
                  showSettleUpModal: true,
                  showSettleUpOnLeave: true,
                  onSettlementComplete: () => {
                    // After settlement, check balances again and proceed if settled
                    checkBalancesAndLeave(groupId, isOnlyMember);
                  }
                });
              }
            }
          ]
        );
        return;
      }

      // Show confirmation alert with balance information
      const alertTitle = 'Leave Group';
      const alertMessage = hasOutstandingBalance 
        ? `Are you sure you want to leave "${group.name}"?\n\n${balanceDetails}\n\nYou can settle your balances before leaving.`
        : `Are you sure you want to leave "${group.name}"?`;

      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: hasOutstandingBalance ? 'Settle & Leave' : 'Leave Group',
            style: hasOutstandingBalance ? 'default' : 'destructive',
            onPress: async () => {
              try {
                if (hasOutstandingBalance) {
                  // Navigate to group details with settle up modal open
                  navigation.navigate('GroupDetails', { 
                    groupId,
                    showSettleUpModal: true,
                    showSettleUpOnLeave: true,
                    onSettlementComplete: () => {
                      // After settlement, check balances again and proceed if settled
                      checkBalancesAndLeave(groupId, isOnlyMember);
                    }
                  });
                } else {
                  // Proceed directly with leaving group
                  await proceedWithLeavingGroup(groupId, isOnlyMember);
                }
              } catch (error) {
                console.error('❌ GroupSettingsScreen: Error in leave group process:', error);
                Alert.alert('Error', 'Failed to leave group. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ GroupSettingsScreen: Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave group. Please try again.');
    }
  };

  // Helper function to check balances after settlement and proceed with leaving
  const checkBalancesAndLeave = async (groupId: string, isOnlyMember: boolean) => {
    try {
      console.log('🔄 GroupSettingsScreen: Re-checking balances after settlement...');
      
      // Re-check balances after settlement
      const balances = await getGroupBalances(groupId);
      const userBalanceData = balances.find(balance => 
        String(balance.userId) === String(currentUser?.id)
      );
      
      const stillOwesMoney = userBalanceData && userBalanceData.amount < -0.01;
      
      if (stillOwesMoney) {
        Alert.alert(
          'Still Outstanding Balances',
          `You still owe $${Math.abs(userBalanceData.amount).toFixed(2)} to other members.\n\nPlease complete all settlements before leaving.`,
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return;
      }
      
      // If no longer owes money, proceed with leaving
      await proceedWithLeavingGroup(groupId, isOnlyMember);
    } catch (error) {
      console.error('❌ GroupSettingsScreen: Error checking balances after settlement:', error);
      Alert.alert('Error', 'Failed to verify settlement. Please try again.');
    }
  };

  const proceedWithLeavingGroup = async (groupId: string, isOnlyMember: boolean) => {
    try {
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

  // Refresh members list
  const refreshMembers = async () => {
    if (!groupId) return;
    
    setLoadingMembers(true);
    try {
      console.log('🔄 GroupSettingsScreen: Refreshing members for group:', groupId);
      const members = await firebaseDataService.group.getGroupMembers(groupId.toString(), true, currentUser?.id ? String(currentUser.id) : undefined);
      console.log('🔄 GroupSettingsScreen: Refreshed members:', members.length);
      setRealMembers(members);
    } catch (error) {
      console.error('❌ GroupSettingsScreen: Error refreshing members:', error);
    } finally {
      setLoadingMembers(false);
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
    setEditGroupCategory(group?.category || 'trip');
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

      const updateData = {
        name: editGroupName.trim(),
        category: editGroupCategory.trim() || 'trip',
        icon: editGroupCategory, // Use category as icon
        color: editGroupColor
      };

      console.log('🔄 GroupSettingsScreen: Updating group with data:', updateData);

      await updateGroup(groupId, updateData);

      console.log('🔄 GroupSettingsScreen: Group updated successfully, real-time listener will update state...');

      // The real-time listener will automatically update the group data
      // No need to manually refresh since the listener will handle it

      console.log('🔄 GroupSettingsScreen: Group data refreshed, new group data:', {
        name: group?.name,
        category: group?.category,
        color: group?.color,
        icon: group?.icon
      });

      setShowEditModal(false);
      Alert.alert('Success', 'Group updated successfully');
    } catch (error) {
      console.error('❌ GroupSettingsScreen: Error updating group:', error);
      Alert.alert('Error', 'Failed to update group. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Gesture handler for edit modal
  const handleEditGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleEditStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      opacity.setValue(1);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) { // Threshold to close modal
        // Close modal
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          handleCancelEdit();
          // Reset values
          translateY.setValue(0);
          opacity.setValue(0);
        });
      } else {
        // Reset to original position
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animate in when edit modal becomes visible
  useEffect(() => {
    if (showEditModal) {
      opacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showEditModal]);

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditGroupName('');
    setEditGroupCategory('trip');
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
        <TouchableOpacity onPress={() => {
          console.log('🔄 GroupSettingsScreen: Back button pressed');
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('GroupsList');
          }
        }} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group settings</Text>
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => setShowQRModal(true)}
        >
          <Image
                            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fqr-code-scan.png?alt=media&token=3fc388bd-fdf7-4863-a8b1-9313490d6382' }}
            style={styles.qrIcon}
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingMembers}
            onRefresh={refreshMembers}
            tintColor="#A5EA15"
            colors={["#A5EA15"]}
          />
        }
      >
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
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-edit-white70.png?alt=media&token=bc45a0b7-6fcd-45f1-8d65-c73fe2ef4a92' }}
              style={styles.editIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddMembers', { groupId })}
        >
          <Image
                            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fperson-add.png?alt=media&token=c424d92a-3faf-4db5-baeb-1c0e92b099e8' }}
            style={[styles.iconWrapper, { tintColor: '#A5EA15' }]}
          />
          <Text style={styles.actionButtonText}>Add new members</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleShareInviteLink}
        >
          <Image
                            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Flink-icon-green.png?alt=media&token=381707d9-7ea7-4323-b2cf-7afcc6a7fea7' }}
            style={[styles.iconWrapper, { tintColor: '#A5EA15' }]}
          />
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
                  {isInvited ? (
                    <Icon name="clock" size={16} color="#A89B9B" />
                  ) : profileImages[member.id] ? (
                    <Image
                      source={{ uri: profileImages[member.id] }}
                      style={[styles.memberAvatar, { backgroundColor: 'transparent' }]}
                    />
                  ) : (
                    <Text style={{ color: '#000000', fontSize: 16, fontWeight: 'bold' }}>
                      {member.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
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
                      {hashWalletAddress(member.wallet_address)}
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

              </View>
            );
          })
        )}

      </ScrollView>

      {/* Bottom Action Buttons - Fixed at bottom */}
      <View style={styles.bottomActionContainer}>
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
      </View>

      {/* QR Code Modal */}
      <QRCodeModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrValue={inviteLink || ''}
        title="Show QR code to your friend"
        displayName={group?.name || 'Group'}
        displayIcon={group?.category || 'trip'}
        displayColor={group?.color || '#A5EA15'}
        isGroup={true}
      />

      {/* Edit Group Modal - Animated */}
      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancelEdit}
        statusBarTranslucent={true}
      >
        <Animated.View style={[styles.editModalOverlay, { opacity }]}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback onPress={handleCancelEdit}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            </TouchableWithoutFeedback>
            
            <PanGestureHandler
              onGestureEvent={handleEditGestureEvent}
              onHandlerStateChange={handleEditStateChange}
            >
              <Animated.View
                style={[
                  styles.editModalContent,
                  {
                    transform: [{ translateY }],
                  },
                ]}
              >
                {/* Handle bar for slide down */}
                <View style={styles.editModalHandle} />

                {/* Header */}
                <View style={styles.editModalHeader}>
                  <Text style={styles.editModalTitle}>Edit Group</Text>
                </View>
                
                <ScrollView 
                  style={styles.editModalScrollContent} 
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                >
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
                  

                  
                  {/* Category Selection */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.categoryRow}>
                      {CATEGORIES.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryOption,
                            editGroupCategory === category.id && {
                              backgroundColor: editGroupColor,
                              borderWidth: 1,
                              borderColor: colors.green,
                            }
                          ]}
                          onPress={() => setEditGroupCategory(category.id)}
                          disabled={updating}
                        >
                          <Image
                            source={CATEGORY_IMAGES[category.imageKey]}
                            style={styles.categoryImage}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Color Selection */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Color</Text>
                    <View style={styles.colorRow}>
                      {COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            editGroupColor === color && styles.colorSelected
                          ]}
                          onPress={() => setEditGroupColor(color)}
                          disabled={updating}
                        />
                      ))}
                    </View>
                  </View>
                </ScrollView>
                
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
              </Animated.View>
            </PanGestureHandler>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

export default GroupSettingsScreen; 
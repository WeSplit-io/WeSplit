import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Animated
} from 'react-native';
import Icon from '../../components/Icon';
import NotificationCard, { NotificationData } from '../../components/NotificationCard';
import { useApp } from '../../context/AppContext';
import { getUserNotifications, markNotificationAsRead, sendNotification, Notification } from '../../services/firebaseNotificationService';
import { updatePaymentRequestStatus, updateSettlementRequestStatus } from '../../services/notificationStatusService';
import { firebaseDataService } from '../../services/firebaseDataService';
import styles from './styles';
import { colors } from '../../theme/colors';
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications, acceptGroupInvitation } = useApp();
  const { currentUser } = state;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');

  // State for managing action button states and animations
  const [actionStates, setActionStates] = useState<{ [key: string]: 'pending' | 'completed' | 'error' }>({});
  const [fadeAnimations, setFadeAnimations] = useState<{ [key: string]: Animated.Value }>({});

  // Use notifications from context
  useEffect(() => {
    const loadNotificationsAsync = async () => {
      try {
        setLoading(true);
        await loadNotifications();
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotificationsAsync();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(true);
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(String(notification.id));
        loadNotifications(); // Refresh notifications to update read status
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'settlement_request' || notification.type === 'settlement_notification') {
      const groupId = notification.data?.groupId;
      if (groupId) {
        navigation.navigate('GroupDetails', { groupId });
      }
    }
  };

  // Initialize fade animation for a notification
  const initializeFadeAnimation = (notificationId: string) => {
    if (!fadeAnimations[notificationId]) {
      setFadeAnimations(prev => ({
        ...prev,
        [notificationId]: new Animated.Value(1)
      }));
    }
  };

  // Show toast-like alert
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    Alert.alert(
      type === 'success' ? 'Success' : 'Error',
      message,
      [{ text: 'OK' }]
    );
  };

  // Comprehensive notification action handler
  const notificationActionHandler = async (notification: NotificationData) => {
    const notificationId = notification.id;
    
    // Initialize animation if not exists
    initializeFadeAnimation(notificationId);
    
    // Set action state to pending
    setActionStates(prev => ({
      ...prev,
      [notificationId]: 'pending'
    }));

    try {
      if (notification.type === 'payment_request' || notification.type === 'payment_reminder') {
        // Handle payment request
        if (notification.status === 'paid') {
          showToast('Payment already completed');
          return;
        }

        // Navigate to send payment screen
        navigation.navigate('Send', { 
          recipient: notification.data?.requester,
          amount: notification.data?.amount,
          currency: notification.data?.currency,
          fromNotification: true,
          notificationId: notificationId
        });

        // Mark as completed after navigation
        setActionStates(prev => ({
          ...prev,
          [notificationId]: 'completed'
        }));

        // Fade animation
        Animated.timing(fadeAnimations[notificationId], {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }).start();

      } else if (notification.type === 'group_invite') {
        // Handle group invitation
        const groupId = notification.data?.groupId;
        const inviteLink = notification.data?.inviteLink;
        
        if (!groupId) {
          throw new Error('Missing group data in notification');
        }



        // Get the current user ID
        const currentUserId = state.currentUser?.id;
        if (!currentUserId) {
          throw new Error('User not authenticated');
        }
        
        try {
          // Extract inviteId from inviteLink if available
          let inviteId = groupId; // Default to groupId
          
          if (inviteLink) {
            // Parse inviteLink format: "wesplit://join/invite_{groupId}_{timestamp}_{randomId}"
            const inviteMatch = inviteLink.match(/invite_([^_]+)_(\d+)_([a-zA-Z0-9]+)/);
            if (inviteMatch) {
              inviteId = inviteMatch[1]; // Use the groupId part as inviteId
            }
          }

          // Try to join using the proper inviteId
          const result = await firebaseDataService.group.joinGroupViaInvite(
            inviteId,
            currentUserId.toString()
          );



          // Update action state
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          // Fade animation
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            // Navigate to group details after animation
            navigation.navigate('GroupDetails', { groupId });
          });

          showToast('Successfully joined the group!');

        } catch (error) {
          console.error('❌ NotificationsScreen: Error joining group:', error);
          
          // If the joinGroupViaInvite fails, try alternative approach
          if (error instanceof Error && (error.message.includes('Invalid or expired invite link') || error.message.includes('invite'))) {
            // Try to join using the group ID directly
            try {
              // Add user to group members directly
              const groupMembersRef = collection(db, 'groupMembers');
              const userDoc = await getDoc(doc(db, 'users', currentUserId.toString()));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check if user is already a member
                const memberQuery = query(
                  groupMembersRef,
                  where('group_id', '==', groupId),
                  where('user_id', '==', currentUserId.toString())
                );
                const memberDocs = await getDocs(memberQuery);
                
                if (memberDocs.empty) {
                  // Add user to group
                  await addDoc(groupMembersRef, {
                    group_id: groupId,
                    user_id: currentUserId.toString(),
                    name: userData.name || 'You',
                    email: userData.email || '',
                    wallet_address: userData.wallet_address || '',
                    wallet_public_key: userData.wallet_public_key || '',
                    joined_at: serverTimestamp(),
                    created_at: serverTimestamp(),
                    avatar: userData.avatar || '',
                    invitation_status: 'accepted',
                    invited_at: serverTimestamp(),
                    invited_by: currentUserId.toString()
                  });
                  

                  
                  // Update action state
                  setActionStates(prev => ({
                    ...prev,
                    [notificationId]: 'completed'
                  }));

                  // Fade animation
                  Animated.timing(fadeAnimations[notificationId], {
                    toValue: 0.6,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    // Navigate to group details after animation
                    navigation.navigate('GroupDetails', { groupId });
                  });

                  showToast('Successfully joined the group!');
                } else {
                  // User is already a member, update their status to accepted if it's pending
                  const existingMember = memberDocs.docs[0];
                  const existingData = existingMember.data();
                  
                  if (existingData.invitation_status === 'pending') {
                    // Update the member's status to accepted
                    await updateDoc(existingMember.ref, {
                      invitation_status: 'accepted',
                      joined_at: serverTimestamp(),
                      name: userData.name || 'You',
                      email: userData.email || '',
                      wallet_address: userData.wallet_address || '',
                      wallet_public_key: userData.wallet_public_key || '',
                      avatar: userData.avatar || ''
                    });
                    
                    showToast('Successfully joined the group!');
                  } else {
                    showToast('You are already a member of this group');
                  }
                  
                  // Update action state
                  setActionStates(prev => ({
                    ...prev,
                    [notificationId]: 'completed'
                  }));
                }
              } else {
                throw new Error('User data not found');
              }
            } catch (directError) {
              console.error('❌ NotificationsScreen: Error with direct join method:', directError);
              showToast('Failed to join group. Please try again.', 'error');
              
              // Set action state to error
              setActionStates(prev => ({
                ...prev,
                [notificationId]: 'error'
              }));
            }
          } else {
            // Handle other types of errors
            showToast('Failed to join group. Please try again.', 'error');
            
            // Set action state to error
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'error'
            }));
          }
        }

      } else if (notification.type === 'expense_added') {
        // Handle expense added notification
        const groupId = notification.data?.groupId;
        
        if (groupId) {
          // Navigate to group details
          navigation.navigate('GroupDetails', { groupId });
          
          // Mark as completed
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          // Fade animation
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

      } else if (notification.type === 'payment_received') {
        // Handle payment received notification
        const transactionId = notification.data?.transactionId;
        
        if (transactionId) {
          // Navigate to transaction details
          navigation.navigate('TransactionHistory', { 
            transactionId: transactionId 
          });
          
          // Mark as completed
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          // Fade animation
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

      } else if (notification.type === 'group_payment_request') {
        // Handle group payment request notification
        const sender = notification.data?.sender;
        const amount = notification.data?.amount;
        const currency = notification.data?.currency;
        const groupId = notification.data?.groupId;
        
        if (sender && amount && currency) {
          // Navigate to send payment screen
          navigation.navigate('Send', { 
            recipient: sender,
            amount: amount,
            currency: currency,
            groupId: groupId,
            fromNotification: true,
            notificationId: notificationId
          });
          
          // Mark as completed
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          // Fade animation
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

      } else if (notification.type === 'group_added') {
        // Handle group added notification
        const groupId = notification.data?.groupId;
        
        if (groupId) {
          // Navigate to group details
          navigation.navigate('GroupDetails', { 
            groupId: groupId 
          });
          
          // Mark as completed
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          // Fade animation
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

      } else if (notification.type === 'system_warning') {
        // Handle system warning notification
        try {
          // Dismiss system warning by marking as read
          await firebaseDataService.notification.markNotificationAsRead(notificationId);
          
          // Mark as completed
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          // Fade animation
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
          
          showToast('Warning dismissed', 'success');
        } catch (error) {
          console.error('❌ NotificationsScreen: Error dismissing system warning:', error);
          
          // Set action state to error
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'error'
          }));
          
          showToast('Failed to dismiss warning', 'error');
        }

      } else if (notification.type === 'settlement_request') {
        // Handle settlement request
        const groupId = notification.data?.groupId;
        
        if (groupId) {
          // Navigate to settlement screen
          navigation.navigate('SettleUp', { groupId });
          
          // Mark as completed
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          // Fade animation
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

      } else if (notification.type === 'settlement_notification') {
        // Handle settlement notification (view only)
        const groupId = notification.data?.groupId;
        
        if (groupId) {
          navigation.navigate('GroupDetails', { groupId });
          
          setActionStates(prev => ({
            ...prev,
            [notificationId]: 'completed'
          }));

          Animated.timing(fadeAnimations[notificationId], {
            toValue: 0.6,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }

      } else {
        // Default action for other notification types
        setActionStates(prev => ({
          ...prev,
          [notificationId]: 'completed'
        }));

        Animated.timing(fadeAnimations[notificationId], {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }

      // Refresh notifications to update status
      await loadNotifications(true);

    } catch (error) {
      console.error('Error handling notification action:', error);
      
      // Set error state
      setActionStates(prev => ({
        ...prev,
        [notificationId]: 'error'
      }));

      // Show error toast
      showToast(
        error instanceof Error ? error.message : 'Failed to complete action. Please try again.',
        'error'
      );

      // Reset animation after error
      Animated.timing(fadeAnimations[notificationId], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePaymentStatusUpdate = async (notificationId: string, newStatus: 'paid' | 'cancelled') => {
    try {
      if (!currentUser?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      Alert.alert(
        'Update Payment Status',
        `Mark notification ${notificationId} as ${newStatus}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Update', 
            onPress: async () => {
              try {
                // Update the notification status in Firestore
                await updatePaymentRequestStatus(notificationId, newStatus, String(currentUser.id));
                
                // Refresh notifications to show updated status
                await loadNotifications(true);
                
                Alert.alert('Success', `Notification status updated to ${newStatus}`);
              } catch (error) {
                console.error('Error updating payment status:', error);
                Alert.alert('Error', 'Failed to update payment status');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const handleSettlementStatusUpdate = async (notificationId: string, newStatus: 'paid' | 'cancelled') => {
    try {
      if (!currentUser?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      Alert.alert(
        'Update Settlement Status',
        `Mark settlement ${notificationId} as ${newStatus}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Update', 
            onPress: async () => {
              try {
                // Update the notification status in Firestore
                await updateSettlementRequestStatus(notificationId, newStatus, String(currentUser.id));
                
                // Refresh notifications to show updated status
                await loadNotifications(true);
                
                Alert.alert('Success', `Settlement status updated to ${newStatus}`);
              } catch (error) {
                console.error('Error updating settlement status:', error);
                Alert.alert('Error', 'Failed to update settlement status');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating settlement status:', error);
      Alert.alert('Error', 'Failed to update settlement status');
    }
  };



  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (dateString: string) => {
    const date = new Date(dateString);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return date.toDateString() === yesterday.toDateString();
  };

  const getSectionTitle = (dateString: string) => {
    if (isToday(dateString)) return 'Today';
    if (isYesterday(dateString)) return 'Yesterday';
    return 'Earlier';
  };

  const groupNotificationsByDate = (notifications: any[]) => {
    const grouped: { [key: string]: any[] } = {};

    notifications.forEach(notification => {
      const sectionTitle = getSectionTitle(notification.created_at);
      if (!grouped[sectionTitle]) {
        grouped[sectionTitle] = [];
      }
      grouped[sectionTitle].push(notification);
    });

    return grouped;
  };

  // Transform real notifications to match NotificationData interface
  const getDisplayNotifications = (): NotificationData[] => {
    const realNotifications = notifications || [];
    
    // Transform real notifications to match NotificationData interface
    const transformedNotifications: NotificationData[] = realNotifications.map((notification: any) => ({
      id: notification.id,
      type: notification.type as NotificationData['type'],
      title: notification.title,
      message: notification.message,
      created_at: notification.created_at,
      is_read: notification.is_read,
      status: notification.data?.status || 'pending',
      data: notification.data || {}
    }));
    
    return activeTab === 'requests'
      ? transformedNotifications.filter((n: NotificationData) => n.type === 'payment_request' || n.type === 'payment_reminder')
      : transformedNotifications;
  };

  const filteredNotifications = getDisplayNotifications();

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const unreadCount = filteredNotifications.filter((n: NotificationData) => !n.is_read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}

        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A5EA15"
            titleColor="#FFF"
          />
        }
      >
        {Object.keys(groupedNotifications).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fnotif-empty-state.png?alt=media&token=c2a67bb0-0e1b-40b0-9467-6e239f41a166' }} style={styles.emptyStateIcon} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You have no notifications yet.
              Please come back later.
            </Text>
          </View>
        ) : (
          Object.entries(groupedNotifications).map(([sectionTitle, sectionNotifications]) => (
            <View key={sectionTitle}>
              <Text style={styles.sectionHeader}>{sectionTitle}</Text>
              {sectionNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onPress={handleNotificationPress}
                  onActionPress={notificationActionHandler}
                  actionState={actionStates[notification.id]}
                  fadeAnimation={fadeAnimations[notification.id]}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsScreen; 
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { NotificationCard } from '../../components/notifications';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { Container } from '../../components/shared';
import Header from '../../components/shared/Header';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import styles from './styles';

// Import the unified NotificationData interface
import { NotificationData } from '../../types/notifications';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications, acceptSplitInvitation } = useApp();

  // State variables
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, any>>({});
  const [fadeAnimations, setFadeAnimations] = useState<Record<string, any>>({});

  // Function to fetch user data from Firebase
  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Function to standardize notification data
  const standardizeNotificationData = (notification: any) => {
    const data = notification.data || {};
    return {
      senderId: data.senderId || data.fromUser || data.userId || '',
      senderName: data.senderName || data.fromUserName || data.userName || 'Unknown User',
      amount: data.amount || 0,
      currency: data.currency || 'USDC',
      requestId: data.requestId || data.id || '',
      description: data.description || data.note || '',
      note: data.note || data.description || '',
      splitId: data.splitId || '',
      splitWalletId: data.splitWalletId || '',
      splitType: data.splitType || 'fair',
      billName: data.billName || '',
      participantAmount: data.participantAmount || 0,
      totalAmount: data.totalAmount || 0,
      transactionId: data.transactionId || '',
      transactionHash: data.transactionHash || '',
      status: data.status || 'pending',
      shareableLink: data.shareableLink || '',
      splitInvitationData: data.splitInvitationData || '',
      timestamp: data.timestamp || notification.created_at || new Date().toISOString()
    };
  };

  // Function to log notification data for debugging
  const logNotificationData = (data: any, context: string, type: string) => {
    console.log(`📱 ${context} - ${type}:`, {
      senderId: data.senderId,
      senderName: data.senderName,
      amount: data.amount,
      currency: data.currency,
      requestId: data.requestId,
      splitId: data.splitId,
      splitType: data.splitType,
      billName: data.billName,
      participantAmount: data.participantAmount,
      totalAmount: data.totalAmount
    });
  };

  // Function to show toast message
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // You can implement a toast library here
    console.log(`Toast (${type}): ${message}`);
  };

  // Function to handle notification press
  const handleNotificationPress = async (notification: any) => {
    try {
      console.log('🔔 Handling notification press:', {
        type: notification.type,
        data: notification.data,
        id: notification.id
      });

      // Navigate based on notification type
      if (notification.type === 'split_invite') {
        // Handle split invitation by accepting it first, then navigating to split details
        const splitId = notification.data?.splitId;
        if (splitId) {
          try {
            // Call acceptSplitInvitation with proper arguments if available
            if (acceptSplitInvitation && state.currentUser?.id) {
              await acceptSplitInvitation(splitId, state.currentUser.id);
            }
            showToast('Split invitation accepted!');
            // Navigate to split details
            navigation.navigate('SplitDetails', { splitId });
          } catch (error) {
            console.error('Error accepting split invitation:', error);
            showToast('Failed to accept split invitation', 'error');
          }
        }
      } else if (notification.type === 'payment_request') {
        // Handle payment request notification
        try {
          console.log('💰 Processing payment request notification:', notification);
          
          const standardizedData = standardizeNotificationData(notification);
          console.log('📊 Standardized data:', standardizedData);
          
          logNotificationData(standardizedData, 'Payment request handling', notification.type);

          const { senderId: requesterId, amount, currency, requestId } = standardizedData;
          
          console.log('🔍 Extracted data:', { requesterId, amount, currency, requestId });

          if (!requesterId) {
            throw new Error('No requester ID found in notification data');
          }

          // Fetch user data for the requester
          console.log('👤 Fetching user data for requester:', requesterId);
          const requesterData = await fetchUserData(requesterId);
          console.log('👤 Fetched requester data:', requesterData);
          
          if (!requesterData) {
            throw new Error('Could not fetch requester data');
          }

          console.log('🚀 Navigating to Send screen with data:', {
            destinationType: 'friend',
            contact: {
              id: requesterId,
              name: requesterData.name || 'Unknown User',
              email: requesterData.email || '',
              wallet_address: requesterData.wallet_address || '',
              avatar: requesterData.avatar || null
            },
            prefilledAmount: amount,
            prefilledNote: `Payment request from ${requesterData.name}`,
            requestId: requestId
          });

          // Navigate to send screen with prefilled data
          navigation.navigate('Send', {
            destinationType: 'friend',
            contact: {
              id: requesterId,
              name: requesterData.name || 'Unknown User',
              email: requesterData.email || '',
              wallet_address: requesterData.wallet_address || '',
              avatar: requesterData.avatar || null
            },
            prefilledAmount: amount,
            prefilledNote: `Payment request from ${requesterData.name}`,
            requestId: requestId
          });
          
          console.log('✅ Successfully navigated to Send screen');
        } catch (error) {
          console.error('❌ Error handling payment request:', error);
          showToast(`Failed to process payment request: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
      } else if (notification.type === 'payment_sent' || notification.type === 'payment_received' || notification.type === 'money_sent' || notification.type === 'money_received') {
        // Handle payment sent/received notifications
        console.log('💸 Processing payment notification:', notification);
        
        const transactionId = notification.data?.transactionId || notification.data?.tx_hash || notification.data?.signature;
        console.log('🔍 Transaction ID found:', transactionId);
        
        if (transactionId) {
          console.log('🚀 Navigating to TransactionHistory with transactionId:', transactionId);
          // Navigate to transaction details
          navigation.navigate('TransactionHistory', { transactionId });
        } else {
          console.warn('⚠️ No transaction ID found in notification data:', notification.data);
          showToast('Transaction ID not found in notification', 'error');
        }
      } else if (notification.type === 'split_completed') {
        // Handle split completion notification
        const splitId = notification.data?.splitId;
        if (splitId) {
          navigation.navigate('SplitDetails', { splitId });
        }
      } else if (notification.type === 'split_payment_required') {
        // Handle split payment required notification
        const splitId = notification.data?.splitId;
        if (splitId) {
          navigation.navigate('SplitPayment', { splitId });
        }
      } else {
        // Default handling for other notification types
        console.log('Unhandled notification type:', notification.type);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      showToast('Failed to process notification', 'error');
    }
  };

  // Function to mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        read_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Function to get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_request':
        return '💰';
      case 'payment_sent':
        return '📤';
      case 'payment_received':
        return '📥';
      case 'split_invite':
        return '🎯';
      case 'split_completed':
        return '✅';
      case 'split_payment_required':
        return '💳';
      default:
        return '🔔';
    }
  };

  // Function to get notification color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_request':
        return colors.warning;
      case 'payment_sent':
        return colors.info;
      case 'payment_received':
        return colors.green;
      case 'split_invite':
        return colors.primaryGreen;
      case 'split_completed':
        return colors.green;
      case 'split_payment_required':
        return colors.red;
      default:
        return colors.GRAY;
    }
  };

  // Function to format notification time
  const formatNotificationTime = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  // Function to handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshNotifications) {
        await refreshNotifications();
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotifications]);

  // Function to handle refresh (alias for compatibility)
  const onRefresh = handleRefresh;

  // Function to handle notification actions
  const notificationActionHandler = useCallback(async (notification: NotificationData) => {
    try {
      // Handle different notification actions based on notification type
      if (notification.type === 'payment_request') {
        // Handle payment request
        console.log('Handling payment request:', notification.id);
      } else if (notification.type === 'split_invite') {
        // Handle split invitation
        console.log('Handling split invitation:', notification.id);
      } else {
        // Default action - mark as read
        await markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }, []);

  // Load notifications on component mount
  useEffect(() => {
    const loadNotificationsData = async () => {
      setLoading(true);
      try {
        if (loadNotifications) {
          await loadNotifications();
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotificationsData();
  }, [loadNotifications]);




  // Transform real notifications to match NotificationData interface
  const getDisplayNotifications = (): NotificationData[] => {
    const realNotifications = notifications || [];
    
    // Transform real notifications to match NotificationData interface
    const transformedNotifications: NotificationData[] = realNotifications.map((notification: any) => {
      // Map notification types to match the expected interface
      let mappedType: NotificationData['type'] = 'general';
      
      switch (notification.type) {
        case 'payment_request':
          mappedType = 'payment_request';
          break;
        case 'payment_sent':
          mappedType = 'money_sent';
          break;
        case 'payment_received':
          mappedType = 'payment_received';
          break;
        case 'split_invite':
          mappedType = 'split_invite';
          break;
        case 'split_completed':
          mappedType = 'split_completed';
          break;
        case 'split_payment_required':
          mappedType = 'split_lock_required';
          break;
        case 'payment_reminder':
          mappedType = 'payment_reminder';
          break;
        default:
          mappedType = 'general';
      }

      return {
        id: notification.id,
        userId: notification.userId || notification.user_id || '',
        user_id: notification.userId || notification.user_id || '', // For backward compatibility
        type: mappedType,
        title: notification.title || '',
        message: notification.message || '',
        created_at: notification.created_at,
        is_read: notification.is_read || false,
        status: notification.data?.status || 'pending',
        data: notification.data || {}
      };
    });
    
    return activeTab === 'requests'
      ? transformedNotifications.filter((n: NotificationData) => {
          if (n.type === 'payment_request') {
            return n.data?.status !== 'completed' && !n.is_read;
          }
          return n.type === 'payment_reminder';
        })
      : transformedNotifications;
  };

  const filteredNotifications = getDisplayNotifications();

  if (loading) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A5EA15" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header */}
      <Header 
        title="Notifications"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <PhosphorIcon name="ArrowClockwise" size={20} color={colors.white} />
          </TouchableOpacity>
        }
      />

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
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fnotif-empty-state.png?alt=media&token=c2a67bb0-0e1b-40b0-9467-6e239f41a166' }} style={styles.emptyStateIcon} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You have no notifications yet.
              Please come back later.
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={handleNotificationPress}
              onActionPress={notificationActionHandler}
              actionState={actionStates[notification.id]}
              fadeAnimation={fadeAnimations[notification.id]}
            />
          ))
        )}
      </ScrollView>
    </Container>
  );
};


export default NotificationsScreen;
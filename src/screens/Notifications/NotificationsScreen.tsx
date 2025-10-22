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
  SafeAreaView,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import NotificationCard from '../../components/NotificationCard';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Container, Header } from '../../components/shared';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications, acceptSplitInvitation } = useApp();

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
      expenseId: data.expenseId || '',
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
      // Navigate based on notification type
      if (notification.type === 'settlement_request' || notification.type === 'settlement_notification') {
        // Removed group navigation logic
      } else if (notification.type === 'split_invite') {
        // Handle split invitation by accepting it first, then navigating to split details
        const splitId = notification.data?.splitId;
        if (splitId) {
          try {
            await acceptSplitInvitation(splitId);
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
          const standardizedData = standardizeNotificationData(notification);
          logNotificationData(standardizedData, 'Payment request handling', notification.type);

          const { senderId: requesterId, amount, currency, requestId } = standardizedData;

          // Fetch user data for the requester
          const requesterData = await fetchUserData(requesterId);
          if (!requesterData) {
            throw new Error('Could not fetch requester data');
          }

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
        } catch (error) {
          console.error('Error handling payment request:', error);
          showToast('Failed to process payment request', 'error');
        }
      } else if (notification.type === 'payment_sent' || notification.type === 'payment_received') {
        // Handle payment sent/received notifications
        const transactionId = notification.data?.transactionId;
        if (transactionId) {
          // Navigate to transaction details
          navigation.navigate('TransactionHistory', { transactionId });
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
        return colors.orange;
      case 'payment_sent':
        return colors.blue;
      case 'payment_received':
        return colors.green;
      case 'split_invite':
        return colors.purple;
      case 'split_completed':
        return colors.green;
      case 'split_payment_required':
        return colors.red;
      default:
        return colors.gray;
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
        variant="titleOnly"
        rightElement={
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  refreshButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsList: {
    padding: 20,
  },
  notificationItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unreadNotification: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default NotificationsScreen;
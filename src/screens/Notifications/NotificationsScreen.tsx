import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

import { NotificationCard } from '../../components/notifications';
import RequestCard from '../../components/requests/RequestCard';
import { useApp } from '../../context/AppContext';
import { doc, getDoc, serverTimestamp, updateDoc, deleteDoc, writeBatch, getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../../config/firebase/firebase';
import { getReceivedPaymentRequests } from '../../services/payments/firebasePaymentRequestService';
import { Container, LoadingScreen } from '../../components/shared';
import Header from '../../components/shared/Header';
import PhosphorIcon from '../../components/shared/PhosphorIcon';
import { colors } from '../../theme/colors';
import styles from './styles';

// Import the unified NotificationData interface
import { NotificationData } from '../../types/notifications';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications, acceptSplitInvitation } = useApp();

  // State variables
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, any>>({});
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationData[]>([]);
  const [viewedNotificationIds, setViewedNotificationIds] = useState<Set<string>>(new Set());
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [deletedNotificationIds, setDeletedNotificationIds] = useState<Set<string>>(new Set());

  // Load deleted notification IDs from AsyncStorage on mount
  useEffect(() => {
    const loadDeletedIds = async () => {
      try {
        const stored = await AsyncStorage.getItem('deletedNotificationIds');
        if (stored) {
          const ids = JSON.parse(stored);
          setDeletedNotificationIds(new Set(ids));
        }
      } catch (error) {
        console.error('Error loading deleted notification IDs:', error);
      }
    };
    loadDeletedIds();
  }, []);

  // Save deleted notification IDs to AsyncStorage whenever it changes
  useEffect(() => {
    const saveDeletedIds = async () => {
      try {
        const idsArray = Array.from(deletedNotificationIds);
        await AsyncStorage.setItem('deletedNotificationIds', JSON.stringify(idsArray));
      } catch (error) {
        console.error('Error saving deleted notification IDs:', error);
      }
    };
    if (deletedNotificationIds.size > 0) {
      saveDeletedIds();
    }
  }, [deletedNotificationIds]);

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
    // Show alert for now - you can implement a toast library here
    Alert.alert(
      type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message,
      [{ text: 'OK' }]
    );
  };

  // Function to handle notification press
  const handleNotificationPress = async (notification: any) => {
    try {
      console.log('🔔 Handling notification press:', {
        type: notification.type,
        data: notification.data,
        id: notification.id
      });

      // Notification is already marked as read when it appears on screen
      // No need to mark again on press

      // Navigate based on notification type
      if (notification.type === 'split_invite') {
        // Handle split invitation by accepting it first, then navigating to split details
        const splitId = notification.data?.splitId;
        if (splitId && state.currentUser?.id) {
          try {
            // Call acceptSplitInvitation with correct parameters: notificationId first, then splitId
            if (acceptSplitInvitation) {
              await acceptSplitInvitation(notification.id, splitId);
            }
            showToast('Split invitation accepted!');
            // Navigate to splits list first, then to split details
            navigation.navigate('SplitsList');
            setTimeout(() => {
              navigation.navigate('SplitDetails', { 
                splitId,
                isFromNotification: true,
                notificationId: notification.id
              });
            }, 100);
          } catch (error) {
            console.error('Error accepting split invitation:', error);
            showToast('Failed to accept split invitation', 'error');
          }
        } else {
          console.error('Missing splitId or user not authenticated');
          showToast('Invalid invitation data', 'error');
        }
      } else if (notification.type === 'payment_request') {
        // Handle payment request notification
        try {
          console.log('💰 Processing payment request notification:', notification);
          
          const standardizedData = standardizeNotificationData(notification);
          console.log('📊 Standardized data:', standardizedData);
          console.log('📊 Raw notification data:', notification.data);
          
          logNotificationData(standardizedData, 'Payment request handling', notification.type);

          const { senderId: requesterId, amount, currency, requestId, description } = standardizedData;
          
          // Try to get description from multiple sources like RequestCard does
          const requestDescription = description || notification.data?.description || notification.data?.note || '';
          
          console.log('🔍 Extracted data:', { requesterId, amount, currency, requestId, description });

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

          // Use the original message from the user if available, otherwise use a generic message
          const hasValidDescription = requestDescription && requestDescription.trim().length > 0;
          const prefilledNote = hasValidDescription 
            ? `Re: "${requestDescription.trim()}"` 
            : `Payment request from ${requesterData.name}`;

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
            prefilledNote: prefilledNote,
            requestId: requestId
          });
          console.log('📝 Prefilled note details:', {
            description: description,
            requestDescription: requestDescription,
            prefilledNote: prefilledNote,
            hasDescription: !!description,
            hasRequestDescription: !!requestDescription,
            hasValidDescription: hasValidDescription,
            hasPrefilledNote: !!prefilledNote,
            descriptionType: typeof description,
            requestDescriptionType: typeof requestDescription,
            descriptionLength: description?.length || 0,
            requestDescriptionLength: requestDescription?.length || 0,
            descriptionTrimmed: description?.trim() || '',
            requestDescriptionTrimmed: requestDescription?.trim() || '',
            isEmpty: !description || description.trim() === '',
            requestDescriptionEmpty: !requestDescription || requestDescription.trim() === ''
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
            prefilledNote: prefilledNote,
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
          // Navigate to transaction history
          navigation.navigate('TransactionHistory', { transactionId });
        } else {
          console.warn('⚠️ No transaction ID found in notification data:', notification.data);
          showToast('Transaction ID not found in notification', 'error');
        }
      } else if (notification.type === 'split_completed') {
        // Handle split completion notification
        const splitId = notification.data?.splitId;
        if (splitId) {
          // Navigate to splits list first, then to split details
          navigation.navigate('SplitsList');
          setTimeout(() => {
            navigation.navigate('SplitDetails', { splitId });
          }, 100);
        }
      } else if (notification.type === 'split_payment_required') {
        // Handle split payment required notification
        const splitId = notification.data?.splitId;
        if (splitId) {
          // Navigate to splits list first, then to split payment
          navigation.navigate('SplitsList');
          setTimeout(() => {
            navigation.navigate('SplitPayment', { splitId });
          }, 100);
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
  const markAsRead = async (notificationId: string, updateUI: boolean = true) => {
    try {
      // Check if it's a Firebase payment request (starts with firebase_)
      if (notificationId.startsWith('firebase_')) {
        // For Firebase payment requests, we can't mark them as read in the payment_requests collection
        // Instead, we'll refresh the notifications to update the UI
        // The is_read status will be managed locally or through notifications collection
        if (updateUI) {
          // Update local state immediately
          setFilteredNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
          );
        }
        if (refreshNotifications) {
          await refreshNotifications();
        }
        if (updateUI) {
          await loadAndProcessNotifications();
        }
      } else {
        // Mark regular notification as read in Firebase
        await updateDoc(doc(db, 'notifications', notificationId), {
          read: true,
          is_read: true,
          read_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        
        // Update local state immediately for instant UI update
        if (updateUI) {
          setFilteredNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
          );
        }
        
        // Refresh notifications context in background
        if (refreshNotifications) {
          refreshNotifications().catch(err => console.error('Error refreshing notifications:', err));
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      console.log('🗑️ Deleting notification:', notificationId);
      
      // Add to deleted set to prevent it from reappearing
      setDeletedNotificationIds(prev => new Set(prev).add(notificationId));
      
      // Remove from local state immediately for instant UI update
      setFilteredNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Delete from Firebase in background
      try {
        if (notificationId.startsWith('firebase_')) {
          const actualRequestId = notificationId.replace('firebase_', '');
          console.log('🗑️ Deleting payment request:', actualRequestId);
          
          // Verify the document exists before deleting
          const requestDoc = await getDoc(doc(db, 'payment_requests', actualRequestId));
          if (requestDoc.exists()) {
            await deleteDoc(doc(db, 'payment_requests', actualRequestId));
            console.log('✅ Payment request deleted successfully:', actualRequestId);
          } else {
            console.warn('⚠️ Payment request not found:', actualRequestId);
          }
        } else {
          console.log('🗑️ Deleting notification from notifications collection:', notificationId);
          
          // Verify the document exists before deleting
          const notificationDoc = await getDoc(doc(db, 'notifications', notificationId));
          if (notificationDoc.exists()) {
            await deleteDoc(doc(db, 'notifications', notificationId));
            console.log('✅ Notification deleted successfully:', notificationId);
          } else {
            console.warn('⚠️ Notification not found:', notificationId);
            // Still keep it in deleted set to prevent it from showing up
          }
        }
        
        // Refresh notifications context in background
        if (refreshNotifications) {
          refreshNotifications().catch(err => console.error('Error refreshing notifications:', err));
        }
      } catch (error) {
        console.error('❌ Error deleting notification from Firebase:', error);
        // Don't re-add to local state - keep it deleted
        // The deletedNotificationIds set will prevent it from showing up again
        showToast('Failed to delete notification from server', 'error');
      }
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      showToast('Failed to delete notification', 'error');
    }
  };

  // Render swipe delete action (Apple style)
  const renderRightActions = (notification: NotificationData, progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    return (
      <Animated.View
        style={[
          styles.swipeDeleteContainer,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            deleteNotification(notification.id);
          }}
          style={styles.swipeDeleteButton}
          activeOpacity={0.7}
        >
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };


  // Function to load and process notifications
  const loadAndProcessNotifications = useCallback(async () => {
    try {
      const processedNotifications = await getDisplayNotifications();
      setFilteredNotifications(processedNotifications);
      console.log('🔍 Loaded notifications:', processedNotifications.length, 'Payment requests:', processedNotifications.filter(n => n.type === 'payment_request').length);
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  }, [notifications, state.currentUser?.id]);

  // Function to handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshNotifications) {
        await refreshNotifications();
      }
      // Also reload and process notifications
      await loadAndProcessNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotifications, loadAndProcessNotifications]);

  // Function to handle refresh (alias for compatibility)
  const onRefresh = handleRefresh;

  // Function to clear all notifications
  const handleClearAll = useCallback(async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearingAll(true);
              
              // Store current notifications before clearing
              const notificationsToDelete = [...filteredNotifications];

              // Add all IDs to deleted set to prevent them from reappearing
              setDeletedNotificationIds(prev => {
                const newSet = new Set(prev);
                notificationsToDelete.forEach(n => newSet.add(n.id));
                return newSet;
              });

              // Clear local state immediately
              setFilteredNotifications([]);
              setViewedNotificationIds(new Set());

              // Delete all notifications from Firebase using batch operations for better performance
              // Don't wait for completion to keep UI responsive
              (async () => {
                try {
                  console.log('🗑️ Starting batch deletion of', notificationsToDelete.length, 'notifications');
                  
                  // Separate payment requests and regular notifications
                  const paymentRequestIds: string[] = [];
                  const notificationIds: string[] = [];
                  
                  notificationsToDelete.forEach(notification => {
                    if (notification.id.startsWith('firebase_')) {
                      const actualRequestId = notification.id.replace('firebase_', '');
                      paymentRequestIds.push(actualRequestId);
                    } else {
                      notificationIds.push(notification.id);
                    }
                  });
                  
                  // Delete payment requests (Firebase batch limit is 500 operations)
                  if (paymentRequestIds.length > 0) {
                    const BATCH_LIMIT = 500;
                    const batches: string[][] = [];
                    
                    // Split into batches of 500
                    for (let i = 0; i < paymentRequestIds.length; i += BATCH_LIMIT) {
                      batches.push(paymentRequestIds.slice(i, i + BATCH_LIMIT));
                    }
                    
                    let totalDeleted = 0;
                    for (const batch of batches) {
                      const paymentBatch = writeBatch(db);
                      let batchCount = 0;
                      
                      for (const requestId of batch) {
                        try {
                          const requestDoc = await getDoc(doc(db, 'payment_requests', requestId));
                          if (requestDoc.exists()) {
                            paymentBatch.delete(doc(db, 'payment_requests', requestId));
                            batchCount++;
                          }
                        } catch (error) {
                          console.error(`Error checking payment request ${requestId}:`, error);
                        }
                      }
                      
                      if (batchCount > 0) {
                        await paymentBatch.commit();
                        totalDeleted += batchCount;
                        console.log(`✅ Deleted batch of ${batchCount} payment requests`);
                      }
                    }
                    
                    if (totalDeleted > 0) {
                      console.log(`✅ Total deleted ${totalDeleted} payment requests`);
                    }
                  }
                  
                  // Delete regular notifications (Firebase batch limit is 500 operations)
                  if (notificationIds.length > 0) {
                    const BATCH_LIMIT = 500;
                    const batches: string[][] = [];
                    
                    // Split into batches of 500
                    for (let i = 0; i < notificationIds.length; i += BATCH_LIMIT) {
                      batches.push(notificationIds.slice(i, i + BATCH_LIMIT));
                    }
                    
                    let totalDeleted = 0;
                    for (const batch of batches) {
                      const notificationBatch = writeBatch(db);
                      let batchCount = 0;
                      
                      for (const notifId of batch) {
                        try {
                          const notifDoc = await getDoc(doc(db, 'notifications', notifId));
                          if (notifDoc.exists()) {
                            notificationBatch.delete(doc(db, 'notifications', notifId));
                            batchCount++;
                          }
                        } catch (error) {
                          console.error(`Error checking notification ${notifId}:`, error);
                        }
                      }
                      
                      if (batchCount > 0) {
                        await notificationBatch.commit();
                        totalDeleted += batchCount;
                        console.log(`✅ Deleted batch of ${batchCount} notifications`);
                      }
                    }
                    
                    if (totalDeleted > 0) {
                      console.log(`✅ Total deleted ${totalDeleted} notifications`);
                    }
                  }
                  
                  console.log('✅ Batch deletion completed');
                } catch (error) {
                  console.error('❌ Error during batch deletion:', error);
                  // Fallback: try individual deletions
                  console.log('🔄 Falling back to individual deletions...');
                  for (const notification of notificationsToDelete) {
                    try {
                      if (notification.id.startsWith('firebase_')) {
                        const actualRequestId = notification.id.replace('firebase_', '');
                        const requestDoc = await getDoc(doc(db, 'payment_requests', actualRequestId));
                        if (requestDoc.exists()) {
                          await deleteDoc(doc(db, 'payment_requests', actualRequestId));
                        }
                      } else {
                        const notifDoc = await getDoc(doc(db, 'notifications', notification.id));
                        if (notifDoc.exists()) {
                          await deleteDoc(doc(db, 'notifications', notification.id));
                        }
                      }
                    } catch (individualError) {
                      console.error(`Error deleting notification ${notification.id}:`, individualError);
                    }
                  }
                }
              })().catch(err => {
                console.error('❌ Error during batch deletion:', err);
              });

              // Refresh notifications context to sync with Firebase
              if (refreshNotifications) {
                refreshNotifications().catch(err => console.error('Error refreshing notifications:', err));
              }

              showToast('All notifications cleared', 'success');
              setIsClearingAll(false);
              
              // Don't reload - keep the list empty
              // The deletedNotificationIds will filter out any notifications that try to come back
            } catch (error) {
              console.error('Error clearing all notifications:', error);
              showToast('Failed to clear all notifications', 'error');
              setIsClearingAll(false);
              // Reload notifications if clearing failed
              await loadAndProcessNotifications();
            }
          },
        },
      ]
    );
  }, [filteredNotifications, refreshNotifications, loadAndProcessNotifications]);

  // Function to handle notification actions
  const notificationActionHandler = useCallback(async (notification: NotificationData) => {
    try {
      // Handle different notification actions based on notification type
      if (notification.type === 'payment_request') {
        // Handle payment request
        console.log('Handling payment request:', notification.id);
      } else if (notification.type === 'split_invite') {
        // Handle split invitation - accept it and redirect to split details
        const splitId = notification.data?.splitId;
        if (splitId && state.currentUser?.id) {
          try {
            console.log('🚀 Starting split invitation acceptance...');
            // Set action state to pending
            setActionStates(prev => ({ ...prev, [notification.id]: 'pending' }));
            
            // Call acceptSplitInvitation with correct parameters: notificationId first, then splitId
            if (acceptSplitInvitation) {
              console.log('📞 Calling acceptSplitInvitation...');
              const result = await acceptSplitInvitation(notification.id, splitId);
              console.log('✅ acceptSplitInvitation result:', result);
              
              // Check if user is already a participant
              const isAlreadyParticipant = result?.joinResult?.message?.includes('already a participant');
              
              if (isAlreadyParticipant) {
                console.log('ℹ️ User already in split');
                showToast('You are already in this split!');
              } else {
                console.log('✅ User successfully joined split');
                showToast('Split invitation accepted!');
              }
            }
            
            // Set action state to completed
            setActionStates(prev => ({ ...prev, [notification.id]: 'completed' }));
            
            // Navigate to splits list first, then to split details
            console.log('🧭 Navigating to SplitsList...');
            navigation.navigate('SplitsList');
            setTimeout(() => {
              console.log('🧭 Navigating to SplitDetails...');
              navigation.navigate('SplitDetails', { 
                splitId,
                isFromNotification: true,
                notificationId: notification.id
              });
            }, 100);
          } catch (error) {
            console.error('❌ Error accepting split invitation:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isAlreadyParticipant = errorMessage.includes('already a participant');
            
            // Check if user is already a participant
            if (isAlreadyParticipant) {
              console.log('ℹ️ User already participant - treating as success');
              showToast('You are already in this split!');
              setActionStates(prev => ({ ...prev, [notification.id]: 'completed' }));
              
              // Still navigate to the split
              console.log('🧭 Navigating to SplitsList (already participant)...');
              navigation.navigate('SplitsList');
              setTimeout(() => {
                console.log('🧭 Navigating to SplitDetails (already participant)...');
                navigation.navigate('SplitDetails', { 
                  splitId,
                  isFromNotification: true,
                  notificationId: notification.id
                });
              }, 100);
            } else {
              console.log('❌ Real error occurred');
              // Set action state to error only for real errors
              setActionStates(prev => ({ ...prev, [notification.id]: 'error' }));
              showToast('Failed to accept split invitation', 'error');
            }
          }
        } else {
          console.error('Missing splitId or user not authenticated');
          showToast('Invalid invitation data', 'error');
        }
      } else {
        // Default action - mark as read
        await markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }, [state.currentUser?.id, acceptSplitInvitation, navigation, showToast]);

  // Function to handle RequestCard send press
  const handleRequestCardSendPress = useCallback(async (request: any) => {
    try {
      console.log('🚀 Handling RequestCard send press:', request);
      
      // Use the same logic as handleNotificationPress for payment_request
      const standardizedData = standardizeNotificationData(request);
      console.log('📊 RequestCard standardized data:', standardizedData);
      console.log('📊 RequestCard raw request data:', request.data);
      const { senderId: requesterId, amount, requestId, description } = standardizedData;
      
      // Try to get description from multiple sources like RequestCard does
      const requestDescription = description || request.data?.description || request.data?.note || '';
      
      if (!requesterId) {
        throw new Error('No requester ID found in request data');
      }

      // Fetch user data for the requester
      const requesterData = await fetchUserData(requesterId);
      
      if (!requesterData) {
        throw new Error('Could not fetch requester data');
      }

      // Use the original message from the user if available, otherwise use a generic message
      const hasValidDescription = requestDescription && requestDescription.trim().length > 0;
      const prefilledNote = hasValidDescription 
        ? `Re: "${requestDescription.trim()}"` 
        : `Payment request from ${requesterData.name}`;

      console.log('📝 RequestCard prefilled note details:', {
        description: description,
        requestDescription: requestDescription,
        prefilledNote: prefilledNote,
        hasDescription: !!description,
        hasRequestDescription: !!requestDescription,
        hasValidDescription: hasValidDescription,
        hasPrefilledNote: !!prefilledNote,
        descriptionType: typeof description,
        requestDescriptionType: typeof requestDescription,
        descriptionLength: description?.length || 0,
        requestDescriptionLength: requestDescription?.length || 0,
        descriptionTrimmed: description?.trim() || '',
        requestDescriptionTrimmed: requestDescription?.trim() || '',
        isEmpty: !description || description.trim() === '',
        requestDescriptionEmpty: !requestDescription || requestDescription.trim() === ''
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
        prefilledNote: prefilledNote,
        requestId: requestId
      });
      
      console.log('✅ Successfully navigated to Send screen from RequestCard');
    } catch (error) {
      console.error('❌ Error handling RequestCard send press:', error);
      showToast(`Failed to process payment request: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }, [navigation, fetchUserData, standardizeNotificationData, showToast]);

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

  // Process notifications when they change
  useEffect(() => {
    if (notifications && state.currentUser?.id && !isClearingAll) {
      loadAndProcessNotifications();
    }
  }, [notifications, state.currentUser?.id, loadAndProcessNotifications, isClearingAll]);

  // Save timestamp when user views notifications screen
  useFocusEffect(
    useCallback(() => {
      const saveLastViewedTimestamp = async () => {
        try {
          const timestamp = new Date().toISOString();
          await AsyncStorage.setItem('lastNotificationsViewTimestamp', timestamp);
        } catch (error) {
          console.error('Error saving last notifications view timestamp:', error);
        }
      };
      saveLastViewedTimestamp();
    }, [])
  );

  // Mark notifications as read when they appear on screen
  useEffect(() => {
    const markVisibleAsRead = async () => {
      const unreadNotifications = filteredNotifications.filter(
        n => !n.is_read && !viewedNotificationIds.has(n.id)
      );

      if (unreadNotifications.length > 0) {
        // Mark all visible unread notifications as read
        const newViewedIds = new Set(viewedNotificationIds);
        const notificationIdsToMark = unreadNotifications.map(n => n.id);
        
        // Add to viewed set immediately to prevent duplicate processing
        notificationIdsToMark.forEach(id => newViewedIds.add(id));
        setViewedNotificationIds(newViewedIds);
        
        // Update local state immediately for all notifications
        setFilteredNotifications(prev => 
          prev.map(n => notificationIdsToMark.includes(n.id) ? { ...n, is_read: true } : n)
        );
        
        // Mark as read in Firebase in background
        const promises = unreadNotifications.map(async (notification) => {
          try {
            // Check if it's a Firebase payment request
            if (notification.id.startsWith('firebase_')) {
              if (refreshNotifications) {
                await refreshNotifications();
              }
            } else {
              // Mark regular notification as read in Firebase
              await updateDoc(doc(db, 'notifications', notification.id), {
                read: true,
                is_read: true,
                read_at: serverTimestamp(),
                updated_at: serverTimestamp()
              });
              
              // Refresh notifications context in background
              if (refreshNotifications) {
                refreshNotifications().catch(err => console.error('Error refreshing notifications:', err));
              }
            }
          } catch (error) {
            console.error('Error marking notification as read:', error);
          }
        });

        await Promise.all(promises);
      }
    };

    if (filteredNotifications.length > 0) {
      markVisibleAsRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNotifications]);




  // Transform real notifications to match NotificationData interface and create unified timeline
  const getDisplayNotifications = useCallback(async (): Promise<NotificationData[]> => {
    const realNotifications = notifications || [];
    
    // Load payment requests from Firebase (like DashboardScreen does)
    let firebasePaymentRequests: any[] = [];
    if (state.currentUser?.id) {
      try {
        firebasePaymentRequests = await getReceivedPaymentRequests(state.currentUser.id, 10);
        console.log('🔥 Loaded Firebase payment requests:', firebasePaymentRequests.length, firebasePaymentRequests);
        firebasePaymentRequests.forEach((req, index) => {
          console.log(`🔥 Firebase request ${index}:`, {
            id: req.id,
            senderName: req.senderName,
            amount: req.amount,
            description: req.description,
            hasDescription: !!req.description,
            descriptionLength: req.description?.length || 0,
            descriptionTrimmed: req.description?.trim() || '',
            isEmpty: !req.description || req.description.trim() === '',
            rawData: req
          });
        });
      } catch (error) {
        console.error('Error loading Firebase payment requests:', error);
      }
    }
    
    // Transform Firebase payment requests to notification format
    // Check if there's a corresponding notification in the notifications collection
    const firebaseRequestNotifications: NotificationData[] = firebasePaymentRequests
      .filter(req => req.amount > 0 && req.status !== 'completed')
      .map(req => {
        // Check if there's a corresponding notification that's already marked as read
        const correspondingNotification = realNotifications.find(
          (n: any) => n.type === 'payment_request' && n.data?.requestId === req.id
        );
        const isRead = correspondingNotification?.is_read || (correspondingNotification as any)?.read || false;
        
        return {
          id: `firebase_${req.id}`,
          userId: state.currentUser?.id || '',
          user_id: state.currentUser?.id || '',
          type: 'payment_request' as const,
          title: 'Payment Request',
          message: `${req.senderName} has requested ${req.amount} ${req.currency}${req.description ? ` for ${req.description}` : ''}`,
          created_at: req.created_at,
          is_read: isRead,
          status: req.status,
          data: {
            requestId: req.id,
            senderId: req.senderId,
            senderName: req.senderName,
            amount: req.amount,
            currency: req.currency,
            description: req.description,
            status: req.status
          }
        };
      });
    
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
    
    // Combine Firebase payment requests with regular notifications
    const processedIds = new Set<string>();
    const allNotifications: NotificationData[] = [];
    
    // Add Firebase payment requests first
    firebaseRequestNotifications.forEach(req => {
      if (req.data?.requestId) {
        processedIds.add(req.data.requestId);
        allNotifications.push(req);
      }
    });
    
    // Add regular notifications, avoiding duplicates
    transformedNotifications.forEach(notification => {
      if (notification.type === 'payment_request') {
        // Skip if we already have this payment request from Firebase
        if (processedIds.has(notification.data?.requestId)) {
          return;
        }
      }
      allNotifications.push(notification);
    });
    
    // Show all notifications including payment_request (no filtering by tabs)
    // Filter out deleted notifications
    const filteredNotifications = allNotifications.filter((n: NotificationData) => {
      // Don't show deleted notifications
      if (deletedNotificationIds.has(n.id)) {
        return false;
      }
      
      // Show payment_request if not completed
      if (n.type === 'payment_request') {
        return n.data?.status !== 'completed';
      }
      // Show all other notification types
      return true;
    });

    // Sort by timestamp (newest first)
    return filteredNotifications.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  }, [deletedNotificationIds, state.currentUser?.id]);

  // Debug: Log the notifications to understand what we're working with
  console.log('🔍 NotificationsScreen - Total:', notifications?.length || 0, 'Filtered:', filteredNotifications.length, 'Payment requests:', filteredNotifications.filter(n => n.type === 'payment_request').length);

  if (loading) {
    return (
      <LoadingScreen
        message="Loading notifications..."
        showSpinner={true}
      />
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
          filteredNotifications.length > 0 ? (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          ) : null
        }
      />


      {/* Notifications List */}
      <GestureHandlerRootView style={{ flex: 1 }}>
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
            <View style={styles.emptyStateIconContainer}>
              <PhosphorIcon name="Bell" size={48} color={colors.white70} weight="regular" />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You have no notifications yet.
              Please come back later.
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification, index) => {
            // Use RequestCard for payment_request notifications
            if (notification.type === 'payment_request') {
              return (
                <Swipeable
                  key={notification.id}
                  renderRightActions={(progress) => renderRightActions(notification, progress)}
                  overshootRight={false}
                >
                  <RequestCard
                    request={notification as any}
                    index={index}
                    onSendPress={handleRequestCardSendPress}
                  />
                </Swipeable>
              );
            }
            
            // Use NotificationCard for all other notification types
            return (
              <Swipeable
                key={notification.id}
                renderRightActions={(progress) => renderRightActions(notification, progress)}
                overshootRight={false}
              >
                <NotificationCard
                  notification={notification}
                  onPress={handleNotificationPress}
                  onActionPress={notificationActionHandler}
                  actionState={actionStates[notification.id]}
                />
              </Swipeable>
            );
          })
        )}
        </ScrollView>
      </GestureHandlerRootView>
    </Container>
  );
};


export default NotificationsScreen;
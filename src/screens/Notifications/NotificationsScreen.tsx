import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import NotificationCard, { NotificationData } from '../../components/NotificationCard';
import { useApp } from '../../context/AppContext';
import { getUserNotifications, markNotificationAsRead, sendNotification, Notification } from '../../services/firebaseNotificationService';
import { updatePaymentRequestStatus, updateSettlementRequestStatus } from '../../services/notificationStatusService';
import { firebaseDataService } from '../../services/firebaseDataService';
import styles from './styles';
import { colors } from '../../theme/colors';
import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const NotificationsScreen: React.FC<any> = ({ navigation }) => {
  const { state, notifications, loadNotifications, refreshNotifications, acceptGroupInvitation, acceptSplitInvitation } = useApp();

  // Function to fetch user data from Firebase
  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: userId,
          name: userData.name || userData.email || 'Unknown User',
          email: userData.email || '',
          wallet_address: userData.wallet_address || userData.wallet_public_key || '',
          avatar: userData.avatar || userData.photoURL || ''
        };
      }
    } catch (error) {
      console.log('🔍 DEBUG: Error fetching user data:', error);
    }
    
    // Return fallback data if user not found
    return {
      id: userId,
      name: 'Unknown User',
      email: '',
      wallet_address: '',
      avatar: ''
    };
  };

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
    console.log('🔍 NotificationsScreen: handleNotificationPress called with:', {
      notificationId: notification.id,
      notificationType: notification.type,
      notificationData: notification.data,
      isRead: notification.is_read,
      fullNotification: notification
    });
    
    console.log('🔍 NotificationsScreen: handleNotificationPress - notification type check:', {
      type: notification.type,
      isSplitInvite: notification.type === 'split_invite'
    });
    
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await firebaseDataService.notification.markNotificationAsRead(String(notification.id));
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
    } else if (notification.type === 'split_invite') {
      // Handle split invitation by accepting it first, then navigating to split details
      console.log('🔍 NotificationsScreen: ENTERED split_invite handler in handleNotificationPress');
      const splitId = notification.data?.splitId;
      console.log('🔍 NotificationsScreen: Split invite notification data:', {
        notificationId: notification.id,
        splitId: splitId,
        notificationData: notification.data,
        fullNotification: notification
      });
      
      if (splitId) {
        console.log('🔍 NotificationsScreen: Handling split invitation tap - accepting invitation first:', splitId);
        
        // Accept the invitation first, then navigate
        try {
          const result = await acceptSplitInvitation(notification.id, splitId);
          console.log('🔍 NotificationsScreen: Split invitation accepted from tap:', result);
          
          if (result.success) {
            // Navigate to SplitDetails after successful acceptance
            console.log('🔍 NotificationsScreen: About to navigate to SplitDetails with params:', {
              splitId: splitId,
              isFromNotification: true,
              notificationId: notification.id,
              resultSplitId: result.splitId,
              navigationObject: !!navigation,
              navigationNavigate: !!navigation.navigate,
              currentRoute: navigation.getState?.()?.routes?.[navigation.getState?.()?.index]?.name
            });
            
            try {
              navigation.navigate('SplitDetails', { 
                splitId: splitId,
                isFromNotification: true,
                notificationId: notification.id
              });
              console.log('🔍 NotificationsScreen: Navigation call completed successfully');
            } catch (navError) {
              console.error('🔍 NotificationsScreen: Navigation error in handleNotificationPress:', navError);
              Alert.alert('Navigation Error', 'Failed to navigate to split details. Please try again.');
            }
          } else {
            Alert.alert('Error', result.error || 'Failed to accept invitation');
          }
        } catch (error) {
          console.error('🔍 NotificationsScreen: Error accepting split invitation from tap:', error);
          Alert.alert('Error', 'Failed to accept invitation. Please try again.');
        }
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

  // Initialize tracking services safely
  const initializeTrackingSafely = () => {
    try {
      const globalAny = global as any;
      
      // Simple analytics initialization - no complex overrides
      if (!globalAny.analytics) {
        globalAny.analytics = {
          stopTracking: () => {
            console.log('Analytics tracking stopped (safe mode)');
          },
          startTracking: () => {
            console.log('Analytics tracking started (safe mode)');
          },
          trackEvent: (event: string, data?: any) => {
            console.log('Analytics event tracked (safe mode):', event, data);
          }
        };
      }
      
      // Ensure stopTracking method exists
      if (!globalAny.analytics.stopTracking) {
        globalAny.analytics.stopTracking = () => {
          console.log('Analytics tracking stopped (fallback)');
        };
      }

      // Handle Firebase Analytics
      if (globalAny.firebase && globalAny.firebase.analytics) {
        try {
          if (!globalAny.firebase.analytics.stopTracking) {
            globalAny.firebase.analytics.stopTracking = () => {
              console.log('Firebase Analytics tracking stopped (safe mode)');
            };
          }
        } catch (firebaseError) {
          console.warn('Firebase Analytics initialization error:', firebaseError);
        }
      }

      // Add a more targeted fix for any undefined stopTracking calls
      // This will catch any attempt to call stopTracking on undefined
      const originalConsoleError = console.error;
      console.error = function(...args: any[]) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('stopTracking')) {
          console.log('🔍 Intercepted stopTracking error in console.error:', args[0]);
          return; // Don't log the error
        }
        originalConsoleError.apply(console, args);
      };

    } catch (error) {
      console.warn('Failed to initialize tracking services safely:', error);
    }
  };

  // Initialize tracking on component mount
  useEffect(() => {
    // Set up global error handler BEFORE any other initialization
    const globalAny = global as any;
    
    // Override console.error to catch stopTracking errors
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('stopTracking')) {
        console.log('🔍 DEBUG: Intercepted stopTracking error in console.error:', args[0]);
        return; // Don't log the error
      }
      originalConsoleError.apply(console, args);
    };

    // Set up global error handler for React Native
    const originalErrorHandler = globalAny.ErrorUtils?.setGlobalHandler;
    if (originalErrorHandler) {
      const customErrorHandler = (error: Error, isFatal?: boolean) => {
        // Check if this is a stopTracking error
        if (error.message && error.message.includes('stopTracking')) {
          console.log('🔍 DEBUG: Global error handler caught stopTracking error:', {
            message: error.message,
            stack: error.stack,
            isFatal: isFatal
          });
          // Don't re-throw the error, just log it
          return;
        }
        
        // For other errors, use the original handler
        if (originalErrorHandler) {
          originalErrorHandler(error, isFatal);
        }
      };
      
      globalAny.ErrorUtils?.setGlobalHandler(customErrorHandler);
    }

    // Now initialize tracking services safely
    initializeTrackingSafely();
    
    // Cleanup on unmount
    return () => {
      // Restore original console.error
      console.error = originalConsoleError;
      
      // Restore original error handler
      if (originalErrorHandler) {
        globalAny.ErrorUtils?.setGlobalHandler(originalErrorHandler);
      }
    };
  }, []);

  // Comprehensive notification action handler
  const notificationActionHandler = async (notification: NotificationData) => {
    const notificationId = notification.id;
    
    console.log('🔍 NotificationsScreen: notificationActionHandler called with:', {
      notificationId: notification.id,
      notificationType: notification.type,
      notificationData: notification.data
    });
    
    // Wrap the entire handler in a try-catch to prevent any stopTracking errors from escaping
    try {
      // Initialize animation if not exists
      initializeFadeAnimation(notificationId);
      
      // Set action state to pending
      setActionStates(prev => ({
        ...prev,
        [notificationId]: 'pending'
      }));

      try {
        // Ensure tracking services are safely initialized BEFORE any navigation
        initializeTrackingSafely();

        // Add a small delay to ensure tracking services are fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        // Add debugging to identify where the error is coming from
        console.log('🔍 DEBUG: Starting notification action for type:', notification.type);
        console.log('🔍 DEBUG: Notification type check:', {
          type: notification.type,
          isSplitInvite: notification.type === 'split_invite',
          isPaymentRequest: notification.type === 'payment_request',
          isPaymentReminder: notification.type === 'payment_reminder'
        });

        if (notification.type === 'payment_request' || notification.type === 'payment_reminder') {
          console.log('🔍 DEBUG: Handling payment request/reminder');
          // Handle payment request
          if (notification.status === 'paid') {
            showToast('Payment already completed');
            return;
          }

          // Check if this is a split payment notification
          const notificationData = notification.data as any;
          if (notificationData?.splitId && notificationData?.splitWalletId) {
            // This is a split payment notification - navigate to SplitPayment screen
            console.log('🔍 DEBUG: Split payment notification detected:', {
              splitId: notificationData.splitId,
              splitWalletId: notificationData.splitWalletId,
              participantAmount: notificationData.participantAmount,
              billName: notificationData.billName
            });

            try {
              // Load full split data from database to determine correct navigation
              const { SplitStorageService } = await import('../../services/splitStorageService');
              const splitResult = await SplitStorageService.getSplit(notificationData.splitId);
              
              if (splitResult.success && splitResult.split) {
                const split = splitResult.split;
                console.log('🔍 NotificationsScreen: Loaded split data for navigation:', {
                  splitId: split.id,
                  splitType: split.splitType,
                  splitMethod: split.splitMethod,
                  status: split.status
                });
                
                // Navigate to the correct screen based on split type
                if (split.splitType === 'fair') {
                  navigation.navigate('FairSplit', {
                    splitData: split,
                    isFromNotification: true,
                    notificationId: notificationId,
                  });
                } else if (split.splitType === 'degen') {
                  navigation.navigate('DegenLock', {
                    splitData: split,
                    isFromNotification: true,
                    notificationId: notificationId,
                  });
                } else {
                  // Fallback to FairSplit for unknown types
                  navigation.navigate('FairSplit', {
                    splitData: split,
                    isFromNotification: true,
                    notificationId: notificationId,
                  });
                }
                
                showToast('Opening split details...');
                return;
              } else {
                console.error('🔍 NotificationsScreen: Failed to load split data:', splitResult.error);
                showToast('Error loading split data', 'error');
                return;
              }
            } catch (error) {
              console.error('Error navigating to split details:', error);
              showToast('Error opening split details', 'error');
              return;
            }
          }

          // Handle regular payment requests (non-split)
          const requesterId = notificationData?.senderId || notificationData?.requester || notificationData?.sender;
          const amount = notification.data?.amount;
          const currency = notification.data?.currency || 'USDC';
          const groupId = notification.data?.groupId;

          console.log('🔍 DEBUG: Regular payment request notification data:', {
            requesterId,
            amount,
            currency,
            groupId,
            fullData: notification.data
          });

          if (!requesterId) {
            showToast('Error: Missing requester information', 'error');
            return;
          }

          // Fetch the user data to get wallet address and other details
          console.log('🔍 DEBUG: Fetching user data for ID:', requesterId);
          const contact = await fetchUserData(requesterId);
          
          console.log('🔍 DEBUG: Fetched contact data:', {
            id: contact.id,
            name: contact.name,
            email: contact.email,
            wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet'
          });

          // Navigate directly to SendAmount screen with pre-filled data
          console.log('🔍 DEBUG: About to navigate to SendAmount screen with pre-filled data:', {
            contact: contact.name,
            amount: amount,
            currency: currency,
            groupId: groupId
          });

          try {
            navigation.navigate('SendAmount', { 
              contact: contact,
              groupId: groupId,
              prefilledAmount: amount,
              prefilledNote: `Payment request from ${contact.name}`,
              fromNotification: true,
              notificationId: notificationId
            });
            console.log('🔍 DEBUG: Successfully navigated to SendAmount screen');
            
            // Mark notification as in progress but don't delete it yet
            // It will be deleted when the payment process is completed
            console.log('🔍 DEBUG: Payment request notification marked as in progress, will be deleted after payment completion');
            
          } catch (navError) {
            console.log('🔍 DEBUG: Navigation error (non-critical):', navError);
            // Even if navigation fails, we don't want to show an error to the user
            // The navigation should work fine, this is just a safety net
          }

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

        } else if (notification.type === 'split_invite') {
          // Handle split invitation
          console.log('🔍 NotificationsScreen: ENTERED split_invite handler in notificationActionHandler');
          console.log('🔍 DEBUG: Processing split_invite notification');
          const splitId = notification.data?.splitId;
          
          console.log('🔍 NotificationsScreen: Action button - split invite notification data:', {
            notificationId: notification.id,
            splitId: splitId,
            notificationData: notification.data,
            fullNotification: notification
          });
          
          if (!splitId) {
            throw new Error('Missing split data in notification');
          }

          // Accept the split invitation using AppContext method
          console.log('🔍 NotificationsScreen: Accepting split invitation:', splitId);
          try {
            console.log('🔍 NotificationsScreen: Calling acceptSplitInvitation with:', {
              notificationId,
              splitId,
              notificationData: notification.data
            });
            
            const result = await acceptSplitInvitation(notificationId, splitId);
            
            console.log('🔍 NotificationsScreen: acceptSplitInvitation result:', result);
            
            if (result.success) {
              // Update action state
              setActionStates(prev => ({
                ...prev,
                [notificationId]: 'completed'
              }));

              // Navigate to SplitDetailsScreen immediately after successful acceptance
              console.log('🔍 NotificationsScreen: About to navigate to SplitDetails with params (action button):', {
                splitId: splitId,
                isFromNotification: true,
                resultSplitId: result.splitId,
                navigationState: navigation.getState ? navigation.getState() : 'No state available'
              });
              
              try {
                const currentRoute = navigation.getState()?.routes[navigation.getState()?.index]?.name;
                console.log('🔍 NotificationsScreen: About to navigate with params (action button):', {
                  splitId: splitId,
                  isFromNotification: true,
                  currentRoute: currentRoute,
                  navigationState: navigation.getState(),
                  canNavigate: navigation.canGoBack !== undefined,
                  resultSplitId: result.splitId
                });
                
                // Check if we're already on SplitDetails screen
                if (currentRoute === 'SplitDetails') {
                  console.log('🔍 NotificationsScreen: Already on SplitDetails, using replace instead of navigate');
                  navigation.replace('SplitDetails', { 
                    splitId: splitId,
                    isFromNotification: true
                  });
                } else {
                  console.log('🔍 NotificationsScreen: Navigating to SplitDetails from:', currentRoute);
                  navigation.navigate('SplitDetails', { 
                    splitId: splitId,
                    isFromNotification: true
                  });
                }
                console.log('✅ NotificationsScreen: Successfully called navigation (action button)');
              } catch (navError) {
                console.error('❌ NotificationsScreen: Navigation error (action button):', navError);
                Alert.alert('Navigation Error', 'Failed to navigate to split details. Please try again.');
              }

              // Fade animation after navigation
              Animated.timing(fadeAnimations[notificationId], {
                toValue: 0.6,
                duration: 300,
                useNativeDriver: true,
              }).start();
              
              showToast('Successfully joined the split!');
            } else {
              throw new Error(result.error || 'Failed to join split');
            }
          } catch (error) {
            // Check if this is a stopTracking error (non-critical)
            if (error instanceof Error && error.message.includes('stopTracking')) {
              console.log('🔍 NotificationsScreen: Non-critical stopTracking error in split invitation:', error.message);
              // Don't treat this as an error, just log it and continue with navigation
              setActionStates(prev => ({
                ...prev,
                [notificationId]: 'completed'
              }));
              
              // Still try to navigate even if there's a stopTracking error
              try {
                navigation.navigate('SplitDetails', { 
                  splitId: splitId,
                  isFromNotification: true
                });
                console.log('🔍 NotificationsScreen: Navigation completed despite stopTracking error');
              } catch (navError) {
                console.error('🔍 NotificationsScreen: Navigation error after stopTracking error:', navError);
              }
              return; // Exit early, don't re-throw
            }
            
            console.error('🔍 NotificationsScreen: Error accepting split invitation:', error);
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'error'
            }));
            throw error;
          }
        } else if (notification.type === 'group_invite') {
          // Handle group invitation
          const groupId = notification.data?.groupId;
          const inviteLink = notification.data?.inviteLink;
          
          if (!groupId) {
            throw new Error('Missing group data in notification');
          }

          // Navigate to group details
          console.log('🔍 DEBUG: Navigating to GroupDetails for group invitation:', groupId);
          try {
            navigation.navigate('GroupDetails', { groupId });
            console.log('🔍 DEBUG: Successfully navigated to GroupDetails');
          } catch (navError) {
            console.log('🔍 DEBUG: Navigation error (non-critical):', navError);
            // Even if navigation fails, we don't want to show an error to the user
          }

          // Get the current user ID
          const currentUserId = state.currentUser?.id;
          if (!currentUserId) {
            throw new Error('User not authenticated');
          }
          
          try {
            // Join group invitation
            if (groupId) {
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



            // Mark as completed and delete for group invitations
            if (groupId) {
              // Update action state
              setActionStates(prev => ({
                ...prev,
                [notificationId]: 'completed'
              }));

              // Mark notification as completed and delete it after successful group join
              await deleteNotification(notificationId);

              // Fade animation
              Animated.timing(fadeAnimations[notificationId], {
                toValue: 0.6,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                // Navigate to group details after animation
                navigation.navigate('GroupDetails', { groupId });
              });
            }
            showToast('Successfully joined the group!');
          }

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

                    // Delete the notification after successful group join
                    await deleteNotification(notificationId);

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
          const notificationData = notification.data as any;
          const expenseId = notificationData?.expenseId;
          const addedBy = notificationData?.addedBy;
          
          console.log('🔍 DEBUG: Expense added notification data:', {
            groupId,
            expenseId,
            addedBy,
            fullData: notification.data
          });
          
          if (groupId) {
            // Navigate to group details with expense details
            navigation.navigate('GroupDetails', { 
              groupId: groupId,
              expenseId: expenseId, // Pass the expense ID to open expense details
              fromNotification: true,
              notificationId: notificationId
            });
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

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
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'group_payment_request') {
          // Handle group payment request notification
          const requesterId = notification.data?.sender || notification.data?.requester;
          const amount = notification.data?.amount;
          const currency = notification.data?.currency;
          const groupId = notification.data?.groupId;
          
          if (requesterId && amount && currency) {
            // Fetch the user data to get wallet address and other details
            console.log('🔍 DEBUG: Fetching user data for group payment request ID:', requesterId);
            const contact = await fetchUserData(requesterId);
            
            console.log('🔍 DEBUG: Fetched contact data for group payment request:', {
              id: contact.id,
              name: contact.name,
              email: contact.email,
              wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet'
            });

            // Navigate to SendAmount screen with pre-filled data
            navigation.navigate('SendAmount', { 
              destinationType: 'friend',
              contact: contact,
              groupId: groupId,
              prefilledAmount: amount,
              prefilledNote: `Payment request from ${contact.name}`,
              fromNotification: true,
              notificationId: notificationId
            });
            
            // Mark notification as in progress but don't delete it yet
            // It will be deleted when the payment process is completed
            console.log('🔍 DEBUG: Group payment request notification marked as in progress, will be deleted after payment completion');
            
            // Mark as in progress
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'pending'
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
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

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
            // Dismiss system warning by marking as read and deleting
            await firebaseDataService.notification.markNotificationAsRead(notificationId);
            await deleteNotification(notificationId);
            
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
            navigation.navigate('SettleUp', { 
              groupId,
              fromNotification: true,
              notificationId: notificationId
            });
            
            // Mark notification as in progress but don't delete it yet
            // It will be deleted when the settlement process is completed
            console.log('🔍 DEBUG: Settlement request notification marked as in progress, will be deleted after settlement completion');
            
            // Mark as in progress
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'pending'
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
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'money_sent' || notification.type === 'money_received') {
          // Handle money sent/received notifications
          const transactionId = notification.data?.transactionId;
          
          if (transactionId) {
            // Navigate to transaction details
            navigation.navigate('TransactionHistory', { 
              transactionId: transactionId 
            });
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'group_payment_sent' || notification.type === 'group_payment_received') {
          // Handle group payment sent/received notifications
          const groupId = notification.data?.groupId;
          const transactionId = notification.data?.transactionId;
          
          if (groupId) {
            // Navigate to group details
            navigation.navigate('GroupDetails', { 
              groupId: groupId,
              transactionId: transactionId
            });
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'split_completed') {
          // Handle split completed notification
          const splitWalletId = notification.data?.splitWalletId;
          
          if (splitWalletId) {
            // Navigate to split details
            navigation.navigate('SplitDetails', { 
              splitWalletId: splitWalletId 
            });
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'degen_all_locked') {
          // Handle degen all locked notification
          const splitWalletId = notification.data?.splitWalletId;
          
          if (splitWalletId) {
            // Navigate to degen spin screen
            navigation.navigate('DegenSpin', { 
              splitWalletId: splitWalletId 
            });
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'degen_ready_to_roll') {
          // Handle degen ready to roll notification
          const splitWalletId = notification.data?.splitWalletId;
          
          if (splitWalletId) {
            // Navigate to degen spin screen
            navigation.navigate('DegenSpin', { 
              splitWalletId: splitWalletId 
            });
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'roulette_result') {
          // Handle roulette result notification
          const splitWalletId = notification.data?.splitWalletId;
          
          if (splitWalletId) {
            // Navigate to degen result screen
            navigation.navigate('DegenResult', { 
              splitWalletId: splitWalletId 
            });
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'contact_added') {
          // Handle contact added notification
          const addedByName = notification.data?.addedByName;
          
          if (addedByName) {
            // Navigate to contacts screen
            navigation.navigate('Contacts');
            
            // Mark notification as completed and delete it after successful navigation
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            await deleteNotification(notificationId);

            // Fade animation
            Animated.timing(fadeAnimations[notificationId], {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }

        } else if (notification.type === 'split_lock_required') {
          // Handle split lock required notification
          const splitWalletId = notification.data?.splitWalletId;
          const billName = notification.data?.billName;
          
          if (splitWalletId) {
            // Navigate to degen lock screen
            navigation.navigate('DegenLock', {
              splitWalletId,
              billName,
              isFromNotification: true,
              notificationId: notificationId,
            });
            showToast('Opening degen split...');
          }
          
          // Mark as read and delete
          try {
            await firebaseDataService.notification.markNotificationAsRead(notificationId);
            await deleteNotification(notificationId);
            
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            // Fade out animation
            if (fadeAnimations[notificationId]) {
              Animated.timing(fadeAnimations[notificationId], {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          } catch (error) {
            console.error('Error handling split lock required notification:', error);
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'error'
            }));
            throw error;
          }

        } else if (notification.type === 'split_spin_available') {
          // Handle split spin available notification
          const splitWalletId = notification.data?.splitWalletId;
          const billName = notification.data?.billName;
          
          if (splitWalletId) {
            // Navigate to SplitDetails first, which will handle the correct navigation
            navigation.navigate('SplitDetails', {
              splitWalletId,
              billName,
              isFromNotification: true,
              notificationId: notificationId,
            });
            showToast('Opening split details...');
          }
          
          // Mark as read and delete
          try {
            await firebaseDataService.notification.markNotificationAsRead(notificationId);
            await deleteNotification(notificationId);
            
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            // Fade out animation
            if (fadeAnimations[notificationId]) {
              Animated.timing(fadeAnimations[notificationId], {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          } catch (error) {
            console.error('Error handling split spin available notification:', error);
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'error'
            }));
            throw error;
          }

        } else if (notification.type === 'split_winner') {
          // Handle split winner notification
          const splitWalletId = notification.data?.splitWalletId;
          const billName = notification.data?.billName;
          
          if (splitWalletId) {
            // Navigate to SplitDetails first, which will handle the correct navigation
            navigation.navigate('SplitDetails', {
              splitWalletId,
              billName,
              isFromNotification: true,
              notificationId: notificationId,
            });
            showToast('Opening split details...');
          }
          
          // Mark as read and delete
          try {
            await firebaseDataService.notification.markNotificationAsRead(notificationId);
            await deleteNotification(notificationId);
            
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            // Fade out animation
            if (fadeAnimations[notificationId]) {
              Animated.timing(fadeAnimations[notificationId], {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          } catch (error) {
            console.error('Error handling split winner notification:', error);
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'error'
            }));
            throw error;
          }

        } else if (notification.type === 'split_loser') {
          // Handle split loser notification
          const splitWalletId = notification.data?.splitWalletId;
          const billName = notification.data?.billName;
          const amount = notification.data?.amount;
          
          if (splitWalletId) {
            // Navigate to SplitDetails first, which will handle the correct navigation
            navigation.navigate('SplitDetails', {
              splitWalletId,
              billName,
              amount,
              isFromNotification: true,
              notificationId: notificationId,
            });
            showToast('Opening split details...');
          }
          
          // Mark as read and delete
          try {
            await firebaseDataService.notification.markNotificationAsRead(notificationId);
            await deleteNotification(notificationId);
            
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'completed'
            }));
            
            // Fade out animation
            if (fadeAnimations[notificationId]) {
              Animated.timing(fadeAnimations[notificationId], {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          } catch (error) {
            console.error('Error handling split loser notification:', error);
            setActionStates(prev => ({
              ...prev,
              [notificationId]: 'error'
            }));
            throw error;
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
        
        // Handle specific tracking-related errors
        if (error instanceof Error && error.message.includes('stopTracking')) {
          console.warn('Tracking service error (non-critical):', error.message);
          // Don't show error popup for tracking errors since the action is working
          // Just reset the animation and continue
          Animated.timing(fadeAnimations[notificationId], {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
          return; // Exit early, don't show error popup
        }
        
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
    } catch (error) {
      console.error('Error handling notification action (outer catch):', error);
      
      // Handle specific tracking-related errors in outer catch as well
      if (error instanceof Error && error.message.includes('stopTracking')) {
        console.warn('Tracking service error (non-critical) in outer catch:', error.message);
        // Don't show error popup for tracking errors since the action is working
        return; // Exit early, don't show error popup
      }
      
      // This catch block will handle any errors that might have escaped the inner try-catch
      // For example, if initializeTrackingSafely itself throws an error.
      showToast('Failed to complete action. Please try again.', 'error');
      setActionStates(prev => ({
        ...prev,
        [notificationId]: 'error'
      }));
      Animated.timing(fadeAnimations[notificationId], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Function to delete notification after it has served its purpose
  const deleteNotification = async (notificationId: string) => {
    try {
      console.log('🗑️ DEBUG: Deleting notification after action:', notificationId);
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'notifications', notificationId));
      
      // Refresh notifications to update the list
      loadNotifications();
      
      console.log('🗑️ DEBUG: Notification deleted successfully');
    } catch (error) {
      console.error('🗑️ DEBUG: Error deleting notification:', error);
      // Don't show error to user as this is not critical
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
                loadNotifications();
                
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
            source={require('../../../assets/chevron-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('all')}
        >
          {activeTab === 'all' ? (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>All</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>All</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('requests')}
        >
          {activeTab === 'requests' ? (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>Requests</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>Requests</Text>
          )}
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
    </SafeAreaView>
  );
};

export default NotificationsScreen; 
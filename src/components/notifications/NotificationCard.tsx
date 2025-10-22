import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import styles from './NotificationCard.styles';

export interface NotificationData {
  id: string;
  type: 'payment_request' | 'payment_reminder' | 'general' | 'split_invite' | 'split_confirmed' | 'payment_received' | 'system_warning' | 'system_notification' | 'money_sent' | 'money_received' | 'split_completed' | 'degen_all_locked' | 'degen_ready_to_roll' | 'roulette_result' | 'contact_added' | 'split_spin_available' | 'split_winner' | 'split_loser' | 'split_lock_required';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  status?: 'pending' | 'paid' | 'cancelled';
  data?: {
    amount?: number;
    currency?: string;
    sender?: string;
    requester?: string;
    senderAvatar?: string;
    requesterAvatar?: string;
    addedBy?: string;
    addedByAvatar?: string;
    inviteLink?: string;
    invitedBy?: string;
    invitedByName?: string;
    expiresAt?: string;
    transactionId?: string;
    senderName?: string;
    recipientName?: string;
    status?: string;
    warningType?: string;
    severity?: string;
    splitWalletId?: string;
    billName?: string;
    splitId?: string;
    totalAmount?: number;
    currency?: string;
    inviterName?: string;
    inviterId?: string;
    participantAmount?: number;
    creatorName?: string;
    creatorId?: string;
    splitWalletId?: string;
    splitWalletAddress?: string;
    loserId?: string;
    loserName?: string;
    addedByName?: string;
    addedAt?: string;
    type?: string;
  };
}

interface NotificationCardProps {
  notification: NotificationData;
  onPress: (notification: NotificationData) => void;
  onActionPress?: (notification: NotificationData) => void;
  actionState?: 'pending' | 'completed' | 'error';
  fadeAnimation?: Animated.Value;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onActionPress,
  actionState,
  fadeAnimation
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  
  // Use provided fade animation or default
  const animationValue = fadeAnimation || fadeAnim;

  // Animate when status changes
  useEffect(() => {
    if (notification.status === 'paid') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [notification.status, scaleAnim]);

  // Handle action state changes
  useEffect(() => {
    if (actionState === 'completed') {
      // Animate button to show completion
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    } else if (actionState === 'error') {
      // Shake animation for error
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [actionState, buttonScaleAnim]);
  const getNotificationImage = () => {
    // For payment requests, use requester avatar or sender avatar
    if (notification.type === 'payment_request' || notification.type === 'payment_reminder') {
      return notification.data?.requesterAvatar 
        ? { uri: notification.data.requesterAvatar }
        : notification.data?.senderAvatar
        ? { uri: notification.data.senderAvatar }
        : require('../../../assets/user-icon-black.png');
    }
    
    // For settlement notifications, use wallet icon
    if (notification.type === 'settlement_request' || notification.type === 'settlement_notification') {
      return require('../../../assets/wallet-icon-default.png');
    }
    
    // For funding notifications, use wallet icon
    if (notification.type === 'funding_notification') {
      return require('../../../assets/wallet-icon-default.png');
    }
    
    // For expense added, use book icon
    if (notification.type === 'expense_added') {
      return require('../../../assets/book-icon-default.png');
    }
    
    // For group invites, use pool icon
    if (notification.type === 'group_invite') {
      return require('../../../assets/pool-icon.png');
    }
    
    // For split invites, use pool icon (same as group invites)
    if (notification.type === 'split_invite') {
      return require('../../../assets/pool-icon.png');
    }
    
    // For general notifications, use user icon
    if (notification.type === 'general') {
      return require('../../../assets/user-icon-black.png');
    }
    
    // For payment received, use wallet icon
    if (notification.type === 'payment_received') {
      return require('../../../assets/wallet-icon-default.png');
    }
    
    // For group payment requests, use sender avatar or user icon
    if (notification.type === 'group_payment_request') {
      return notification.data?.senderAvatar
        ? { uri: notification.data.senderAvatar }
        : require('../../../assets/user-icon-black.png');
    }
    
    // For group added, use pool icon
    if (notification.type === 'group_added') {
      return require('../../../assets/pool-icon.png');
    }
    
    // For system warnings, use warning icon
    if (notification.type === 'system_warning') {
      return require('../../../assets/warning-icon.png');
    }
    
    // For system notifications, use info icon
    if (notification.type === 'system_notification') {
      return require('../../../assets/info-icon.png');
    }
    
    // For money sent, use send icon
    if (notification.type === 'money_sent') {
      return require('../../../assets/icon-send.png');
    }
    
    // For money received, use wallet icon
    if (notification.type === 'money_received') {
      return require('../../../assets/wallet-icon-default.png');
    }
    
    // For group payment sent, use send icon
    if (notification.type === 'group_payment_sent') {
      return require('../../../assets/icon-send.png');
    }
    
    // For group payment received, use wallet icon
    if (notification.type === 'group_payment_received') {
      return require('../../../assets/wallet-icon-default.png');
    }
    
    // For split completed, use award icon
    if (notification.type === 'split_completed') {
      return require('../../../assets/award-icon.png');
    }
    
    // For degen split notifications, use dice icon
    if (notification.type === 'degen_all_locked' || notification.type === 'degen_ready_to_roll' || notification.type === 'roulette_result') {
      // Note: dice-icon.png doesn't exist in assets, using a fallback
      return require('../../../assets/user-icon-black.png');
    }
    
    // For contact added, use user icon
    if (notification.type === 'contact_added') {
      return require('../../../assets/user-icon-black.png');
    }
    
    // Default fallback
    return require('../../../assets/user-icon-black.png');
  };

  const getNotificationIconColor = () => {
    switch (notification.type) {
      case 'payment_request':
      case 'payment_reminder':
        return '#A5EA15';
      case 'settlement_request':
        return '#FF6B6B';
      case 'settlement_notification':
        return '#A5EA15';
      case 'funding_notification':
        return '#45B7D1';
      case 'expense_added':
        return colors.green;
      case 'group_invite':
      case 'split_invite':
      case 'split_confirmed':
        return colors.green;
      case 'general':
        return '#A89B9B';
      case 'payment_received':
        return '#A5EA15';
      case 'group_payment_request':
        return '#A5EA15';
      case 'group_added':
        return colors.green;
      case 'system_warning':
        return '#FF6B6B';
      case 'system_notification':
        return '#45B7D1';
      case 'money_sent':
        return '#A5EA15';
      case 'money_received':
        return '#A5EA15';
      case 'group_payment_sent':
        return '#A5EA15';
      case 'group_payment_received':
        return '#A5EA15';
      case 'split_completed':
        return '#A5EA15';
      case 'degen_all_locked':
        return '#FF6B6B';
      case 'degen_ready_to_roll':
        return '#A5EA15';
      case 'roulette_result':
        return '#A5EA15';
      case 'contact_added':
        return '#A5EA15';
      default:
        return '#A89B9B';
    }
  };

  const getActionButtonConfig = () => {
    const isPaid = notification.status === 'paid';
    const isCompleted = actionState === 'completed';
    const isPending = actionState === 'pending';
    const isError = actionState === 'error';
    
    switch (notification.type) {
      case 'payment_request':
      case 'payment_reminder':
        return {
          show: true,
          text: isPaid || isCompleted ? 'Done' : isPending ? 'Processing...' : 'Send',
          disabled: isPaid || isCompleted || isPending,
          backgroundColor: isPaid || isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isPaid || isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'group_invite':
        return {
          show: true,
          text: isCompleted ? 'Joined' : isPending ? 'Joining...' : 'Join',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'split_invite':
        return {
          show: true,
          text: isCompleted ? 'Joined' : isPending ? 'Joining...' : 'Join',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'split_confirmed':
        return {
          show: true,
          text: isCompleted ? 'Paid' : isPending ? 'Opening...' : 'Pay Now',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'split_lock_required':
        return {
          show: true,
          text: isCompleted ? 'Locked' : isPending ? 'Locking...' : 'Lock Funds',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'split_spin_available':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View Spin',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'split_winner':
        return {
          show: true,
          text: isCompleted ? 'Claimed' : isPending ? 'Claiming...' : 'Claim Funds',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'split_loser':
        return {
          show: true,
          text: isCompleted ? 'Paid' : isPending ? 'Processing...' : 'Pay Now',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'expense_added':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'settlement_request':
        return {
          show: true,
          text: isPaid || isCompleted ? 'Done' : isPending ? 'Opening...' : 'Settle',
          disabled: isPaid || isCompleted || isPending,
          backgroundColor: isPaid || isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isPaid || isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'settlement_notification':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'general':
        return {
          show: false,
          text: '',
          disabled: false,
          backgroundColor: colors.green,
          textColor: colors.black
        };
      case 'payment_received':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'group_payment_request':
        return {
          show: true,
          text: isPaid || isCompleted ? 'Done' : isPending ? 'Processing...' : 'Send',
          disabled: isPaid || isCompleted || isPending,
          backgroundColor: isPaid || isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isPaid || isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'group_added':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'system_warning':
        return {
          show: true,
          text: isCompleted ? 'Dismissed' : isPending ? 'Dismissing...' : 'Dismiss',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : '#FF6B6B',
          textColor: isCompleted ? '#666' : isError ? '#FFF' : '#FFF'
        };
      case 'system_notification':
        return {
          show: false,
          text: '',
          disabled: false,
          backgroundColor: colors.green,
          textColor: colors.black
        };
      case 'money_sent':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'money_received':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'group_payment_sent':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'group_payment_received':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'split_completed':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'degen_all_locked':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'degen_ready_to_roll':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'roulette_result':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      case 'contact_added':
        return {
          show: true,
          text: isCompleted ? 'Viewed' : isPending ? 'Opening...' : 'View',
          disabled: isCompleted || isPending,
          backgroundColor: isCompleted ? '#A8A8A8' : isError ? '#FF6B6B' : colors.green,
          textColor: isCompleted ? '#666' : isError ? '#FFF' : colors.black
        };
      default:
        return {
          show: false,
          text: '',
          disabled: false,
          backgroundColor: colors.green,
          textColor: colors.black
        };
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    // If less than 1 hour ago, show "X minutes ago"
    if (diffInMinutes < 60) {
      if (diffInMinutes < 1) {return 'Just now';}
      return `${diffInMinutes}m ago`;
    }

    // If less than 24 hours ago, show "X hours ago"
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    // If more than 24 hours ago, show date and time
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress(notification);
    } else {
      // Default action handling
      if (notification.type === 'payment_request' || notification.type === 'payment_reminder') {
        Alert.alert('Send Payment', 'Navigate to send payment screen');
      } else if (notification.type === 'group_invite' || notification.type === 'split_invite' || notification.type === 'expense_added') {
        Alert.alert('View Details', 'Navigate to details screen');
      } else if (notification.type === 'split_confirmed') {
        Alert.alert('Pay Your Share', 'Navigate to payment screen');
      } else if (notification.type === 'split_lock_required') {
        Alert.alert('Lock Funds', 'Navigate to lock funds screen');
      } else if (notification.type === 'split_spin_available') {
        Alert.alert('View Spin', 'Navigate to spin screen');
      } else if (notification.type === 'split_winner') {
        Alert.alert('Claim Funds', 'Navigate to claim funds screen');
      } else if (notification.type === 'split_loser') {
        Alert.alert('Pay Now', 'Navigate to payment screen');
      } else if (notification.type === 'settlement_request') {
        Alert.alert('Settle Up', 'Navigate to settlement screen');
      }
    }
  };

  const actionConfig = getActionButtonConfig();

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: animationValue,
      }}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress(notification)}
      >
      <View style={styles.contentWrapper}>
        <View style={[
          styles.iconContainer,
          { backgroundColor: getNotificationIconColor() + '20' }
        ]}>
          <Image
            source={getNotificationImage()}
            style={styles.icon}
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message.split(/(\d+\.?\d*\s*USDC|Rémi G\.|Haxxxoloto|Hackathon Solana)/).map((part: string, index: number) => {
              // Check if this part is a USDC amount
              if (/\d+\.?\d*\s*USDC/.test(part)) {
                return (
                  <Text key={index} style={styles.amount}>
                    {part}
                  </Text>
                );
              }
              // Check if this part is a user name or group name
              if (/Rémi G\.|Haxxxoloto|Hackathon Solana/.test(part)) {
                return (
                  <Text key={index} style={styles.userName}>
                    {part}
                  </Text>
                );
              }
              return (
                <Text key={index} style={styles.message}>
                  {part}
                </Text>
              );
            })}
          </Text>
          <Text style={styles.dateTime}>
            {formatDateTime(notification.created_at)}
          </Text>
        </View>
      </View>
      
      {actionConfig.show && (
        <View style={styles.actionWrapper}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { opacity: actionConfig.disabled ? 0.6 : 1 }
            ]}
            onPress={handleActionPress}
            disabled={actionConfig.disabled}
          >
            <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
              {actionConfig.disabled || actionConfig.backgroundColor === '#A8A8A8' || actionConfig.backgroundColor === '#FF6B6B' ? (
                <View style={[
                  styles.actionButtonDisabled,
                  { backgroundColor: actionConfig.backgroundColor }
                ]}>
                  <Text style={[
                    styles.actionButtonText,
                    { color: actionConfig.textColor }
                  ]}>
                    {actionConfig.text}
                  </Text>
                </View>
              ) : (
                <LinearGradient
                  colors={[colors.greenLight, colors.green]}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[
                    styles.actionButtonText,
                    { color: actionConfig.textColor }
                  ]}>
                    {actionConfig.text}
                  </Text>
                </LinearGradient>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default NotificationCard; 
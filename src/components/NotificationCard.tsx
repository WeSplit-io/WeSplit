import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  Animated
} from 'react-native';
import { colors } from '../theme/colors';

export interface NotificationData {
  id: string;
  type: 'settlement_request' | 'settlement_notification' | 'funding_notification' | 'payment_request' | 'payment_reminder' | 'general' | 'expense_added' | 'group_invite' | 'payment_received' | 'group_payment_request' | 'group_added' | 'system_warning' | 'system_notification' | 'money_sent' | 'money_received' | 'group_payment_sent' | 'group_payment_received' | 'split_completed' | 'degen_all_locked' | 'degen_ready_to_roll' | 'roulette_result' | 'contact_added';
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
    groupName?: string;
    groupId?: string;
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
    // For payment requests, use requester avatar or default user icon
    if (notification.type === 'payment_request' || notification.type === 'payment_reminder') {
      return notification.data?.requesterAvatar 
        ? { uri: notification.data.requesterAvatar }
        : { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser-icon-black.png?alt=media&token=7f585090-000c-4f3a-96cc-73fd062225b4' };
    }
    
    // For settlement notifications, use wallet icon
    if (notification.type === 'settlement_request' || notification.type === 'settlement_notification') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' };
    }
    
    // For funding notifications, use wallet icon
    if (notification.type === 'funding_notification') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' };
    }
    
    // For expense added, use book icon
    if (notification.type === 'expense_added') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbook-icon-default.png?alt=media&token=ec1254bb-72d6-49eb-a107-5e82b714e031' };
    }
    
    // For group invites, use folder icon
    if (notification.type === 'group_invite') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffolder-icon-default.png?alt=media&token=4d7d12ca-1b6f-4f42-a594-cb3de91f777a' };
    }
    
    // For general notifications, use user icon
    if (notification.type === 'general') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser-icon-black.png?alt=media&token=7f585090-000c-4f3a-96cc-73fd062225b4' };
    }
    
    // For payment received, use wallet icon
    if (notification.type === 'payment_received') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' };
    }
    
    // For group payment requests, use user icon
    if (notification.type === 'group_payment_request') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser-icon-black.png?alt=media&token=7f585090-000c-4f3a-96cc-73fd062225b4' };
    }
    
    // For group added, use folder icon
    if (notification.type === 'group_added') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffolder-icon-default.png?alt=media&token=4d7d12ca-1b6f-4f42-a594-cb3de91f777a' };
    }
    
    // For system warnings, use warning icon
    if (notification.type === 'system_warning') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwarning-icon.png?alt=media&token=5be5bba3-97cd-4e87-b872-4c3e82a6a4b8' };
    }
    
    // For system notifications, use info icon
    if (notification.type === 'system_notification') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Finfo-icon.png?alt=media&token=4322bde0-8be0-43bd-aed8-a1c250f93853' };
    }
    
    // For money sent/received, use wallet icon
    if (notification.type === 'money_sent' || notification.type === 'money_received') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' };
    }
    
    // For group payment sent/received, use user icon
    if (notification.type === 'group_payment_sent' || notification.type === 'group_payment_received') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser-icon-black.png?alt=media&token=7f585090-000c-4f3a-96cc-73fd062225b4' };
    }
    
    // For split completed, use award icon
    if (notification.type === 'split_completed') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Faward-icon.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' };
    }
    
    // For degen split notifications, use dice icon
    if (notification.type === 'degen_all_locked' || notification.type === 'degen_ready_to_roll' || notification.type === 'roulette_result') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fdice-icon.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' };
    }
    
    // For contact added, use user icon
    if (notification.type === 'contact_added') {
      return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser-icon-black.png?alt=media&token=7f585090-000c-4f3a-96cc-73fd062225b4' };
    }
    
    // Default fallback
    return { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser-icon-black.png?alt=media&token=7f585090-000c-4f3a-96cc-73fd062225b4' };
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
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
      } else if (notification.type === 'group_invite' || notification.type === 'expense_added') {
        Alert.alert('View Details', 'Navigate to details screen');
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
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.white10,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            marginTop: 8,
            borderWidth: 0.5,
            borderColor: colors.white50,
            minHeight: 80,
          },
          !notification.is_read && {
            backgroundColor: colors.green10,
            borderColor: colors.green,
            borderWidth: 1,
          }
        ]}
        onPress={() => onPress(notification)}
      >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <View style={[
          {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          },
          { backgroundColor: getNotificationIconColor() + '20' }
        ]}>
          <Image
            source={getNotificationImage()}
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              tintColor: '#FFF',
            }}
          />
        </View>
        
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{
            fontSize: 14,
            color: '#E0E0E0',
            lineHeight: 20,
            marginBottom: 8,
            flexShrink: 1,
          }} numberOfLines={2}>
            {notification.message.split(/(\d+\.?\d*\s*USDC|Rémi G\.|Haxxxoloto|Hackathon Solana)/).map((part: string, index: number) => {
              // Check if this part is a USDC amount
              if (/\d+\.?\d*\s*USDC/.test(part)) {
                return (
                  <Text key={index} style={{
                    fontSize: 13,
                    color: '#A5EA15',
                    fontWeight: '600',
                    marginTop: 4,
                  }}>
                    {part}
                  </Text>
                );
              }
              // Check if this part is a user name or group name
              if (/Rémi G\.|Haxxxoloto|Hackathon Solana/.test(part)) {
                return (
                  <Text key={index} style={{
                    fontSize: 14,
                    color: '#E0E0E0',
                    fontWeight: '600',
                  }}>
                    {part}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
          <Text style={{
            fontSize: 12,
            color: '#A89B9B',
            marginTop: 2,
          }}>
            {formatTime(notification.created_at)}
          </Text>
        </View>
      </View>
      
      {actionConfig.show && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', marginLeft: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: actionConfig.backgroundColor,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 8,
              alignSelf: 'flex-start',
              marginTop: 4,
              minWidth: 60,
              alignItems: 'center',
              opacity: actionConfig.disabled ? 0.6 : 1,
            }}
            onPress={handleActionPress}
            disabled={actionConfig.disabled}
          >
            <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
              <Text style={{
                color: actionConfig.textColor,
                fontSize: 14,
                fontWeight: '500',
              }}>
                {actionConfig.text}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default NotificationCard; 
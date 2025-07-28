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
  type: 'settlement_request' | 'settlement_notification' | 'funding_notification' | 'payment_request' | 'payment_reminder' | 'general' | 'expense_added' | 'group_invite' | 'payment_received' | 'group_payment_request' | 'group_added' | 'system_warning' | 'system_notification';
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
        : require('../../assets/user-icon-black.png');
    }
    
    // For settlement notifications, use wallet icon
    if (notification.type === 'settlement_request' || notification.type === 'settlement_notification') {
      return require('../../assets/wallet-icon-default.png');
    }
    
    // For funding notifications, use wallet icon
    if (notification.type === 'funding_notification') {
      return require('../../assets/wallet-icon-default.png');
    }
    
    // For expense added, use book icon
    if (notification.type === 'expense_added') {
      return require('../../assets/book-icon-default.png');
    }
    
    // For group invites, use folder icon
    if (notification.type === 'group_invite') {
      return require('../../assets/folder-icon-default.png');
    }
    
    // For general notifications, use user icon
    if (notification.type === 'general') {
      return require('../../assets/user-icon-black.png');
    }
    
    // Default fallback
    return require('../../assets/user-icon-black.png');
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
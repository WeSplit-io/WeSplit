import React from 'react';
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import Avatar from '../shared/Avatar';
import { PaymentRequestNotificationData } from '../../types/notificationTypes';
import { NotificationData } from '../../types/notifications';
import styles from './RequestCard.styles';

// Request can be either PaymentRequestNotificationData (direct properties) or NotificationData (with id, title, data)
type RequestData = PaymentRequestNotificationData | (NotificationData & { data?: PaymentRequestNotificationData });

interface RequestCardProps {
  request: RequestData;
  index: number;
  onSendPress: (request: RequestData) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  index,
  onSendPress,
}) => {
  // Helper function to format amount with appropriate decimal places
  const formatAmount = (amount: number): string => {
    // If amount has decimal places, show up to 2 decimals
    if (amount % 1 !== 0) {
      return amount.toFixed(2);
    }
    // If it's a whole number, show with 1 decimal for consistency
    return amount.toFixed(1);
  };

  try {
    // Handle both data structures: direct properties or nested in data
    const hasDataProperty = 'data' in request && request.data !== undefined;
    const requestData = hasDataProperty 
      ? (request as unknown as NotificationData).data as unknown as PaymentRequestNotificationData 
      : request as PaymentRequestNotificationData;
    
    const senderName = requestData?.senderName || 
      (requestData as unknown as Record<string, unknown>)?.fromUser as string || 
      (request as unknown as NotificationData)?.title || 
      'Unknown User';
    const amount = requestData?.amount || 0;
    const currency = requestData?.currency || 'USDC';
    const senderAvatar = (requestData as unknown as Record<string, unknown>)?.senderAvatar as string | null || null;
    const description = requestData?.description || 
      (requestData as unknown as Record<string, unknown>)?.note as string || 
      '';
    const requestId = (request as unknown as NotificationData)?.id || 
      (requestData as unknown as Record<string, unknown>)?.requestId as string || 
      String(index);
    const senderId = requestData?.senderId || '';
    
    // Check if notification is read (handle both NotificationData and direct request structures)
    const isRead = (request as unknown as { is_read?: boolean })?.is_read ?? 
                   (request as unknown as NotificationData)?.is_read ?? 
                   false;
    const cardOpacity = isRead ? 0.7 : 1.0;
    const isUnread = !isRead;

    return (
      <View key={requestId} style={[
        styles.requestItemNew, 
        { opacity: cardOpacity },
        isUnread && styles.unreadRequestItem
      ]}>
        <Avatar
          userId={senderId}
          userName={senderName || 'U'}
          avatarUrl={senderAvatar || ''}
          style={styles.requestAvatarNew}
        />
        <View style={styles.requestContent}>
          <Text style={styles.requestMessageWithAmount}>
            <Text style={styles.requestSenderName}>{senderName}</Text>
            <Text> requested a payment of </Text>
            <Text style={styles.requestAmountGreen}>
              {formatAmount(amount)} {currency}
            </Text>
          </Text>
          {description && (
            <Text style={styles.requestDescription}>
              &quot;{description}&quot;
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.requestSendButtonNew}
          onPress={() => onSendPress(request)}
          accessibilityRole="button"
          accessibilityLabel={`Send payment of ${formatAmount(amount)} ${currency} to ${senderName}`}
          accessibilityHint="Opens the send payment screen"
        >
          <LinearGradient
            colors={[colors.green, colors.greenLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.requestSendButtonGradient}
          >
            <Text style={styles.requestSendButtonTextNew}>Send</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  } catch (error) {
    console.error(`Error rendering request ${index}:`, error);
    return (
      <View key={index} style={styles.requestItemNew}>
        <Avatar
          userName="Error"
          style={styles.requestAvatarNew}
          size={40}
        />
        <View style={styles.requestContent}>
          <Text style={styles.requestSenderName}>Error loading request</Text>
        </View>
      </View>
    );
  }
};

export default RequestCard;

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import Avatar from '../shared/Avatar';
import styles from './RequestCard.styles';

interface RequestCardProps {
  request: any;
  index: number;
  onSendPress: (request: any) => void;
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
    const senderName = request.data?.senderName || request.data?.fromUser || request.title || 'Unknown User';
    const amount = request.data?.amount || 0;
    const currency = request.data?.currency || 'USDC';
    const senderAvatar = request.data?.senderAvatar || null;
    const description = request.data?.description || request.data?.note || '';

    return (
      <View key={request.id || index} style={styles.requestItemNew}>
        <Avatar
          userId={request.data?.senderId}
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
              "{description}"
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.requestSendButtonNew}
          onPress={() => onSendPress(request)}
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

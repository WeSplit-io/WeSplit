import React from 'react';
import {
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import UserAvatar from '../UserAvatar';

interface RequestCardProps {
  request: any;
  index: number;
  onSendPress: (request: any) => void;
  requestStyles: any;
}

const RequestCard: React.FC<RequestCardProps> = ({
  request,
  index,
  onSendPress,
  requestStyles
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

    return (
      <View key={request.id || index} style={requestStyles.requestItemNew}>
        <UserAvatar
          avatarUrl={senderAvatar || ''}
          displayName={senderName || 'U'}
          style={requestStyles.requestAvatarNew}
        />
        <View style={requestStyles.requestContent}>
          <Text style={requestStyles.requestMessageWithAmount}>
            <Text style={requestStyles.requestSenderName}>{senderName}</Text>
            <Text> requested a payment of </Text>
            <Text style={requestStyles.requestAmountGreen}>
              {formatAmount(amount)} {currency}
            </Text>
          </Text>
        </View>
        <TouchableOpacity
          style={requestStyles.requestSendButtonNew}
          onPress={() => onSendPress(request)}
        >
          <LinearGradient
            colors={[colors.green, colors.greenLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={requestStyles.requestSendButtonGradient}
          >
            <Text style={requestStyles.requestSendButtonTextNew}>Send</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  } catch (error) {
    console.error(`Error rendering request ${index}:`, error);
    return (
      <View key={index} style={requestStyles.requestItemNew}>
        <View style={requestStyles.requestAvatarNew}>
          <Text style={requestStyles.balanceAmountText}>E</Text>
        </View>
        <View style={requestStyles.requestContent}>
          <Text style={requestStyles.requestSenderName}>Error loading request</Text>
        </View>
      </View>
    );
  }
};

export default RequestCard;

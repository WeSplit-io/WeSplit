import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';
import { NotificationCompletionService } from '../../services/notificationCompletionService';

const SendSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId, transactionId, isSettlement, fromNotification, notificationId } = route.params || {};

  // Complete notification process when payment is successful
  useEffect(() => {
    const completeNotificationProcess = async () => {
      if (fromNotification && notificationId && transactionId) {
        try {
          console.log('🔍 SendSuccess: Completing notification process for payment request');
          
          // Get current user ID from navigation state or context
          // For now, we'll use a placeholder - in a real app, you'd get this from context
          const currentUserId = 'current_user_id'; // This should be replaced with actual user ID
          
          await NotificationCompletionService.completePaymentRequestNotification(
            notificationId,
            currentUserId,
            {
              amount: amount || 0,
              currency: 'USDC',
              recipientId: contact?.id || '',
              transactionId: transactionId,
              groupId: groupId
            }
          );
          
          console.log('🔍 SendSuccess: Notification process completed successfully');
        } catch (error) {
          console.error('🔍 SendSuccess: Failed to complete notification process:', error);
          // Don't fail the success screen if notification completion fails
        }
      }
    };

    completeNotificationProcess();
  }, [fromNotification, notificationId, transactionId, amount, contact, groupId]);

  const handleBackHome = () => {
    if (isSettlement && groupId) {
      // Navigate back to group details for settlement payments
      navigation.navigate('GroupDetails', { groupId });
    } else {
      // Navigate back to the dashboard/home screen
      navigation.navigate('Dashboard');
    }
  };

  // Format current date
  const getCurrentDate = () => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: colors.darkBackground}}>
      <View style={[styles.mockupSuccessContainer, {flex: 1, justifyContent: 'space-between', paddingBottom: 0}]}>  
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          {/* Success Icon */}
          <View style={styles.mockupSuccessIcon}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsuccess-icon.png?alt=media&token=6cf1d0fb-7a48-4c4c-aa4c-3c3f76c54f07' }} style={styles.mockupSuccessIconImage} />
          </View>

          {/* Success Title */}
          <Text style={[styles.mockupSuccessTitle, {
            fontSize: 24,
            marginBottom: 8,
          }]}> 
            {isSettlement ? 'Settlement Complete' : 'Transaction Success'}
          </Text>

          {/* Date */}
          <Text style={[styles.mockupSuccessDate, {
            fontSize: 16,
            marginBottom: 40,
          }]}>{getCurrentDate()}</Text>

          <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
            <Text style={[styles.mockupSuccessDescription, { color: colors.primaryGreen, textDecorationLine: 'underline' }]}>
              View transaction details
            </Text>
          </TouchableOpacity>
        </View>
        {/* Back Home Button collé en bas */}
        <View style={{width: '100%', paddingBottom: 24, alignItems: 'center'}}>
          <TouchableOpacity 
            style={[styles.mockupBackHomeButton, {
              paddingVertical: 16,
              paddingHorizontal: 48,
              borderRadius: 12,
              minWidth: '70%',
            }]} 
            onPress={handleBackHome}
          >
            <Text style={[styles.mockupBackHomeButtonText, {
              fontSize: 16,
              fontWeight: '600',
            }]}> 
              {isSettlement ? 'Back to Group' : 'Back Home'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SendSuccessScreen; 
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';
import { notificationService } from '../../services/notifications';
import { logger } from '../../services/analytics/loggingService';
import { Container, Button } from '../../components/shared';

const SendSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, wallet, destinationType, amount, description, groupId, transactionId, isSettlement, fromNotification, notificationId } = route.params || {};
  

  // Complete notification process when payment is successful
  useEffect(() => {
    const completeNotificationProcess = async () => {
      if (fromNotification && notificationId && transactionId) {
        try {
          logger.info('Completing notification process for payment request', {
            notificationId,
            transactionId,
            fromNotification
          }, 'SendSuccessScreen');
          
          // Mark notification as read using the notification service
          await notificationService.markAsRead(notificationId);
          
          // If we have a requestId, also mark payment request notifications as completed
          const requestId = route.params?.requestId;
          if (requestId) {
            // Get current user ID from route params or context
            const currentUserId = route.params?.currentUserId || 'current_user_id';
            await notificationService.markPaymentRequestCompleted(requestId, currentUserId);
          }
          
          logger.info('Notification process completed successfully', {
            notificationId,
            transactionId,
            requestId: route.params?.requestId
          }, 'SendSuccessScreen');
        } catch (error) {
          console.error('🔍 SendSuccess: Failed to complete notification process:', error);
          // Don't fail the success screen if notification completion fails
        }
      }
    };

    completeNotificationProcess();
  }, [fromNotification, notificationId, transactionId, amount, contact, groupId, route.params?.requestId, route.params?.currentUserId]);

  const handleBackHome = () => {
    if (isSettlement && groupId) {
      // Navigate back to group details for settlement payments
      navigation.navigate('GroupDetails', { groupId });
    } else {
      // Navigate back to the dashboard/home screen with refresh flag
      navigation.navigate('Dashboard', { 
        refreshRequests: true,
        refreshBalance: true 
      });
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
    <Container>
      <View style={[styles.mockupSuccessContainer, {flex: 1, justifyContent: 'space-between', paddingBottom: 0}]}>  
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          {/* Success Icon */}
          <View style={styles.mockupSuccessIcon}>
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsucess-icon-new.png?alt=media&token=5ee14802-562e-45d1-bc4a-deeb584d2904' }} style={styles.mockupSuccessIconImage} />
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
            <Text style={styles.mockupSuccessDescription}>
              View transaction details
            </Text>
          </TouchableOpacity>
        </View>
        {/* Back Home Button collé en bas */}
        <View style={{width: '100%', alignItems: 'center'}}>
          <Button
            title={isSettlement ? 'Back to Group' : 'Back Home'}
            onPress={handleBackHome}
            variant="primary"
            fullWidth={true}
            style={styles.mockupBackHomeButton}
          />
        </View>
      </View>
    </Container>
  );
};

export default SendSuccessScreen; 
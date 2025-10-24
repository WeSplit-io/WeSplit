import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { colors } from '../../theme';
import { styles } from './styles';
import { logger } from '../../services/analytics/loggingService';
import { Container, Button } from '../../components/shared';

const RequestSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId, requestId, paymentRequest } = route.params || {};

  // Debug logging
  logger.info('Route params', {
    contact: contact?.name,
    amount,
    description,
    groupId,
    requestId,
    paymentRequest: paymentRequest?.id
  });

  const handleBackHome = () => {
    // Navigate back to the appropriate screen
    if (groupId) {
      navigation.navigate('GroupDetails', { groupId });
    } else {
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
            Request Sent Successfully
          </Text>

          {/* Date */}
          <Text style={[styles.mockupSuccessDate, {
            fontSize: 16,
            marginBottom: 40,
          }]}>
            {getCurrentDate()}
          </Text>

         

          

         </View>
        {/* Back Home Button collé en bas */}
        <View style={{width: '100%', alignItems: 'center'}}>
          <Button
            title="Back Home"
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

export default RequestSuccessScreen; 
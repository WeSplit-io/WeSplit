import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';
import { logger } from '../../services/loggingService';

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
    <SafeAreaView style={{flex: 1, backgroundColor: colors.darkBackground}}>
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
          <TouchableOpacity onPress={handleBackHome} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.mockupBackHomeButton, {
                paddingVertical: 16,
                paddingHorizontal: 48,
                borderRadius: 12,
                width: '100%'
              }]}
            >
              <Text style={[styles.mockupBackHomeButtonText, {
                fontSize: 16,
                fontWeight: '600',
              }]}> 
                Back Home
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default RequestSuccessScreen; 
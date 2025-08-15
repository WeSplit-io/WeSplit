import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';

const RequestSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId, requestId, paymentRequest } = route.params || {};

  // Debug logging
  console.log('✅ RequestSuccess: Route params:', {
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
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsuccess-icon.png?alt=media&token=6cf1d0fb-7a48-4c4c-aa4c-3c3f76c54f07' }} style={styles.mockupSuccessIconImage} />
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

          {/* Additional Info */}
          {contact && (
            <Text style={[styles.mockupSuccessDate, {
              fontSize: 14,
              marginBottom: 20,
              color: colors.textSecondary,
            }]}>
              Sent to {contact.name || contact.email || 'Unknown'}
            </Text>
          )}

          {amount && (
            <Text style={[styles.mockupSuccessDate, {
              fontSize: 16,
              marginBottom: 10,
              color: colors.primaryGreen,
              fontWeight: '600',
            }]}>
              ${amount} USDC
            </Text>
          )}

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
              Back Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default RequestSuccessScreen; 
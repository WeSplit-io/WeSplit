import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';

const SendSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId, transactionId, isSettlement } = route.params || {};

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
            <Image source={require('../../../assets/success-icon.png')} style={styles.mockupSuccessIconImage} />
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

          <Text style={styles.mockupSuccessDescription}>View transaction details</Text>
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
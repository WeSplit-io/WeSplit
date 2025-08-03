import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';

const WithdrawSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { 
    amount, 
    withdrawalFee, 
    totalWithdraw, 
    walletAddress, 
    description, 
    transactionId, 
    txId 
  } = route.params || {};

  // Ensure withdrawalFee and totalWithdraw have default values
  const safeWithdrawalFee = withdrawalFee || 0;
  const safeTotalWithdraw = totalWithdraw || 0;

  const handleBackHome = () => {
    // Navigate back to dashboard
    navigation.navigate('Dashboard');
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
    <SafeAreaView style={styles.container}>
      <View style={[styles.mockupSuccessContainer, styles.mockupSuccessContainerWithSpace]}>  
        <View style={styles.mockupSuccessContentContainer}>
          {/* Success Icon */}
          <View style={styles.mockupSuccessIcon}>
            <Image source={require('../../../assets/success-icon.png')} style={styles.mockupSuccessIconImage} />
          </View>

          {/* Success Title */}
          <Text style={styles.mockupSuccessTitleLarge}> 
            Withdrawal Complete
          </Text>

          {/* Date */}
          <Text style={styles.mockupSuccessDateLarge}>{getCurrentDate()}</Text>

          <Text style={styles.mockupSuccessDescription}>View transaction details</Text>
        </View>
        {/* Back Home Button collé en bas */}
        <View style={styles.mockupBackHomeButtonContainer}>
          <TouchableOpacity 
            style={styles.mockupBackHomeButtonCustom}
            onPress={handleBackHome}
          >
            <Text style={styles.mockupBackHomeButtonTextCustom}> 
              Back Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WithdrawSuccessScreen; 
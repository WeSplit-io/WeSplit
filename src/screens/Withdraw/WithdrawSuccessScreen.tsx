import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
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
            <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fsuccess-icon.png?alt=media&token=6cf1d0fb-7a48-4c4c-aa4c-3c3f76c54f07' }} style={styles.mockupSuccessIconImage} />
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
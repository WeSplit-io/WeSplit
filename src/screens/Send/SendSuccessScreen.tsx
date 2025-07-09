import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
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
    <SafeAreaView style={styles.container}>
      <View style={styles.mockupSuccessContainer}>
        {/* Success Icon */}
        <View style={[styles.mockupSuccessIcon, {
          width: 120,
          height: 120,
          borderRadius: 60,
          marginBottom: 32,
        }]}>
          <Icon name="check" size={60} color={colors.darkBackground} />
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

        {/* Sent Amount */}
        <View style={[styles.mockupSentAmountContainer, {
          alignItems: 'center',
          marginBottom: 24,
        }]}>
          <Text style={[styles.mockupSentAmountLabel, {
            fontSize: 16,
            marginBottom: 8,
          }]}>
            {isSettlement ? 'Settlement amount' : 'Sent amount'}
          </Text>
          <Text style={[styles.mockupSentAmountValue, {
            fontSize: 42,
            fontWeight: 'bold',
          }]}>{amount} USDC</Text>
          {isSettlement && (
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: 8,
              textAlign: 'center',
            }}>
              Paid to {contact?.name}
            </Text>
          )}
        </View>

        {/* Note */}
        {description && (
          <View style={[styles.mockupSuccessNoteContainer, {
            marginBottom: 48,
          }]}>
            <Text style={[styles.mockupSuccessNoteText, {
              fontSize: 16,
            }]}>"{description}"</Text>
          </View>
        )}

        {/* Back Home Button */}
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
    </SafeAreaView>
  );
};

export default SendSuccessScreen; 
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';

const RequestSuccessScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId, requestId } = route.params || {};

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
    <SafeAreaView style={styles.container}>
      <View style={styles.mockupRequestSuccessContainer}>
        {/* Success Icon */}
        <View style={[styles.mockupRequestSuccessIcon, {
          width: 120,
          height: 120,
          borderRadius: 60,
          marginBottom: 32,
        }]}>
          <Icon name="check" size={60} color={colors.darkBackground} />
        </View>

        {/* Success Title */}
        <Text style={[styles.mockupRequestSuccessTitle, {
          fontSize: 24,
          marginBottom: 8,
        }]}>
          Request Send
        </Text>

        {/* Date */}
        <Text style={[styles.mockupRequestSuccessDate, {
          fontSize: 16,
          marginBottom: 40,
        }]}>{getCurrentDate()}</Text>

        {/* Request Amount */}
        <View style={[styles.mockupRequestAmountContainer, {
          alignItems: 'center',
          marginBottom: 24,
        }]}>
          <Text style={[styles.mockupRequestAmountLabel, {
            fontSize: 16,
            marginBottom: 8,
          }]}>
            Request amount
          </Text>
          <Text style={[styles.mockupRequestSuccessAmount, {
            fontSize: 42,
            fontWeight: 'bold',
          }]}>{amount} USDC</Text>
        </View>

        {/* Note */}
        {description && (
          <View style={[styles.mockupRequestNoteContainer, {
            marginBottom: 48,
          }]}>
            <Text style={{
              fontSize: 16,
              color: colors.textLight,
              textAlign: 'center',
            }}>"{description}"</Text>
          </View>
        )}

        {/* Back Home Button */}
        <TouchableOpacity 
          style={[styles.mockupRequestSuccessButton, {
            paddingVertical: 16,
            paddingHorizontal: 48,
            borderRadius: 12,
            minWidth: '70%',
          }]} 
          onPress={handleBackHome}
        >
          <Text style={[styles.mockupRequestSuccessButtonText, {
            fontSize: 16,
            fontWeight: '600',
          }]}>
            Back Home
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RequestSuccessScreen; 
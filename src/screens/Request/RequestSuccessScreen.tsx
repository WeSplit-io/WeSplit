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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mockupRequestSuccessContainer}>
        {/* Success Icon */}
        <View style={styles.mockupRequestSuccessIconContainer}>
          <View style={styles.mockupRequestSuccessIcon}>
            <Icon name="check" size={60} color={colors.brandGreen} />
          </View>
        </View>

        {/* Success Message */}
        <Text style={styles.mockupRequestSuccessTitle}>Request Sent</Text>
        <Text style={styles.mockupRequestSuccessSubtitle}>
          {contact?.name || 'The recipient'} can now send you money
        </Text>

        {/* Request Details Card */}
        <View style={styles.mockupRequestSuccessCard}>
          <View style={styles.mockupRequestSuccessRow}>
            <Text style={styles.mockupRequestSuccessLabel}>Request to:</Text>
            <Text style={styles.mockupRequestSuccessValue}>{contact?.name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.mockupRequestSuccessRow}>
            <Text style={styles.mockupRequestSuccessLabel}>Amount:</Text>
            <Text style={styles.mockupRequestSuccessValue}>{amount?.toFixed(0) || '0'} USDC</Text>
          </View>
          
          {description && (
            <View style={styles.mockupRequestSuccessRow}>
              <Text style={styles.mockupRequestSuccessLabel}>Note:</Text>
              <Text style={styles.mockupRequestSuccessValue}>{description}</Text>
            </View>
          )}
        </View>

        {/* Amount Display */}
        <Text style={styles.mockupRequestSuccessAmount}>
          {amount?.toFixed(0) || '0'} USDC
        </Text>

        {/* Back Home Button */}
        <TouchableOpacity 
          style={styles.mockupRequestSuccessButton} 
          onPress={handleBackHome}
        >
          <Text style={styles.mockupRequestSuccessButtonText}>Back Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RequestSuccessScreen; 
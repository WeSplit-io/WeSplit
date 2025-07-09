import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import Icon from '../../components/Icon';
import { GroupMember } from '../../services/groupService';
import { styles } from './styles';

const RequestConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, amount, description, groupId } = route.params || {};
  const [requesting, setRequesting] = useState(false);

  const handleConfirmRequest = async () => {
    setRequesting(true);
    
    try {
      // Simulate request process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to success screen
      navigation.navigate('RequestSuccess', {
        contact,
        amount,
        description,
        groupId,
        requestId: `REQ${Date.now()}`,
      });
    } catch (error) {
      console.error('Request error:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Request</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Confirmation Details */}
        <View style={styles.confirmationCard}>
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Requesting from:</Text>
            <Text style={styles.confirmationValue}>{contact?.name || 'Unknown'}</Text>
          </View>
          
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Amount:</Text>
            <Text style={styles.confirmationValue}>${amount?.toFixed(2) || '0.00'}</Text>
          </View>
          
          {description && (
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Description:</Text>
              <Text style={styles.confirmationValue}>{description}</Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Requested:</Text>
            <Text style={styles.totalAmount}>${amount?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {contact?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact?.name || 'Unknown'}</Text>
            <Text style={styles.contactEmail}>{contact?.email || ''}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.actionButton, requesting && styles.disabledButton]}
          onPress={handleConfirmRequest}
          disabled={requesting}
        >
          <Text style={styles.actionButtonText}>
            {requesting ? 'Sending Request...' : 'Send Request'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          disabled={requesting}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RequestConfirmationScreen; 
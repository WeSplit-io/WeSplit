import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView, TextInput } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';

const RequestAmountScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, groupId } = route.params || {};
  const [amount, setAmount] = useState('0');
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) return;
    
    setAmount(cleaned || '0');
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!contact) {
      Alert.alert('Error', 'Contact information is missing');
      return;
    }

    // Navigate to confirmation screen for proper backend integration
    navigation.navigate('RequestConfirmation', {
      contact,
      amount: numAmount,
      description: note.trim(),
      groupId,
    });
  };



  const isAmountValid = parseFloat(amount) > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.mockupRequestScrollContainer}
        contentContainerStyle={styles.mockupRequestScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient Avatar */}
        <View style={styles.mockupRequestRecipientContainer}>
          <View style={styles.mockupRequestRecipientAvatar}>
            <Text style={styles.mockupRequestRecipientAvatarText}>
              {contact?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.mockupRequestRecipientName}>{contact?.name || 'Unknown'}</Text>
          <Text style={styles.mockupRequestRecipientEmail}>{contact?.wallet_address ? 
            `${contact.wallet_address.slice(0, 6)}...${contact.wallet_address.slice(-6)}` : 
            contact?.email || ''}</Text>
        </View>

        {/* Amount Display */}
        <View style={styles.mockupRequestAmountContainer}>
          <Text style={styles.mockupRequestAmountLabel}>Enter amount</Text>
          <TextInput
            style={styles.mockupRequestAmountDisplay}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            autoFocus={true}
          />
          <Text style={{
            color: colors.textLight,
            fontSize: 16,
            textAlign: 'center',
            marginTop: 4,
          }}>USDC</Text>
        </View>

        {/* Add Note Section */}
        {!showAddNote ? (
          <TouchableOpacity 
            style={styles.mockupRequestAddNoteButton}
            onPress={() => setShowAddNote(true)}
          >
            <Icon name="message-circle" size={14} color={colors.textSecondary} />
            <Text style={styles.mockupRequestAddNoteText}>Add note</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.mockupRequestNoteContainer}>
            <View style={styles.mockupRequestNoteHeader}>
              <Text style={styles.mockupRequestNoteLabel}>Note:</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowAddNote(false);
                  setNote('');
                }}
                style={styles.mockupRequestNoteCloseButton}
              >
                <Icon name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.mockupRequestNoteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Enter request note (e.g., Reimbursement pizza friday)"
              placeholderTextColor={colors.textSecondary}
              multiline={true}
              numberOfLines={2}
              maxLength={100}
              autoFocus={true}
              returnKeyType="done"
              blurOnSubmit={true}
            />
            {note.length > 0 && (
              <Text style={styles.mockupRequestNoteCounter}>
                {note.length}/100
              </Text>
            )}
          </View>
        )}



        {/* Request Button */}
        <TouchableOpacity
          style={[
            styles.mockupRequestButton,
            isAmountValid && styles.mockupRequestButtonActive,
          ]}
          onPress={handleContinue}
          disabled={!isAmountValid}
        >
          <Text style={[
            styles.mockupRequestButtonText,
            isAmountValid && styles.mockupRequestButtonTextActive,
          ]}>
            Request
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RequestAmountScreen; 
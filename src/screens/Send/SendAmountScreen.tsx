import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, Alert, ScrollView, Image } from 'react-native';
import Icon from '../../components/Icon';
import { GroupMember } from '../../types';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { styles } from './styles';

const SendAmountScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, groupId, prefilledAmount, prefilledNote, isSettlement } = route.params || {};
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toString() : '0');
  const [showAddNote, setShowAddNote] = useState(!!prefilledNote || isSettlement);
  const [note, setNote] = useState(prefilledNote || '');

  // Debug logging to ensure contact data is passed correctly
  useEffect(() => {
    console.log('💰 SendAmount: Contact data received:', {
      name: contact?.name || 'No name',
      email: contact?.email,
      wallet: contact?.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
      fullWallet: contact?.wallet_address,
      id: contact?.id
    });
  }, [contact]);

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

    navigation.navigate('SendConfirmation', {
      contact,
      amount: numAmount,
      description: note.trim(),
      groupId,
      isSettlement,
    });
  };



  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const isAmountValid = parseFloat(amount) > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient Avatar */}
        <View style={[styles.recipientAvatarContainer, { marginTop: 10, marginBottom: 20 }]}>
          <View style={[styles.recipientAvatar, { width: 60, height: 60, marginBottom: 8 }]}>
            <Text style={[styles.recipientAvatarText, { fontSize: 18 }]}>
              {contact?.name ? contact.name.charAt(0).toUpperCase() : formatWalletAddress(contact?.wallet_address || '').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.recipientName, { fontSize: 16 }]}>
            {contact?.name || formatWalletAddress(contact?.wallet_address || '')}
          </Text>
          <Text style={[styles.recipientEmail, { fontSize: 14 }]}>
            {contact?.wallet_address ? formatWalletAddress(contact.wallet_address) : contact?.email || ''}
          </Text>
          {contact?.email && contact?.wallet_address && (
            <Text style={[styles.recipientEmail, { fontSize: 12, marginTop: 2 }]}>
              {contact.email}
            </Text>
          )}
        </View>

        {/* Amount Display */}
        <View style={[styles.amountDisplayContainer, { marginBottom: 30, alignItems: 'center' }]}>
          <Text style={[styles.enterAmountLabel, { fontSize: 16, marginBottom: 8, color: colors.textSecondary }]}>
            {isSettlement ? 'Settlement Amount' : 'Enter amount'}
          </Text>
          <TextInput
            style={{
              color: colors.textLight,
              fontSize: 48,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 4,
              backgroundColor: 'transparent',
              borderWidth: 0,
              padding: 0,
              minWidth: 200,
            }}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            autoFocus={!isSettlement}
            editable={!isSettlement}
          />
          <Text style={{
            color: colors.textLight,
            fontSize: 16,
            textAlign: 'center',
            marginTop: 4,
          }}>USDC</Text>
          {isSettlement && (
            <Text style={{
              color: colors.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              marginTop: 8,
            }}>
              Settlement payment amount (fixed)
            </Text>
          )}
        </View>

        {/* Add Note Section */}
        {!showAddNote ? (
          !isSettlement && (
            <TouchableOpacity 
              style={[styles.addNoteButton, { marginBottom: 20, paddingVertical: 4 }]}
              onPress={() => setShowAddNote(true)}
            >
              <Icon name="message-circle" size={14} color={colors.textSecondary} />
              <Text style={[styles.addNoteText, { fontSize: 14 }]}>Add note</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={[styles.noteInputContainer, { marginBottom: 20 }]}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <Text style={[styles.noteLabel, { fontSize: 14 }]}>
                {isSettlement ? 'Settlement Note:' : 'Note:'}
              </Text>
              {!isSettlement && (
                <TouchableOpacity 
                  onPress={() => {
                    setShowAddNote(false);
                    setNote('');
                  }}
                  style={{ padding: 4 }}
                >
                  <Icon name="x" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={{
                backgroundColor: isSettlement ? colors.darkCard : colors.darkBackground,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isSettlement ? colors.textSecondary : colors.textLight,
                padding: 12,
                color: colors.textLight,
                fontSize: 14,
                minHeight: 44,
                textAlignVertical: 'top',
                opacity: isSettlement ? 0.8 : 1,
              }}
              value={note}
              onChangeText={isSettlement ? undefined : setNote}
              placeholder={isSettlement ? '' : "Enter payment note (e.g., Pizza dinner, Gas money, etc.)"}
              placeholderTextColor={colors.textSecondary}
              multiline={true}
              numberOfLines={2}
              maxLength={100}
              autoFocus={!isSettlement}
              returnKeyType="done"
              blurOnSubmit={true}
              editable={!isSettlement}
            />
            {note.length > 0 && !isSettlement && (
              <Text style={{
                color: colors.textSecondary,
                fontSize: 12,
                textAlign: 'right',
                marginTop: 4,
              }}>
                {note.length}/100
              </Text>
            )}
          </View>
        )}



        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.mockupContinueButton,
            isAmountValid && styles.mockupContinueButtonActive,
            { marginTop: 20 }
          ]}
          onPress={handleContinue}
          disabled={!isAmountValid}
        >
          <Text style={[
            styles.mockupContinueButtonText,
            isAmountValid && styles.mockupContinueButtonTextActive,
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendAmountScreen; 
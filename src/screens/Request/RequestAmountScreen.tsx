import React, { useState, useEffect, useRef } from 'react';
import type { Text as RNText } from 'react-native';
import { Header, Button } from '../../components/shared';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';
import UserAvatar from '../../components/UserAvatar';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/data';
import { createPaymentRequest } from '../../services/payments';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';

const RequestAmountScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, groupId } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  const [amount, setAmount] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');
  const [noteInputWidth, setNoteInputWidth] = useState(60);
  const [maxNoteInputWidth, setMaxNoteInputWidth] = useState(0);
  const noteTextRef = useRef<RNText>(null);

  // Debug logging to ensure contact data is passed correctly
  useEffect(() => {
    logger.debug('Contact data received', {
      name: contact?.name || 'No name',
      email: contact?.email,
      wallet: contact?.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
      fullWallet: contact?.wallet_address,
      id: contact?.id
    });
  }, [contact]);

  useEffect(() => {
    // Mesure la largeur du texte (note ou placeholder)
    if (noteTextRef.current && typeof noteTextRef.current.measure === 'function') {
      noteTextRef.current.measure((x: number, y: number, w: number) => {
        setNoteInputWidth(Math.max(60, Math.min(w + 8, maxNoteInputWidth)));
      });
    }
  }, [note, maxNoteInputWidth]);

  const handleAmountChange = (value: string) => {
    // Allow numbers, decimal point, and comma (for international keyboards)
    // First, convert commas to dots for consistency
    let cleaned = value.replace(/,/g, '.');

    // Then remove any other non-numeric characters except dots
    cleaned = cleaned.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {return;}

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {return;}

    setAmount(cleaned);
  };

  const handleContinue = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || !numAmount || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!contact) {
      Alert.alert('Error', 'Contact information is missing');
      return;
    }

    try {
      logger.info('Creating payment request', {
        senderId: currentUser?.id,
        recipientId: contact.id,
        amount: numAmount,
        description: note.trim(),
        groupId
      });

      // Create the payment request using Firebase service
      const paymentRequest = await createPaymentRequest(
        currentUser?.id || '',
        contact.id,
        numAmount,
        'USDC',
        note.trim(),
        groupId
      );

      logger.info('Payment request created successfully', { paymentRequest }, 'RequestAmountScreen');

      // Navigate to success screen with the actual request data
    navigation.navigate('RequestSuccess', {
      contact,
      amount: numAmount,
      description: note.trim(),
      groupId,
        requestId: paymentRequest.id,
        paymentRequest
      });
    } catch (error) {
      console.error('❌ RequestAmount: Error creating payment request:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('❌ RequestAmount: Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      
      Alert.alert(
        'Error', 
        `Failed to create payment request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) {return '';}
    if (address.length <= 8) {return address;}
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const isAmountValid = amount && parseFloat(amount) > 0;

  return (
    <Container>
      {/* Header */}
      <Header
        title="Request"
        onBackPress={() => navigation.goBack()}
      />

      {/* Recipient Info */}
      <View style={styles.requestRecipientAvatarContainer}>
        <UserAvatar
          userId={contact?.id?.toString() || ''}
          userName={contact?.name}
          size={60}
          avatarUrl={contact?.avatar || contact?.photoURL}
          style={styles.requestRecipientAvatar}
        />
        <Text style={styles.requestRecipientName}>
          {contact?.name || formatWalletAddress(contact?.wallet_address || '')}
        </Text>
        <Text style={styles.requestRecipientEmail}>
          {contact?.wallet_address
            ? formatWalletAddress(contact.wallet_address)
            : contact?.email || ''}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 0, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card for Amount and Note */}
          <View style={styles.requestAmountCardMockup}>
            <View style={styles.requestAmountCardHeader}>
              <Text style={styles.requestAmountCardLabel}>Enter amount</Text>
              <TextInput
                style={styles.requestAmountCardInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                autoFocus={true}
                textAlign="center"
                selectionColor={colors.brandGreen}
                maxLength={12}
                returnKeyType="done"
                blurOnSubmit={true}
              />
              <Text style={styles.requestAmountCardCurrency}>USDC</Text>
            </View>

            {/* Add Note Section */}
            {!showAddNote ? (
              <TouchableOpacity
                style={[styles.requestAmountCardAddNoteRow, { justifyContent: 'center' }]}
                onPress={() => setShowAddNote(true)}
              >
                <Icon name="message-circle" size={16} color={colors.white50} />
                <Text style={styles.requestAmountCardAddNoteText}>Add note</Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[styles.requestAmountCardAddNoteRow, { justifyContent: 'center', position: 'relative' }]}
                onLayout={e => setMaxNoteInputWidth(e.nativeEvent.layout.width - 32)} // 32px padding (16 left + 16 right)
              >
                <Icon name="message-circle" size={16} color={colors.white50} />
                <TextInput
                  style={[
                    styles.requestAmountCardAddNoteText,
                    {
                      color: 'white',
                      marginLeft: 8,
                      paddingVertical: 0,
                      paddingHorizontal: 0,
                      width: noteInputWidth,
                      minWidth: 60,
                      maxWidth: maxNoteInputWidth,
                      textAlign: 'center',
                    },
                  ]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add note"
                  placeholderTextColor={colors.white50}
                  multiline={false}
                  maxLength={100}
                  autoFocus={true}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                {/* Text invisible pour mesurer la largeur */}
                <Text
                  ref={noteTextRef}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    left: 40, // après l'icône
                    fontSize: 15,
                    fontWeight: 'normal',
                    padding: 0,
                    margin: 0,
                  }}
                  numberOfLines={1}
                >
                  {note.length > 0 ? note : 'Add note'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Continue Button fixed at bottom */}
        <View style={styles.requestAmountCardContinueButtonWrapper}>
          <Button
            title="Request"
            onPress={handleContinue}
            variant="primary"
            disabled={!isAmountValid}
            fullWidth={true}
            style={{ width: '100%' }}
          />
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default RequestAmountScreen; 
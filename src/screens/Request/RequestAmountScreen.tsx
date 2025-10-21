import React, { useState, useEffect, useRef } from 'react';
import type { Text as RNText } from 'react-native';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { colors } from '../../theme';
import { styles } from './styles';
import UserAvatar from '../../components/UserAvatar';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { createPaymentRequest } from '../../services/firebasePaymentRequestService';
import { logger } from '../../services/loggingService';
import { 
  validatePaymentAmount, 
  validateContactForRequest, 
  validateUserForRequest,
  handlePaymentRequestError,
  logPaymentRequestAttempt,
  logPaymentRequestSuccess,
  isAmountValid,
  createRequestSuccessNavigationData
} from '../../utils/requestUtils';

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
    // Allow numbers, decimal point, and comma (for decimal separator)
    const cleaned = value.replace(/[^0-9.,]/g, '');

    // Convert comma to period for consistency (comma as decimal separator)
    const normalized = cleaned.replace(',', '.');

    // Prevent multiple decimal points
    const parts = normalized.split('.');
    if (parts.length > 2) return;

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) return;

    setAmount(normalized);
  };

  const handleContinue = async () => {
    // Validate amount
    const amountValidation = validatePaymentAmount(amount);
    if (!amountValidation.isValid) {
      Alert.alert('Error', amountValidation.error || 'Please enter a valid amount');
      return;
    }

    // Validate contact
    const contactValidation = validateContactForRequest(contact);
    if (!contactValidation.isValid) {
      Alert.alert('Error', contactValidation.error || 'Contact information is missing');
      return;
    }

    // Validate user
    const userValidation = validateUserForRequest(currentUser);
    if (!userValidation.isValid) {
      Alert.alert('Error', userValidation.error || 'User not authenticated');
      return;
    }

    try {
      logPaymentRequestAttempt(
        currentUser.id,
        contact.id,
        amountValidation.numAmount!,
        note.trim(),
        groupId,
        'RequestAmountScreen'
      );

      // Create the payment request using Firebase service
      const paymentRequest = await createPaymentRequest(
        currentUser.id,
        contact.id,
        amountValidation.numAmount!,
        'USDC',
        note.trim(),
        groupId
      );

      logPaymentRequestSuccess(paymentRequest, 'RequestAmountScreen');

      // Navigate to success screen with the actual request data
      navigation.navigate('RequestSuccess', createRequestSuccessNavigationData(
        contact,
        amountValidation.numAmount!,
        note.trim(),
        paymentRequest.id,
        paymentRequest,
        groupId
      ));
    } catch (error) {
      handlePaymentRequestError(error, 'RequestAmount');
    }
  };

  const amountValid = isAmountValid(amount);

  // Temporary fallback for formatWalletAddress
  const formatWalletAddressLocal = (address: string): string => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
              source={require('../../../assets/chevron-left.png')}
              style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Recipient Info */}
      <View style={styles.requestRecipientAvatarContainer}>
        <UserAvatar
          userId={contact?.id?.toString() || ''}
          userName={contact?.name}
          size={60}
          avatarUrl={contact?.avatar || contact?.photoURL}
          style={styles.requestRecipientAvatar}
          backgroundColor={colors.surface}
        />
        <Text style={styles.requestRecipientName}>
          {contact?.name || formatWalletAddressLocal(contact?.wallet_address || '')}
        </Text>
        <Text style={styles.requestRecipientEmail}>
          {contact?.wallet_address
            ? formatWalletAddressLocal(contact.wallet_address)
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
          <TouchableOpacity onPress={handleContinue} disabled={!isAmountValid} activeOpacity={0.8} style={{ width: '100%' }}>
            {isAmountValid ? (
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mockupContinueButton}
              >
                <Text style={styles.mockupContinueButtonTextActive}>Request</Text>
              </LinearGradient>
            ) : (
              <View style={styles.mockupContinueButton}>
                <Text style={styles.mockupContinueButtonText}>Request</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RequestAmountScreen; 
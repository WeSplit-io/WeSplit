import React, { useState, useEffect, useRef } from 'react';
import type { Text as RNText } from 'react-native';
import { Header } from '../../components/shared';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import Avatar from '../../components/shared/Avatar';
import Button from '../../components/shared/Button';
import { colors } from '../../theme';
import { styles } from './styles';
import { useApp } from '../../context/AppContext';
import { createPaymentRequest } from '../../services/payments';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';

interface ContactActionScreenProps {
  navigation: any;
  route: any;
}

const ContactActionScreen: React.FC<ContactActionScreenProps> = ({ navigation, route }) => {
  const { selectedContact } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;

  // Debug logging for contact data
  useEffect(() => {
    logger.debug('Selected contact data', {
      id: selectedContact?.id,
      name: selectedContact?.name,
      avatar: selectedContact?.avatar,
      hasAvatar: !!selectedContact?.avatar,
      email: selectedContact?.email,
      wallet_address: selectedContact?.wallet_address
    });
  }, [selectedContact]);
  const [activeAction, setActiveAction] = useState<'send' | 'request'>('send');
  const [amount, setAmount] = useState('0');
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');
  const [noteInputWidth, setNoteInputWidth] = useState(60);
  const [maxNoteInputWidth, setMaxNoteInputWidth] = useState(0);
  const [processing, setProcessing] = useState(false);
  const noteTextRef = useRef<RNText>(null);

  useEffect(() => {
    // Mesure la largeur du texte (note ou placeholder)
    if (noteTextRef.current && typeof noteTextRef.current.measure === 'function') {
      noteTextRef.current.measure((x: number, y: number, w: number) => {
        setNoteInputWidth(Math.max(60, Math.min(w + 8, maxNoteInputWidth)));
      });
    }
  }, [note, maxNoteInputWidth]);

  const handleActionToggle = (action: 'send' | 'request') => {
    setActiveAction(action);
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {return;}

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {return;}

    setAmount(cleaned || '0');
  };

  const handleContinue = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (!selectedContact) {
      Alert.alert('Error', 'Contact information is missing');
      return;
    }

    if (activeAction === 'send') {
      // Navigate directly to SendConfirmation screen
      navigation.navigate('SendConfirmation', {
        destinationType: 'friend',
        contact: selectedContact,
        amount: numAmount,
        description: note.trim(),
        isSettlement: false,
      });
    } else {
      // Handle request directly here
      if (!currentUser?.id) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      setProcessing(true);
      try {
        logger.info('Creating payment request', {
          senderId: currentUser.id,
          recipientId: selectedContact.id,
          amount: numAmount,
          description: note.trim(),
        });

        // Create the payment request using Firebase service
        const paymentRequest = await createPaymentRequest(
          currentUser.id,
          selectedContact.id,
          numAmount,
          'USDC',
          note.trim()
        );

        logger.info('Payment request created successfully', { paymentRequest }, 'ContactActionScreen');

        // Navigate to success screen with the actual request data
        navigation.navigate('RequestSuccess', {
          contact: selectedContact,
          amount: numAmount,
          description: note.trim(),
          requestId: paymentRequest.id,
          paymentRequest,
        });
      } catch (error) {
        console.error('❌ ContactAction: Error creating payment request:', error);
        
        // More detailed error logging
        if (error instanceof Error) {
          console.error('❌ ContactAction: Error details:', {
            message: error.message,
            stack: error.stack
          });
        }
        
        Alert.alert(
          'Error', 
          `Failed to create payment request: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setProcessing(false);
      }
    }
  };

  const formatWalletAddress = (address: string) => {
    if (!address) {return '';}
    if (address.length <= 8) {return address;}
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const isAmountValid = parseFloat(amount) > 0;

  return (
    <Container>
      <Header
        title="Select Action"
        onBackPress={() => navigation.goBack()}
      />

      {/* Action Toggle - Using NotificationsScreen design */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tab} onPress={() => handleActionToggle('send')}>
          {activeAction === 'send' ? (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabActive}
            >
              <Text style={[styles.tabText, styles.activeTabText]}>Send</Text>
            </LinearGradient>
          ) : (
            <View style={styles.tab}>
              <Text style={styles.tabText}>Send</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => handleActionToggle('request')}>
          {activeAction === 'request' ? (
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabActive}
            >
              <Text style={[styles.tabText, styles.activeTabText]}>Request</Text>
            </LinearGradient>
          ) : (
            <View style={styles.tab}>
              <Text style={styles.tabText}>Request</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Contact Info - Using SendAmountScreen design */}
      <View style={styles.recipientAvatarContainer}>
        <View style={styles.recipientAvatar}>
          <Avatar
            userId={selectedContact?.id?.toString() || ''}
            userName={selectedContact?.name}
            size={70}
            avatarUrl={selectedContact?.avatar}
            style={{ width: '100%', height: '100%', borderRadius: 999 }}
          />
        </View>
        <Text style={styles.recipientName}>
          {selectedContact?.name || formatWalletAddress(selectedContact?.wallet_address || '')}
        </Text>
        <Text style={styles.recipientEmail}>
          {selectedContact?.wallet_address
            ? formatWalletAddress(selectedContact.wallet_address)
            : selectedContact?.email || ''}
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
          {/* Amount Card - Using SendAmountScreen design */}
          <View style={styles.amountCardMockup}>
            <View style={styles.amountCardHeader}>
              <Text style={styles.amountCardLabel}>Enter amount</Text>
              <TextInput
                style={styles.amountCardInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                autoFocus={true}
                textAlign="center"
                selectionColor={colors.brandGreen}
                maxLength={12}
                returnKeyType="done"
                blurOnSubmit={true}
              />
              <Text style={styles.amountCardCurrency}>USDC</Text>
            </View>

            {/* Add Note Section */}
            {!showAddNote ? (
              <TouchableOpacity
                style={[styles.amountCardAddNoteRow, { justifyContent: 'center' }]}
                onPress={() => setShowAddNote(true)}
              >
                <Icon name="message-circle" size={16} color={colors.white50} />
                <Text style={styles.amountCardAddNoteText}>Add note</Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[styles.amountCardAddNoteRow, { justifyContent: 'center', position: 'relative' }]}
                onLayout={e => setMaxNoteInputWidth(e.nativeEvent.layout.width - 32)} // 32px padding (16 left + 16 right)
              >
                <Icon name="message-circle" size={16} color={colors.white50} />
                <TextInput
                  style={[
                    styles.amountCardAddNoteText,
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
        <View style={styles.amountCardContinueButtonWrapper}>
          <Button
            title={processing ? 'Processing...' : (activeAction === 'send' ? 'Send' : 'Request')}
            onPress={handleContinue}
            variant="primary"
            disabled={!isAmountValid || processing}
            loading={processing}
            fullWidth={true}
            style={{ width: '100%' }}
          />
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default ContactActionScreen; 
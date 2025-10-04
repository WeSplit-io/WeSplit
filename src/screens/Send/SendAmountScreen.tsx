import React, { useState, useEffect, useRef } from 'react';
import type { Text as RNText } from 'react-native';
import { View, Text, TouchableOpacity, TextInput, SafeAreaView, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from '../../components/Icon';
import { GroupMember } from '../../types';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { colors } from '../../theme';
import { styles } from './styles';

const SendAmountScreen: React.FC<any> = ({ navigation, route }) => {
  const { 
    destinationType, 
    contact, 
    wallet, 
    groupId, 
    prefilledAmount, 
    prefilledNote, 
    isSettlement 
  } = route.params || {};
  
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toString() : '');
  const [showAddNote, setShowAddNote] = useState(!!prefilledNote || isSettlement);
  const [note, setNote] = useState(prefilledNote || '');
  const [noteInputWidth, setNoteInputWidth] = useState(60);
  const [maxNoteInputWidth, setMaxNoteInputWidth] = useState(0);
  const [selectedChip, setSelectedChip] = useState<'25' | '50' | '100' | null>(null);
  const noteTextRef = useRef<RNText>(null);
  
  const { state } = useApp();
  const { currentUser } = state;
  const { appWalletBalance, appWalletConnected } = useWallet();

  // Debug logging to ensure data is passed correctly
  useEffect(() => {
    console.log('💰 SendAmount: Data received:', {
      destinationType,
      contact: contact ? {
        name: contact.name || 'No name',
        email: contact.email,
        wallet: contact.wallet_address ? `${contact.wallet_address.substring(0, 6)}...${contact.wallet_address.substring(contact.wallet_address.length - 6)}` : 'No wallet',
        fullWallet: contact.wallet_address,
        id: contact.id
      } : null,
      wallet: wallet ? {
        name: wallet.name,
        address: wallet.address,
        id: wallet.id
      } : null
    });
  }, [destinationType, contact, wallet]);

  useEffect(() => {
    // Mesure la largeur du texte (note ou placeholder)
    if (noteTextRef.current && typeof noteTextRef.current.measure === 'function') {
      noteTextRef.current.measure((x: number, y: number, w: number) => {
        setNoteInputWidth(Math.max(60, Math.min(w + 8, maxNoteInputWidth)));
      });
    }
  }, [note, maxNoteInputWidth]);

  const handleAmountChange = (value: string) => {
    // Allow empty string, numbers, and decimal separators (both . and ,)
    // First, convert commas to dots for consistency
    let cleaned = value.replace(/,/g, '.');
    
    // Then remove any other non-numeric characters except dots
    cleaned = cleaned.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) return;

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) return;

    // Allow empty string or valid number
    setAmount(cleaned);
    
    // Clear chip selection when user manually edits amount
    if (selectedChip) {
      setSelectedChip(null);
    }
  };

  const handleChipPress = (percentage: '25' | '50' | '100') => {
    if (appWalletBalance !== null) {
      const percentageValue = parseInt(percentage);
      const calculatedAmount = (appWalletBalance * percentageValue) / 100;
      setAmount(calculatedAmount.toFixed(2));
      setSelectedChip(percentage);
    }
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (destinationType === 'friend') {
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
        fromNotification: route.params?.fromNotification,
        notificationId: route.params?.notificationId,
      });
    } else if (destinationType === 'external') {
      if (!wallet) {
        Alert.alert('Error', 'Wallet information is missing');
        return;
      }
      
      // Calculate fees (3% withdrawal fee for external wallets)
      const withdrawalFee = numAmount * 0.03;
      const totalWithdraw = numAmount - withdrawalFee;
      
      navigation.navigate('WithdrawConfirmation', {
        amount: numAmount,
        withdrawalFee,
        totalWithdraw,
        walletAddress: wallet.address,
        description: note.trim(),
      });
    }
  };



  const formatWalletAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 8) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const getRecipientInfo = () => {
    if (destinationType === 'friend' && contact) {
      return {
        name: contact.name || formatWalletAddress(contact.wallet_address || ''),
        email: contact.wallet_address
          ? formatWalletAddress(contact.wallet_address)
          : contact.email || '',
        avatar: contact.avatar || contact.photoURL,
        walletAddress: contact.wallet_address
      };
    } else if (destinationType === 'external' && wallet) {
      return {
        name: wallet.name,
        email: formatWalletAddress(wallet.address),
        avatar: null,
        walletAddress: wallet.address
      };
    }
    return null;
  };

  const recipientInfo = getRecipientInfo();
  const isAmountValid = amount.length > 0 && parseFloat(amount) > 0;

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
        <Text style={styles.headerTitle}>Send</Text>
        <View style={styles.placeholder} />
      </View>




      {/* Recipient Info */}
      {recipientInfo && (
        <View style={styles.recipientAvatarContainer}>
          <View style={styles.recipientAvatar}>
            {recipientInfo.avatar ? (
              <Image
                source={{ uri: recipientInfo.avatar }}
                style={{ width: '100%', height: '100%', borderRadius: 999 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.recipientAvatarText, { fontSize: 18 }]}>
                {recipientInfo.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.recipientName}>
            {recipientInfo.name}
          </Text>
          <Text style={styles.recipientEmail}>
            {recipientInfo.email}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1,  paddingHorizontal: 0, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card for Amount and Note */}
          <View style={styles.amountCardMockup}>
            <View style={styles.amountCardHeader}>
              <Text style={styles.amountCardLabel}>Enter amount</Text>
              <TextInput
                style={styles.amountCardInput}
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                autoFocus={true}
                editable={!isSettlement}
                textAlign="center"
                selectionColor={colors.brandGreen}
                maxLength={12}
                returnKeyType="done"
                blurOnSubmit={true}
              />
              <Text style={styles.amountCardCurrency}>USDC</Text>
            </View>

            {/* Quick Amount Chips - Only for External Wallet */}
            {destinationType === 'external' && appWalletBalance !== null && (
              <View style={styles.quickAmountChips}>
                <TouchableOpacity 
                  style={[
                    styles.quickAmountChip,
                    selectedChip === '25' && styles.quickAmountChipSelected
                  ]}
                  onPress={() => handleChipPress('25')}
                >
                  <Text style={[
                    styles.quickAmountChipText,
                    selectedChip === '25' && styles.quickAmountChipTextSelected
                  ]}>25%</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.quickAmountChip,
                    selectedChip === '50' && styles.quickAmountChipSelected
                  ]}
                  onPress={() => handleChipPress('50')}
                >
                  <Text style={[
                    styles.quickAmountChipText,
                    selectedChip === '50' && styles.quickAmountChipTextSelected
                  ]}>50%</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.quickAmountChip,
                    selectedChip === '100' && styles.quickAmountChipSelected
                  ]}
                  onPress={() => handleChipPress('100')}
                >
                  <Text style={[
                    styles.quickAmountChipText,
                    selectedChip === '100' && styles.quickAmountChipTextSelected
                  ]}>100%</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Add Note Section */}
            {!showAddNote ? (
              !isSettlement && (
                <TouchableOpacity
                  style={[styles.amountCardAddNoteRow, { justifyContent: 'center' }]}
                  onPress={() => setShowAddNote(true)}
                >
                  <Icon name="message-circle" size={16} color={colors.white50} />
                  <Text style={styles.amountCardAddNoteText}>Add note</Text>
                </TouchableOpacity>
              )
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
          <TouchableOpacity
            style={[
              styles.mockupContinueButton,
              isAmountValid && styles.mockupContinueButtonActive,
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SendAmountScreen; 
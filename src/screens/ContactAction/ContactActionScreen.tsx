import React, { useState, useEffect, useRef } from 'react';
import type { Text as RNText } from 'react-native';
import { View, Text, TouchableOpacity, SafeAreaView, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from '../../components/Icon';
import { UserContact } from '../../types';
import { colors } from '../../theme';
import { styles } from './styles';

interface ContactActionScreenProps {
  navigation: any;
  route: any;
}

const ContactActionScreen: React.FC<ContactActionScreenProps> = ({ navigation, route }) => {
  const { selectedContact } = route.params || {};
  const [activeAction, setActiveAction] = useState<'send' | 'request'>('send');
  const [amount, setAmount] = useState('0');
  const [showAddNote, setShowAddNote] = useState(false);
  const [note, setNote] = useState('');
  const [noteInputWidth, setNoteInputWidth] = useState(60);
  const [maxNoteInputWidth, setMaxNoteInputWidth] = useState(0);
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
    if (parts.length > 2) return;

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) return;

    setAmount(cleaned || '0');
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      // Show error or handle invalid amount
      return;
    }

    if (activeAction === 'send') {
      navigation.navigate('SendAmount', {
        contact: selectedContact,
        prefilledAmount: numAmount,
      });
    } else {
      navigation.navigate('RequestAmount', {
        contact: selectedContact,
        prefilledAmount: numAmount,
      });
    }
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
        <Text style={styles.headerTitle}>Select Action</Text>
      </View>

      {/* Action Toggle - Using NotificationsScreen design */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeAction === 'send' && styles.activeTab]}
          onPress={() => handleActionToggle('send')}
        >
          <Text style={[styles.tabText, activeAction === 'send' && styles.activeTabText]}>
            Send
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeAction === 'request' && styles.activeTab]}
          onPress={() => handleActionToggle('request')}
        >
          <Text style={[styles.tabText, activeAction === 'request' && styles.activeTabText]}>
            Request
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contact Info - Using SendAmountScreen design */}
      <View style={styles.recipientAvatarContainer}>
        <View style={styles.recipientAvatar}>
          {selectedContact?.avatar || selectedContact?.photoURL ? (
            <Image
              source={{ uri: selectedContact.avatar || selectedContact.photoURL }}
              style={{ width: '100%', height: '100%', borderRadius: 999 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.recipientAvatarText}>
              {selectedContact?.name ? selectedContact.name.charAt(0).toUpperCase() : formatWalletAddress(selectedContact?.wallet_address || '').charAt(0).toUpperCase()}
            </Text>
          )}
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

export default ContactActionScreen; 
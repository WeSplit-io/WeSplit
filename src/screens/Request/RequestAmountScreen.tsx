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

  const handleNumberPress = (num: string) => {
    if (amount === '0') {
      setAmount(num);
    } else {
      setAmount(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    if (amount.length === 1) {
      setAmount('0');
    } else {
      setAmount(prev => prev.slice(0, -1));
    }
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

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace']
    ];

    return (
      <View style={styles.mockupRequestNumberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.mockupRequestNumberPadRow}>
            {row.map((item, itemIndex) => {
              if (item === '') {
                return <View key={itemIndex} style={styles.mockupRequestNumberPadButton} />;
              }
              
              if (item === 'backspace') {
                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.mockupRequestNumberPadButton}
                    onPress={handleBackspace}
                  >
                    <Icon name="delete" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.mockupRequestNumberPadButton}
                  onPress={() => handleNumberPress(item)}
                >
                  <Text style={styles.mockupRequestNumberPadText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
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
          <Text style={styles.mockupRequestAmountDisplay}>{amount} USDC</Text>
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

        {/* Number Pad */}
        {renderNumberPad()}

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
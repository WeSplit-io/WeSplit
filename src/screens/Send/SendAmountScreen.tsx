import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView, TextInput } from 'react-native';
import Icon from '../../components/Icon';
import { GroupMember } from '../../services/groupService';
import { colors } from '../../theme';
import { styles } from './styles';

const SendAmountScreen: React.FC<any> = ({ navigation, route }) => {
  const { contact, groupId, prefilledAmount, prefilledNote, isSettlement } = route.params || {};
  const [amount, setAmount] = useState(prefilledAmount ? prefilledAmount.toString() : '0');
  const [showAddNote, setShowAddNote] = useState(!!prefilledNote || isSettlement);
  const [note, setNote] = useState(prefilledNote || '');

  const handleNumberPress = (num: string) => {
    if (amount === '0') {
      setAmount(num);
    } else {
      setAmount((prev: string) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (amount.length === 1) {
      setAmount('0');
    } else {
      setAmount((prev: string) => prev.slice(0, -1));
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

    navigation.navigate('SendConfirmation', {
      contact,
      amount: numAmount,
      description: note.trim(),
      groupId,
      isSettlement,
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
      <View style={[styles.numberPad, { flex: 0 }]}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberPadRow}>
            {row.map((item, itemIndex) => {
              if (item === '') {
                return <View key={itemIndex} style={[styles.numberPadButton, { width: 60, height: 60 }]} />;
              }
              
              if (item === 'backspace') {
                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[styles.numberPadButton, { width: 60, height: 60 }]}
                    onPress={handleBackspace}
                  >
                    <Icon name="delete" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.numberPadButton, { width: 60, height: 60 }]}
                  onPress={() => handleNumberPress(item)}
                >
                  <Text style={[styles.numberPadText, { fontSize: 18 }]}>{item}</Text>
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
              {contact?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.recipientName, { fontSize: 16 }]}>{contact?.name || 'Unknown'}</Text>
          <Text style={[styles.recipientEmail, { fontSize: 14 }]}>{contact?.wallet_address || ''}</Text>
        </View>

        {/* Amount Display */}
        <View style={[styles.amountDisplayContainer, { marginBottom: 30, alignItems: 'center' }]}>
          <Text style={[styles.enterAmountLabel, { fontSize: 16, marginBottom: 8, color: colors.textSecondary }]}>
            {isSettlement ? 'Settlement Amount' : 'Enter amount'}
          </Text>
          <Text style={{
            color: colors.textLight,
            fontSize: 48,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 4,
          }}>{amount} USDC</Text>
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

        {/* Number Pad - only show for non-settlement payments */}
        {!isSettlement && renderNumberPad()}

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
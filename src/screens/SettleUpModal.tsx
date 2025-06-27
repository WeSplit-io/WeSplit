import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';

const dummyPayer = { name: 'Bentlee Barrera', avatar: 'https://randomuser.me/api/portraits/women/23.jpg' };
const dummyPayee = { name: 'You', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' };

const SettleUpModal: React.FC = () => {
  const [amount, setAmount] = useState('500.00');
  return (
    <View style={styles.modal}>
      <Text style={styles.title}>Settle Up Amount</Text>
      <View style={styles.row}>
        <Image source={{ uri: dummyPayer.avatar }} style={styles.avatar} />
        <Text style={styles.paidText}>{dummyPayer.name} Paid you</Text>
        <Image source={{ uri: dummyPayee.avatar }} style={styles.avatar} />
      </View>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
      />
      <TouchableOpacity style={styles.doneBtn}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold as any,
    marginBottom: spacing.lg,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightGray,
    marginHorizontal: spacing.md,
  },
  paidText: {
    fontSize: fontSizes.md,
    color: colors.gray,
    fontWeight: fontWeights.medium as any,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.input,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    width: 120,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    width: 120,
  },
  doneBtnText: {
    color: colors.background,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold as any,
  },
});

export default SettleUpModal; 
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { DEFAULT_AVATAR_URL } from '../config/constants';

interface ExpenseItemProps {
  payer: string;
  payerAvatar: string;
  description: string;
  date: string;
  amount: string;
  youLent?: boolean;
  youOwe?: boolean;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({
  payer,
  payerAvatar,
  description,
  date,
  amount,
  youLent = false,
  youOwe = false,
}) => (
  <View style={styles.container}>
    <Image source={{ uri: payerAvatar || DEFAULT_AVATAR_URL }} style={styles.avatar} />
    <View style={styles.info}>
      <Text style={styles.desc}>{payer} paid {amount}</Text>
      <Text style={styles.sub}>{description} • {date}</Text>
    </View>
    {youLent && <Text style={styles.lent}>you lent</Text>}
    {youOwe && <Text style={styles.owe}>you owe</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.md,
    backgroundColor: colors.lightGray,
  },
  info: {
    flex: 1,
  },
  desc: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  sub: {
    fontSize: typography.fontSize.xs,
    color: colors.gray,
    marginTop: 2,
  },
  lent: {
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.md,
  },
  owe: {
    color: colors.red,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    marginLeft: spacing.md,
  },
});

export default ExpenseItem; 
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, fontSizes, fontWeights, spacing, radii } from '../lib/theme';
import Icon from './Icon';

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
    <Image source={{ uri: payerAvatar }} style={styles.avatar} />
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
    borderRadius: radii.card,
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
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.medium as any,
  },
  sub: {
    fontSize: fontSizes.xs,
    color: colors.gray,
    marginTop: 2,
  },
  lent: {
    color: colors.green,
    fontWeight: fontWeights.semibold as any,
    fontSize: fontSizes.sm,
    marginLeft: spacing.md,
  },
  owe: {
    color: colors.red,
    fontWeight: fontWeights.semibold as any,
    fontSize: fontSizes.sm,
    marginLeft: spacing.md,
  },
});

export default ExpenseItem; 
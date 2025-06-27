import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '../lib/theme';

const screens = [
  { name: 'Dashboard', route: 'Dashboard' },
  { name: 'Add Expense', route: 'AddExpense' },
  { name: 'Create Group', route: 'CreateGroup' },
  { name: 'Add Members', route: 'AddMembers' },
  { name: 'Group Details', route: 'GroupDetails' },
  { name: 'Balance', route: 'Balance' },
  { name: 'Settle Up Modal', route: 'SettleUpModal' },
  { name: 'Group Settings', route: 'GroupSettings' },
  { name: 'Profile', route: 'Profile' },
];

const ScreensMenu = ({ navigation }: any) => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Screens Menu</Text>
    {screens.map((screen) => (
      <TouchableOpacity
        key={screen.route}
        style={styles.button}
        onPress={() => navigation.navigate(screen.route)}
      >
        <Text style={styles.buttonText}>{screen.name}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold as any,
    marginBottom: spacing.xl,
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold as any,
  },
});

export default ScreensMenu; 
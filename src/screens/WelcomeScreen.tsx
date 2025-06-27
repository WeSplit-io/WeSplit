import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSizes, fontWeights, spacing } from '../lib/theme';

const WelcomeScreen: React.FC<any> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to WeSplit</Text>
      <Text style={styles.subtitle}>Please authenticate to continue</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.gray,
    textAlign: 'center',
  },
});

export default WelcomeScreen; 
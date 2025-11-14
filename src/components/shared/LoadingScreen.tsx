/**
 * LoadingScreen Component
 * Standardized loading state component used across all screens
 * Eliminates duplication of loading UI patterns
 */

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface LoadingScreenProps {
  message?: string;
  showSpinner?: boolean;
  style?: StyleProp<ViewStyle>;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  showSpinner = true,
  style,
}) => {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <View style={styles.content}>
        {showSpinner && (
          <ActivityIndicator 
            size="large" 
            color={colors.green} 
            style={styles.spinner}
          />
        )}
        <Text style={styles.message}>{message}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  spinner: {
    marginBottom: spacing.md,
  },
  message: {
    ...typography.textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingScreen;

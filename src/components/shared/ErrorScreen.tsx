/**
 * ErrorScreen Component
 * Standardized error state component used across all screens
 * Eliminates duplication of error UI patterns
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../Icon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
  style?: any;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  showIcon = true,
  style,
}) => {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <View style={styles.content}>
        {showIcon && (
          <Icon 
            name="x-circle" 
            size={64} 
            color={colors.error} 
            style={styles.icon}
          />
        )}
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        
        {onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
          >
            <Text style={styles.retryButtonText}>{retryText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.white,
    textAlign: 'center',
  },
});

export default ErrorScreen;

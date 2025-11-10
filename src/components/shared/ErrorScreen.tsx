/**
 * ErrorScreen Component
 * Standardized error state component used across all screens
 * Eliminates duplication of error UI patterns
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhosphorIcon from './PhosphorIcon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import Button from './Button';

interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
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
          <PhosphorIcon 
            name="XCircle" 
            size={64} 
            color={colors.error} 
            weight="fill"
            style={styles.icon}
          />
        )}
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        
        {onRetry && (
          <Button
            title={retryText}
            onPress={onRetry}
            variant="primary"
            size="medium"
          />
        )}
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
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.fontSize.md,
    fontWeight: '400',
    color: colors.white70,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
});

export default ErrorScreen;

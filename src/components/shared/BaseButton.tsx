/**
 * BaseButton Component
 * Standardized button component with consistent styling and behavior
 * Eliminates duplication of button implementations across components
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from '../Icon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface BaseButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  iconPosition?: 'left' | 'right';
}

const BaseButton: React.FC<BaseButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      ...getSizeStyle(),
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.gray : colors.green,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.lightGray : colors.blue,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: disabled ? colors.gray : colors.green,
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.gray : colors.error,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...typography.button,
      textAlign: 'center',
    };

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return {
          ...baseStyle,
          color: disabled ? colors.textSecondary : colors.white,
        };
      case 'outline':
        return {
          ...baseStyle,
          color: disabled ? colors.textSecondary : colors.green,
        };
      default:
        return baseStyle;
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        };
      case 'large':
        return {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
        };
      default: // medium
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        };
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.7}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? colors.green : colors.white}
          style={styles.loader}
        />
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <Icon name={icon} size={16} color={getTextStyle().color} style={styles.iconLeft} />
      )}
      
      <Text style={[getTextStyle(), textStyle]}>
        {loading ? 'Loading...' : title}
      </Text>
      
      {icon && iconPosition === 'right' && !loading && (
        <Icon name={icon} size={16} color={getTextStyle().color} style={styles.iconRight} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  loader: {
    marginRight: spacing.sm,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});

export default BaseButton;

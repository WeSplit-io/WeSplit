/**
 * Button Component
 * Enhanced button component with LinearGradient for primary variant
 * Supports primary/secondary variants with disabled states
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
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
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
          backgroundColor: disabled ? colors.blackWhite5 : 'transparent', // LinearGradient will handle the background
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.blackWhite5 : colors.greenBlue,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...typography.textStyles.button,
      textAlign: 'center',
      color: colors.white,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          color: disabled ? colors.textSecondary : colors.white,
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: disabled ? colors.textSecondary : colors.white,
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

  const renderButtonContent = () => (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={colors.white}
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
    </>
  );

  // Primary variant with LinearGradient
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        {disabled ? (
          renderButtonContent()
        ) : (
          <LinearGradient
            colors={[colors.green, colors.greenBlue || colors.green]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {renderButtonContent()}
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  }

  // Secondary variant (regular TouchableOpacity)
  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.7}
    >
      {renderButtonContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    width: '100%',
    height: '100%',
  },
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

export default Button;

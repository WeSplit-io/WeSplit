/**
 * Button Component
 * Enhanced button component with LinearGradient for primary variant
 * Supports primary/secondary variants with disabled states
 */

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  Animated,
  StyleProp,
} from 'react-native';
import PhosphorIcon, { PhosphorIconName } from './PhosphorIcon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: PhosphorIconName;
  iconPosition?: 'left' | 'right';
  gradientColors?: string[]; // Custom gradient colors for primary variant
  children?: React.ReactNode; // Allow custom content
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
  gradientColors,
  children,
}) => {
  // Animation values
  const opacityAnim = useRef(new Animated.Value(disabled ? 0.5 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate when disabled state changes
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: disabled ? 0.5 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [disabled, opacityAnim]);

  // Handle press animations
  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }
  };
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: spacing.md,
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.white10 : 'transparent', // LinearGradient will handle the background
          // No padding here - LinearGradient will handle it
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? colors.blackWhite5 : colors.white10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          ...getSizeStyle(),
        };
      default:
        return {
          ...baseStyle,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          ...getSizeStyle(),
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const buttonStyle = typography.textStyles.button;
    
    // Convert typography styles to React Native TextStyle format
    // lineHeight multiplier needs to be converted to absolute value
    const baseStyle: TextStyle = {
      fontFamily: buttonStyle.fontFamily,
      fontSize: buttonStyle.fontSize,
      fontStyle: buttonStyle.fontStyle as 'normal' | 'italic' | undefined,
      fontWeight: buttonStyle.fontWeight as TextStyle['fontWeight'],
      lineHeight: buttonStyle.lineHeight * buttonStyle.fontSize, // Convert multiplier to absolute value
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          color: disabled ? colors.white70 : colors.black,
        };
      case 'secondary':
        return {
          ...baseStyle,
          color: disabled ? colors.white70 : colors.white,
        };
      default:
        return {
          ...baseStyle,
          color: disabled ? colors.white70 : colors.white,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        };
      case 'large':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
        };
      default: // medium
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        };
    }
  };

  const isDisabled = disabled || loading;

  const renderButtonContent = () => {
    // If children are provided, render them instead of title
    if (children) {
      return children;
    }

    return (
      <>
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.white}
            style={styles.loader}
          />
        )}
        
        {icon && iconPosition === 'left' && !loading && (
          <PhosphorIcon name={icon} size={title ? 16 : 24} color={getTextStyle().color as string} style={styles.iconLeft} />
        )}
        
        {title && (
          <Text 
            style={[getTextStyle(), textStyle]}
            allowFontScaling={false}
          >
            {loading ? 'Loading...' : title}
          </Text>
        )}
        
        {icon && iconPosition === 'right' && !loading && (
          <PhosphorIcon name={icon} size={title ? 16 : 24} color={getTextStyle().color as string} style={styles.iconRight} />
        )}
      </>
    );
  };

  // Primary variant with LinearGradient
  if (variant === 'primary') {
    return (
      <Animated.View
        style={[
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        <TouchableOpacity
          style={[getButtonStyle()]}
          onPress={onPress}
          disabled={isDisabled}
          activeOpacity={isDisabled ? 1 : 0.7}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled: isDisabled }}
          accessibilityHint={loading ? "Loading" : undefined}
        >
          {disabled ? (
            <View style={[styles.gradient, { backgroundColor: colors.white10 }, getSizeStyle()]}>
              {renderButtonContent()}
            </View>
          ) : (
            <LinearGradient
              colors={gradientColors || [colors.green, colors.greenBlue || colors.green]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradient, getSizeStyle()]}
            >
              {renderButtonContent()}
            </LinearGradient>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Secondary variant (regular TouchableOpacity)
  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[getButtonStyle()]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {renderButtonContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.md,
    // Padding will be set by getSizeStyle() based on size prop
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

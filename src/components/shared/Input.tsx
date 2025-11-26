/**
 * Input Component
 * Enhanced input component with label, placeholder, icons, and error/focus states
 * Supports left/right icons with customizable styling
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import PhosphorIcon, { PhosphorIconName } from './PhosphorIcon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  error?: string;
  leftIcon?: PhosphorIconName;
  rightIcon?: PhosphorIconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  disabled?: boolean;
  required?: boolean;
  variant?: 'default' | 'filled';
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  disabled = false,
  required: _required = false,
  variant = 'default',
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = (event: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setIsFocused(true);
    textInputProps.onFocus?.(event);
  };

  const handleBlur = (event: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    textInputProps.onBlur?.(event);
  };

  const handlePressOutside = () => {
    if (inputRef.current && isFocused) {
      inputRef.current.blur();
    }
  };

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginBottom: spacing.md,
    };

    if (variant === 'filled') {
      baseStyle.backgroundColor = colors.white5;
      baseStyle.borderRadius = spacing.md;
      baseStyle.paddingHorizontal = spacing.md;
      baseStyle.paddingVertical = spacing.sm;
    }

    return baseStyle;
  };

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: variant === 'default' ? 1 : 0,
      borderColor: error 
        ? colors.red 
        : isFocused 
          ? colors.white50 
          : colors.white10,
      borderRadius: spacing.md,
      backgroundColor: variant === 'default' ? colors.white5 : 'transparent',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
      minHeight: 48,
      marginBottom: spacing.sm,
    };

    if (disabled) {
      baseStyle.opacity = 0.5;
      baseStyle.backgroundColor = colors.white5;
    }

    return baseStyle;
  };

  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.regular,
      color: colors.white,
      paddingVertical: 0,
      marginHorizontal: spacing.sm,
      
    };
  };

  const getLabelStyle = (): TextStyle => {
    return {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.regular,
      color: colors.white80,
      marginBottom: spacing.md,
    };
  };

  const getErrorStyle = (): TextStyle => {
    return {
      fontSize: typography.fontSize.caption,
      fontWeight: typography.fontWeight.regular,
      color: colors.red,
      marginTop: spacing.xs,
    };
  };

  return (
    <TouchableWithoutFeedback onPress={handlePressOutside}>
      <View style={[getContainerStyle(), containerStyle]}>
        {/* Label */}
        {label && (
          <Text style={[getLabelStyle(), labelStyle]}>
            {label}
          </Text>
        )}

        {/* Input Container */}
        <View style={getInputContainerStyle()}>
          {/* Left Icon */}
          {leftIcon && (
            <PhosphorIcon
              name={leftIcon}
              size={20}
              color={error ? colors.red : isFocused ? colors.white80 : colors.white50}
              style={{ marginRight: spacing.sm }}
            />
          )}

          {/* Text Input */}
          <TextInput
            ref={inputRef}
            style={[getInputStyle(), inputStyle]}
            placeholder={placeholder}
            placeholderTextColor={colors.white50}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            {...textInputProps}
          />

          {/* Right Icon */}
          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={{ marginLeft: spacing.sm }}
              disabled={!onRightIconPress}
            >
              <PhosphorIcon
                name={rightIcon}
                size={20}
                color={error ? colors.red : isFocused ? colors.white80 : colors.white50}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <Text style={[getErrorStyle(), errorStyle]}>
            {error}
          </Text>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Input;

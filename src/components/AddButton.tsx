import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';
import Icon from './Icon';

interface AddButtonProps {
  onPress?: () => void;
  style?: ViewStyle;
}

const AddButton: React.FC<AddButtonProps> = ({ onPress, style }) => (
  <TouchableOpacity style={[styles.button, style]} onPress={onPress} activeOpacity={0.85}>
    <Icon name="plus" size={28} color={colors.background} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryGreen,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl + 16,
    zIndex: 20,
  },
});

export default AddButton; 
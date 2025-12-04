/**
 * Color Picker Component
 * Allows users to select a color for their shared wallet
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ColorPickerProps {
  selectedColor?: string;
  onSelectColor: (color: string) => void;
}

// Predefined color palette - reduced selection of vibrant colors
const COLOR_PALETTE = [
  { name: 'Purple', value: '#9668FE' },
  { name: 'Green', value: '#01B84E' },
  { name: 'Orange', value: '#FF7302' },
  { name: 'Blue', value: '#219EFB' },
  { name: 'Red', value: '#DC3434' },
  { name: 'Pink', value: '#F5A623' },
  { name: 'Grey', value: '#7E7E7E' },
  { name: 'Yellow', value: '#CDB800' },
];

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelectColor,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.colorGrid}>
        {COLOR_PALETTE.map((color) => {
          const isSelected = selectedColor === color.value;
          return (
            <TouchableOpacity
              key={color.value}
              style={[
                styles.colorWrapper,
                isSelected && styles.colorOptionSelected,
              ]}
              onPress={() => onSelectColor(color.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                ]}
              />
              <Text style={styles.colorName} numberOfLines={1}>
                {color.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  colorWrapper: {
    alignItems: 'center',
    width: '23%',
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  colorOptionSelected: {
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.green,
  },
  colorName: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },

});

export default ColorPicker;


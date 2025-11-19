/**
 * Color Picker Component
 * Allows users to select a color for their shared wallet
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PhosphorIcon } from '../shared';

interface ColorPickerProps {
  selectedColor?: string;
  onSelectColor: (color: string) => void;
}

// Predefined color palette - vibrant and cohesive colors
const COLOR_PALETTE = [
  { name: 'Green', value: '#A5EA15' },
  { name: 'Teal', value: '#53EF97' },
  { name: 'Blue', value: '#4A90E2' },
  { name: 'Purple', value: '#BD10E0' },
  { name: 'Pink', value: '#FF6B9D' },
  { name: 'Orange', value: '#F5A623' },
  { name: 'Yellow', value: '#F8E71C' },
  { name: 'Red', value: '#D0021B' },
  { name: 'Cyan', value: '#50E3C2' },
  { name: 'Lime', value: '#B8E986' },
  { name: 'Indigo', value: '#9013FE' },
  { name: 'Emerald', value: '#7ED321' },
];

const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelectColor,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Color</Text>
      <View style={styles.colorGrid}>
        {COLOR_PALETTE.map((color) => {
          const isSelected = selectedColor === color.value;
          return (
            <TouchableOpacity
              key={color.value}
              style={styles.colorWrapper}
              onPress={() => onSelectColor(color.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  isSelected && styles.colorOptionSelected,
                ]}
              >
                {isSelected && (
                  <View style={styles.selectedOverlay}>
                    <PhosphorIcon
                      name="Check"
                      size={20}
                      color={colors.black}
                      weight="bold"
                    />
                  </View>
                )}
              </View>
              <Text style={styles.colorName} numberOfLines={1}>
                {color.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedColor && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <View style={[styles.previewBox, { backgroundColor: selectedColor }]} />
          <Text style={styles.previewValue}>{selectedColor}</Text>
        </View>
      )}
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
    color: colors.white70,
    marginBottom: spacing.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorWrapper: {
    alignItems: 'center',
    width: '23%',
    marginBottom: spacing.sm,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  colorOptionSelected: {
    borderColor: colors.white,
    borderWidth: 3,
  },
  selectedOverlay: {
    width: '100%',
    height: '100%',
    borderRadius: spacing.md - 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorName: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    textAlign: 'center',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
  },
  previewLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  previewBox: {
    width: 30,
    height: 30,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  previewValue: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    fontFamily: 'monospace',
  },
});

export default ColorPicker;


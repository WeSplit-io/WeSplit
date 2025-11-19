/**
 * Logo Picker Component
 * Allows users to select a logo/emoji for their shared wallet
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface LogoPickerProps {
  selectedLogo?: string;
  onSelectLogo: (logo: string) => void;
}

// Predefined logo bank - emojis commonly used for wallets/groups
const LOGO_BANK = [
  // Money & Finance
  '💰', '💵', '💸', '💳', '💎', '🏦', '💼',
  // Groups & Teams
  '👥', '🤝', '👫', '👬', '👭', '👨‍👩‍👧‍👦', '👪',
  // Activities
  '🍕', '🍔', '🍟', '🍰', '☕', '🍺', '🍷',
  '✈️', '🚗', '🏠', '🎉', '🎊', '🎈', '🎁',
  // Symbols
  '⭐', '🌟', '✨', '🔥', '💫', '⚡', '🎯',
  // Objects
  '🎨', '🎭', '🎪', '🎬', '📱', '💻', '⌚',
  // Nature
  '🌍', '🌎', '🌏', '🌊', '⛰️', '🏔️', '🌲',
  // Food
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓',
  // Sports
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉',
];

const LogoPicker: React.FC<LogoPickerProps> = ({
  selectedLogo,
  onSelectLogo,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Logo</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {LOGO_BANK.map((logo, index) => {
          const isSelected = selectedLogo === logo;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.logoOption,
                isSelected && styles.logoOptionSelected,
              ]}
              onPress={() => onSelectLogo(logo)}
              activeOpacity={0.7}
            >
              <Text style={styles.logoEmoji}>{logo}</Text>
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {selectedLogo && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewEmoji}>{selectedLogo}</Text>
          </View>
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
  scrollContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  logoOption: {
    width: 60,
    height: 60,
    borderRadius: spacing.md,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  logoOptionSelected: {
    backgroundColor: colors.greenBlue20,
    borderColor: colors.green,
  },
  logoEmoji: {
    fontSize: 32,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: colors.black,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
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
    width: 40,
    height: 40,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewEmoji: {
    fontSize: 24,
  },
});

export default LogoPicker;


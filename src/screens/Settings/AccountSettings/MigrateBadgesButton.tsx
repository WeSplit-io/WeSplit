/**
 * Migrate Badges Button Component
 * Allows authenticated users to migrate badges to Firestore
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors, spacing } from '../../../theme';
import { typography } from '../../../theme/typography';
import { migrateBadgesToFirestore } from '../../../services/rewards/badgeMigrationService';
import { logger } from '../../../services/analytics/loggingService';
import PhosphorIcon from '../../../components/shared/PhosphorIcon';

export const MigrateBadgesButton: React.FC = () => {
  const [migrating, setMigrating] = useState(false);

  const handleMigrate = async () => {
    Alert.alert(
      'Migrate Badges',
      'This will add event/community badges to Firestore. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          onPress: async () => {
            setMigrating(true);
            try {
              const result = await migrateBadgesToFirestore(false); // Don't overwrite existing
              
              Alert.alert(
                'Migration Complete',
                `Successfully migrated: ${result.success}\n` +
                `Skipped (already exists): ${result.skipped}\n` +
                `Errors: ${result.errors.length}`,
                [{ text: 'OK' }]
              );
              
              logger.info('Badge migration completed from UI', {
                success: result.success,
                skipped: result.skipped,
                errors: result.errors.length
              }, 'AccountSettingsScreen');
            } catch (error) {
              logger.error('Badge migration failed', { error }, 'AccountSettingsScreen');
              Alert.alert(
                'Migration Failed',
                error instanceof Error ? error.message : 'Unknown error',
                [{ text: 'OK' }]
              );
            } finally {
              setMigrating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.button, migrating && styles.buttonDisabled]}
      onPress={handleMigrate}
      disabled={migrating}
      activeOpacity={0.7}
    >
      <PhosphorIcon 
        name={migrating ? "Spinner" : "CloudArrowUp"} 
        size={20} 
        color={colors.white} 
        weight="bold"
      />
      <Text style={styles.buttonText}>
        {migrating ? 'Migrating Badges...' : 'Migrate Badges to Firestore'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.md,
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});

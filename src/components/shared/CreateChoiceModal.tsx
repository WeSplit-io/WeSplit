/**
 * Create Choice Modal
 * Modal that appears when user clicks the center button in NavBar
 * Allows user to choose between creating a Split or Shared Wallet
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from './Modal';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PhosphorIcon from './PhosphorIcon';

interface CreateChoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateSplit: () => void;
  onCreateSharedWallet: () => void;
}

const CreateChoiceModal: React.FC<CreateChoiceModalProps> = ({
  visible,
  onClose,
  onCreateSplit,
  onCreateSharedWallet,
}) => {
  const handleCreateSplit = () => {
    onClose();
    onCreateSplit();
  };

  const handleCreateSharedWallet = () => {
    onClose();
    onCreateSharedWallet();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showHandle={true}
      title="Create New"
      description="Choose what you want to create"
    >
      <View style={styles.container}>
        {/* Create Split Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleCreateSplit}
          activeOpacity={0.7}
        >
          <View style={styles.optionIconContainer}>
            <PhosphorIcon
              name="Receipt"
              size={32}
              color={colors.green}
              weight="fill"
            />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Create Split</Text>
            <Text style={styles.optionDescription}>
              Split a bill with friends
            </Text>
          </View>
          <PhosphorIcon
            name="CaretRight"
            size={20}
            color={colors.white70}
            weight="regular"
          />
        </TouchableOpacity>

        {/* Create Shared Wallet Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleCreateSharedWallet}
          activeOpacity={0.7}
        >
          <View style={styles.optionIconContainer}>
            <PhosphorIcon
              name="Wallet"
              size={32}
              color={colors.greenBlue}
              weight="fill"
            />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Create Shared Wallet</Text>
            <Text style={styles.optionDescription}>
              Shared account for ongoing expenses
            </Text>
          </View>
          <PhosphorIcon
            name="CaretRight"
            size={20}
            color={colors.white70}
            weight="regular"
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: spacing.md,
    backgroundColor: colors.white5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  optionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
});

export default CreateChoiceModal;


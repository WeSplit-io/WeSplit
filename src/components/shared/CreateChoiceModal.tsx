/**
 * Create Choice Modal
 * Modal that appears when user clicks the center button in NavBar
 * Allows user to choose between creating a Split or Shared Wallet
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_MAX_HEIGHT = Math.min(SCREEN_HEIGHT * 0.45, 520);

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

  // Shared wallet is now enabled in production
  const isSharedWalletEnabled = true;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showHandle={true}
      title="Create New"
      description="Choose what you want to create"
      maxHeight={MODAL_MAX_HEIGHT}
    >
      <View style={styles.optionsContainer}>
        {/* Create Split Option */}
        <TouchableOpacity
          style={styles.option}
          onPress={handleCreateSplit}
          activeOpacity={0.7}
        >
          <View style={styles.optionIconContainer}>
            <PhosphorIcon
              name="Receipt"
              size={50}
              color={colors.white70}
              weight="fill"
            />
          </View>
          <Text style={styles.optionTitle}>Simple Split</Text>
          <Text style={styles.optionDescription}>
            Split a bill with friends
          </Text>
        </TouchableOpacity>

        {/* Create Shared Wallet Option - Enabled in dev, disabled in production */}
        {isSharedWalletEnabled ? (
          <TouchableOpacity
            style={styles.option}
            onPress={handleCreateSharedWallet}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconContainer}>
              <PhosphorIcon
                name="Wallet"
                size={50}
                color={colors.white70}
                weight="fill"
              />
            </View>
            <Text style={styles.optionTitle}>Shared Wallet</Text>
            <Text style={styles.optionDescription}>
              Shared wallet for group expenses
            </Text>
          </TouchableOpacity>
        ) : (
        <TouchableOpacity
          style={[styles.option, styles.optionDisabled]}
          onPress={() => Alert.alert('Coming Soon', 'Shared wallet creation is currently unavailable. This feature will be available in a future update.')}
          activeOpacity={0.7}
          disabled={true}
        >
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
          <View style={styles.optionIconContainer}>
            <PhosphorIcon
              name="Wallet"
              size={50}
              color={colors.white50}
              weight="fill"
            />
          </View>
          <Text style={[styles.optionTitle, styles.optionTitleDisabled]}>Shared Wallet</Text>
          <Text style={styles.optionDescription}>
            Shared wallet for group expenses
          </Text>
        </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  option: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 200,
    justifyContent: 'center',
    minWidth: 140,
    position: 'relative',
  },
  optionDisabled: {
    opacity: 0.8,
    backgroundColor: colors.white5,
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  optionDescription: {
    color: colors.white80,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
  },
  optionTitleDisabled: {
    color: colors.white50,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: colors.green,
  },
  comingSoonText: {
    color: colors.black,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
});

export default CreateChoiceModal;


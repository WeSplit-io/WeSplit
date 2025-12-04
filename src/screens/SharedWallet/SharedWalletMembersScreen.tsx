/**
 * Shared Wallet Members Screen
 * Second step in shared wallet creation - direct contact selection
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, PhosphorIcon } from '../../components/shared';
import Modal from '../../components/shared/Modal';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { logger, LogData } from '../../services/analytics/loggingService';
import { SharedWalletService } from '../../services/sharedWallet';
import ContactsList from '../../components/ContactsList';
import type { UserContact } from '../../types';

const SharedWalletMembersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { state } = useApp();
  const { currentUser } = state;
  const { appWalletAddress, ensureAppWallet } = useWallet();

  const { walletName } = route.params || {};

  // Use app wallet address or fall back to currentUser's wallet_address
  const walletAddress = appWalletAddress || currentUser?.wallet_address || '';

  const [selectedMembers, setSelectedMembers] = useState<UserContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Ensure app wallet is initialized
  useEffect(() => {
    if (currentUser?.id && !appWalletAddress) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletAddress, ensureAppWallet]);

  const [visible, setVisible] = useState(true);

  const closeSheet = useCallback(() => {
    setVisible(false);
    navigation.goBack();
  }, [navigation]);

  const handleBackToName = useCallback(() => {
    navigation.replace('SharedWalletName', {
      walletName,
    });
  }, [navigation, walletName]);

  const handleContactSelect = useCallback((contact: UserContact) => {
    // Don't allow selecting the creator
    if (contact.id === currentUser?.id?.toString()) {
      return;
    }

    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === contact.id);
      if (isSelected) {
        // Remove if already selected
        return prev.filter(m => m.id !== contact.id);
      } else {
        // Add if not selected
        return [...prev, contact];
      }
    });
  }, [currentUser?.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = useCallback(async () => {
    if (!currentUser || !walletAddress || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      logger.info('Proceeding to wallet creation', {
        name: walletName,
        selectedMembersCount: selectedMembers.length,
        totalMembers: selectedMembers.length + 1
      }, 'SharedWalletMembersScreen');

      // Build initialMembers array - service will ensure creator is included
      const initialMembers = [
        {
          userId: currentUser.id.toString(),
          name: currentUser.name || 'You',
          walletAddress: walletAddress,
          role: 'creator' as const,
        },
        ...selectedMembers.map(member => ({
          userId: member.id.toString(),
          name: member.name,
          walletAddress: member.wallet_address || '',
          role: 'member' as const,
        }))
      ];

      const result = await SharedWalletService.createSharedWallet({
        name: walletName,
        creatorId: currentUser.id.toString(),
        creatorName: currentUser.name || 'Unknown',
        creatorWalletAddress: walletAddress,
        initialMembers,
        currency: 'USDC',
        settings: {
          allowMemberInvites: true,
          requireApprovalForWithdrawals: false,
        },
      });

      if (result.success && result.wallet) {
        navigation.replace('SharedWalletDetails', {
          walletId: result.wallet.id,
          wallet: result.wallet,
          newlyCreated: true,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to create shared wallet');
      }
    } catch (error) {
      logger.error('Error creating shared wallet', error as LogData, 'SharedWalletMembersScreen');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, walletAddress, walletName, selectedMembers, navigation, isSubmitting]);

  return (
    <Modal
      visible={visible}
      onClose={closeSheet}
      showHandle
      closeOnBackdrop
      style={styles.modalContent}
      maxHeight={800}
      enableSwipe={false}
    >
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconButtonTransparent} onPress={handleBackToName}>
            <PhosphorIcon name="CaretLeft" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Add Contact</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Input
          placeholder="Search"
          leftIcon="MagnifyingGlass"
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchContainer}
          inputRef={searchInputRef}
        />

        <ContactsList
          onContactSelect={handleContactSelect}
          showAddButton={false}
          showSearch={false}
          hideToggleBar
          multiSelect
          selectedContacts={selectedMembers}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          placeholder="Search contacts"
        />

        <Button
          title="Continue"
          onPress={handleNext}
          variant="primary"
          size="large"
          fullWidth
          disabled={selectedMembers.length === 0 || isSubmitting}
          loading={isSubmitting}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sheet: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconButtonTransparent: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  searchContainer: {
    marginTop: spacing.sm,
  },
  membersMeta: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaText: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
  },
});

export default SharedWalletMembersScreen;

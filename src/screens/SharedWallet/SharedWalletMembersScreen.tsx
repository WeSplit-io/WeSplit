/**
 * Shared Wallet Members Screen
 * Handles both:
 * 1. Adding members during wallet creation (walletName provided)
 * 2. Adding members to existing wallet (walletId provided)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components/shared';
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

  const { walletName, walletId } = route.params || {};

  // Determine if we're creating a new wallet or adding to existing
  const isCreatingNewWallet = !!walletName && !walletId;
  const isAddingToExisting = !!walletId;

  // Use app wallet address or fall back to currentUser's wallet_address
  const walletAddress = appWalletAddress || currentUser?.wallet_address || '';

  const [selectedMembers, setSelectedMembers] = useState<UserContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Ensure app wallet is initialized
  useEffect(() => {
    if (currentUser?.id && !appWalletAddress) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletAddress, ensureAppWallet]);

  // Load existing wallet members if adding to existing wallet
  useEffect(() => {
    const loadExistingWallet = async () => {
      if (!isAddingToExisting || !walletId || !currentUser?.id) {
        return;
      }

      setLoadingWallet(true);
      try {
        const result = await SharedWalletService.getSharedWallet(walletId);
        if (result.success && result.wallet) {
          // Extract existing member IDs to filter them out
          const memberIds = new Set(
            result.wallet.members.map(m => m.userId)
          );
          setExistingMemberIds(memberIds);
          logger.info('Loaded existing wallet members', {
            walletId,
            existingMembersCount: memberIds.size
          }, 'SharedWalletMembersScreen');
        } else {
          logger.error('Failed to load existing wallet', {
            walletId,
            error: result.error
          }, 'SharedWalletMembersScreen');
          Alert.alert('Error', result.error || 'Failed to load wallet');
          navigation.goBack();
        }
      } catch (error) {
        logger.error('Error loading existing wallet', error as LogData, 'SharedWalletMembersScreen');
        Alert.alert('Error', 'Failed to load wallet information');
        navigation.goBack();
      } finally {
        setLoadingWallet(false);
      }
    };

    loadExistingWallet();
  }, [isAddingToExisting, walletId, currentUser?.id, navigation]);

  const [visible, setVisible] = useState(true);

  const closeSheet = useCallback(() => {
    setVisible(false);
    navigation.goBack();
  }, [navigation]);

  const handleContactSelect = useCallback((contact: UserContact) => {
    // Don't allow selecting the creator/current user
    if (contact.id === currentUser?.id?.toString()) {
      return;
    }

    // Don't allow selecting existing members when adding to existing wallet
    if (isAddingToExisting && existingMemberIds.has(contact.id.toString())) {
      Alert.alert('Already a Member', 'This contact is already a member of this shared wallet.');
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
  }, [currentUser?.id, isAddingToExisting, existingMemberIds]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = useCallback(async () => {
    // Validation checks
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to perform this action');
      return;
    }

    // ✅ FIX: Prevent duplicate submissions - check if already submitting
    if (isSubmitting || loadingWallet) {
      logger.warn('Prevented duplicate submission', {
        isSubmitting,
        loadingWallet,
        isCreatingNewWallet
      }, 'SharedWalletMembersScreen');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('No Members Selected', 'Please select at least one member to add.');
      return;
    }

    // Additional validation for wallet creation
    if (isCreatingNewWallet) {
      if (!walletName || walletName.trim().length === 0) {
        Alert.alert('Error', 'Wallet name is required');
        return;
      }

      if (!walletAddress) {
        Alert.alert('Error', 'Wallet address is required. Please ensure your wallet is connected.');
        return;
      }
    }

    // Additional validation for adding to existing wallet
    if (isAddingToExisting) {
      if (!walletId) {
        Alert.alert('Error', 'Wallet ID is missing');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isCreatingNewWallet) {
        // Create new wallet flow
      logger.info('Proceeding to wallet creation', {
        name: walletName,
        selectedMembersCount: selectedMembers.length,
        totalMembers: selectedMembers.length + 1
      }, 'SharedWalletMembersScreen');

        // Validate that all selected members have wallet addresses
        const membersWithoutWallets = selectedMembers.filter(m => !m.wallet_address || m.wallet_address.trim().length === 0);
        if (membersWithoutWallets.length > 0) {
          Alert.alert(
            'Warning',
            `Some selected members don't have wallet addresses. They will be added but won't be able to receive funds until they set up their wallet.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
              { text: 'Continue', onPress: () => {} }
            ]
          );
          // Continue with creation - wallet addresses can be added later
        }

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
          logger.info('Shared wallet created successfully', {
            walletId: result.wallet.id,
            membersCount: result.wallet.members.length
          }, 'SharedWalletMembersScreen');

        navigation.replace('SharedWalletDetails', {
          walletId: result.wallet.id,
          wallet: result.wallet,
          newlyCreated: true,
        });
      } else {
          logger.error('Failed to create shared wallet', {
            error: result.error,
            walletName
          }, 'SharedWalletMembersScreen');
        Alert.alert('Error', result.error || 'Failed to create shared wallet');
        }
      } else if (isAddingToExisting && walletId) {
        // Add members to existing wallet flow
        logger.info('Adding members to existing wallet', {
          walletId,
          selectedMembersCount: selectedMembers.length
        }, 'SharedWalletMembersScreen');

        // Filter out any members that might already be in the wallet (double-check)
        const validInviteeIds = selectedMembers
          .filter(m => !existingMemberIds.has(m.id.toString()))
          .map(m => m.id.toString());

        if (validInviteeIds.length === 0) {
          Alert.alert('Error', 'All selected members are already part of this wallet.');
          setIsSubmitting(false);
          return;
        }

        const result = await SharedWalletService.inviteToSharedWallet({
          sharedWalletId: walletId,
          inviterId: currentUser.id.toString(),
          inviteeIds: validInviteeIds,
        });

        if (result.success) {
          logger.info('Members invited successfully', {
            walletId,
            invitedCount: result.invitedCount
          }, 'SharedWalletMembersScreen');

          Alert.alert(
            'Success',
            result.message || `Successfully invited ${result.invitedCount || validInviteeIds.length} member(s)`,
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.goBack();
                }
              }
            ]
          );
        } else {
          logger.error('Failed to invite members', {
            walletId,
            error: result.error,
            inviteeCount: validInviteeIds.length
          }, 'SharedWalletMembersScreen');
          Alert.alert('Error', result.error || 'Failed to invite members');
        }
      }
    } catch (error) {
      logger.error('Error in shared wallet operation', {
        error: error instanceof Error ? error.message : String(error),
        isCreatingNewWallet,
        isAddingToExisting,
        walletId
      } as LogData, 'SharedWalletMembersScreen');
      Alert.alert('Error', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentUser,
    walletAddress,
    walletName,
    walletId,
    selectedMembers,
    navigation,
    isSubmitting,
    isCreatingNewWallet,
    isAddingToExisting,
    loadingWallet,
    existingMemberIds
  ]);

  return (
    <Modal
      visible={visible}
      onClose={closeSheet}
      showHandle
      closeOnBackdrop
      style={styles.modalContent}
      maxHeight={700}
      enableSwipe={false}
    >
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        {/* Fixed Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            {isCreatingNewWallet ? 'Add Members' : 'Invite Members'}
          </Text>
        </View>

        {/* Fixed Search Input */}
        <Input
          placeholder="Search"
          leftIcon="MagnifyingGlass"
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchContainer}
          inputRef={searchInputRef}
        />

        {/* Scrollable Contacts List - Takes remaining space */}
        {loadingWallet ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading wallet...</Text>
          </View>
        ) : (
          <View style={styles.contactsContainer}>
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
          </View>
        )}

        {/* Fixed Button at Bottom */}
        <View style={styles.buttonContainer}>
        <Button
            title={isCreatingNewWallet ? 'Continue' : 'Invite Members'}
          onPress={handleNext}
          variant="primary"
          size="large"
          fullWidth
            disabled={selectedMembers.length === 0 || isSubmitting || loadingWallet}
          loading={isSubmitting}
        />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
  },
  sheet: {
    height: 700,
    maxHeight: 700,
    flexDirection: 'column',
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexShrink: 0,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  searchContainer: {
    marginBottom: spacing.md,
    flexShrink: 0,
  },
  contactsContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  buttonContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: colors.white10,
    backgroundColor: colors.blackWhite5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
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

/**
 * Shared Wallet Members Screen
 * Second step in shared wallet creation - direct contact selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Container, Header, Button } from '../../components/shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { logger } from '../../services/analytics/loggingService';
import ContactsList from '../../components/ContactsList';
import type { UserContact } from '../../types';

interface SharedWalletMembersScreenProps {
  navigation: any;
  route: any;
}

const SharedWalletMembersScreen: React.FC<SharedWalletMembersScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state } = useApp();
  const { currentUser } = state;
  const { appWalletAddress, ensureAppWallet } = useWallet();

  const { walletName } = route.params || {};

  // Use app wallet address or fall back to currentUser's wallet_address
  const walletAddress = appWalletAddress || currentUser?.wallet_address || '';

  const [selectedMembers, setSelectedMembers] = useState<UserContact[]>([]);

  // Ensure app wallet is initialized
  useEffect(() => {
    if (currentUser?.id && !appWalletAddress) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletAddress, ensureAppWallet]);

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

  const handleNext = useCallback(() => {
    if (!currentUser || !walletAddress) {
      return;
    }

    logger.info('Proceeding to wallet creation', {
      name: walletName,
      selectedMembersCount: selectedMembers.length,
      totalMembers: selectedMembers.length + 1
    }, 'SharedWalletMembersScreen');

    // Build initialMembers array - service will ensure creator is included
    const initialMembers = selectedMembers.map(member => ({
      userId: member.id.toString(),
      name: member.name,
      walletAddress: member.wallet_address || '',
      role: 'member' as const,
    }));

    // Navigate to creation screen
    navigation.navigate('SharedWalletCreation', {
      walletName,
      initialMembers: [
        // Add creator as first member (service will validate this)
        {
          userId: currentUser.id.toString(),
          name: currentUser.name || 'You',
          walletAddress: walletAddress,
          role: 'creator' as const,
        },
        ...initialMembers
      ],
      creatorId: currentUser.id.toString(),
      creatorName: currentUser.name || 'Unknown',
      creatorWalletAddress: walletAddress,
    });
  }, [currentUser, walletAddress, walletName, selectedMembers, navigation]);

  return (
    <Container>
      <Header
        title={`Add Members to "${walletName}"`}
        subtitle={`${selectedMembers.length + 1} total members`}
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
        rightElement={
          selectedMembers.length > 0 ? (
            <TouchableOpacity
              onPress={handleNext}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.green + '20', borderRadius: 8 }}
            >
              <Text style={{ color: colors.green, fontWeight: '600' }}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: colors.white50, fontSize: 14 }}>
              Select members to continue
            </Text>
          )
        }
      />
      <ContactsList
        onContactSelect={handleContactSelect}
        showAddButton={true}
        showSearch={true}
        showTabs={true}
        multiSelect={true}
        selectedContacts={selectedMembers}
        placeholder="Search friends to add to your wallet..."
      />

      {/* Bottom Continue Button */}
      {selectedMembers.length > 0 && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.black,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.lg + 20, // Extra padding for safe area
          borderTopWidth: 1,
          borderTopColor: colors.white10,
        }}>
          <Button
            title={`Continue with ${selectedMembers.length} member${selectedMembers.length === 1 ? '' : 's'}`}
            onPress={handleNext}
            variant="primary"
            size="large"
            fullWidth
          />
        </View>
      )}
    </Container>
  );
};

export default SharedWalletMembersScreen;

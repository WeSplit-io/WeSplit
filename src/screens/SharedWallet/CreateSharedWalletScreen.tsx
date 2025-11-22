/**
 * Create Shared Wallet Screen
 * Allows users to create a new shared wallet/account
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  Container, 
  Button, 
  Input, 
  ModernLoader,
  Header,
  Avatar,
  PhosphorIcon
} from '../../components/shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useApp } from '../../context/AppContext';
import { SharedWalletService } from '../../services/sharedWallet';
import { logger } from '../../services/analytics/loggingService';
import { useWallet } from '../../context/WalletContext';
import ContactsList from '../../components/ContactsList';
import type { UserContact } from '../../types';

interface CreateSharedWalletScreenProps {
  navigation: any;
  route: any;
}

const CreateSharedWalletScreen: React.FC<CreateSharedWalletScreenProps> = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const { currentUser } = state;
  const { appWalletAddress, ensureAppWallet } = useWallet();
  
  // Use app wallet address or fall back to currentUser's wallet_address
  const walletAddress = appWalletAddress || currentUser?.wallet_address || '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showContactsPicker, setShowContactsPicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; members?: string }>({});
  
  // Track if creator has been initialized to prevent re-initialization
  const creatorInitializedRef = useRef(false);

  // Add creator to members if not already included
  // Use useMemo to prevent unnecessary recalculations
  const creatorAsContact = useMemo<UserContact | null>(() => {
    if (!currentUser || !walletAddress) return null;
    
    return {
      id: currentUser.id.toString(),
      name: currentUser.name || 'You',
      email: currentUser.email,
      wallet_address: walletAddress,
      wallet_public_key: currentUser.wallet_public_key,
      created_at: new Date().toISOString(),
      first_met_at: new Date().toISOString(),
      avatar: currentUser.avatar,
      isFavorite: false,
    };
  }, [currentUser, walletAddress]);

  // Initialize selectedMembers with creator if available
  // This ensures creator is always in the list from the start
  const [selectedMembers, setSelectedMembers] = useState<UserContact[]>(() => {
    if (currentUser && walletAddress) {
      return [{
        id: currentUser.id.toString(),
        name: currentUser.name || 'You',
        email: currentUser.email,
        wallet_address: walletAddress,
        wallet_public_key: currentUser.wallet_public_key,
        created_at: new Date().toISOString(),
        first_met_at: new Date().toISOString(),
        avatar: currentUser.avatar,
        isFavorite: false,
      }];
    }
    return [];
  });

  // Ensure app wallet is initialized
  useEffect(() => {
    if (currentUser?.id && !appWalletAddress) {
      ensureAppWallet(currentUser.id.toString());
    }
  }, [currentUser?.id, appWalletAddress, ensureAppWallet]);

  // Ensure creator is always in the list - runs when creatorAsContact becomes available
  useEffect(() => {
    if (creatorAsContact) {
      setSelectedMembers(prev => {
        // Check if creator is already in the list
        const creatorExists = prev.some(m => m.id === creatorAsContact.id);
        if (!creatorExists) {
          // Add creator at the beginning of the list
          if (!creatorInitializedRef.current) {
            creatorInitializedRef.current = true;
          }
          return [creatorAsContact, ...prev];
        }
        if (!creatorInitializedRef.current) {
          creatorInitializedRef.current = true;
        }
        return prev;
      });
    }
  }, [creatorAsContact]);

  // Sync state when ContactsList closes
  useEffect(() => {
    if (!showContactsPicker) {
      logger.debug('Contacts picker closed', { 
        selectedCount: selectedMembers.length 
      }, 'CreateSharedWalletScreen');
    }
  }, [showContactsPicker, selectedMembers.length]);

  const validateForm = useCallback((): boolean => {
    const newErrors: { name?: string; members?: string } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Wallet name is required';
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Wallet name must be 100 characters or less';
    }

    if (selectedMembers.length === 0) {
      newErrors.members = 'At least one member (you) is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, selectedMembers.length]);

  const handleCreateWallet = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    if (!currentUser || !walletAddress) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    setIsCreating(true);

    try {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      
      logger.info('Creating shared wallet', {
        name: trimmedName,
        creatorId: currentUser.id,
        membersCount: selectedMembers.length
      }, 'CreateSharedWalletScreen');

      // Ensure creator is always included in members
      // Filter out duplicates and ensure creator is first
      const creatorId = currentUser.id.toString();
      const membersWithoutCreator = selectedMembers.filter(m => m.id !== creatorId);
      const creatorMember = selectedMembers.find(m => m.id === creatorId) || creatorAsContact;
      
      // Build initialMembers array with creator first, then others
      const initialMembers = creatorMember ? [
        {
          userId: creatorMember.id.toString(),
          name: creatorMember.name,
          walletAddress: creatorMember.wallet_address || walletAddress,
          role: 'creator' as const,
        },
        ...membersWithoutCreator.map(member => ({
          userId: member.id.toString(),
          name: member.name,
          walletAddress: member.wallet_address || '',
          role: 'member' as const,
        }))
      ] : [];

      // Validate that creator is included
      if (initialMembers.length === 0 || !initialMembers.some(m => m.userId === creatorId)) {
        Alert.alert('Error', 'Creator must be included as a member');
        setIsCreating(false);
        return;
      }

      const result = await SharedWalletService.createSharedWallet({
        name: trimmedName,
        description: trimmedDescription || undefined,
        creatorId: creatorId,
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
          name: result.wallet.name
        }, 'CreateSharedWalletScreen');

        // Navigate back to SplitsList with shared wallets tab active
        // Use replace to prevent going back to this screen
        navigation.replace('SplitsList', { activeTab: 'sharedWallets' });
        
        // Show success message after navigation
        setTimeout(() => {
          Alert.alert(
            'Success',
            'Shared wallet created successfully!',
            [{ text: 'OK' }]
          );
        }, 300);
      } else {
        logger.error('Failed to create shared wallet', {
          error: result.error
        }, 'CreateSharedWalletScreen');

        Alert.alert('Error', result.error || 'Failed to create shared wallet');
      }
    } catch (error) {
      logger.error('Error creating shared wallet', error, 'CreateSharedWalletScreen');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  }, [validateForm, currentUser, walletAddress, name, description, selectedMembers, navigation]);

  const handleSelectContact = useCallback((contact: UserContact) => {
    // Don't allow selecting/removing creator
    if (contact.id === currentUser?.id?.toString()) {
      return;
    }
    
    // Use functional update to avoid stale closure
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

  const handleRemoveMember = useCallback((memberId: string) => {
    // Don't allow removing creator
    if (memberId === currentUser?.id?.toString()) {
      return;
    }
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  }, [currentUser?.id]);

  if (showContactsPicker) {
    return (
      <Container>
        <Header
          title="Add Members"
          onBackPress={() => setShowContactsPicker(false)}
          showBackButton={true}
        />
        <ContactsList
          onContactSelect={handleSelectContact}
          showAddButton={true}
          showSearch={true}
          showTabs={true}
          multiSelect={true}
          selectedContacts={selectedMembers}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Create Shared Wallet"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Name Input */}
        <Input
          label="Wallet Name"
          placeholder="e.g., Apartment Rent, Party Fund"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) {
              setErrors(prev => ({ ...prev, name: undefined }));
            }
          }}
          error={errors.name}
          leftIcon="Wallet"
          required
          containerStyle={styles.inputContainer}
        />

        {/* Description Input */}
        <Input
          label="Description (Optional)"
          placeholder="What is this shared wallet for?"
          value={description}
          onChangeText={setDescription}
          leftIcon="Note"
          containerStyle={styles.inputContainer}
          multiline
          numberOfLines={3}
        />

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {errors.members && (
            <Text style={styles.errorText}>{errors.members}</Text>
          )}

          {/* Selected Members List */}
          <View style={styles.membersList}>
            {selectedMembers.map((member) => {
              const isCreator = member.id === currentUser?.id?.toString();
              return (
                <View key={member.id} style={styles.memberCard}>
                  <Avatar
                    userId={member.id}
                    userName={member.name}
                    avatarUrl={member.avatar}
                    size={32}
                    style={styles.memberAvatar}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.name} {isCreator && '(You)'}
                    </Text>
                    <Text style={styles.memberRole}>
                      {isCreator ? 'Creator' : 'Member'}
                    </Text>
                  </View>
                  {!isCreator && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member.id)}
                      style={styles.removeButton}
                    >
                      <PhosphorIcon
                        name="X"
                        size={18}
                        color={colors.red}
                        weight="bold"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {/* Add Members Button */}
          <Button
            title="Add Members"
            onPress={() => setShowContactsPicker(true)}
            variant="secondary"
            icon="UserPlus"
            iconPosition="left"
            fullWidth
            style={styles.addMembersButton}
          />
        </View>

        {/* Create Button */}
        <Button
          title={isCreating ? 'Creating...' : 'Create Shared Wallet'}
          onPress={handleCreateWallet}
          variant="primary"
          size="large"
          disabled={isCreating || !name.trim()}
          loading={isCreating}
          fullWidth
          style={styles.createButton}
        />
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  section: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.red,
    marginBottom: spacing.xs,
  },
  membersList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.xs / 4,
  },
  memberRole: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  removeButton: {
    padding: spacing.xs / 2,
  },
  addMembersButton: {
    marginTop: spacing.xs,
  },
  createButton: {
    marginTop: spacing.md,
  },
});

export default CreateSharedWalletScreen;


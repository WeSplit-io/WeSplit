/**
 * Shared Wallet Settings Screen
 * Allows users to manage participants and access the private key
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { 
  Container, 
  Header, 
  ModernLoader, 
  Button, 
  Modal, 
  Input, 
  ErrorScreen,
  Avatar,
  PhosphorIcon
} from '../../components/shared';
import UserNameWithBadges from '../../components/profile/UserNameWithBadges';
import LogoPicker from '../../components/sharedWallet/LogoPicker';
import ColorPicker from '../../components/sharedWallet/ColorPicker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWallet } from '../../services/sharedWallet';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';

const SharedWalletSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state } = useApp();
  const { currentUser } = state;

  const { walletId, wallet: routeWallet } = route.params || {};
  
  const [wallet, setWallet] = useState<SharedWallet | null>(routeWallet || null);
  const [isLoading, setIsLoading] = useState(!routeWallet);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isFetchingPrivateKey, setIsFetchingPrivateKey] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [customColor, setCustomColor] = useState<string>(wallet?.customColor || '');
  const [customLogo, setCustomLogo] = useState<string>(wallet?.customLogo || '');
  const [isSavingCustomization, setIsSavingCustomization] = useState(false);
  
  // Auto-save customization
  const autoSaveCustomization = useCallback(async (color?: string, logo?: string) => {
    if (!wallet || !currentUser?.id) return;
    
    const colorToSave = color !== undefined ? color : customColor;
    const logoToSave = logo !== undefined ? logo : customLogo;
    
    // Don't save if nothing changed
    if (colorToSave === wallet.customColor && logoToSave === wallet.customLogo) {
      return;
    }
    
    setIsSavingCustomization(true);
    try {
      const result = await SharedWalletService.updateSharedWalletSettings({
        sharedWalletId: wallet.id,
        userId: currentUser.id.toString(),
        customColor: colorToSave.trim() || undefined,
        customLogo: logoToSave.trim() || undefined,
      });

      if (result.success) {
        // Reload wallet to reflect changes
        const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
        if (reloadResult.success && reloadResult.wallet) {
          setWallet(reloadResult.wallet);
        }
      } else {
        logger.error('Failed to auto-save customization', { error: result.error }, 'SharedWalletSettingsScreen');
      }
    } catch (error) {
      logger.error('Error auto-saving customization', error, 'SharedWalletSettingsScreen');
    } finally {
      setIsSavingCustomization(false);
    }
  }, [wallet, currentUser?.id, customColor, customLogo]);
  
  // Handle logo selection with auto-save
  const handleLogoSelect = useCallback(async (logo: string) => {
    setCustomLogo(logo);
    await autoSaveCustomization(undefined, logo);
  }, [autoSaveCustomization]);
  
  // Handle color selection with auto-save
  const handleColorSelect = useCallback(async (color: string) => {
    setCustomColor(color);
    await autoSaveCustomization(color, undefined);
  }, [autoSaveCustomization]);
  
  // Update local state when wallet changes
  useEffect(() => {
    if (wallet) {
      setCustomColor(wallet.customColor || '');
      setCustomLogo(wallet.customLogo || '');
    }
  }, [wallet]);
  
  // Ref to prevent duplicate processing of selected contacts
  const isProcessingContactsRef = useRef(false);
  const processedContactsRef = useRef<string>('');

  // Load wallet
  useEffect(() => {
    const loadWallet = async () => {
      if (routeWallet) {
        setWallet(routeWallet);
        setIsLoading(false);
        return;
      }

      if (!walletId) {
        Alert.alert('Error', 'Wallet ID is required');
        // Navigate to shared wallets list if no wallet ID
        navigation.navigate('SplitsList', { activeTab: 'sharedWallets' });
        return;
      }

      setIsLoading(true);
      try {
        const result = await SharedWalletService.getSharedWallet(walletId);
        if (result.success && result.wallet) {
          setWallet(result.wallet);
        } else {
          Alert.alert('Error', result.error || 'Failed to load shared wallet');
          navigation.navigate('SplitsList', { activeTab: 'sharedWallets' });
        }
      } catch (error) {
        logger.error('Error loading shared wallet', error, 'SharedWalletSettingsScreen');
        Alert.alert('Error', 'Failed to load shared wallet');
        navigation.navigate('SplitsList', { activeTab: 'sharedWallets' });
      } finally {
        setIsLoading(false);
      }
    };

    loadWallet();
  }, [walletId, routeWallet, navigation]);

  // Reload wallet when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (wallet?.id) {
        const reloadWallet = async () => {
          try {
            const result = await SharedWalletService.getSharedWallet(wallet.id);
            if (result.success && result.wallet) {
              setWallet(result.wallet);
            }
          } catch (error) {
            logger.error('Error reloading wallet on focus', error, 'SharedWalletSettingsScreen');
          }
        };
        reloadWallet();
      }
    }, [wallet?.id])
  );

  // Pre-fetch private key payload for faster retrieval
  useEffect(() => {
    if (wallet?.id && currentUser?.id) {
      SharedWalletService.preFetchPrivateKeyPayload(wallet.id);
    }
  }, [wallet?.id, currentUser?.id]);

  // Handle show private key
  const handleShowPrivateKey = useCallback(async () => {
    if (!wallet || !currentUser?.id) return;

    setIsFetchingPrivateKey(true);
    try {
      const result = await SharedWalletService.getSharedWalletPrivateKey(
        wallet.id,
        currentUser.id.toString()
      );

      if (result.success && result.privateKey) {
        setPrivateKey(result.privateKey);
        setShowPrivateKeyModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to retrieve private key');
      }
    } catch (error) {
      logger.error('Error fetching private key', error, 'SharedWalletSettingsScreen');
      Alert.alert('Error', 'Failed to retrieve private key');
    } finally {
      setIsFetchingPrivateKey(false);
    }
  }, [wallet, currentUser?.id]);

  // Handle copy private key
  const handleCopyPrivateKey = useCallback(async () => {
    if (!privateKey) return;

    try {
      await Clipboard.setString(privateKey);
      Alert.alert('Copied', 'Private key copied to clipboard');
    } catch (error) {
      logger.error('Error copying private key', error, 'SharedWalletSettingsScreen');
      Alert.alert('Error', 'Failed to copy private key');
    }
  }, [privateKey]);

  // Handle close private key modal
  const handleClosePrivateKeyModal = useCallback(() => {
    setShowPrivateKeyModal(false);
    setPrivateKey(null);
  }, []);

  // Handle back navigation - go back to SharedWalletDetails
  const handleBack = useCallback(() => {
    if (wallet) {
      // Navigate back to SharedWalletDetails with wallet data
      navigation.navigate('SharedWalletDetails', {
        walletId: wallet.id,
        wallet: wallet,
      });
    } else {
      // Fallback to goBack if wallet not available
      navigation.goBack();
    }
  }, [wallet, navigation]);

  // Handle add participants - navigate to Contacts screen
  const handleAddParticipants = useCallback(() => {
    if (!wallet || !currentUser?.id) {
      Alert.alert('Error', 'Wallet information not available. Please try again.');
      return;
    }

    logger.info('Navigating to Contacts screen for participant invitation', {
      walletId: wallet.id,
      memberCount: wallet.members.length,
    }, 'SharedWalletSettingsScreen');

    navigation.navigate('Contacts', {
      action: 'sharedWallet',
      sharedWalletId: wallet.id,
      walletMembers: wallet.members,
      returnRoute: 'SharedWalletSettings',
      returnParams: { 
        walletId: wallet.id, 
        wallet: wallet,
        // Ensure wallet data is passed for when screen reloads
      },
    });
  }, [wallet, currentUser?.id, navigation]);

  // Handle selected contacts from Contacts screen
  useEffect(() => {
    const handleSelectedContacts = async () => {
      const { selectedContacts: routeSelectedContacts } = route.params || {};
      
      if (!routeSelectedContacts || !Array.isArray(routeSelectedContacts) || routeSelectedContacts.length === 0) {
        return;
      }

      // Create a unique key for this batch of contacts to prevent duplicate processing
      const contactsKey = routeSelectedContacts.map(c => c.id).sort().join(',');
      
      // Check if we're already processing or have already processed these contacts
      if (isProcessingContactsRef.current) {
        logger.debug('Already processing contacts, skipping duplicate', null, 'SharedWalletSettingsScreen');
        return;
      }

      if (processedContactsRef.current === contactsKey) {
        logger.debug('Contacts already processed, skipping', null, 'SharedWalletSettingsScreen');
        // Clear route params to prevent re-processing
        navigation.setParams({ selectedContacts: undefined });
        return;
      }

      // Mark as processing and store the key
      isProcessingContactsRef.current = true;
      processedContactsRef.current = contactsKey;

      // Clear route params immediately to prevent duplicate triggers
      navigation.setParams({ selectedContacts: undefined });

      // Ensure we have current user
      if (!currentUser?.id) {
        logger.warn('Cannot process selected contacts: missing current user', null, 'SharedWalletSettingsScreen');
        isProcessingContactsRef.current = false;
        return;
      }

      // If wallet is not loaded yet, try to load it first
      let walletToUse = wallet;
      if (!walletToUse) {
        const { walletId: routeWalletId } = route.params || {};
        if (routeWalletId) {
          logger.info('Wallet not loaded, fetching from route params', { walletId: routeWalletId }, 'SharedWalletSettingsScreen');
          const result = await SharedWalletService.getSharedWallet(routeWalletId);
          if (result.success && result.wallet) {
            walletToUse = result.wallet;
            setWallet(walletToUse);
          } else {
            logger.error('Failed to load wallet for contact processing', { error: result.error }, 'SharedWalletSettingsScreen');
            Alert.alert('Error', 'Failed to load wallet. Please try again.');
            isProcessingContactsRef.current = false;
            return;
          }
        } else {
          logger.warn('Cannot process selected contacts: missing wallet and walletId', null, 'SharedWalletSettingsScreen');
          Alert.alert('Error', 'Wallet information not available. Please try again.');
          isProcessingContactsRef.current = false;
          return;
        }
      }

      if (!walletToUse) {
        logger.warn('Cannot process selected contacts: wallet still not available', null, 'SharedWalletSettingsScreen');
        isProcessingContactsRef.current = false;
        return;
      }

      setIsInviting(true);
      try {
        const { ParticipantInvitationService } = await import('../../services/sharedWallet/ParticipantInvitationService');
        
        // Filter out existing members
        const newContacts = ParticipantInvitationService.filterExistingMembers(
          routeSelectedContacts,
          walletToUse.members
        );

        if (newContacts.length === 0) {
          Alert.alert('Info', 'All selected contacts are already members of this shared wallet.');
          isProcessingContactsRef.current = false;
          setIsInviting(false);
          return;
        }

        logger.info('Processing selected contacts for shared wallet', {
          walletId: walletToUse.id,
          selectedCount: routeSelectedContacts.length,
          newContactsCount: newContacts.length,
        }, 'SharedWalletSettingsScreen');

        const result = await ParticipantInvitationService.inviteParticipants({
          sharedWalletId: walletToUse.id,
          inviterId: currentUser.id.toString(),
          contacts: newContacts,
        });

        if (result.success) {
          // Only show success alert if we actually invited someone
          if (result.invitedCount && result.invitedCount > 0) {
            Alert.alert('Success', result.message || `Successfully invited ${result.invitedCount} member(s)`);
          }
          // Reload wallet
          const reloadResult = await SharedWalletService.getSharedWallet(walletToUse.id);
          if (reloadResult.success && reloadResult.wallet) {
            setWallet(reloadResult.wallet);
          }
        } else {
          // Only show error if no one was invited
          if (!result.invitedCount || result.invitedCount === 0) {
            Alert.alert('Error', result.error || 'Failed to invite members');
          } else {
            // Partial success - show the message from result which should indicate partial success
            Alert.alert('Partial Success', result.message || `Some members were invited, but some failed: ${result.error}`);
          }
        }
      } catch (error) {
        logger.error('Error adding participants', error, 'SharedWalletSettingsScreen');
        Alert.alert('Error', 'Failed to add participants');
      } finally {
        setIsInviting(false);
        isProcessingContactsRef.current = false;
        // Reset processed contacts after a delay to allow for new invitations
        setTimeout(() => {
          processedContactsRef.current = '';
        }, 2000);
      }
    };

    handleSelectedContacts();
  }, [route.params?.selectedContacts, route.params?.walletId, wallet, currentUser?.id, navigation]);

  if (isLoading) {
    return (
      <Container>
        <Header
          title="Settings"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ModernLoader size="large" text="Loading settings..." />
        </View>
      </Container>
    );
  }

  if (!wallet) {
    return (
      <Container>
        <Header
          title="Settings"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <ErrorScreen
          title="Wallet Not Found"
          message="The shared wallet you're looking for doesn't exist or you don't have access to it."
          onRetry={handleBack}
          retryText="Go Back"
          showIcon={false}
        />
      </Container>
    );
  }

  const isCreator = wallet.creatorId === currentUser?.id?.toString();
  const canInvite = isCreator || wallet.settings?.allowMemberInvites !== false;

  return (
    <Container>
      <Header
        title="Settings"
        onBackPress={handleBack}
        showBackButton={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Participants Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Participants ({wallet.members.length})
            </Text>
            {canInvite && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddParticipants}
                activeOpacity={0.7}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {wallet.members.map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <Avatar
                userId={member.userId}
                userName={member.name}
                size={40}
                style={styles.memberAvatar}
              />
              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <UserNameWithBadges
                    userId={member.userId}
                    userName={member.name}
                    textStyle={styles.memberName}
                    showBadges={true}
                  />
                  {member.role === 'creator' && (
                    <View style={styles.creatorBadge}>
                      <Text style={styles.creatorText}>Creator</Text>
                    </View>
                  )}
                  {member.status === 'invited' && (
                    <View style={styles.invitedBadge}>
                      <Text style={styles.invitedText}>Invited</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberStats}>
                  {member.totalContributed > 0 && `${member.totalContributed.toFixed(2)} USDC contributed`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Private Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Security</Text>
          <Text style={styles.sectionDescription}>
            Access the shared private key for this wallet. All members can use this key to access the wallet funds.
          </Text>
          
          <TouchableOpacity
            style={[styles.privateKeyButton, isFetchingPrivateKey && styles.privateKeyButtonDisabled]}
            onPress={handleShowPrivateKey}
            disabled={isFetchingPrivateKey}
            activeOpacity={0.7}
          >
            {isFetchingPrivateKey ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: 16, height: 16 }}>
                  <ModernLoader size="small" text="" />
                </View>
                <Text style={styles.privateKeyButtonText}>Retrieving...</Text>
              </View>
            ) : (
              <Text style={styles.privateKeyButtonText}>View Private Key</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Wallet Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Wallet Address</Text>
            <TouchableOpacity
              style={styles.addressContainer}
              onPress={async () => {
                try {
                  await Clipboard.setString(wallet.walletAddress);
                  Alert.alert('Copied', 'Wallet address copied to clipboard');
                } catch (error) {
                  logger.error('Error copying wallet address', error, 'SharedWalletSettingsScreen');
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.addressText} numberOfLines={1}>
                {wallet.walletAddress}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {wallet.status === 'active' ? 'Active' : wallet.status}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {new Date(wallet.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Wallet Customization Section - Only for creator */}
        {isCreator && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet Customization</Text>
            <Text style={styles.sectionDescription}>
              Customize the appearance of your shared wallet with colors and logos.
            </Text>
            
            <TouchableOpacity
              style={styles.customizationButton}
              onPress={() => {
                setCustomColor(wallet?.customColor || '');
                setCustomLogo(wallet?.customLogo || '');
                setShowCustomizationModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.customizationButtonText}>Customize Wallet</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Customization Modal */}
      <Modal
        visible={showCustomizationModal}
        onClose={async () => {
          // Auto-save on modal close if there are changes
          await autoSaveCustomization();
          setShowCustomizationModal(false);
          // Reset to wallet values (will be updated after save completes)
          if (wallet) {
            setCustomColor(wallet.customColor || '');
            setCustomLogo(wallet.customLogo || '');
          }
        }}
        title="Customize Wallet"
      >
        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Picker */}
          <LogoPicker
            selectedLogo={customLogo}
            onSelectLogo={handleLogoSelect}
          />

          {/* Color Picker */}
          <ColorPicker
            selectedColor={customColor}
            onSelectColor={handleColorSelect}
          />

          {/* Optional: Custom URL input for advanced users */}
          <View style={styles.advancedSection}>
            <Text style={styles.advancedLabel}>Advanced: Custom Logo URL</Text>
            <Input
              placeholder="https://example.com/logo.png"
              value={customLogo && typeof customLogo === 'string' && customLogo.startsWith('http') ? customLogo : ''}
              onChangeText={async (text) => {
                // Only set if it's a URL (starts with http) or empty
                if (text.startsWith('http')) {
                  await handleLogoSelect(text);
                } else if (text === '') {
                  await handleLogoSelect('');
                }
              }}
              leftIcon="Link"
            />
            <Text style={styles.modalHint}>
              Or enter a custom image URL for your wallet logo
            </Text>
          </View>
        </ScrollView>
      </Modal>

      {/* Private Key Modal */}
      <Modal
        visible={showPrivateKeyModal && !!privateKey}
        onClose={handleClosePrivateKeyModal}
        showHandle={true}
        title="Private Key"
        description="This is a shared private key for the Shared Wallet. All participants have access to this key to withdraw or move funds from the wallet."
      >
        <View style={styles.privateKeyDisplay}>
          <Text style={styles.privateKeyText}>{privateKey}</Text>
        </View>
        
        <View style={styles.privateKeyWarning}>
          <Text style={styles.privateKeyWarningText}>
            ⚠️ This is a shared private key for the Shared Wallet. All members can use this key to access the wallet funds.
          </Text>
        </View>
        
        <View style={styles.privateKeyButtons}>
          <Button
            title="Copy Key"
            onPress={handleCopyPrivateKey}
            variant="primary"
            style={{ flex: 1 }}
          />
          <Button
            title="Close"
            onPress={handleClosePrivateKeyModal}
            variant="secondary"
            style={{ flex: 1 }}
          />
        </View>
      </Modal>

    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  sectionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  addButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: typography.fontWeight.semibold,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.xs,
  },
  creatorText: {
    fontSize: typography.fontSize.xs,
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
  },
  invitedBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.white10,
    borderRadius: spacing.xs,
  },
  invitedText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  memberStats: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  privateKeyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  privateKeyButtonDisabled: {
    opacity: 0.5,
  },
  privateKeyButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  privateKeyDisplay: {
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  privateKeyText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
  },
  privateKeyWarning: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  privateKeyWarningText: {
    fontSize: typography.fontSize.sm,
    color: '#ffc107',
    textAlign: 'center',
    lineHeight: 18,
  },
  privateKeyButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    fontWeight: typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.regular,
  },
  addressContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  addressText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
    backgroundColor: colors.greenBlue20,
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.green,
  },
  modalScrollView: {
    maxHeight: 600,
  },
  modalContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginBottom: spacing.sm,
  },
  contactsListContainer: {
    maxHeight: 400,
  },
  selectedContactsContainer: {
    marginTop: spacing.sm,
  },
  selectedContactsTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginBottom: spacing.xs,
  },
  selectedContactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.greenBlue20,
    borderRadius: spacing.sm,
    marginRight: spacing.xs,
  },
  selectedContactName: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
  },
  removeChipButton: {
    padding: 2,
  },
  modalButton: {
    marginTop: spacing.sm,
  },
  modalHint: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  customizationButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.white10,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  customizationButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});

export default SharedWalletSettingsScreen;


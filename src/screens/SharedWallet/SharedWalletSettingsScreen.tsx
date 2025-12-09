/**
 * Shared Wallet Settings Screen
 * Allows users to manage participants and access the private key
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Switch,
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
  PhosphorIcon,
  Tabs,
} from '../../components/shared';
import LogoPicker from '../../components/sharedWallet/LogoPicker';
import ColorPicker from '../../components/sharedWallet/ColorPicker';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWallet } from '../../services/sharedWallet';
import { useApp } from '../../context/AppContext';
import { logger, LogData } from '../../services/analytics/loggingService';
import { formatBalance } from '../../utils/ui/format/formatUtils';

const SharedWalletSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { state } = useApp();
  const { currentUser } = state;

  const { walletId, wallet: routeWallet } = route.params || {};
  
  const [wallet, setWallet] = useState<SharedWallet | null>(routeWallet || null);
  const [isLoading, setIsLoading] = useState(!routeWallet);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isFetchingPrivateKey, setIsFetchingPrivateKey] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [customColor, setCustomColor] = useState<string>(wallet?.customColor || '');
  const [customLogo, setCustomLogo] = useState<string>(wallet?.customLogo || '');
  const [draftColor, setDraftColor] = useState<string>(wallet?.customColor || '');
  const [draftLogo, setDraftLogo] = useState<string>(wallet?.customLogo || '');
  const [isSavingCustomization, setIsSavingCustomization] = useState(false);
  const [goalAmount, setGoalAmount] = useState<number | null>(wallet?.settings?.goalAmount ?? null);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState(goalAmount ? String(goalAmount) : '');
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [customizationTab, setCustomizationTab] = useState<'icon' | 'color'>('icon');
  
  // Update local state when wallet changes
  useEffect(() => {
    if (wallet) {
      setCustomColor(wallet.customColor || '');
      setCustomLogo(wallet.customLogo || '');
      setDraftColor(wallet.customColor || '');
      setDraftLogo(wallet.customLogo || '');
      const currentGoal = wallet.settings?.goalAmount ?? null;
      setGoalAmount(currentGoal);
      setGoalInputValue(currentGoal ? String(currentGoal) : '');
    }
  }, [wallet]);
  
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
        logger.error('Error loading shared wallet', error as LogData, 'SharedWalletSettingsScreen');
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
            logger.error('Error reloading wallet on focus', error as LogData, 'SharedWalletSettingsScreen');
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
      logger.error('Error fetching private key', error as LogData, 'SharedWalletSettingsScreen');
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
      logger.error('Error copying private key', error as LogData, 'SharedWalletSettingsScreen');
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
          title="Shared Wallet Settings"
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
  const truncatedAddress = wallet.walletAddress
    ? `${wallet.walletAddress.slice(0, 4)}...${wallet.walletAddress.slice(-4)}`
    : 'Unknown';
  const handleCopyAddress = useCallback(async () => {
    try {
      await Clipboard.setString(wallet.walletAddress);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
                } catch (error) {
                  logger.error('Error copying wallet address', error as LogData, 'SharedWalletSettingsScreen');
    }
  }, [wallet.walletAddress]);

  const handleSetGoal = () => {
    setGoalInputValue(goalAmount ? String(goalAmount) : '');
    setIsGoalModalVisible(true);
  };

  const handleCloseGoalModal = useCallback(() => {
    setIsGoalModalVisible(false);
  }, []);

  const handleOpenCustomizationModal = useCallback((initialTab: 'icon' | 'color' = 'icon') => {
    setDraftColor(customColor || '');
    setDraftLogo(customLogo || '');
    setCustomizationTab(initialTab);
    setShowCustomizationModal(true);
  }, [customColor, customLogo]);

  const normalizedDraftColor = (draftColor || '').trim();
  const normalizedDraftLogo = (draftLogo || '').trim();
  const currentColor = wallet?.customColor || '';
  const currentLogo = wallet?.customLogo || '';
  const hasCustomizationChanges =
    normalizedDraftColor !== currentColor || normalizedDraftLogo !== currentLogo;

  const handleSaveCustomization = useCallback(async () => {
    if (!wallet || !currentUser?.id) return;

    if (!hasCustomizationChanges) {
      setShowCustomizationModal(false);
      return;
    }

    setIsSavingCustomization(true);
    try {
      const result = await SharedWalletService.updateSharedWalletSettings({
        sharedWalletId: wallet.id,
        userId: currentUser.id.toString(),
        customColor: normalizedDraftColor || undefined,
        customLogo: normalizedDraftLogo || undefined,
      });

      if (result.success) {
        setCustomColor(normalizedDraftColor);
        setCustomLogo(normalizedDraftLogo);

        const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
        if (reloadResult.success && reloadResult.wallet) {
          setWallet(reloadResult.wallet);
        }

        setShowCustomizationModal(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to save customization');
      }
    } catch (error) {
      logger.error('Error saving customization', error as LogData, 'SharedWalletSettingsScreen');
      Alert.alert('Error', 'Failed to save customization');
    } finally {
      setIsSavingCustomization(false);
    }
  }, [
    wallet,
    currentUser?.id,
    normalizedDraftColor,
    normalizedDraftLogo,
    hasCustomizationChanges,
  ]);

  const handleGoalConfirm = useCallback(async () => {
    if (!wallet || !currentUser?.id) return;

    const parsedValue = parseFloat(goalInputValue);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid goal amount greater than zero.');
      return;
    }

    setIsSavingGoal(true);
    try {
      const result = await SharedWalletService.updateSharedWalletSettings({
        sharedWalletId: wallet.id,
        userId: currentUser.id.toString(),
        settings: {
          ...(wallet.settings ?? {}),
          goalAmount: parsedValue,
        },
      });

      if (result.success) {
        const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
        if (reloadResult.success && reloadResult.wallet) {
          setWallet(reloadResult.wallet);
        }
        setIsGoalModalVisible(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to save goal');
      }
    } catch (error) {
      logger.error('Error saving goal', error as LogData, 'SharedWalletSettingsScreen');
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setIsSavingGoal(false);
    }
  }, [wallet, currentUser?.id, goalInputValue]);

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
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionHeading}>Security</Text>
          <View style={styles.walletCard}>
            <View style={styles.walletInfoBlock}>
              <Text style={styles.cardLabel}>Wallet address</Text>
                <TouchableOpacity style={styles.walletValueRow} onPress={handleCopyAddress}>
                <Text style={styles.cardValue}>{truncatedAddress}</Text>

                  <PhosphorIcon name="CopySimple" size={16} color={colors.white70} weight="bold" />
                </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.walletActionButton, isFetchingPrivateKey && styles.walletActionButtonDisabled]}
              onPress={handleShowPrivateKey}
              disabled={isFetchingPrivateKey}
              activeOpacity={0.8}
            >
              {isFetchingPrivateKey ? (
                <ModernLoader size="small" text="" />
              ) : (
                <>
                  <PhosphorIcon name="Eye" size={16} color={colors.white} weight="regular"/>
                  <Text style={styles.walletActionText}>Private key</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionGroup}>
          <Text style={styles.sectionHeading}>Goal</Text>
          {!goalAmount ? (
            <TouchableOpacity style={styles.chipButton} onPress={handleSetGoal}>
              <PhosphorIcon name="Plus" size={16} color={colors.white} weight="bold" />
              <Text style={styles.chipButtonText}>Set up a goal</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.walletCard}>
              <View style={styles.goalTextBlock}>
                <Text style={styles.cardLabel}>Goal amount</Text>
                <Text style={styles.goalValue}>{formatBalance(goalAmount, wallet.currency)}</Text>
                {wallet.settings?.goalReachedAt && (
                  <Text style={styles.goalReachedText}>
                    🎉 Goal reached on {new Date(wallet.settings.goalReachedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.walletActionButton} onPress={handleSetGoal}>
                <PhosphorIcon name="PencilSimple" size={16} color={colors.white} weight="regular" />
                <Text style={styles.walletActionText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isCreator && (
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeading}>Wallet Settings</Text>
            <View style={styles.walletCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Allow member invites</Text>
                  <Text style={styles.settingDescription}>
                    Members can invite other users to join
                  </Text>
                </View>
                <Switch
                  value={wallet.settings?.allowMemberInvites ?? true}
                  onValueChange={async (value) => {
                    if (!currentUser?.id) return;
                    const result = await SharedWalletService.updateSharedWalletSettings({
                      sharedWalletId: wallet.id,
                      userId: currentUser.id.toString(),
                      settings: {
                        ...wallet.settings,
                        allowMemberInvites: value,
                      },
                    });
                    if (result.success) {
                      const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
                      if (reloadResult.success && reloadResult.wallet) {
                        setWallet(reloadResult.wallet);
                      }
                    }
                  }}
                  trackColor={{ false: colors.white10, true: colors.green }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <View style={styles.walletCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Require approval for withdrawals</Text>
                  <Text style={styles.settingDescription}>
                    Creator must approve all withdrawal requests
                  </Text>
                </View>
                <Switch
                  value={wallet.settings?.requireApprovalForWithdrawals ?? false}
                  onValueChange={async (value) => {
                    if (!currentUser?.id) return;
                    const result = await SharedWalletService.updateSharedWalletSettings({
                      sharedWalletId: wallet.id,
                      userId: currentUser.id.toString(),
                      settings: {
                        ...wallet.settings,
                        requireApprovalForWithdrawals: value,
                      },
                    });
                    if (result.success) {
                      const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
                      if (reloadResult.success && reloadResult.wallet) {
                        setWallet(reloadResult.wallet);
                      }
                    }
                  }}
                  trackColor={{ false: colors.white10, true: colors.green }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <View style={styles.walletCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Enable custom permissions</Text>
                  <Text style={styles.settingDescription}>
                    Allow custom permissions per member
                  </Text>
                </View>
                <Switch
                  value={wallet.settings?.enableCustomPermissions ?? false}
                  onValueChange={async (value) => {
                    if (!currentUser?.id) return;
                    const result = await SharedWalletService.updateSharedWalletSettings({
                      sharedWalletId: wallet.id,
                      userId: currentUser.id.toString(),
                      settings: {
                        ...wallet.settings,
                        enableCustomPermissions: value,
                      },
                    });
                    if (result.success) {
                      const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
                      if (reloadResult.success && reloadResult.wallet) {
                        setWallet(reloadResult.wallet);
                      }
                    }
                  }}
                  trackColor={{ false: colors.white10, true: colors.green }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            {wallet.settings?.maxMembers && (
              <View style={styles.walletCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Max members</Text>
                    <Text style={styles.settingDescription}>
                      Maximum number of members: {wallet.settings.maxMembers}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {isCreator && (
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeading}>Customization</Text>
            <TouchableOpacity
              style={styles.walletCard}
              onPress={() => handleOpenCustomizationModal('icon')}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconBadge}>
                {customLogo ? (
                  customLogo.startsWith('http') || customLogo.startsWith('file:') ? (
                    <Image source={{ uri: customLogo }} style={styles.optionLogoImage} />
                  ) : (
                    <PhosphorIcon name={customLogo as any} size={24} color={colors.white} weight="regular" />
                  )
                ) : (
                  <PhosphorIcon name="Cards" size={24} color={colors.white} weight="regular" />
                )}
              </View>
              <View style={styles.optionTextBlock}>
                <Text style={styles.optionTitle}>Icon</Text>
                <Text style={styles.optionSubtitle}>Select your group icon</Text>
              </View>
              <PhosphorIcon name="PencilSimple" size={18} color={colors.white70} weight="regular" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.walletCard}
              onPress={() => handleOpenCustomizationModal('color')}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconBadge}>
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: customColor || colors.walletPurple },
                  ]}
                />
              </View>
              <View style={styles.optionTextBlock}>
                <Text style={styles.optionTitle}>Main color</Text>
                <Text style={styles.optionSubtitle}>Select your wallet main color</Text>
              </View>
              <PhosphorIcon name="PencilSimple" size={18} color={colors.white70} weight="regular" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Goal Modal */}
      <Modal
        visible={isGoalModalVisible}
        onClose={handleCloseGoalModal}
        title={goalAmount ? 'Change goal' : 'Set up a goal'}
      >
        <Input
          label="Goal amount"
          placeholder="Enter goal amount"
          value={goalInputValue}
          onChangeText={setGoalInputValue}
          keyboardType="decimal-pad"
          autoFocus
        />
        <Button
          title="Confirm"
          onPress={handleGoalConfirm}
          loading={isSavingGoal}
          disabled={isSavingGoal}
          variant="primary"
        />
      </Modal>

      {/* Customization Modal */}
      <Modal
        visible={showCustomizationModal}
        onClose={() => setShowCustomizationModal(false)}
        title="Customize Wallet"
        maxHeight={700}
      >
        <Tabs
          tabs={[
            { label: 'Icon', value: 'icon' },
            { label: 'Color', value: 'color' },
          ]}
          activeTab={customizationTab}
          onTabChange={(tab) => setCustomizationTab(tab as 'icon' | 'color')}
        />
        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {customizationTab === 'icon' ? (
            <View style={styles.iconPreviewSection}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.iconPreviewCard}>
                {draftLogo ? (
                  draftLogo.startsWith('http') || draftLogo.startsWith('file:') ? (
                    <Image source={{ uri: draftLogo }} style={styles.iconPreviewImage} resizeMode="contain" />
                  ) : (
                    <PhosphorIcon name={draftLogo as any} size={40} color={colors.white} weight="bold" />
                  )
                ) : (
                  <PhosphorIcon name="Cards" size={40} color={colors.white} weight="bold" />
                )}
              </View>
              <LogoPicker selectedLogo={draftLogo} onSelectLogo={setDraftLogo} />
            </View>
          ) : (
            <ColorPicker selectedColor={draftColor} onSelectColor={setDraftColor} />
          )}
        </ScrollView>
        <Button
          title="Save"
          onPress={handleSaveCustomization}
          loading={isSavingCustomization}
          disabled={!hasCustomizationChanges || isSavingCustomization}
          fullWidth
          style={styles.modalSaveButton}
        />
      </Modal>

      {/* Private Key Modal */}
      <Modal
        visible={showPrivateKeyModal && !!privateKey}
        onClose={handleClosePrivateKeyModal}
        showHandle={true}
        title="Private Key"
        maxHeight={500}
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
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionGroup: {
    gap: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  cardLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white50,
  },
  cardValue: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  goalValue: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  goalTextBlock: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  goalChangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goalChangeText: {
    fontSize: typography.fontSize.sm,
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  modalSaveButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: spacing.md,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  walletInfoBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  walletValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  copyButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  walletActionButtonDisabled: {
    opacity: 0.6,
  },
  walletActionText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  chipButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: colors.white5,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  chipButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  optionIconBadge: {
    width: 44,
    height: 44,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  optionIconBadgePlain: {
    backgroundColor: colors.white5,
  },
  optionLogoImage: {
    width: 44,
    height: 44,
    resizeMode: 'cover',
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: spacing.sm,
  },
  optionTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  optionTitle: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  optionSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
  },
  iconPreviewSection: {
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconPreviewCard: {
    height: 160,
    borderRadius: spacing.lg,
    backgroundColor: colors.white5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.white10,
  },
  iconPreviewImage: {
    width: 160,
    height: 120,
    borderRadius: spacing.md,
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
  customizationTabs: {
    flexDirection: 'row',
    backgroundColor: colors.white5,
    borderRadius: spacing.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  customizationTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    alignItems: 'center',
  },
  customizationTabActive: {
    backgroundColor: colors.white,
  },
  customizationTabText: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  customizationTabTextActive: {
    color: colors.black,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  goalReachedText: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    marginTop: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
});

export default SharedWalletSettingsScreen;



/**
 * Member Rights Management Screen
 * Allows creators/admins to manage member permissions and roles
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Container,
  Header,
  ModernLoader,
  Button,
  Avatar,
  PhosphorIcon,
  Input,
  ErrorScreen,
} from '../../components/shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SharedWalletService, SharedWallet, SharedWalletMember } from '../../services/sharedWallet';
import { MemberRightsService } from '../../services/sharedWallet/MemberRightsService';
import { useApp } from '../../context/AppContext';
import { logger, LogData } from '../../services/analytics/loggingService';

const MemberRightsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { state } = useApp();
  const { currentUser } = state;

  const { walletId, wallet: routeWallet } = route.params || {};

  const [wallet, setWallet] = useState<SharedWallet | null>(routeWallet || null);
  const [isLoading, setIsLoading] = useState(!routeWallet);
  const [selectedMember, setSelectedMember] = useState<SharedWalletMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<Partial<import('../../services/sharedWallet/types').SharedWalletMemberPermissions>>({});
  const [withdrawalLimit, setWithdrawalLimit] = useState('');
  const [dailyWithdrawalLimit, setDailyWithdrawalLimit] = useState('');

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
        navigation.goBack();
        return;
      }

      setIsLoading(true);
      try {
        const result = await SharedWalletService.getSharedWallet(walletId);
        if (result.success && result.wallet) {
          setWallet(result.wallet);
        } else {
          Alert.alert('Error', result.error || 'Failed to load shared wallet');
          navigation.goBack();
        }
      } catch (error) {
        logger.error('Error loading shared wallet', error as LogData, 'MemberRightsScreen');
        Alert.alert('Error', 'Failed to load shared wallet');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadWallet();
  }, [walletId, routeWallet, navigation]);

  // Initialize permissions when member is selected
  useEffect(() => {
    if (selectedMember && wallet) {
      const currentPermissions = MemberRightsService.getMemberPermissions(selectedMember, wallet);
      setPermissions({
        canInviteMembers: currentPermissions.canInviteMembers,
        canWithdraw: currentPermissions.canWithdraw,
        canManageSettings: currentPermissions.canManageSettings,
        canRemoveMembers: currentPermissions.canRemoveMembers,
        canViewTransactions: currentPermissions.canViewTransactions,
        canFund: currentPermissions.canFund,
      });
      setWithdrawalLimit(currentPermissions.withdrawalLimit?.toString() || '');
      setDailyWithdrawalLimit(currentPermissions.dailyWithdrawalLimit?.toString() || '');
    }
  }, [selectedMember, wallet]);

  const handleBack = useCallback(() => {
    // If viewing a selected member, go back to member list
    if (selectedMember) {
      setSelectedMember(null);
      return;
    }
    
    // Otherwise, go back to wallet details
    if (wallet) {
      navigation.navigate('SharedWalletDetails', {
        walletId: wallet.id,
        wallet: wallet,
      });
    } else {
      navigation.goBack();
    }
  }, [wallet, navigation, selectedMember]);

  const handleSelectMember = (member: SharedWalletMember) => {
    // Cannot edit creator
    if (member.role === 'creator') {
      Alert.alert('Info', 'Creator permissions cannot be modified');
      return;
    }

    setSelectedMember(member);
  };

  const handleSavePermissions = useCallback(async () => {
    if (!wallet || !selectedMember || !currentUser?.id) return;

    setIsSaving(true);
    try {
      const updates: Partial<import('../../services/sharedWallet/types').SharedWalletMemberPermissions> = {
        ...permissions,
      };

      // Add withdrawal limits if provided
      if (withdrawalLimit.trim()) {
        const limit = parseFloat(withdrawalLimit);
        if (!isNaN(limit) && limit > 0) {
          updates.withdrawalLimit = limit;
        }
      }

      if (dailyWithdrawalLimit.trim()) {
        const limit = parseFloat(dailyWithdrawalLimit);
        if (!isNaN(limit) && limit > 0) {
          updates.dailyWithdrawalLimit = limit;
        }
      }

      // Update permissions
      const result = await SharedWalletService.updateMemberPermissions(
        wallet.id,
        selectedMember.userId,
        currentUser.id.toString(),
        updates
      );

      if (result.success) {
        // Reload wallet
        const reloadResult = await SharedWalletService.getSharedWallet(wallet.id);
        if (reloadResult.success && reloadResult.wallet) {
          setWallet(reloadResult.wallet);
        }

        Alert.alert('Success', 'Member permissions updated successfully', [
          { text: 'OK', onPress: () => setSelectedMember(null) },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to update permissions');
      }
    } catch (error) {
      logger.error('Error saving permissions', error as LogData, 'MemberRightsScreen');
      Alert.alert('Error', 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  }, [wallet, selectedMember, currentUser?.id, permissions, withdrawalLimit, dailyWithdrawalLimit]);

  if (isLoading) {
    return (
      <Container>
        <Header
          title="Manage Rights"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ModernLoader size="large" text="Loading..." />
        </View>
      </Container>
    );
  }

  if (!wallet) {
    return (
      <Container>
        <Header
          title="Manage Rights"
          onBackPress={handleBack}
          showBackButton={true}
        />
      </Container>
    );
  }

  const isCreator = wallet.creatorId === currentUser?.id?.toString();
  const currentUserMember = wallet.members.find((m) => m.userId === currentUser?.id?.toString());
  const canManage = isCreator || currentUserMember?.role === 'admin';

  if (!canManage) {
    return (
      <Container>
        <Header
          title="Manage Rights"
          onBackPress={handleBack}
          showBackButton={true}
        />
        <ErrorScreen
          title="Access Denied"
          message="Only creator or admin can manage member rights"
          onRetry={handleBack}
          retryText="Go Back"
          showIcon={false}
        />
      </Container>
    );
  }

  // Show all members, but creator cannot be edited
  const allMembers = wallet.members;

  return (
    <Container>
      <Header
        title={selectedMember ? selectedMember.name : "Manage Rights"}
        onBackPress={handleBack}
        showBackButton={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {!selectedMember ? (
          <>
            <Text style={styles.sectionTitle}>Select Member</Text>
            <View style={styles.membersList}>
              {allMembers.map((member) => {
                const memberPermissions = MemberRightsService.getMemberPermissions(member, wallet);
                const isCreator = member.role === 'creator';
                const isCurrentUser = member.userId === currentUser?.id?.toString();
                const canEdit = !isCreator; // Creator cannot be edited
                
                return (
                  <TouchableOpacity
                    key={member.userId}
                    style={[styles.memberCard, !canEdit && styles.memberCardDisabled]}
                    onPress={() => canEdit ? handleSelectMember(member) : undefined}
                    activeOpacity={canEdit ? 0.8 : 1}
                    disabled={!canEdit}
                  >
                    <Avatar
                      userId={member.userId}
                      userName={member.name}
                      size={48}
                      style={styles.memberAvatar}
                    />
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        {isCurrentUser && (
                          <Text style={styles.youLabel}> (You)</Text>
                        )}
                      </View>
                      <Text style={styles.memberRole}>
                        {member.role === 'creator' ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member'}
                      </Text>
                      <View style={styles.permissionsPreview}>
                        <Text style={styles.permissionsText}>
                          {Object.values(memberPermissions).filter(Boolean).length} permissions active
                        </Text>
                      </View>
                    </View>
                    {canEdit ? (
                      <PhosphorIcon name="CaretRight" size={spacing.iconSizeSmall} color={colors.white70} weight="regular" />
                    ) : (
                      <PhosphorIcon name="Lock" size={spacing.iconSizeSmall} color={colors.white30} weight="regular" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <View style={styles.selectedMemberHeader}>
              <View style={styles.selectedMemberInfo}>
                <Avatar
                  userId={selectedMember.userId}
                  userName={selectedMember.name}
                  size={56}
                  style={styles.selectedMemberAvatar}
                />
                <View style={styles.selectedMemberNameContainer}>
                  <Text style={styles.selectedMemberName}>{selectedMember.name}</Text>
                  {selectedMember.userId === currentUser?.id?.toString() && (
                    <Text style={styles.youLabel}> (You)</Text>
                  )}
                </View>
              </View>
            </View>


            <View style={styles.permissionsSection}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              {Object.entries({
                canInviteMembers: 'Invite Members',
                canWithdraw: 'Withdraw Funds',
                canManageSettings: 'Manage Settings',
                canRemoveMembers: 'Remove Members',
                canViewTransactions: 'View Transactions',
                canFund: 'Add Funds',
              }).map(([key, label]) => (
                <View key={key} style={styles.permissionRow}>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionLabel}>{label}</Text>
                    <Text style={styles.permissionDescription}>
                      {key === 'canInviteMembers' && 'Allow inviting new members'}
                      {key === 'canWithdraw' && 'Allow withdrawing funds from wallet'}
                      {key === 'canManageSettings' && 'Allow modifying wallet settings'}
                      {key === 'canRemoveMembers' && 'Allow removing other members'}
                      {key === 'canViewTransactions' && 'Allow viewing transaction history'}
                      {key === 'canFund' && 'Allow adding funds to wallet'}
                    </Text>
                  </View>
                  <Switch
                    value={permissions[key as keyof typeof permissions] as boolean}
                    onValueChange={(value) =>
                      setPermissions((prev) => ({ ...prev, [key]: value }))
                    }
                    trackColor={{ false: colors.white10, true: colors.green }}
                    thumbColor={colors.white}
                  />
                </View>
              ))}
            </View>

            <View style={styles.permissionsSection}>
              <Text style={styles.sectionTitle}>Withdrawal Limits</Text>
              <Input
                label="Per Transaction Limit"
                placeholder="Enter limit (optional)"
                value={withdrawalLimit}
                onChangeText={setWithdrawalLimit}
                keyboardType="decimal-pad"
                containerStyle={styles.limitInput}
              />
              <Input
                label="Daily Limit"
                placeholder="Enter daily limit (optional)"
                value={dailyWithdrawalLimit}
                onChangeText={setDailyWithdrawalLimit}
                keyboardType="decimal-pad"
                containerStyle={styles.limitInput}
              />
            </View>

            <Button
              title="Save Changes"
              onPress={handleSavePermissions}
              loading={isSaving}
              disabled={isSaving}
              variant="primary"
              fullWidth
              style={styles.saveButton}
            />
          </>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  membersList: {
    gap: spacing.md,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    gap: spacing.md,
  },
  memberCardDisabled: {
    opacity: 0.6,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  youLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    fontStyle: 'italic',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: spacing.radiusRound / 2,
  },
  memberInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  memberName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  memberRole: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  permissionsPreview: {
    marginTop: spacing.xs,
  },
  permissionsText: {
    fontSize: typography.fontSize.xs,
    color: colors.white50,
  },
  selectedMemberHeader: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: spacing.borderWidthThin,
    borderBottomColor: colors.white10,
  },
  selectedMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedMemberNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  selectedMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: spacing.radiusRound / 2,
  },
  selectedMemberName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  permissionsSection: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: spacing.borderWidthThin,
    borderBottomColor: colors.white10,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  permissionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  permissionLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.xs / 2,
  },
  permissionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  limitInput: {
    marginBottom: spacing.md,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});

export default MemberRightsScreen;

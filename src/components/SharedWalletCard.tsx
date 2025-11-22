/**
 * Shared Wallet Card Component
 * Displays a shared wallet in the list view
 * Consistent with SplitCard styling
 * 
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar, PhosphorIcon } from './shared';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { SharedWallet } from '../services/sharedWallet';

interface SharedWalletCardProps {
  wallet: SharedWallet;
  currentUserId?: string;
  onPress: (wallet: SharedWallet) => void;
}

const SharedWalletCard: React.FC<SharedWalletCardProps> = ({
  wallet,
  currentUserId,
  onPress,
}) => {
  // Memoize computed values to prevent recalculation on every render
  const isCreator = useMemo(() => wallet.creatorId === currentUserId, [wallet.creatorId, currentUserId]);
  
  const userMember = useMemo(
    () => wallet.members.find(m => m.userId === currentUserId),
    [wallet.members, currentUserId]
  );
  
  const userContribution = useMemo(() => userMember?.totalContributed || 0, [userMember?.totalContributed]);
  const userWithdrawn = useMemo(() => userMember?.totalWithdrawn || 0, [userMember?.totalWithdrawn]);
  const userBalance = useMemo(() => userContribution - userWithdrawn, [userContribution, userWithdrawn]);

  // Memoize formatter function to prevent recreation on every render
  // Handle USDC as a special case since it's not a standard ISO 4217 currency code
  const formatBalance = useCallback((amount: number) => {
    const currency = wallet.currency || 'USDC';
    
    // USDC is not a valid ISO 4217 currency code, so format without currency style
    if (currency === 'USDC') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      }).format(amount) + ' USDC';
    }
    
    // For other currencies, use standard currency formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  }, [wallet.currency]);

  // Memoize formatted values
  const formattedTotalBalance = useMemo(() => formatBalance(wallet.totalBalance), [formatBalance, wallet.totalBalance]);
  const formattedUserContribution = useMemo(() => formatBalance(userContribution), [formatBalance, userContribution]);
  const formattedUserBalance = useMemo(() => formatBalance(userBalance), [formatBalance, userBalance]);

  // Memoize press handler
  const handlePress = useCallback(() => {
    onPress(wallet);
  }, [onPress, wallet]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {/* Wallet Icon/Logo - smaller, similar to split cards */}
          <View style={[
            styles.iconContainer,
            wallet.customColor && { backgroundColor: wallet.customColor + '20' }
          ]}>
            {wallet.customLogo ? (
              // Check if customLogo is a URL (starts with http) or a Phosphor icon name
              wallet.customLogo.startsWith('http') ? (
                // Custom URL logo (future support)
                <Text style={styles.logoText}>{wallet.customLogo}</Text>
              ) : (
                // Phosphor icon
                <PhosphorIcon
                  name={wallet.customLogo as any}
                  size={24}
                  color={wallet.customColor || colors.green}
                  weight="bold"
                />
              )
            ) : (
              <PhosphorIcon
                name="Wallet"
                size={24}
                color={wallet.customColor || colors.green}
                weight="fill"
              />
            )}
          </View>

          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {wallet.name}
            </Text>
            <View style={styles.roleContainer}>
              <PhosphorIcon
                name={isCreator ? 'Crown' : 'User'}
                size={12}
                color={isCreator ? (wallet.customColor || colors.green) : colors.white70}
                weight="fill"
              />
              <Text style={styles.roleText}>
                {isCreator ? 'Owner' : 'Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[
          styles.statusBadge, 
          styles.statusBadgeActive,
          wallet.customColor && { backgroundColor: wallet.customColor + '20' }
        ]}>
          <View style={[
            styles.statusDot, 
            styles.statusDotActive,
            wallet.customColor && { backgroundColor: wallet.customColor }
          ]} />
          <Text style={[
            styles.statusText, 
            styles.statusTextActive,
            wallet.customColor && { color: wallet.customColor }
          ]}>
            {wallet.status === 'active' ? 'Active' : wallet.status}
          </Text>
        </View>
      </View>

      {/* Bottom section with avatars and arrow - similar to split cards */}
      <View style={styles.cardBottom}>
        <View style={styles.memberAvatars}>
          {wallet.members.slice(0, 3).map((member, index) => (
            <Avatar
              key={member.userId}
              userId={member.userId}
              userName={member.name}
              avatarUrl={undefined}
              size={32}
              style={[
                styles.memberAvatar,
                index > 0 && styles.memberAvatarOverlap,
              ]}
            />
          ))}
          {wallet.members.length > 3 && (
            <View style={[styles.memberAvatar, styles.memberAvatarOverlay]}>
              <Text style={styles.memberAvatarOverlayText}>
                +{wallet.members.length - 3}
              </Text>
            </View>
          )}
        </View>
        <PhosphorIcon
          name="CaretRight"
          size={20}
          color={colors.white70}
          weight="regular"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'column',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.sm,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white10,
  },
  logoText: {
    fontSize: 24,
  },
  cardTitleContainer: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  roleText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
    gap: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  statusBadgeActive: {
    backgroundColor: colors.greenBlue20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: colors.green,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  statusTextActive: {
    color: colors.green,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    borderWidth: 2,
    borderColor: colors.blackWhite5,
  },
  memberAvatarOverlap: {
    marginLeft: -8,
  },
  memberAvatarOverlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.blackWhite5,
    marginLeft: -8,
  },
  memberAvatarOverlayText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});

// Memoize component to prevent unnecessary re-renders when parent updates
// Returns true if props are equal (skip re-render), false if different (re-render)
export default React.memo(SharedWalletCard, (prevProps, nextProps) => {
  // Only re-render if wallet data or currentUserId changes
  // Check all relevant properties that affect rendering
  const propsEqual = 
    prevProps.wallet.id === nextProps.wallet.id &&
    prevProps.wallet.totalBalance === nextProps.wallet.totalBalance &&
    prevProps.wallet.members.length === nextProps.wallet.members.length &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.wallet.status === nextProps.wallet.status &&
    prevProps.wallet.name === nextProps.wallet.name &&
    prevProps.wallet.currency === nextProps.wallet.currency &&
    prevProps.wallet.customColor === nextProps.wallet.customColor &&
    prevProps.wallet.customLogo === nextProps.wallet.customLogo;
  
  return propsEqual;
});


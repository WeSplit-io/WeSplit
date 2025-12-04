/**
 * Shared Wallet Hero Card
 * Dedicated to the detail screen to allow bespoke styling.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PhosphorIcon } from './shared';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { SharedWallet } from '../services/sharedWallet';
import { formatBalance } from '../utils/ui/format/formatUtils';

const CARD_HEIGHT = 190;
const DEFAULT_WALLET_COLORS = [
  colors.walletPurple,
  colors.walletGreen,
  colors.walletOrange,
  colors.walletBlue,
  colors.walletRed,
  colors.walletMagenta,
];

interface SharedWalletHeroCardProps {
  wallet: SharedWallet;
  colorIndex?: number;
  style?: StyleProp<ViewStyle>;
}

const SharedWalletHeroCard: React.FC<SharedWalletHeroCardProps> = ({
  wallet,
  colorIndex = 0,
  style,
}) => {
  const walletColor = useMemo<string>(
    () =>
      (wallet.customColor ?? DEFAULT_WALLET_COLORS[colorIndex % DEFAULT_WALLET_COLORS.length]) as string,
    [wallet.customColor, colorIndex]
  );

  const middleLayerColor = colors.black70;
  const formattedBalance = useMemo(
    () => formatBalance(wallet.totalBalance, (wallet.currency ?? 'USDC') as string),
    [wallet.totalBalance, wallet.currency]
  );
  return (
    <View style={[styles.container, { backgroundColor: walletColor }, style]}>
      <View style={styles.containerOverlay} />
      <View style={[styles.layer, styles.layerMiddle, { backgroundColor: middleLayerColor }]} />
      <View style={[styles.layerFront, { backgroundColor: walletColor }]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0.15)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.frontGradient}
          pointerEvents="none"
        />
        <View style={styles.iconWrapper}>
          {wallet.customLogo ? (
            wallet.customLogo.startsWith('http') || wallet.customLogo.startsWith('file:') ? (
              <Image source={{ uri: wallet.customLogo }} style={styles.heroLogoImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroLogoIconContainer}>
                <PhosphorIcon name={wallet.customLogo as any} size={36} color={colors.white} weight="regular" />
              </View>
            )
          ) : (
            <PhosphorIcon name="Cards" size={36} color={colors.white} weight="regular" />
          )}
        </View>
        <Text style={styles.balanceText}>{formattedBalance}</Text>
        <Text style={styles.balanceLabel}>Total Balance</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: CARD_HEIGHT + spacing.xl,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: spacing.xl,
    borderWidth: 1,
    borderColor: colors.white10,
    overflow: 'hidden',
  },
  containerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.black20,
    borderRadius: spacing.xl,
  },
  layer: {
    position: 'absolute',
    borderRadius: spacing.xl,
    left: spacing.sm,
    right: spacing.sm,
  },

  layerMiddle: {
    height: CARD_HEIGHT - spacing.sm,
    top: spacing.md,
  },
  layerFront: {
    height: CARD_HEIGHT,
    borderRadius: spacing.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  frontGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: spacing.xl,
  },
  iconWrapper: {
    backgroundColor: colors.black20,
    borderRadius: spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  balanceText: {
    fontSize: typography.fontSize.xxxl + typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
  balanceLabel: {
    fontSize: typography.fontSize.md,
    color: colors.white80,
    marginTop: spacing.xs,
  },
  heroLogoIconContainer: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
  heroLogoImage: {
    width: 50,
    height: 50,
  },
});

export default SharedWalletHeroCard;



/**
 * Shared Wallet Grid Card Component
 * Displays a shared wallet in a colorful grid card format
 * Used in the Shared Wallets tab
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PhosphorIcon } from './shared';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { SharedWallet } from '../services/sharedWallet';

// Calculate card width + height for 2-column layout without stretching
const CARD_ASPECT_RATIO = 0.8; // shorter cards
const CARD_WIDTH_SCALE = 1; // make cards slightly narrower than their column
const getCardDimensions = () => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const containerPadding = spacing.lg * 2;
  const interCardGap = spacing.sm; // single gap between 2 columns
  const baseWidth = (SCREEN_WIDTH - containerPadding - interCardGap) / 2;
  const cardWidth = baseWidth * CARD_WIDTH_SCALE;
  return {
    width: cardWidth,
    height: cardWidth * CARD_ASPECT_RATIO,
  };
};

interface SharedWalletGridCardProps {
  wallet: SharedWallet;
  onPress?: (wallet: SharedWallet) => void;
  colorIndex?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'grid' | 'hero';
  heroSubtitle?: string;
}

// Array of wallet colors for customization
const WALLET_COLORS = [
  colors.walletPurple,
  colors.walletGreen,
  colors.walletOrange,
  colors.walletBlue,
  colors.walletRed,
  colors.walletMagenta,
];

const SharedWalletGridCard: React.FC<SharedWalletGridCardProps> = ({
  wallet,
  onPress,
  colorIndex = 0,
  style,
  variant = 'grid',
  heroSubtitle = 'Total Balance',
}) => {
  // Calculate card size dynamically to avoid vertical stretching
  const cardDimensions = useMemo(() => getCardDimensions(), []);
  
  // Get wallet color - use customColor if available, otherwise cycle through default colors
  const walletColor = useMemo(() => {
    if (wallet.customColor) {
      return wallet.customColor;
    }
    return WALLET_COLORS[colorIndex % WALLET_COLORS.length];
  }, [wallet.customColor, colorIndex]);

  // Format balance
  const formatBalance = useCallback((amount: number) => {
    const currency = wallet.currency || 'USDC';
    
    if (currency === 'USDC') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' USDC';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [wallet.currency]);

  const formattedBalance = useMemo(() => formatBalance(wallet.totalBalance), [formatBalance, wallet.totalBalance]);

  // Get wallet icon
  const isLogoImage =
    typeof wallet.customLogo === 'string' &&
    (wallet.customLogo.startsWith('http') || wallet.customLogo.startsWith('file:'));
  const walletIcon = useMemo(() => {
    if (wallet.customLogo && !wallet.customLogo.startsWith('http')) {
      return wallet.customLogo as any;
    }
    return 'Cards';
  }, [wallet.customLogo]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(wallet);
    }
  }, [onPress, wallet]);

  const cardStyle = useMemo<StyleProp<ViewStyle>>(
    () => ([
      styles.card,
      {
        backgroundColor: walletColor,
        width: cardDimensions.width,
        height: cardDimensions.height,
        marginBottom: spacing.md,
      },
      style,
    ]),
    [walletColor, cardDimensions.height, cardDimensions.width, style]
  );

  const isHero = variant === 'hero';

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={handlePress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      {/* Black20 overlay on top of the card color */}
      <View style={styles.cardOverlay} />
      <View style={styles.cardItem}></View>
      
      {/* Card content with wallet color and gradient overlay */}
      <View style={[styles.cardContent, { backgroundColor: walletColor }]}>
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.00)',
            'rgba(255, 255, 255, 0.15)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.gradientOverlay, isHero && styles.heroGradientOverlay]}
        >
        {/* Icon */}
        <View style={[styles.iconContainer, isHero && styles.heroIconContainer]}>
          {isLogoImage && wallet.customLogo ? (
            <Image
              source={{ uri: wallet.customLogo }}
              style={styles.iconImageFill}
            />
          ) : (
            <View style={[styles.iconFallback, isHero && styles.iconFallbackHero]}>
              <PhosphorIcon
                name={walletIcon}
                size={isHero ? 32 : 20}
                color={colors.white}
                weight={isHero ? 'fill' : 'regular'}
              />
            </View>
          )}
        </View>

        {isHero ? (
          <>
            <Text style={styles.heroBalance} numberOfLines={1}>
              {formattedBalance}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {heroSubtitle}
            </Text>
          </>
        ) : (
          <>
            {/* Wallet Name */}
            <Text style={styles.walletName} numberOfLines={1}>
              {wallet.name}
            </Text>

            {/* Balance */}
            <Text style={styles.balance} numberOfLines={1}>
              {formattedBalance}
            </Text>
          </>
        )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.lg,
    minHeight: 120,
    justifyContent: 'flex-start',
    flexShrink: 0,
    flexGrow: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.white10,
    alignSelf: 'center',


  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.black20,
    borderRadius: spacing.md,
  },
  cardItem: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    height: 10,
    borderTopLeftRadius: spacing.md,
    borderTopRightRadius: spacing.md,
    backgroundColor: colors.black20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-start',
    borderRadius: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.white10,

  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: spacing.md,
  },
  heroGradientOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.sm,
    borderRadius: spacing.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    backgroundColor: colors.black15,
  },
  heroIconContainer: {
    alignSelf: 'center',
  },
  iconImageFill: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackHero: {
    backgroundColor: colors.black20,
  },
  walletName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  balance: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  heroBalance: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs / 2,
  },
  heroSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white80,
    textAlign: 'center',
  },
});

export default React.memo(SharedWalletGridCard);


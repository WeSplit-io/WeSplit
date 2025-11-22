/**
 * SPEND Split Header Component
 * Displays SPEND order information and navigation
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import Header from '../../../components/shared/Header';
import { SpendOrderBadge } from '../../../components/spend';
import { StyleSheet } from 'react-native';

// Local image mapping for category icons
const CATEGORY_IMAGES_LOCAL: { [key: string]: any } = {
  trip: require('../../../../assets/trip-icon-black.png'),
  food: require('../../../../assets/food-icon-black.png'),
  home: require('../../../../assets/house-icon-black.png'),
  event: require('../../../../assets/event-icon-black.png'),
  rocket: require('../../../../assets/rocket-icon-black.png'),
};

interface SpendSplitHeaderProps {
  billName: string;
  billDate: string;
  totalAmount: number;
  category?: string;
  orderId?: string;
  onBackPress: () => void;
}

const SpendSplitHeader: React.FC<SpendSplitHeaderProps> = ({
  billName,
  billDate,
  totalAmount,
  category = 'food',
  orderId,
  onBackPress,
}) => {
  return (
    <>
      {/* Navigation Header */}
      <Header 
        title="SPEND Order"
        onBackPress={onBackPress}
        showBackButton={true}
        rightElement={<SpendOrderBadge variant="compact" />}
      />

      {/* Order Summary Card */}
      <LinearGradient
        colors={[colors.green, colors.greenBlue]}
        style={styles.orderCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* SPEND Badge at top */}
        <View style={styles.spendBadgeContainer}>
          <SpendOrderBadge variant="compact" />
        </View>

        <View style={styles.orderHeader}>
          <View style={styles.iconContainer}>
            <Image
              source={CATEGORY_IMAGES_LOCAL[category] || CATEGORY_IMAGES_LOCAL.food}
              style={styles.orderIconImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.orderTitleContainer}>
            <Text style={styles.orderTitle} numberOfLines={2}>
              {billName}
            </Text>
            <View style={styles.orderMetaContainer}>
              <Text style={styles.orderDate}>
                {new Date(billDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Text>
              {orderId && (
                <View style={styles.orderIdContainer}>
                  <Text style={styles.orderIdLabel}>Order ID:</Text>
                  <Text style={styles.orderId} numberOfLines={1}>
                    {orderId}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.orderAmountContainer}>
          <Text style={styles.orderAmountLabel}>Order Total</Text>
          <Text style={styles.orderAmountUSDC}>
            ${(totalAmount || 0).toFixed(2)}
          </Text>
          <Text style={styles.orderAmountCurrency}>USDC</Text>
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 20,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  spendBadgeContainer: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.black + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orderIconImage: {
    width: 48,
    height: 48,
  },
  orderTitleContainer: {
    flex: 1,
  },
  orderTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.sm,
    lineHeight: typography.fontSize.xl * 1.3,
  },
  orderMetaContainer: {
    gap: spacing.xs / 2,
  },
  orderDate: {
    fontSize: typography.fontSize.sm,
    color: colors.black + 'CC',
    fontWeight: typography.fontWeight.medium,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
    gap: spacing.xs / 2,
  },
  orderIdLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.black + '99',
    fontWeight: typography.fontWeight.medium,
  },
  orderId: {
    fontSize: typography.fontSize.xs,
    color: colors.black + 'CC',
    fontFamily: 'monospace',
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  orderAmountContainer: {
    borderTopWidth: 2,
    borderTopColor: colors.black + '25',
    paddingTop: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.black + '08',
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
    paddingBottom: spacing.lg,
    borderRadius: 0,
  },
  orderAmountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.black + 'CC',
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderAmountUSDC: {
    fontSize: 36,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.xs / 2,
  },
  orderAmountCurrency: {
    fontSize: typography.fontSize.md,
    color: colors.black + 'CC',
    fontWeight: typography.fontWeight.semibold,
  },
});

export default SpendSplitHeader;


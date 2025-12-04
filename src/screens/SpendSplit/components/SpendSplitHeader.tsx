/**
 * SPEND Split Header Component
 * Displays SPEND order information and navigation
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import Header from '../../../components/shared/Header';
import { SpendOrderBadge } from '../../../components/spend';
import PhosphorIcon from '../../../components/shared/PhosphorIcon';
import { StyleSheet } from 'react-native';
import { Split } from '../../../services/splits/splitStorageService';
import { formatAmountWithComma } from '../../../utils/ui/format/formatUtils';
import { extractOrderData } from '../../../utils/spend/spendDataUtils';

interface SpendSplitHeaderProps {
  billName: string;
  billDate: string;
  totalAmount: number;
  category?: string;
  orderId?: string;
  orderNumber?: string; // SP3ND order number (e.g., "ORD-1234567890")
  orderStatus?: string; // SP3ND order status (e.g., "Pending", "Paid")
  store?: string; // Store name (e.g., "amazon", "temu", "jumia")
  split?: Split; // Split data for order items
  onBackPress: () => void;
  onSettingsPress?: () => void; // Callback for settings icon button
}

const SpendSplitHeader: React.FC<SpendSplitHeaderProps> = ({
  billName,
  billDate,
  totalAmount,
  category = 'food',
  orderId,
  orderNumber,
  orderStatus,
  store,
  split,
  onBackPress,
  onSettingsPress,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  // Memoize order number formatting
  const displayOrderNumber = useMemo(() => {
    const formatOrderNumber = (num: string | undefined) => {
      if (!num) return null;
      if (num.includes('-')) {
        const parts = num.split('-');
        return parts[parts.length - 1];
      }
      return num;
    };
    return formatOrderNumber(orderNumber) || formatOrderNumber(orderId) || 'N/A';
  }, [orderNumber, orderId]);

  // Memoize status display
  const statusDisplay = useMemo(() => {
    if (!orderStatus) return null;
    const statusLower = orderStatus.toLowerCase();

    const statusMap: Record<string, string> = {
      'created': 'Pending',
      'payment_pending': 'Pending',
      'funded': 'Paid',
      'paid': 'Paid',
      'processing': 'Processing',
      'ordered': 'Processing',
      'shipped': 'Shipped',
      'partially_shipped': 'Shipped',
      'delivered': 'Delivered',
      'partially_delivered': 'Delivered',
      'completed': 'Completed',
      'canceled': 'Canceled',
      'cancelled': 'Canceled',
      'refunded': 'Refunded',
      'international_processing': 'Processing',
      'ready_for_payment': 'Ready',
      'international_paid': 'Paid',
    };

    return statusMap[statusLower] || orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1).toLowerCase();
  }, [orderStatus]);

  // Memoize date formatting
  const formattedDate = useMemo(() => {
    try {
      const date = new Date(billDate);
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month}. ${year}`;
    } catch {
      const date = new Date();
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month}. ${year}`;
    }
  }, [billDate]);

  // Extract order data using centralized utility
  const { items } = useMemo(() => extractOrderData(split), [split]);

  // Use shared formatting utility
  const formatAmount = formatAmountWithComma;

  // Memoize animation calculations
  const itemHeight = 100; // Increased to accommodate larger images and content
  const headerHeight = 30;
  const separatorHeight = 20; // Space for separator
  const emptyStateHeight = 40;
  const maxItemsHeight = useMemo(() => {
    if (items.length > 0) {
      return headerHeight + separatorHeight + (items.length * itemHeight) + spacing.md; // Extra spacing
    }
    return emptyStateHeight; // Show empty state when expanded
  }, [items.length]);

  const itemsHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxItemsHeight],
  });

  const chevronRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Toggle expansion with useCallback
  const toggleExpanded = useCallback(() => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);

    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animation]);
  return (
    <>
      {/* Navigation Header */}
      <Header
        logoUri="https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fpartners%2Fsp3nd-logo.png?alt=media&token=e93baa6a-caed-4695-8e48-08333424ddaa"
        logoHeight={16}
        onBackPress={onBackPress}
        showBackButton={true}
        rightElement={
          onSettingsPress ? (
            <TouchableOpacity onPress={onSettingsPress} style={styles.settingsButton}>
              <PhosphorIcon name="SlidersHorizontal" size={24} color={colors.white} weight="regular" />
            </TouchableOpacity>
          ) : (
            <SpendOrderBadge variant="compact" />
          )
        }
      />

      {/* Order Summary Card - Full structure matching Figma mockup */}
      <View style={styles.orderCardWrapper}>
        <LinearGradient
          colors={[colors.spendGradientStart, colors.spendGradientEnd]}
          style={styles.orderCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
        {/* Order Header with Icon, Order Number, Date, and Status Badge */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <View style={styles.iconContainer}>
              <Image
                source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fpartners%2Fsp3nd-icon.png?alt=media&token=3b2603eb-57cb-4dc6-aafd-0fff463f1579' }}
                style={styles.spendIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.orderTitleContainer}>
              <Text style={styles.orderTitle} numberOfLines={1}>
                Order #{displayOrderNumber}
              </Text>
              <Text style={styles.orderDate}>
                {formattedDate}
              </Text>
            </View>
          </View>

          {statusDisplay && (
            <View style={styles.statusBadgeContainer}>
              <View style={[
                styles.statusBadge,
                statusDisplay === 'Pending' && styles.statusBadgePending
              ]}>
                <View style={[
                  styles.statusDot,
                  statusDisplay === 'Pending' && styles.statusDotPending
                ]} />
                <Text style={[
                  styles.statusText,
                  statusDisplay === 'Pending' && styles.statusTextPending
                ]}>{statusDisplay}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Total Amount Section */}
        <View style={styles.orderAmountContainer}>
          <Text style={styles.orderAmountLabel}>Total</Text>
          <Text style={styles.orderAmountUSDC}>
            {formatAmount(totalAmount || 0)} USDC
          </Text>
        </View>

        {/* Dashed separator line - Only show when items exist and expanded */}
        {items.length > 0 && (
          <Animated.View
            style={{
              opacity: animation,
              marginVertical: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={styles.separator}>
              {Array.from({ length: 40 }).map((_, index) => (
                <View key={index} style={styles.separatorDot} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Order Items Section - Expandable */}
        <Animated.View
          style={[
            styles.itemsContainer,
            {
              height: itemsHeight,
              opacity: animation,
              overflow: 'visible', // Changed to visible to show all content
            }
          ]}
        >
          {items.length > 0 ? (
            <>
              <View style={styles.itemsHeader}>
                <Text style={styles.itemsHeaderTitle}>
                  Order Items ({items.length})
                </Text>
              </View>
              {items.map((item: any, index: number) => {
                // Extract item data according to SP3ND OrderItem schema
                // Price and quantity are required fields with defaults
                const itemPrice = typeof item.price === 'number' ? item.price : 0;
                const itemQuantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
                const itemTotal = itemPrice * itemQuantity;

                // Use product_title as primary (per SP3ND schema), fallback to name
                const itemName = item.product_title || item.name || `Item ${index + 1}`;

                // Store name comes from order level, not item level (per SP3ND schema)
                const storeName = store || '';

                // Category (optional field)
                const itemCategory = item.category || null;

                // Format variants if available (per SP3ND ProductVariant schema)
                // Handle both array and null/undefined cases
                const variantsText =
                  item.variants &&
                    Array.isArray(item.variants) &&
                    item.variants.length > 0 &&
                    item.variants.every((v: any) => v && typeof v === 'object' && v.type && v.value)
                    ? item.variants.map((v: any) => `${v.type}: ${v.value}`).join(', ')
                    : null;

                // Image URL (per SP3ND schema: image_url or image)
                // Both fields are supported for compatibility
                const imageUrl = item.image_url || item.image || null;

                // Prime eligibility (per SP3ND schema) - boolean field
                const isPrime = item.isPrimeEligible === true;

                // Product URL (optional, for linking to product page)
                const productUrl = item.product_url || item.url || null;

                // Generate unique key for item
                const itemKey = item.product_id || item.id || `item-${index}`;

                return (
                  <View key={itemKey} style={styles.orderItem}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.orderItemImage}
                        resizeMode="cover"
                        onError={() => {
                          // Image failed to load - fallback handled by conditional rendering
                        }}
                      />
                    ) : (
                      <View style={styles.orderItemIcon}>
                        <PhosphorIcon name="Package" size={20} color={colors.black} weight="regular" />
                      </View>
                    )}
                    <View style={styles.orderItemDetails}>
                      <Text style={styles.orderItemName} numberOfLines={2}>
                        {itemName}
                      </Text>
                      {variantsText && (
                        <Text style={styles.orderItemVariants} numberOfLines={1}>
                          {variantsText}
                        </Text>
                      )}
                      {/*{itemCategory && (
                        <Text style={styles.orderItemCategory} numberOfLines={1}>
                          {itemCategory}
                        </Text>
                      )} */}
                      {storeName && (
                        <Text style={styles.orderItemStore} numberOfLines={1}>
                          {storeName}
                        </Text>
                      )}
                     <View style={styles.orderItemBadges}>
                         {/*{isPrime && (
                          <View style={styles.primeBadge}>
                            <Text style={styles.primeBadgeText}>Prime</Text>
                          </View>
                        )} */}
                        {itemQuantity > 1 && (
                          <View style={styles.quantityBadge}>
                            <Text style={styles.quantityBadgeText}>Quantity:{itemQuantity}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.orderItemPriceContainer}>
                      <Text style={styles.orderItemPrice}>
                        ${formatAmountWithComma(itemTotal)}
                      </Text>
                      {itemQuantity > 1 && (
                        <Text style={styles.orderItemUnitPrice}>
                          ${formatAmountWithComma(itemPrice)} each
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsHeaderTitle}>
                No items available
              </Text>
            </View>
          )}
        </Animated.View>

        </LinearGradient>
        
        {/* Order Details Button - Outside the card with gradient border */}
        <View style={styles.orderDetailsButtonContainer}>
          {/* Gradient border background */}
          <LinearGradient
            colors={[colors.spendGradientStart, colors.spendGradientEnd]}
            style={styles.orderDetailsButtonGradientBorder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Black button on top */}
            <TouchableOpacity
              style={styles.orderDetailsButton}
              onPress={toggleExpanded}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.orderDetailsText}>Order details</Text>
              {items.length > 0 ? (
                <Animated.View style={[styles.doubleChevronContainer, { transform: [{ rotate: chevronRotation }] }]}>
                  <PhosphorIcon name="CaretDown" size={14} color={colors.white} weight="regular" style={styles.chevronTop} />
                  <PhosphorIcon name="CaretDown" size={14} color={colors.white} weight="regular" style={styles.chevronBottom} />
                </Animated.View>
              ) : (
                <View style={styles.doubleChevronContainer}>
                  <PhosphorIcon name="CaretDown" size={12} color={colors.white + '60'} weight="regular" style={styles.chevronTop} />
                  <PhosphorIcon name="CaretDown" size={12} color={colors.white + '60'} weight="regular" style={styles.chevronBottom} />
                </View>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  orderCardWrapper: {
    marginTop: spacing.md,
    marginBottom: spacing.xl, 
    position: 'relative',
  },
  orderCard: {
    borderRadius: 20,
    padding: spacing.md,
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 24,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spendIcon: {
    width: 36,
    height: 36,
  },
  orderTitleContainer: {
  },
  orderTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.xs / 2,
    lineHeight: typography.fontSize.xxl,
  },
  orderDate: {
    fontSize: typography.fontSize.sm,
    color: colors.black80,
    fontWeight: typography.fontWeight.medium,
  },
  statusBadgeContainer: {
    marginLeft: 'auto',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green + '20',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.green,
    gap: spacing.xs / 2,
  },
  statusBadgePending: {
    backgroundColor: colors.red20,
    borderColor: colors.red,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.red,
  },
  statusDotPending: {
    backgroundColor: colors.red,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    color: colors.black,
    fontWeight: typography.fontWeight.medium,
  },
  statusTextPending: {
    color: colors.red,
  },
  orderAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  orderAmountLabel: {
    fontSize: typography.fontSize.md,
    color: colors.black80,
    fontWeight: typography.fontWeight.medium,
  },
  orderAmountUSDC: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  orderDetailsButtonContainer: {
    position: 'absolute',
    bottom: -spacing.md, // Position outside the card
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    elevation: 10, // Android
    pointerEvents: 'box-none', // Allow touches to pass through to children
  },
  orderDetailsButtonGradientBorder: {
    borderRadius: 16,
    padding: 2.5, // Border width - visible gradient border
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    minWidth: 140,
    width: 'auto',
  },
  orderDetailsText: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  doubleChevronContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 16,
    marginLeft: spacing.xs / 2,
  },
  chevronTop: {
    marginBottom: -4, // Overlap the chevrons slightly
  },
  chevronBottom: {
    marginTop: -4, // Overlap the chevrons slightly
  },
  settingsButton: {
    padding: spacing.xs,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  separatorDot: {
    width: 4,
    height: 1,
    backgroundColor: colors.black,
    borderRadius: 0.5,
  },
  itemsHeader: {
    marginBottom: spacing.md,
  },
  itemsHeaderTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.black,
  },
  itemsContainer: {
    marginTop: spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderItemImage: {
    width: 56,
    minHeight: 56,
    height: '80%',
    borderRadius: 8,
    marginRight: spacing.sm,
    backgroundColor: colors.black + '10',
  },
  orderItemIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.black + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    marginBottom: spacing.xs / 4,
  },
  orderItemStore: {
    fontSize: typography.fontSize.xs,
    color: colors.black80,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs / 4,
  },
  orderItemCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.black80,
    fontWeight: typography.fontWeight.regular,
    textTransform: 'capitalize',
    marginTop: spacing.xs / 4,
  },
  orderItemVariants: {
    fontSize: typography.fontSize.xs,
    color: colors.black80,
    fontWeight: typography.fontWeight.regular,
    fontStyle: 'italic',
    marginTop: spacing.xs / 4,
  },
  orderItemBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs / 2,
    marginTop: spacing.xs / 2,
  },
  orderItemPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  orderItemPrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.xs / 4,
  },
  orderItemUnitPrice: {
    fontSize: typography.fontSize.xs,
    color: colors.black80,
    fontWeight: typography.fontWeight.medium,
  },
  quantityBadge: {
    alignSelf: 'flex-start',
  },
  quantityBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.black80,
    fontWeight: typography.fontWeight.medium,
  },
  primeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: spacing.xs / 4,
  },
  primeBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
});

export default SpendSplitHeader;


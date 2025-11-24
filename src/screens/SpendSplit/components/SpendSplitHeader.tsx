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
import { formatAmountWithComma } from '../../../utils/spend/formatUtils';
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
  const itemHeight = 80;
  const headerHeight = 30;
  const emptyStateHeight = 40;
  const maxItemsHeight = useMemo(() => {
    if (items.length > 0) {
      return headerHeight + (items.length * itemHeight);
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
        title="SP3ND"
        onBackPress={onBackPress}
        showBackButton={true}
        rightElement={
          onSettingsPress ? (
            <TouchableOpacity onPress={onSettingsPress} style={styles.settingsButton}>
              <PhosphorIcon name="Gear" size={24} color={colors.textLight} weight="regular" />
            </TouchableOpacity>
          ) : (
            <SpendOrderBadge variant="compact" />
          )
        }
      />

      {/* Order Summary Card - Full structure matching Figma mockup */}
      <LinearGradient
        colors={[colors.green, colors.greenBlue]}
        style={styles.orderCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Order Header with Icon, Order Number, Date, and Status Badge */}
        <View style={styles.orderHeader}>
          <View style={styles.iconContainer}>
            <PhosphorIcon name="CurrencyDollar" size={24} color={colors.black} weight="fill" />
          </View>
          <View style={styles.orderTitleContainer}>
            <Text style={styles.orderTitle} numberOfLines={1}>
              Order #{displayOrderNumber}
            </Text>
            <Text style={styles.orderDate}>
              {formattedDate}
            </Text>
          </View>
          {statusDisplay && (
            <View style={styles.statusBadgeContainer}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{statusDisplay}</Text>
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
        {items.length > 0 && isExpanded && (
          <Animated.View
            style={{
              opacity: animation,
              height: isExpanded ? 1 : 0,
              overflow: 'hidden',
            }}
          >
            <View style={styles.separator} />
          </Animated.View>
        )}
        
        {/* Order Items Section - Expandable */}
        <Animated.View 
          style={[
            styles.itemsContainer,
            { 
              height: itemsHeight,
              opacity: animation,
              overflow: 'hidden',
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
                const itemPrice = item.price || 0;
                const itemQuantity = item.quantity || 1;
                const itemTotal = itemPrice * itemQuantity;
                
                // Use product_title as primary (per SP3ND schema), fallback to name
                const itemName = item.product_title || item.name || `Item ${index + 1}`;
                
                // Store name comes from order level, not item level (per SP3ND schema)
                const storeName = store || '';
                
                // Format variants if available (per SP3ND ProductVariant schema)
                const variantsText = item.variants && Array.isArray(item.variants) && item.variants.length > 0
                  ? item.variants.map((v: any) => `${v.type}: ${v.value}`).join(', ')
                  : null;
                
                // Image URL (per SP3ND schema: image_url or image)
                const imageUrl = item.image_url || item.image;
                
                // Prime eligibility (per SP3ND schema)
                const isPrime = item.isPrimeEligible === true;
                
                return (
                  <View key={item.product_id || item.id || `item-${index}`} style={styles.orderItem}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.orderItemImage}
                        resizeMode="cover"
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
                      {storeName && (
                        <Text style={styles.orderItemStore} numberOfLines={1}>
                          {storeName}
                        </Text>
                      )}
                      {isPrime && (
                        <View style={styles.primeBadge}>
                          <Text style={styles.primeBadgeText}>Prime</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.orderItemPriceContainer}>
                      <Text style={styles.orderItemPrice}>
                        ${formatAmountWithComma(itemTotal)}
                      </Text>
                      {itemQuantity > 1 && (
                        <Text style={styles.orderItemQuantity}>
                          Qty: {itemQuantity}
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
        
        {/* Order Details Button - Centered at bottom of card */}
        <TouchableOpacity 
          style={styles.orderDetailsButton}
          onPress={toggleExpanded}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.orderDetailsText}>Order details</Text>
          {items.length > 0 ? (
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <PhosphorIcon name="CaretDown" size={16} color={colors.white} weight="regular" />
            </Animated.View>
          ) : (
            <PhosphorIcon name="CaretDown" size={16} color={colors.white + '60'} weight="regular" />
          )}
        </TouchableOpacity>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 20,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden', // Changed to hidden to properly contain animated content
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.info + '40', // Slightly more opaque to match mockup
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orderTitleContainer: {
    flex: 1,
  },
  orderTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.xs / 2,
    lineHeight: typography.fontSize.xxl * 1.2,
  },
  orderDate: {
    fontSize: typography.fontSize.sm,
    color: colors.black + 'CC',
    fontWeight: typography.fontWeight.medium,
  },
  statusBadgeContainer: {
    marginLeft: 'auto',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green + '40',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.green + '60',
    gap: spacing.xs / 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    color: colors.black,
    fontWeight: typography.fontWeight.bold,
  },
  orderAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  orderAmountLabel: {
    fontSize: typography.fontSize.md,
    color: colors.black + 'CC',
    fontWeight: typography.fontWeight.medium,
  },
  orderAmountUSDC: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  orderDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blackGreen, // Dark green background matching mockup
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 0,
    gap: spacing.xs,
    alignSelf: 'center', // Center the button
    zIndex: 10,
    elevation: 10, // Android
  },
  orderDetailsText: {
    fontSize: typography.fontSize.sm,
    color: colors.white, // White text on dark green background
    fontWeight: typography.fontWeight.semibold,
  },
  settingsButton: {
    padding: spacing.xs,
  },
  separator: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    height: 1,
    borderTopWidth: 1,
    borderTopColor: colors.black + '20',
    borderStyle: 'dashed',
  },
  itemsHeader: {
    marginBottom: spacing.sm,
  },
  itemsHeaderTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  itemsContainer: {
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: spacing.md,
    backgroundColor: colors.black + '10',
  },
  orderItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.black + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
    color: colors.black + 'CC',
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs / 4,
  },
  orderItemVariants: {
    fontSize: typography.fontSize.xs,
    color: colors.black + 'AA',
    fontWeight: typography.fontWeight.regular,
    fontStyle: 'italic',
    marginTop: spacing.xs / 4,
  },
  orderItemPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  orderItemPrice: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.xs / 4,
  },
  orderItemQuantity: {
    fontSize: typography.fontSize.xs,
    color: colors.black + 'CC',
    fontWeight: typography.fontWeight.medium,
  },
  primeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.info + '30',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: spacing.xs / 4,
  },
  primeBadgeText: {
    fontSize: typography.fontSize.xs - 2,
    color: colors.info,
    fontWeight: typography.fontWeight.bold,
  },
});

export default SpendSplitHeader;


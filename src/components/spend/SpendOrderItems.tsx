/**
 * SPEND Order Items Component
 * Displays the list of items/articles from a SPEND order
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Split } from '../../services/splits/splitStorageService';
import PhosphorIcon from '../shared/PhosphorIcon';
import { formatAmountWithComma } from '../../utils/spend/formatUtils';

interface SpendOrderItemsProps {
  split: Split;
}

const SpendOrderItems: React.FC<SpendOrderItemsProps> = ({ split }) => {
  // Get items from split data
  const items = split.items || [];
  
  // Also check externalMetadata for items if available
  const externalItems = (split.externalMetadata as any)?.items || [];

  // Check orderData for items (from SP3ND order schema)
  const orderDataItems = (split.externalMetadata as any)?.orderData?.items || [];

  // Combine all sources - prefer orderData items, then externalMetadata, then split items
  const allItems = orderDataItems.length > 0 
    ? orderDataItems 
    : (externalItems.length > 0 ? externalItems : items);

  if (!allItems || allItems.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        <View style={styles.emptyState}>
          <PhosphorIcon name="Package" size={32} color={colors.white70} weight="regular" />
          <Text style={styles.emptyStateText}>No items available</Text>
          <Text style={styles.emptyStateSubtext}>
            Item details will appear here once available
          </Text>
        </View>
      </View>
    );
  }

  const totalItemsAmount = allItems.reduce((sum: number, item: any) => {
    const price = item.price || 0;
    const quantity = item.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        <Text style={styles.itemCount}>{allItems.length} {allItems.length === 1 ? 'item' : 'items'}</Text>
      </View>

      <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
        {allItems.map((item: any, index: number) => {
          const itemPrice = item.price || 0;
          const itemQuantity = item.quantity || 1;
          const itemTotal = itemPrice * itemQuantity;
          
          // Use product_title if available, otherwise name
          const itemName = item.product_title || item.name || `Item ${index + 1}`;
          
          // Format variants if available
          const variantsText = item.variants && item.variants.length > 0
            ? item.variants.map((v: any) => `${v.type}: ${v.value}`).join(', ')
            : null;

          return (
            <View key={item.product_id || item.id || `item-${index}`} style={styles.itemCard}>
              {item.image_url || item.image ? (
                <Image
                  source={{ uri: item.image_url || item.image }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              ) : (
              <View style={styles.itemIcon}>
                <PhosphorIcon name="Package" size={20} color={colors.green} weight="regular" />
              </View>
              )}
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {itemName}
                </Text>
                {variantsText && (
                  <Text style={styles.itemVariants} numberOfLines={1}>
                    {variantsText}
                  </Text>
                )}
                {itemQuantity > 1 && (
                  <Text style={styles.itemQuantity}>
                    Quantity: {itemQuantity}
                  </Text>
                )}
                {item.isPrimeEligible && (
                  <View style={styles.primeBadge}>
                    <Text style={styles.primeBadgeText}>Prime</Text>
                  </View>
                )}
              </View>
              <View style={styles.itemPriceContainer}>
                <Text style={styles.itemPrice}>
                  ${formatAmountWithComma(itemTotal)}
                </Text>
                {itemQuantity > 1 && (
                  <Text style={styles.itemUnitPrice}>
                    ${formatAmountWithComma(itemPrice)} each
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {allItems.length > 0 && (
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Items Subtotal</Text>
            <Text style={styles.totalAmount}>${totalItemsAmount.toFixed(2)}</Text>
          </View>
          {split.tax && split.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalAmount}>${split.tax.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalLabelFinal}>Order Total</Text>
            <Text style={styles.totalAmountFinal}>${split.totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  itemCount: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    backgroundColor: colors.white5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    fontWeight: typography.fontWeight.semibold,
  },
  itemsList: {
    maxHeight: 300,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.white5,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.green + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: spacing.md,
    backgroundColor: colors.white10,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.xs / 4,
  },
  itemQuantity: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: spacing.xs / 4,
  },
  itemVariants: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: spacing.xs / 4,
    fontStyle: 'italic',
  },
  primeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blue + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: spacing.xs / 4,
  },
  primeBadgeText: {
    fontSize: typography.fontSize.xs - 2,
    color: colors.blue,
    fontWeight: typography.fontWeight.bold,
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs / 4,
  },
  itemUnitPrice: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    marginTop: spacing.md,
    fontWeight: typography.fontWeight.medium,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.white70 + 'CC',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  totalContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalRowFinal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.white5,
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    fontWeight: typography.fontWeight.medium,
  },
  totalAmount: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  totalLabelFinal: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  totalAmountFinal: {
    fontSize: typography.fontSize.lg,
    color: colors.green,
    fontWeight: typography.fontWeight.bold,
  },
});

export default SpendOrderItems;


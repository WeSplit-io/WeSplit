/**
 * SPEND Order Items Component
 * Displays the list of items/articles from a SPEND order
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Split } from '../../services/splits/splitStorageService';
import PhosphorIcon from '../shared/PhosphorIcon';

interface SpendOrderItemsProps {
  split: Split;
}

const SpendOrderItems: React.FC<SpendOrderItemsProps> = ({ split }) => {
  // Get items from split data
  const items = split.items || [];
  
  // Also check externalMetadata for items if available
  const externalItems = (split.externalMetadata as any)?.items || [];

  // Combine both sources
  const allItems = items.length > 0 ? items : externalItems;

  if (!allItems || allItems.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        <View style={styles.emptyState}>
          <PhosphorIcon name="Package" size={32} color={colors.textSecondary} weight="regular" />
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

          return (
            <View key={item.id || `item-${index}`} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                <PhosphorIcon name="Package" size={20} color={colors.green} weight="regular" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name || `Item ${index + 1}`}
                </Text>
                {itemQuantity > 1 && (
                  <Text style={styles.itemQuantity}>
                    Quantity: {itemQuantity}
                  </Text>
                )}
              </View>
              <View style={styles.itemPriceContainer}>
                <Text style={styles.itemPrice}>
                  ${itemTotal.toFixed(2)}
                </Text>
                {itemQuantity > 1 && (
                  <Text style={styles.itemUnitPrice}>
                    ${itemPrice.toFixed(2)} each
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
    color: colors.textLight,
  },
  itemCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs / 4,
  },
  itemQuantity: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.xs / 4,
  },
  itemUnitPrice: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontWeight: typography.fontWeight.medium,
  },
  emptyStateSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary + 'CC',
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
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  totalAmount: {
    fontSize: typography.fontSize.sm,
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  totalLabelFinal: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    fontWeight: typography.fontWeight.bold,
  },
  totalAmountFinal: {
    fontSize: typography.fontSize.lg,
    color: colors.green,
    fontWeight: typography.fontWeight.bold,
  },
});

export default SpendOrderItems;


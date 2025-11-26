import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  // Modal Container - similar to TransactionModal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.black,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    paddingTop: 24,
    maxHeight: '90%',
    minHeight: 600,
  },
  
  // Handle bar for slide down
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.white50,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 30,
  },
  
  // Content container
  content: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  
  // Amount Header - matching the image design
  amountHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
  },
  amountHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white70,
    marginBottom: 8,
    textAlign: 'center',
  },
  amountHeaderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  amountHeaderCurrency: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  
  // Settlement Cards - matching the image design
  settlementCards: {
    width: '100%',
    marginBottom: 32,
  },
  settlementCard: {
    backgroundColor: colors.white70 || '#363636',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementCardHeader: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settlementCardTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  settlementCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green || '#99FF00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settlementCardAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  settlementCardAvatarText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
  settlementCardContent: {
    flex: 1,
  },
  settlementCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  settlementCardStatus: {
    fontSize: 14,
    color: colors.white70,
    marginBottom: 8,
  },
  settlementCardQuestion: {
    fontSize: 12,
    color: colors.white50,
  },
  settlementCardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'right',
  },
  settlementCardAmountContainer: {
    alignItems: 'flex-end',
  },
  settlementCardCurrency: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  settlementCardButton: {
    backgroundColor: colors.green || '#99FF00',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  settlementCardButtonText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Bottom Action Button - fixed at bottom of screen
  bottomActionButton: {
    backgroundColor: colors.green || '#99FF00',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
  },
  bottomActionButtonText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Loading and Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.red,
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Empty State
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  // Debug styles (kept for development)
  debugText: {
    color: colors.black,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  debugTextSmall: {
    color: colors.black,
    fontSize: 10,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  debugTextTiny: {
    color: colors.black,
    fontSize: 8,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Scroll to close hint
  scrollToCloseHint: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  scrollToCloseText: {
    color: colors.white50,
    fontSize: 12,
    textAlign: 'center',
  },

  // Leave Group Header styles
  leaveGroupHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.primaryGreen,
    borderRadius: 12,
  },
  leaveGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  leaveGroupSubtitle: {
    fontSize: 14,
    color: colors.white70,
    textAlign: 'center',
    lineHeight: 20,
  },

}); 
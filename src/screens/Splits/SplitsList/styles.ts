import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: spacing.lg,
  },
  pageIndicatorContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  pageIndicatorText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
  },
  newPoolButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  newPoolButtonIcon: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  newPoolButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  newPoolButtonDisabled: {
    opacity: 0.5,
  },
  newPoolButtonTextDisabled: {
    color: colors.white50,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.white5,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  filterButtonActive: {
    // backgroundColor is now handled by LinearGradient
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.black,
    fontWeight: '600',
  },
  splitsContainer: {
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.md,
  },
  splitCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  splitCardIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.white5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  splitCardContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  splitCardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  splitCardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  splitCardRole: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  splitCardRoleIcon: {
    width: 16,
    height: 16,
    tintColor: colors.white70,
  },
  splitCardMembers: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  splitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  splitCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  splitCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  splitCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  splitCardStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  splitCardStatusText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: '500',
  },
  splitCardArrow: {
    width: 16,
    height: 16,
    tintColor: colors.white,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    width: '100%',
  },
  splitHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  categoryIcon: {
    flexShrink: 0,
  },
  splitTitleContainer: {
    flex: 1,
  },
  splitTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  splitDate: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  splitCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  splitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  amountContainer: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.green,
  },
  participantsContainer: {
    alignItems: 'center',
  },
  participantsLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    marginBottom: spacing.xs,
  },
  participantsValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  splitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.white10,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleIcon: {
    width: 12,
    height: 12,
    tintColor: colors.white70,
  },
  createdBy: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  createdAt: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: spacing.xl,
    width: '100%',
  },
  emptyStateIcon: {
    width: 170,
    objectFit: 'contain',
  },
  emptyStateContent: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyStateTitle: {
    color: colors.white,
    textAlign: 'center',
    fontSize: typography.fontSize.xxl,
    fontStyle: 'normal',
    fontWeight: typography.fontWeight.bold,
  },
  emptyStateSubtitle: {
    color: colors.white70,
    textAlign: 'center',
    fontSize: typography.fontSize.md,
    fontStyle: 'normal',
    fontWeight: typography.fontWeight.regular,
  },

  createFirstButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createFirstButtonWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyTabState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTabText: {
    fontSize: typography.fontSize.md,
    color: colors.white70,
    textAlign: 'center',
  },
  createFirstButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: '500',
  },
  // Shared Wallet Empty State - Clean and Minimalist
  sharedWalletEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    minHeight: 300,
  },
  sharedWalletEmptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 280,
  },
  sharedWalletEmptyTitle: {
    color: colors.white,
    textAlign: 'center',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  sharedWalletEmptySubtitle: {
    color: colors.white50,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  walletInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.white10,
  },
  walletLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  walletAddress: {
    color: colors.green,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
  participantAvatarsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.white10,
  },
  participantAvatarsLabel: {
    color: colors.white70,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  participantAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white10,
  },
  participantAvatarOverlap: {
    marginLeft: -8,
  },
  participantAvatarOverlay: {
    backgroundColor: colors.black,
    borderColor: colors.white10,
    width: 32,
    height: 32,
    marginLeft: -8,
    borderWidth: 2,


    
  },
  participantAvatarOverlayText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  loadMoreContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadMoreButton: {
    minWidth: 120,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white10,
    backgroundColor: colors.black,
  },
  paginationButton: {
    minWidth: 44,
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
  },
  pageText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  // Swipe-to-delete styles
  deleteAction: {
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    borderRadius: 16,
    marginVertical: spacing.xs,
    marginRight: spacing.md,
  },
  deleteActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs / 2,
  },
  deleteText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});

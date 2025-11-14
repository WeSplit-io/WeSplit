import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({
  // Header
  clearAllButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'flex-end',
    zIndex: 1,
  },
  clearAllText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  // Content
  scrollView: {
    flex: 1,  
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 150,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIcon: {
    height: 150,
    objectFit: 'contain',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A89B9B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  // Swipe to delete (Apple style)
  swipeDeleteContainer: {
    flex: 1,
    backgroundColor: colors.white5,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.md,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
  },
  swipeDeleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  swipeDeleteText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
}); 
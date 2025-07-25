import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: colors.darkBackground,
  },
  backButton: {
    padding: 8,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Balance out back button
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 24,
  },
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.green10,
    borderRadius: 16,
    marginHorizontal: spacing.screenPadding,
    borderWidth: 1,
    borderColor: colors.white10,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: colors.green,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  activeTabText: {
    color: colors.black,
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkBackground,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  // Content
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  // Section Headers
  sectionHeader: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
    marginTop: 24,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.white10,
    paddingBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 150,
  },
  emptyStateIcon: {
    height: 150,
    objectFit: 'contain',
    marginBottom: spacing.md,
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
  // Notification Items
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: colors.white50,
    minHeight: 80,
  },
  notificationLeftWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow content to shrink
  },
  notificationRightWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    marginLeft: 8,
  },
  unreadNotification: {
    backgroundColor: colors.green10,
    borderColor: colors.green,
    borderWidth: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    tintColor: '#FFF', // Make icons white for better contrast
  },
  notificationContent: {
    flex: 1,
    minWidth: 0, // Allow text to shrink
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    color: '#A5EA15',
  },
  notificationTime: {
    fontSize: 12,
    color: '#A89B9B',
    marginTop: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
    marginBottom: 8,
    flexShrink: 1, // Allow text to shrink
  },
  notificationAmount: {
    fontSize: 13,
    color: '#A5EA15', // Green color
    fontWeight: '600', // Semi-bold
    marginTop: 4,
  },
  notificationAmountPositive: {
    fontSize: 13,
    color: '#A5EA15', // Green color
    fontWeight: '600', // Semi-bold
    marginTop: 4,
  },
  notificationUserName: {
    fontSize: 14,
    color: '#E0E0E0',
    fontWeight: '600', // Semi-bold
  },
  // Action Button
  actionButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
    marginLeft: 8,
    marginTop: 8,
  },
}); 
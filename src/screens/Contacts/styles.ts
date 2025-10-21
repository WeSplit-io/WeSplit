import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.darkBackground,
    minHeight: 60,
  },
  backButton: {
    padding: spacing.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radiusSm,
    flexShrink: 0,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  contentWithButton: {
    paddingBottom: 80, // Make room for the invite button
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.textLight,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.white50,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    marginBottom: -1,
  },
  activeTab: {
    // Gradient indicator is rendered in component
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
  },
  activeTabText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  tabIndicatorContainer: {
    height: 2,
    width: '100%',
    marginTop: 10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tabIndicatorPlaceholder: {
    height: 2,
    width: '100%',
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  contactsScrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkBackground,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mutualGroupsText: {
    color: colors.brandGreen,
  },
  favoriteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inviteButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
    marginBottom: spacing.md,
  },
  inviteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
  },
  inviteButtonTextDisabled: {
  },
  // QR Code styles
  qrCodeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  qrCodeTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  qrCodeContent: {
    alignItems: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: colors.white,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  qrCodeBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodePlaceholder: {
    width: 160,
    height: 160,
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrCodePlaceholderText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  qrCodeUserInfo: {
    alignItems: 'center',
  },
  qrCodeUserName: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  qrCodeUserWallet: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  qrCodeDoneButton: {
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  qrCodeDoneButtonText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
}); 
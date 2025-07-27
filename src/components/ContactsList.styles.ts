import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.white50,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  searchIcon: {
    width: 20,
    height: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.green10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
    padding: 4,
    marginBottom: spacing.md,
    width: '100%',
    marginTop: spacing.md,
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
  tabActive: {
    backgroundColor: colors.green,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  tabTextActive: {
    color: colors.black,
  },
  contactsScrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  avatar: {
    width: spacing.xxl + spacing.sm,
    height: spacing.xxl + spacing.sm,
    borderRadius: spacing.xxl,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.darkBackground,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  contactEmail: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  mutualGroupsText: {
    color: colors.brandGreen,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  favoriteButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  searchIconEmpty: {
    height: 100,
    marginBottom: spacing.md,
    objectFit: 'contain',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: typography.fontWeight.medium,
  },
  // Toggle Contact List / Scan QR Code
  containerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.white50,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 18,
    fontWeight: 'normal',
    color: colors.textSecondary,
    paddingBottom: 10,
    marginBottom: -2,
    width: '100%',
    textAlign: 'center',
  },
  toggleTextActive: {
    color: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.green,

  },
  toggleUnderline: {
    height: 3,
    backgroundColor: colors.brandGreen,
    marginTop: 4,
    borderRadius: 2,
    width: '60%',
  },
}); 
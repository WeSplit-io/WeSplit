import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  // Tab Navigation - Using NotificationsScreen design
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white5,
    borderRadius: 16,
    marginHorizontal: spacing.screenPadding,
    padding: 5,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tabActive: {
    backgroundColor: colors.green,
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',


  },
  
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  activeTabText: {
    color: colors.black,
  },
  // Content - Using SendAmountScreen design
  recipientAvatarContainer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxxl,
  },
  recipientAvatar: {
    width: 70,
    height: 70,
    borderRadius: spacing.xxl + spacing.lg,
    backgroundColor: colors.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  recipientName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  recipientEmail: {
    color: colors.white70,
    fontSize: 14,
  },
  // Amount Card - Using SendAmountScreen design
  amountCardMockup: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 24,
    alignItems: 'center',
    minHeight: 180,
    overflow: 'hidden',
  },
  amountCardHeader: {
    alignItems: 'center',
    backgroundColor: colors.white5,
    padding: 24,
    width: '100%',
  },
  amountCardLabel: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  amountCardInput: {
    color: colors.white,
    fontSize: 50,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    minWidth: 120,
    marginBottom: 10,
  },
  amountCardCurrency: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 8,
  },
  amountCardAddNoteRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
  },
  amountCardAddNoteText: {
    color: colors.white50,
    fontSize: 15,
    marginLeft: 8,
  },
  amountCardContinueButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.darkBackground,
    paddingBottom: 16,
    paddingTop: 8,
    alignItems: 'center',
    borderTopWidth: 0,
    marginHorizontal: spacing.lg,
  },
  mockupContinueButton: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  mockupContinueButtonText: {
    color: colors.white70,
    fontSize: 16,
    fontWeight: '600',
  },
  mockupContinueButtonTextActive: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
}); 
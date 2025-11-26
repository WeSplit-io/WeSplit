import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.radiusSm,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  placeholder: {
    width: spacing.xxl + spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontWeight: typography.fontWeight.medium,
    paddingHorizontal: spacing.lg,
  },
  
  // Category Selection Styles
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  categoryOption: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.white,
    minWidth: 70,
    minHeight: 70,
    justifyContent: 'center',
  },
  categorySelected: {
    backgroundColor: colors.primaryGreen,
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: colors.black,
    fontWeight: typography.fontWeight.medium,
  },
  categoryImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  
  // Color Selection Styles
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: colors.textLight,
    borderWidth: 3,
  },
  
  // Input Styles
  input: {
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.white50,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Members Section
  membersSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membersSectionLabel: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    fontWeight: typography.fontWeight.medium,
  },
  memberSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
  },
  addMembersLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMembersLinkText: {
    fontSize: typography.fontSize.md,
    color: colors.primaryGreen,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  },
  linkIcon: {
    marginRight: spacing.xs,
  },
  searchUsersLink: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  searchUsersLinkText: {
    fontSize: typography.fontSize.md,
    color: colors.primaryGreen,
    fontWeight: typography.fontWeight.medium,
  },
  inviteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  inviteLinkText: {
    fontSize: typography.fontSize.md,
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  },
  
  // Done Button
  doneButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  doneButtonDisabled: {
    backgroundColor: colors.white10,
  },
  doneButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  doneButtonTextDisabled: {
    color: colors.white50,
  },
  
  // Legacy styles (keeping for compatibility)
  iconScrollView: {
    marginBottom: spacing.md,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconSelected: {
    borderColor: colors.textLight,
    borderWidth: 3,
  },
  colorScrollView: {
    marginBottom: spacing.md,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  catIconWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: spacing.sm + spacing.xs / 2,
    backgroundColor: colors.black,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    width: '30%',
  },
  catIconSelected: {
    borderWidth: spacing.xs / 2,
    borderColor: colors.green,
    backgroundColor: colors.black,
  },
  catIconLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white70,
    marginTop: spacing.xs / 2,
  },
  addMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white70,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  addMembersText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginLeft: spacing.md,
    flex: 1,
  },
  createButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createButtonDisabled: {
    backgroundColor: colors.white10,
  },
  createButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: spacing.lg,
    padding: spacing.md,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
  },
  currencyPicker: {
    backgroundColor: colors.black,
    borderRadius: spacing.lg,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  currencyOption: {
    padding: spacing.md,
    borderBottomWidth: spacing.borderWidthThin,
    borderBottomColor: colors.textLight,
  },
  currencyOptionSelected: {
    backgroundColor: colors.green,
  },
  currencyOptionText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
  },
  currencyOptionTextSelected: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },
  linkText: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginLeft: spacing.md,
  },
  doneBtn: {
    backgroundColor: colors.green,
    borderRadius: spacing.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  doneBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  inviteOptions: {
    marginBottom: spacing.md,
  },
  addPhoneBtn: {
    backgroundColor: colors.green,
    borderRadius: spacing.lg,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addPhoneBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
}); 
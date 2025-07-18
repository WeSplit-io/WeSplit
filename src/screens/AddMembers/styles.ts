import { StyleSheet } from 'react-native';
import { typography, spacing, colors } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#212121',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  placeholder: {
    width: 40,
  },
  
  // Search Section
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white50,
  },
  searchIcon: {
    width: 18,
    height: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.white,
    marginLeft: spacing.md,
  },
  
  // Tabs Section
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.white10,
  },
  activeTab: {
    backgroundColor: colors.green,
  },
  tabText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white70,
  },
  activeTabText: {
    color: colors.black,
  },
  

  
  // Contact Rows
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkboxContainer: {
    marginRight: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.white50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white10,
  },
  checkboxSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  contactEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
  },
  avatarText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  favoriteButton: {
    padding: spacing.md,
  },
  inviteButton: {
    padding: spacing.md,
  },
  
  // No Contacts State
  noContactsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  noContactsText: {
    fontSize: typography.fontSize.md,
    color: colors.white50,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  noContactsSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    textAlign: 'center',
    lineHeight: spacing.md,
  },
  
  // Bottom Action Button
  bottomContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.black,
  },
  addButton: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.md,
  },
  addButtonDisabled: {
    backgroundColor: colors.white10,
  },
  addButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  
  // Legacy Styles (keeping for compatibility with existing group flow)
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  loadingText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.md,
  },
  sectionTitle: {
        fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.white10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.black,
  },
  errorText: {
    color: colors.red,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  groupInfo: {
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusSm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFF',
    alignItems: 'center',
  },
  tempGroupIcon: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: spacing.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  groupName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  memberCount: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    textAlign: 'center',
  },
  tempGroupNote: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  membersList: {
    marginBottom: spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusSm,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.white,
  },
  memberAvatar: {
    width: spacing.md,
    height: spacing.md,
    borderRadius: spacing.radiusSm,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  memberEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    marginTop: spacing.xs,
  },
  removeButton: {
    padding: spacing.md,
  },
  youLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    fontWeight: typography.fontWeight.medium,
  },
  shareOptions: {
    marginBottom: spacing.lg,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusSm,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.white,
  },
  shareOptionText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginLeft: spacing.md,
  },
  qrCodeSection: {
    marginBottom: spacing.lg,
  },
  qrCodeTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: colors.white10,
    borderRadius: spacing.radiusSm,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.white,
  },
  qrCodePlaceholder: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    marginBottom: spacing.md,
  },
  qrCodeText: {
    fontSize: typography.fontSize.sm,
    color: colors.green,
    textAlign: 'center',
  },
  // Action Buttons for Creation Flow
  actionButtons: {
    gap: spacing.md,
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
        backgroundColor: colors.green,
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  createGroupButtonDisabled: {
    backgroundColor: '#666666',
  },
  createGroupButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.md,
  },
  backToEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  backToEditButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.md,
  },
  // Existing Group Flow
  backToGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: spacing.radiusSm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backToGroupButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.md,
  },
}); 
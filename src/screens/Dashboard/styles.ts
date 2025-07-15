import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

/**
 * =======================================================================
 * DASHBOARD SCREEN STYLES
 * =======================================================================
 * This file contains all styles for the Dashboard screen, organized by
 * component sections for easy navigation and modification.
 * 
 * DESIGN NOTES:
 * - Uses dark theme with primary green (#C5FF00) accent
 * - Main balance card is the focal point with large typography
 * - Action buttons are arranged in a grid layout
 * - Groups list uses cards with consistent spacing
 * 
 * FIGMA REFERENCE: Dashboard screen mockups
 * =======================================================================
 */

// Legacy color constants for compatibility - will be deprecated
export const BG_COLOR = colors.darkBackground;
export const GREEN = colors.brandGreen;
export const GRAY = colors.darkGray;

export const styles = StyleSheet.create({
  
  // === MAIN CONTAINER & LAYOUT ===
  // Root container with dark background
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingHorizontal: 0,
    paddingTop: 0,
    
  },
  
  // Scrollable content wrapper
  scrollContainer: {
    flex: 1,
  },
  
  // Content padding to avoid bottom navigation overlap
  scrollContent: {
    paddingBottom: spacing.bottomNavSpace,
  },
  
  // Status bar spacing (iOS)
  statusBar: {
    height: spacing.profileImageSize,
    backgroundColor: BG_COLOR,
  },

  // === HEADER SECTION ===
  // Main header containing user info and notifications
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,

  },
  
  // Left side of header (profile + welcome text)
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  // === USER PROFILE SECTION ===
  // Circular profile image
  profileImage: {
    width: spacing.profileImageSize,
    height: spacing.profileImageSize,
    borderRadius: spacing.profileImageSize / 2,
    marginRight: spacing.itemSpacing,
    backgroundColor: colors.border,
  },
  
  // Welcome text above user name
  welcomeText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.xs / 2,
  },
  
  // User's display name (large, bold)
  userName: {
    color: colors.white,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 0,
  },

  // === NOTIFICATION BELL ===
  // Container for notification bell with padding for touch target
  bellContainer: {
    position: 'relative',
    padding: spacing.sm,
  },
  
  // Bell icon styling
  bellIcon: {
    width: 30,
    height: 30,
    color: colors.white,
  },
  
  // Red notification dot on bell icon
  bellDot: {
    position: 'absolute',
    top: spacing.xs + spacing.xs / 2,
    right: spacing.xs + spacing.xs / 2,
    width: spacing.bellDotSize,
    height: spacing.bellDotSize,
    borderRadius: spacing.bellDotRadius,
    backgroundColor: colors.green,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.textLight,
  },

  // Notification badge with count on bell icon
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.darkBackground,
  },

  // Text inside notification badge
  bellBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // === BALANCE CARD (MAIN FOCAL POINT) ===
  // Large green card displaying user's balance
  balanceCard: {
    backgroundColor: GREEN,
    borderRadius: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    minHeight: spacing.balanceCardMinHeight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.1,
    shadowRadius: spacing.sm,
    elevation: 4,
  },
  
  // Header row of balance card (label + QR icon)
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.itemSpacing,
  },
  
  // "Your Balance" label
  balanceLabel: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
  },
  
  // QR code icon container
  qrCodeIcon: {
    width: spacing.qrCodeIconSize,
    height: spacing.qrCodeIconSize,
    borderRadius: spacing.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // QR text inside icon
  qrCodeImage: {
    width: 25,
    height: 25,
  },
  
  // Loading and message styles
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textLight,
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },
  activityIndicator: {
    color: colors.primaryGreen,
    fontSize: typography.fontSize.xs,
    marginLeft: spacing.sm,
  },
  inactiveText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  balanceAmountText: {
    color: colors.darkBackground,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.md,
  },

  // Transaction avatar styles 
  transactionAvatar: {
    backgroundColor: colors.primaryGreen,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === BALANCE AMOUNT (HERO ELEMENT) ===
  // Large dollar amount display
  balanceAmount: {
    color: colors.black,
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.extrabold,
    marginBottom: spacing.sm,
    letterSpacing: -2,
    lineHeight: typography.fontSize.hero + spacing.xs,
  },
  
  // Small limit text below amount
  balanceLimitText: {
    color: colors.black,
    fontSize: typography.fontSize.small,
    fontWeight: typography.fontWeight.normal,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  
  // === LOADING STATES ===
  // Container for price loading indicator
  priceLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Loading text during price calculation
  priceLoadingText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
  },

  // === ACTION BUTTONS GRID ===
  // Container for action buttons below balance card
  actionsGrid: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    marginTop: 0,
  },
  
  // Row containing all action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Individual action button container
  actionButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  
  // === ACTION BUTTON CIRCLES ===
  // Circular button background (default style)
  actionButtonCircle: {
    width: spacing.actionButtonSize,
    height: spacing.actionButtonSize,
    borderRadius: spacing.actionButtonRadius,
    backgroundColor: colors.darkCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    display: 'flex',
    position: 'relative',
  },
  
  // === ACTION BUTTON ICONS & TEXT ===
  // Icon inside action button (default)
  actionButtonIcon: {
    width: 30,
    height: 30,
    tintColor: colors.textLight,
  },
  
  // Icon for request button (dark on green)
  actionButtonIconRequest: {
    width: 24,
    height: 24,
    tintColor: BG_COLOR,
  },
  
  // Label text below action buttons
  actionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // === REQUESTS SECTION ===
  // Container for requests list
  requestsSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  
  // Title for the requests section
  sectionTitle: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  
  // Individual request card
  requestCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.itemSpacing,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
  },
  
  // Header of a request card (from user, amount, send button)
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  // Info about the request (from user, amount)
  requestInfo: {
    flex: 1,
  },
  
  // Name of the user who sent the request
  requestFromUser: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  
  // Amount of the request
  requestAmount: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Button to send the request
  requestSendButton: {
    backgroundColor: GREEN,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusSm,
  },
  
  // Text on the send request button
  requestSendButtonText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Message from the request sender
  requestMessage: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  
  // Individual request item (new style for mockup)
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  
  // Request avatar
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.darkCard,
    marginRight: spacing.md,
  },
  
  // Request details container
  requestDetails: {
    flex: 1,
  },
  
  // Request name
  requestName: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  
  // Request date
  requestDate: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  
  // Empty requests state
  emptyRequestsState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  
  // Empty requests text
  emptyRequestsText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },

  // === GROUPS SECTION ===
  // Container for groups list
  groupsSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  
  // Header for the groups section (title + add button)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  // Text for the "Add Group" button
  addButtonText: {
    color: GREEN,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // "See all" text
  seeAllText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },
  
  // Grid layout for groups
  groupsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  
  // Individual group card in grid
  groupGridCard: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: spacing.lg,
    padding: spacing.md,
    minHeight: 140,
  },
  
  // Left grid card (with special positioning)
  groupGridCardLeft: {
    marginRight: spacing.sm / 2,
  },
  
  // Right grid card (with special positioning)
  groupGridCardRight: {
    marginLeft: spacing.sm / 2,
  },
  
  // Header of group grid card
  groupGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  
  // Icon container in group grid
  groupGridIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Icon SVG in group grid
  groupGridIconSvg: {
    width: 20,
    height: 20,
    tintColor: BG_COLOR,
  },
  
  // Amount text in group grid
  groupGridAmount: {
    color: BG_COLOR,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Group name in grid
  groupGridName: {
    color: BG_COLOR,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  
  // Role text in group grid
  groupGridRole: {
    color: BG_COLOR,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.sm,
  },
  
  // Member avatars container
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Individual member avatar
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginRight: -spacing.xs,
    borderWidth: 2,
    borderColor: GREEN,
  },
  
  // More members indicator (+4)
  memberAvatarMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  
  // Text inside more members indicator
  memberAvatarMoreText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.tiny,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Empty state for groups when no groups exist
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  
  // Text for the empty state
  emptyStateText: {
    color: colors.textLight,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  
  // Subtext for the empty state
  emptyStateSubtext: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  // Button to create a new group
  createGroupButton: {
    backgroundColor: GREEN,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
  },
  
  // Text on the create group button
  createGroupButtonText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // Individual group card
  groupCard: {
    backgroundColor: colors.darkCard,
    borderRadius: spacing.radiusMd,
    marginBottom: spacing.itemSpacing,
    borderWidth: spacing.borderWidthThin,
    borderColor: colors.border,
  },
  
  // Content of a group card (name, members, amounts)
  groupCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  
  // Info about the group (name, members)
  groupInfo: {
    flex: 1,
  },
  
  // Name of the group
  groupName: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  
  // Number of members in the group
  groupMembers: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  
  // Amounts displayed for the group (USD, Crypto)
  groupAmounts: {
    alignItems: 'flex-end',
  },
  
  // USD amount for the group
  groupUSDAmount: {
    color: GREEN,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  
  // Crypto amount for the group
  groupCryptoAmount: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
}); 
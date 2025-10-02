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
  },
  
  // Scrollable content wrapper
  scrollContainer: {
    flex: 1,
  },
  
  // Content padding to avoid bottom navigation overlap
  scrollContent: {
    paddingBottom: spacing.bottomNavSpace,
  },


  // === HEADER SECTION ===
  // Main header containing user info and notifications
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,

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
    width: 23,
    height: 23,
    color: colors.white,
  },
  
  // Notification badge indicator (green dot)
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.green,
    borderRadius: 6,
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: colors.darkBackground,
  },

  // === BALANCE CARD (MAIN FOCAL POINT) ===
  // Large green card displaying user's balance
  balanceCard: {
    borderRadius: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    minHeight: spacing.balanceCardMinHeight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.1,
    shadowRadius: spacing.sm,
    elevation: 4,
    overflow: 'hidden',
  },
  
  // Header row of balance card (label + QR icon)
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  
  // "Your Balance" label
  balanceLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.light,
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
    tintColor: colors.white,
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
  inactiveText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  balanceAmountText: {
    color: colors.white,
    fontWeight: typography.fontWeight.regular,
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
    color: colors.white,
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    letterSpacing: -2,
    lineHeight: typography.fontSize.hero + spacing.xs,
  },
  
  // Wallet address text below amount
  balanceLimitText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
    opacity: 0.8,
  },
  
  // Wallet address container with copy button
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  
  // Copy button for wallet address
  copyButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Copy icon
  copyIcon: {
    width: 14,
    height: 14,
    tintColor: colors.white,
    marginLeft: spacing.xs,

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
    marginHorizontal: spacing.md,
    marginBottom: spacing.xxl,
    marginTop: 0,
    position: 'relative',
  },
  
  // Row containing all action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  
  // Individual action button container
  actionButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 80,
  },
  
  // === ACTION BUTTON CIRCLES ===
  // Circular button background (default style) - larger for better touch targets
  actionButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    display: 'flex',
    position: 'relative',
    // Border to simulate inset shadow effect
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(10, 138, 90, 0.15)',
    borderBottomColor: 'rgba(10, 138, 90, 0.15)',
  },
  
  // === ACTION BUTTON ICONS & TEXT ===
  // Icon inside action button (default)
  // Icon without tint to preserve original colors
  actionButtonIconNoTint: {
    width: 32,
    height: 32,
  },
  
  // Label text below action buttons
  actionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },

  // === MORE MENU DROPDOWN ===
  // Container for the more menu dropdown
  moreMenuContainer: {
    position: 'absolute',
    top: 160,
    right: 20,
    backgroundColor: '#121D1F',
    borderRadius: 15,
    padding: spacing.sm,
    minWidth: 230,
    // Border to simulate inset shadow effect (same as actionButtonCircle)
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(10, 138, 90, 0.15)',
    borderBottomColor: 'rgba(10, 138, 90, 0.15)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },

  // Individual menu item
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.xs,
    backgroundColor: 'transparent',
    minHeight: 44, // Minimum touch target size
  },

  // Text in menu item
  moreMenuText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },

  // Chevron icon in menu item
  moreMenuChevron: {
    width: 16,
    height: 16,
    tintColor: colors.white70,
  },

  // Overlay to close menu when clicking outside
  moreMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998, // Lower than menu
  },

  // === REQUESTS SECTION ===
  // Container for requests list
  requestsSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  
  // Title for the requests section
  sectionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
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
  
  // New request item style matching the mockup
  requestItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  
  // Request avatar for new design
  requestAvatarNew: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryGreen,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Transaction avatar with green10 background
  transactionAvatarNew: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGreen + '10',
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Request content container
  requestContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  
  // Request sender name
  requestSenderName: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  
  // Request message with amount
  requestMessageWithAmount: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.xs / 2,
  },
  
  // Request amount in green
  requestAmountGreen: {
    color: GREEN,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Request source info
  requestSource: {
    color: colors.white70,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
  },
  
  // Send button for new design
  requestSendButtonNew: {
    backgroundColor: GREEN,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Send button text
  requestSendButtonTextNew: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  // Request preview item (3rd request with overlay)
  requestPreviewItem: {
    position: 'relative',
    opacity: 0.8,
  },

  // Request preview content (blurred)
  requestPreviewContent: {
    filter: 'blur(1px)',
  },

  // Request preview overlay
  requestPreviewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.black ,
    borderRadius: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Request preview text
  requestPreviewText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    
  },

  // === GROUPS SECTION ===
  // Container for groups list
  groupsSection: {
    marginHorizontal: spacing.md,
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
    color: colors.green,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  
  // "See all" text
  seeAllText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },
  
  // Grid layout for groups (full-width vertical layout)
  groupsGrid: {
    flexDirection: 'column',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  
  // Full-width group card (matches design with horizontal layout)
  groupGridCardFullWidth: {
    width: '100%',
    backgroundColor: colors.white5,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  
  // Container for group name and role
  groupGridNameContainer: {
    flexDirection: 'column',
    flex: 1,
    marginLeft: 0, // Remove left margin for horizontal layout
  },
  
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  
  // Group name in grid
  groupGridName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4, // Smaller margin for horizontal layout
  },
  
  // Role container in group grid
  groupGridRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  
  // Role icon in group grid
  groupGridRoleIcon: {
    width: 16,
    height: 16,
    marginRight: 0, // Remove marginRight since we use gap in parent
    flexShrink: 0, // Prevent icon from shrinking
    tintColor: colors.white70, // Apply tint color like the Icon component
  },
  
  // Role text in group grid  
  groupGridRole: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  
  // Member avatars container (horizontal layout)
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0, // Don't take up flex space
  },
  
  // Empty member avatars container
  memberAvatarsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Individual member avatar (overlapping style)
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white10,
    marginLeft: -8, // Negative margin for overlapping effect
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  
  // More members indicator (+4)
  memberAvatarMore: {
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: colors.black,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Text inside more members indicator
  memberAvatarMoreText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Empty state for groups when no groups exist
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
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
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: spacing.radiusMd,
  },
  
  // Text on the create group button
  createGroupButtonText: {
    color: BG_COLOR,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },

  // Gradient wrapper for the CTA button
  createGroupButtonGradient: {
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === SPLIT CARD STYLES ===
  // Container for split icon
  splitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  // Split type icon
  splitIcon: {
    fontSize: 20,
  },

  // Container for split status
  splitStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  // Status indicator dot
  splitStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },

  // Status text
  splitStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // Container for split amount and participants info
  splitInfoContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // Split amount text
  splitAmount: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },

  // Split participants count
  splitParticipants: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
  },

  // Split date text
  splitDate: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

}); 
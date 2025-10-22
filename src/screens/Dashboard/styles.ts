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
export const GREEN = colors.green;
export const GRAY = colors.darkGray;

export const styles = StyleSheet.create({
  
  // === MAIN CONTAINER & LAYOUT ===


  
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
    backgroundColor: colors.white10,
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
    borderWidth: 1,
    borderColor: colors.white10,
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
  
  loadingText: {
    color: colors.textLight,
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },

  // Container for generic loading rows
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  balanceAmountText: {
    color: colors.white,
    fontWeight: typography.fontWeight.regular,
    fontSize: typography.fontSize.md,
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
    marginBottom: spacing.xxl,
    marginTop: 0,
    position: 'relative',
  },
  
  // Row containing all action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 5,
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


  // === REQUESTS SECTION ===
  // Container for requests list
  requestsSection: {
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
    borderRadius: 30,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  
  // Request content container
  requestContent: {
    flex: 1,
    marginRight: spacing.md,
    marginLeft: spacing.md,
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
    color: colors.greenBlue,
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
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Gradient content for the send button
  requestSendButtonGradient: {
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Send button text
  requestSendButtonTextNew: {
    color: colors.black,
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

  
  // "See all" text
  seeAllText: {
    color: colors.white70,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.normal,
  },
  
  
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  
  
  
  



  //transaction styles
  // New request item style matching the mockup
  TransactionItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  
  // Transaction avatar with green10 background
  transactionAvatarNew: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
    // Transaction avatar styles 
    transactionAvatar: {
      width: 24,
      height: 24,
      objectFit: 'contain',
      alignItems: 'center',
      justifyContent: 'center',
    },
  
  // Request content container
  transactionContent: {
    flex: 1,
    marginRight: spacing.md,
    marginLeft: spacing.md,
  },
  
  // Request sender name
  transactionSenderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 10,
  },
  
  // Request message with amount
  transactionMessageWithAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 10,
  },
  
  // Request amount in green
  transactionAmountGreen: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Request source info
  transactionSource: {
    color: colors.white70,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.darkGray,
  },
  
  
}); 


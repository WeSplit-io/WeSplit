import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({
  // Main request item container
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  
  // Request message with amount
  requestMessageWithAmount: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.xs / 2,
  },
  
  // Request amount in green
  requestAmountGreen: {
    color: colors.greenBlue,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Request description
  requestDescription: {
    color: colors.white70,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    fontStyle: 'italic',
    marginTop: spacing.xs / 2,
    marginLeft: spacing.xs,
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
    backgroundColor: colors.black,
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

  // Balance amount text (for error state)
  balanceAmountText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  
  // Unread request item styling
  unreadRequestItem: {
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.white10,
  },
});

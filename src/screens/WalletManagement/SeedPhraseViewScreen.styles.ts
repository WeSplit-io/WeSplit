import { StyleSheet, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for button
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  titleContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: spacing.iconBoxSize,
    height: spacing.iconBoxSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white5,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...(typography.textStyles.h2 as TextStyle),
    lineHeight: typography.textStyles.h2.lineHeight * typography.textStyles.h2.fontSize,
    color: colors.white,
    textAlign: 'left',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white70,
    textAlign: 'left',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  
  // Seed Phrase Container
  seedPhraseContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  
  // Blurred/Reveal State
  blurredContainer: {
    width: '100%',
    minHeight: 300,
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusRound,
    gap: spacing.sm,
  },
  revealButtonText: {
    ...(typography.textStyles.body as TextStyle),
    lineHeight: typography.textStyles.body.lineHeight * typography.textStyles.body.fontSize,
    color: colors.white,
  },
  
  // Seed Phrase Grid (Revealed State)
  seedPhraseGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  seedWordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.md,
    backgroundColor: colors.white10,
    gap: spacing.sm,
  },
  seedWordNumber: {
    ...(typography.numberStyles.bodyNumber as TextStyle),
    lineHeight: typography.numberStyles.bodyNumber.lineHeight * typography.numberStyles.bodyNumber.fontSize,
    color: colors.white70,
  },
  seedWord: {
    ...(typography.textStyles.h3 as TextStyle),
    lineHeight: typography.textStyles.h3.lineHeight * typography.textStyles.h3.fontSize,
    color: colors.white,
    flex: 1,
  },
  
  // Copy Link
  copyLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  copyLinkText: {
    ...(typography.textStyles.bodySmall as TextStyle),
    lineHeight: typography.textStyles.bodySmall.lineHeight * typography.textStyles.bodySmall.fontSize,
    color: colors.white,
  },
  
  // Private Key Styles (fallback)
  privateKeyContainer: {
    width: '100%',
    alignItems: 'center',
  },
  privateKeyDisplay: {
    width: '100%',
    backgroundColor: colors.white5,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  privateKeyText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Bottom Spacer
  bottomSpacer: {
    height: 20,
  },
  
  // Done Button Fixed
  doneButtonFixed: {
    position: 'absolute',
    bottom: spacing.lg,
  },
  doneButtonGradient: {
    borderRadius: spacing.radiusLg,
    overflow: 'hidden',
  },
  doneButtonTouchable: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonTextGradient: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
});

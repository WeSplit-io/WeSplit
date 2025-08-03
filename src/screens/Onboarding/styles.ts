import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Legacy color constants for compatibility - now using theme colors
export const BG_COLOR = colors.darkBackground;
export const GREEN = colors.brandGreen;
export const GRAY = colors.darkGray;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
    flexDirection: 'column',
    paddingHorizontal: 0,
  },
  logoRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.radiusXl + spacing.xl + spacing.xs, // 60
    marginBottom: spacing.xl,
  },
  logoIcon: {
    width: spacing.xl + spacing.sm, // 40
    height: spacing.xl + spacing.sm, // 40
    marginRight: spacing.itemSpacing,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: typography.fontSize.title,
    fontFamily: 'Satoshi',
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    letterSpacing: 0.5,
  },
  logoSplit: {
    color: GREEN,
  },
  skipButton: {
    position: 'absolute',
    top: spacing.radiusXl + spacing.xl + spacing.xs, // 60
    right: spacing.xl,
    zIndex: 2,
  },
  skipText: {
    color: GREEN,
    fontSize: typography.fontSize.md,
    opacity: 0.7,
    fontWeight: typography.fontWeight.medium,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  illustration: {
    width: 330,
    height: 350,
    marginBottom: spacing.xl,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 35,
    fontWeight: typography.fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.sm,
    textAlign: 'left',
    width: '80%',
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    marginBottom: spacing.xl,
    textAlign: 'left',
    opacity: 0.8,
    width: '80%',
    alignSelf: 'center',
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: 0,
  },
  trackerDot: {
    width: spacing.itemSpacing,
    height: spacing.itemSpacing,
    borderRadius: 6,
    backgroundColor: GRAY,
    marginHorizontal: 6,
    opacity: 0.4,
  },
  trackerDotActive: {
    backgroundColor: GREEN,
    opacity: 1,
  },
  nextButton: {
    position: 'absolute',
    bottom: spacing.xxxl,
    right: spacing.xl,
    backgroundColor: GREEN,
    borderRadius: spacing.lg,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButtonText: {
    color: BG_COLOR,
    top: -5,
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.bold,
    marginTop: -2,
  },
  paginationContainer: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.xl + spacing.sm, // 40
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  paginationBar: {
    width: spacing.screenPadding,
    height: spacing.xs + 6, // 10
    borderRadius: spacing.screenPadding,
    backgroundColor: 'rgba(165, 234, 21, 0.10)',
    marginRight: spacing.sm,
  },
  paginationBarActive: {
    width: spacing.radiusRound,
    backgroundColor: GREEN,
  },
}); 
import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const styles = StyleSheet.create({
  rouletteContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xl,
    overflow: 'hidden',
  },
  rouletteCards: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rouletteCard: {
    width: 140,
    height: 180,
    marginHorizontal: spacing.xs,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.white10,
    borderWidth: 2,
    borderColor: colors.white20,
  },
  selectedCard: {
    borderColor: colors.green,
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  tiltedCard: {
    transform: [{ rotate: '5deg' }],
    opacity: 0.7,
  },
  rouletteCardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  rouletteCardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rouletteCardLogo: {
    width: 24,
    height: 24,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  rouletteCardHeader: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  rouletteCardName: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'left',
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  rouletteCardHash: {
    color: colors.white80,
    fontSize: typography.fontSize.sm,
    fontWeight: '400',
    textAlign: 'left',
    opacity: 0.8,
    alignSelf: 'flex-start',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    zIndex: 10,
  },
  selectionText: {
    color: colors.black,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
});

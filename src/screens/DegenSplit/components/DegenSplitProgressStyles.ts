import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const styles = StyleSheet.create({
  progressContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  progressCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 15,
    borderColor: colors.white10,
  },
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 15,
    transform: [{ rotate: '-90deg' }],
  },
  progressInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  progressAmount: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
});

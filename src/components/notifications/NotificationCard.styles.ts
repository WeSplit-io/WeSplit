import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white5,
    borderRadius: spacing.md,
    padding: spacing.md,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
    marginLeft: spacing.md,
  },
  message: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    marginBottom: spacing.xs / 2,
  },
  amount: {
    fontSize: typography.fontSize.sm,
    color: colors.greenBlue,
    fontWeight: typography.fontWeight.medium,
    marginTop: 4,
  },
  userName: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  dateTime: {
    fontSize: 12,
    color: '#A89B9B',
    marginTop: 2,
  },
  actionWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    marginLeft: 16,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    minWidth: 60,
    alignItems: 'center',
    paddingLeft: 10,
  },
  actionButtonDisabled: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  gradientButton: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  expandText: {
    fontSize: 12,
    color: colors.greenBlue,
    fontWeight: typography.fontWeight.medium,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});

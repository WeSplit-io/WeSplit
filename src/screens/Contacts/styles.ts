import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentWithButton: {
    paddingBottom: 80, // Make room for the invite button
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white10,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.green,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white70,
  },
  tabTextActive: {
    color: colors.black,
  },
  inviteButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
    marginBottom: spacing.md,
  },
  inviteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 
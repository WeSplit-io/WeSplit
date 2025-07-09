import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.darkBackground,
  },
  header: { 
    fontSize: typography.fontSize.xl, 
    fontWeight: typography.fontWeight.bold, 
    color: colors.brandGreen, 
    margin: spacing.lg,
  },
  content: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  text: {
    color: colors.darkGray,
    fontSize: typography.fontSize.md,
  },
}); 
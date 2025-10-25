import { StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, typography } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const styles = StyleSheet.create({


  // Tab Content Styles
  tabContent: {
    flex: 1,
    paddingTop: spacing.xl,
    backgroundColor: 'transparent',
  },

  // My Code Tab Styles
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,

  },
  userInfo: {
    padding: spacing.lg,
    width: '100%',
  },
  userPseudo: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  expiryText: {
    fontSize: 14,
    color: colors.white70,
    textAlign: 'center',
  },
  qrCodeWrapper: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  walletAddress: {
    fontSize: 16,
    color: colors.white70,
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  // Scan Tab Styles
  scanContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cameraFrame: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: SCREEN_HEIGHT * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  scanArea: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholderText: {
    fontSize: 16,
    color: colors.white70,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'none', // Allow touches to pass through to camera
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.green,
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  scanCornerTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerBottomLeft: {
    bottom: 0,
    left: 0,
    top: 'auto',
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  scanCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanInstruction: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    pointerEvents: 'none',
  },

});

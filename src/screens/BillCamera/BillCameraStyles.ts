import { StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
    padding: spacing.xl,
  },
  permissionText: {
    fontSize: typography.fontSize.lg,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  cameraErrorText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  bottomLeftButton: {
    backgroundColor: colors.blackWhite5,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: 100,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    width: 130,
  },
  bottomLeftButtonIcon: {
    width: 18,
    height: 18,
    tintColor: colors.white,
  },
  bottomLeftButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  bottomRightButton: {
    backgroundColor: colors.blackWhite5,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    width: 60,
    height: 60,
    justifyContent: 'center',
    marginLeft: 130-60,
  },
  bottomRightButtonIcon: {
    width: 25,
    height: 25,
    tintColor: colors.white,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.white10,
    overflow: 'hidden',
  },
  captureButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: colors.blackWhite5,
  },
  fullHeightImageContainer: {
    flex: 1,
  },
  fullHeightImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
    gap: spacing.md,
  },
  retakeButton: {
    backgroundColor: colors.white10,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: 150,
  },
  retakeButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  processButton: {
    flex: 1,
    borderRadius: 8,
    height: 50,
    overflow: 'hidden',
  },
  processButtonTouchable: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
});

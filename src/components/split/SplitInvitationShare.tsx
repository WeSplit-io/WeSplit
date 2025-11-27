/**
 * SplitInvitationShare Component
 * 
 * Reusable component for sharing split invitations via QR code or link.
 * Can be used in SplitDetailsScreen, FairSplitScreen, SpendSplitScreen, DegenLockScreen.
 * 
 * Supports:
 * - QR code display
 * - Copy link to clipboard
 * - Native share sheet
 * - Universal links (works for users with and without the app)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SplitInvitationService, SplitInvitationData } from '../../services/splits/splitInvitationService';
import { Split } from '../../services/splits/splitStorageService';
import QrCodeView from '../../services/core/QrCodeView';
import Modal from '../shared/Modal';
import PhosphorIcon from '../shared/PhosphorIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { logger } from '../../services/analytics/loggingService';

export interface SplitInvitationShareProps {
  /** The split to share */
  split: Split | null;
  /** Current user ID */
  currentUserId: string;
  /** Current user name */
  currentUserName?: string;
  /** Whether to show as a modal (controlled externally) */
  visible?: boolean;
  /** Callback when modal is closed */
  onClose?: () => void;
  /** Whether to render as inline (not modal) */
  inline?: boolean;
  /** Custom title */
  title?: string;
}

export const SplitInvitationShare: React.FC<SplitInvitationShareProps> = ({
  split,
  currentUserId,
  currentUserName,
  visible = false,
  onClose,
  inline = false,
  title = 'Invite Friends',
}) => {
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [shareableLink, setShareableLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate invitation data and links
  const generateInvitationLinks = useCallback(() => {
    if (!split?.id || !currentUserId) {
      logger.warn('Cannot generate invitation: missing split or user', {
        hasSplit: !!split,
        hasUserId: !!currentUserId,
      }, 'SplitInvitationShare');
      return;
    }

    setIsGenerating(true);

    try {
      // Create invitation data
      const invitationData: SplitInvitationData = {
        type: 'split_invitation',
        splitId: split.id,
        billName: split.title || 'Split',
        totalAmount: split.totalAmount || 0,
        currency: split.currency || 'USDC',
        creatorId: currentUserId,
        creatorName: currentUserName,
        timestamp: new Date().toISOString(),
        splitType: split.splitType || 'fair',
      };

      // Generate universal link (works for everyone)
      const link = SplitInvitationService.generateUniversalLink(invitationData);
      setShareableLink(link);
      setQrCodeData(link);

      logger.debug('Generated split invitation links', {
        splitId: split.id,
        splitType: split.splitType,
        linkPreview: link.substring(0, 50) + '...',
      }, 'SplitInvitationShare');
    } catch (error) {
      logger.error('Error generating invitation links', {
        error: error instanceof Error ? error.message : String(error),
        splitId: split?.id,
      }, 'SplitInvitationShare');
    } finally {
      setIsGenerating(false);
    }
  }, [split, currentUserId, currentUserName]);

  // Generate links when component mounts or dependencies change
  useEffect(() => {
    if ((visible || inline) && split?.id) {
      generateInvitationLinks();
    }
  }, [visible, inline, split?.id, generateInvitationLinks]);

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!shareableLink) {
      Alert.alert('Error', 'No link available to copy');
      return;
    }

    try {
      await Clipboard.setStringAsync(shareableLink);
      Alert.alert(
        'Link Copied!',
        'The invitation link has been copied to your clipboard. Share it with friends!\n\nThis link works even if they don\'t have the app yet.',
        [{ text: 'OK' }]
      );

      logger.info('Invitation link copied to clipboard', {
        splitId: split?.id,
      }, 'SplitInvitationShare');
    } catch (error) {
      logger.error('Error copying link', {
        error: error instanceof Error ? error.message : String(error),
      }, 'SplitInvitationShare');
      Alert.alert('Error', 'Failed to copy link. Please try again.');
    }
  };

  // Share via native share sheet
  const handleNativeShare = async () => {
    if (!shareableLink || !split) {
      Alert.alert('Error', 'No link available to share');
      return;
    }

    try {
      const result = await Share.share({
        message: `Join my split "${split.title || 'Split'}" on WeSplit!\n\nTotal: $${(split.totalAmount || 0).toFixed(2)} USDC\n\n${shareableLink}`,
        title: `Join Split: ${split.title || 'Split'}`,
      });

      if (result.action === Share.sharedAction) {
        logger.info('Split invitation shared successfully', {
          splitId: split.id,
          sharedWith: result.activityType,
        }, 'SplitInvitationShare');
      }
    } catch (error) {
      logger.error('Error sharing invitation', {
        error: error instanceof Error ? error.message : String(error),
      }, 'SplitInvitationShare');
    }
  };

  // Render content
  const renderContent = () => (
    <View style={styles.container}>
      {/* QR Code Section */}
      <View style={styles.qrCodeSection}>
        {qrCodeData && qrCodeData.length > 0 ? (
          <View style={styles.qrCodeWrapper}>
            <QrCodeView
              value={qrCodeData}
              size={220}
              backgroundColor="white"
              color="black"
              showAddress={false}
              showButtons={false}
              caption="Scan to join"
            />
          </View>
        ) : (
          <View style={styles.qrCodePlaceholder}>
            <Text style={styles.placeholderText}>
              {isGenerating ? 'Generating...' : 'No QR code available'}
            </Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        Share this QR code or link with friends to invite them to the split.
        Works even if they don't have the app!
      </Text>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopyLink}
          activeOpacity={0.7}
        >
          <PhosphorIcon name="Link" size={20} color={colors.green} />
          <Text style={styles.actionButtonText}>Copy Link</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNativeShare}
          activeOpacity={0.7}
        >
          <PhosphorIcon name="ShareNetwork" size={20} color={colors.green} />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render as modal or inline
  if (inline) {
    return renderContent();
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      showHandle={true}
      closeOnBackdrop={true}
    >
      {renderContent()}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  qrCodeSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrCodeWrapper: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodePlaceholder: {
    width: 220,
    height: 220,
    backgroundColor: colors.white10,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.white50,
    fontSize: typography.fontSize.sm,
  },
  instructions: {
    fontSize: typography.fontSize.sm,
    color: colors.white50,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green + '40',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
});

export default SplitInvitationShare;


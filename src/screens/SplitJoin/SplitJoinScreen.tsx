/**
 * Split Join Screen
 * Handles joining splits via QR code, NFC, or link invitations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SplitInvitationService, SplitInvitationData } from '../../services/splitInvitationService';
import { useApp } from '../../context/AppContext';

interface RouteParams {
  invitationData?: SplitInvitationData;
  qrCodeData?: string;
  nfcPayload?: string;
  shareableLink?: string;
  splitInvitationData?: string; // From deep link
}

const SplitJoinScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { currentUser } = useApp();
  const { invitationData, qrCodeData, nfcPayload, shareableLink, splitInvitationData } = route.params as RouteParams;

  const [isLoading, setIsLoading] = useState(false);
  const [parsedInvitation, setParsedInvitation] = useState<SplitInvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    parseInvitationData();
  }, []);

  const parseInvitationData = async () => {
    try {
      let invitation: SplitInvitationData | null = null;

      if (invitationData) {
        invitation = invitationData;
      } else if (splitInvitationData) {
        // Handle deep link data
        invitation = SplitInvitationService.parseInvitationData(splitInvitationData);
      } else if (qrCodeData) {
        invitation = SplitInvitationService.parseInvitationData(qrCodeData);
      } else if (nfcPayload) {
        invitation = SplitInvitationService.parseNFCPayload(nfcPayload);
      } else if (shareableLink) {
        invitation = SplitInvitationService.validateInvitationURL(shareableLink);
      }

      if (!invitation) {
        setError('Invalid invitation data');
        return;
      }

      setParsedInvitation(invitation);
    } catch (error) {
      console.error('Error parsing invitation:', error);
      setError('Failed to parse invitation');
    }
  };

  const handleJoinSplit = async () => {
    if (!parsedInvitation || !currentUser?.id) {
      Alert.alert('Error', 'Missing required data');
      return;
    }

    setIsLoading(true);

    try {
      const result = await SplitInvitationService.joinSplit(parsedInvitation, currentUser.id.toString());

      if (result.success) {
        Alert.alert(
          'Success!',
          result.message || 'You have successfully joined the split!',
          [
            {
              text: 'Pay Now',
              onPress: () => navigation.navigate('SplitPayment', {
                splitWalletId: parsedInvitation.splitId,
                billName: parsedInvitation.billName,
                totalAmount: parsedInvitation.totalAmount,
              }),
            },
            {
              text: 'Later',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to join split');
      }
    } catch (error) {
      console.error('Error joining split:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this split invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Invalid Invitation</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!parsedInvitation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Split Invitation</Text>
          <Text style={styles.subtitle}>You've been invited to join a bill split</Text>
        </View>

        {/* Split Details */}
        <View style={styles.splitDetails}>
          <View style={styles.splitInfo}>
            <Text style={styles.splitName}>{parsedInvitation.billName}</Text>
            <Text style={styles.splitAmount}>
              {parsedInvitation.totalAmount} {parsedInvitation.currency}
            </Text>
          </View>

          <View style={styles.splitMeta}>
            <Text style={styles.metaLabel}>Created by:</Text>
            <Text style={styles.metaValue}>User {parsedInvitation.creatorId}</Text>
          </View>

          <View style={styles.splitMeta}>
            <Text style={styles.metaLabel}>Invited on:</Text>
            <Text style={styles.metaValue}>
              {new Date(parsedInvitation.timestamp).toLocaleDateString()}
            </Text>
          </View>

          {parsedInvitation.expiresAt && (
            <View style={styles.splitMeta}>
              <Text style={styles.metaLabel}>Expires:</Text>
              <Text style={styles.metaValue}>
                {new Date(parsedInvitation.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
            disabled={isLoading}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.joinButton]}
            onPress={handleJoinSplit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.joinButtonText}>Join Split</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
  },
  splitDetails: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  splitInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  splitName: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  splitAmount: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  splitMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  metaValue: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  declineButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: colors.green,
    marginLeft: spacing.sm,
  },
  joinButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
});

export default SplitJoinScreen;

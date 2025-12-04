/**
 * Phantom Authentication Button
 *
 * Uses official Phantom React SDK for app authentication
 * Processes authenticated users through PhantomAuthService
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { usePhantom, useModal, useConnect } from '@phantom/react-native-sdk';
import { Button } from '../shared';
import { colors } from '../../theme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PhantomAuthService } from '../../services/auth/PhantomAuthService';
import { logger } from '../../services/analytics/loggingService';

interface PhantomAuthButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
  style?: any;
  fullWidth?: boolean;
}

export const PhantomAuthButton: React.FC<PhantomAuthButtonProps> = ({
  onSuccess,
  onError,
  style,
  fullWidth = false
}) => {
  const { isConnected, user } = usePhantom();
  const { open, isOpened } = useModal();
  const { isConnecting } = useConnect();
  const [processing, setProcessing] = useState(false);
  const [hasProcessedConnection, setHasProcessedConnection] = useState(false);

  // Listen for modal close after explicit user authentication (not auto-connect)
  useEffect(() => {
    // Only process if modal was opened and is now closed, and we have a connected user
    // But ignore auto-connect sources (session restoration)
    if (!isOpened && !isConnecting && isConnected && user && !processing && !hasProcessedConnection) {
      // Check if this is an explicit user authentication (not auto-connect)
      const userSource = (user as any).source;
      const isExplicitAuth = user.authUserId && user.authProvider && userSource !== 'auto-connect';

      if (isExplicitAuth) {
        logger.info('Modal closed with explicitly authenticated user, processing', {
          authUserId: user.authUserId,
          authProvider: user.authProvider,
          status: user.status,
          source: userSource
        }, 'PhantomAuthButton');

        handleSuccessfulConnection(user);
      } else if (userSource === 'auto-connect') {
        logger.debug('Ignoring auto-connect session restoration', {
          authUserId: user.authUserId,
          authProvider: user.authProvider,
          status: user.status,
          source: userSource
        }, 'PhantomAuthButton');
      }
    }
  }, [isOpened, isConnecting, isConnected, user, processing, hasProcessedConnection]);

  const handleSuccessfulConnection = async (connectedUser: any) => {
    if (hasProcessedConnection) {
      logger.debug('Connection already processed, skipping', null, 'PhantomAuthButton');
      return;
    }

    try {
      setProcessing(true);
      setHasProcessedConnection(true);

      logger.info('Processing successful Phantom connection', {
        walletId: connectedUser?.walletId,
        hasAddresses: !!connectedUser?.addresses
      }, 'PhantomAuthButton');

      const authService = PhantomAuthService.getInstance();
      // Try to determine provider from user data, default to google
      const provider = connectedUser?.authProvider || 'google';
      const result = await authService.processAuthenticatedUser(connectedUser, provider);

      if (result.success) {
        logger.info('Phantom authentication successful', { userId: result.user?.id }, 'PhantomAuthButton');
        onSuccess?.(result.user);
      } else {
        logger.error('Phantom authentication failed', { error: result.error }, 'PhantomAuthButton');
        onError?.(result.error || 'Failed to process authentication');
        setHasProcessedConnection(false); // Allow retry on failure
      }
    } catch (error) {
      logger.error('Error processing Phantom connection', { error }, 'PhantomAuthButton');
      onError?.(error instanceof Error ? error.message : 'Authentication failed');
      setHasProcessedConnection(false); // Allow retry on error
    } finally {
      setProcessing(false);
    }
  };

  const handlePress = () => {
    // Reset processed state when user explicitly opens modal
    // This ensures we don't process auto-connect sessions automatically
    setHasProcessedConnection(false);

    // Always open the modal for explicit user authentication
    // Auto-connected sessions will be ignored until user explicitly chooses
    logger.info('Opening Phantom authentication modal for explicit user authentication', null, 'PhantomAuthButton');
    open();
  };

  const getButtonText = () => {
    if (processing) return 'Creating account...';
    if (hasProcessedConnection) return 'Account connected!';
    if (isConnecting) return 'Connecting to Phantom...';
    if (isOpened) return 'Select Google or Apple';
    if (hasAutoConnectedSession) return 'Continue with existing session';
    if (isConnected && user) return 'Continue with Phantom';
    return 'Continue with Phantom';
  };

  const getButtonVariant = (): 'primary' | 'secondary' => {
    return isConnected ? 'secondary' : 'primary';
  };

  const isButtonLoading = processing || isConnecting || isOpened;

  // Check if user has an auto-connected session
  const hasAutoConnectedSession = isConnected && user && (user as any).source === 'auto-connect' && !hasProcessedConnection;

  // Reset processed state when connection changes (for re-authentication)
  useEffect(() => {
    if (!isConnected || !user) {
      setHasProcessedConnection(false);
    }
  }, [isConnected, user]);

  return (
    <View style={[fullWidth ? styles.fullWidthContainer : styles.container, style]}>
      <Button
        title={getButtonText()}
        onPress={handlePress}
        variant={getButtonVariant()}
        size="medium"
        disabled={isButtonLoading}
        loading={isButtonLoading}
        fullWidth={fullWidth}
        style={[
          styles.buttonOverride,
          isConnected && styles.connectedButton
        ]}
      />

      {/* Connection Status */}
      {isOpened && (
        <Text style={styles.statusText}>
          Select Google or Apple to continue...
        </Text>
      )}
      {isConnected && user && !processing && (
        <Text style={styles.statusText}>
          Wallet connected • Ready to split!
        </Text>
      )}
    </View>
  );
};

const styles = {
  container: {
    width: 'auto' as const,
  },
  fullWidthContainer: {
    width: '100%' as const,
  },
  buttonOverride: {
    // Custom styles that override the shared Button component
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  connectedButton: {
    // Additional styling for connected state
    shadowColor: colors.white10,
    shadowOpacity: 0.1,
  },
  statusText: {
    color: colors.white70,
    fontSize: typography.fontSize.sm,
    textAlign: 'center' as const,
    marginTop: spacing.xs,
  },
};

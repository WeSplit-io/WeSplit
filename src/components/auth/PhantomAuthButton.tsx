/**
 * Phantom Authentication Button
 *
 * Uses official Phantom React SDK for app authentication
 * Processes authenticated users through PhantomAuthService
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const { isConnected, user, disconnect } = usePhantom();
  const { open, isOpened } = useModal();
  const { isConnecting, disconnect: disconnectFromConnect } = useConnect();
  const [processing, setProcessing] = useState(false);
  const [hasProcessedConnection, setHasProcessedConnection] = useState(false);
  const [hasErrored, setHasErrored] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const processingRef = useRef(false); // Guard against concurrent processing

  // Register disconnect callback with PhantomAuthService so it can be called during logout
  useEffect(() => {
    const authService = PhantomAuthService.getInstance();
    const disconnectCallback = async () => {
      try {
        logger.info('Disconnecting from Phantom SDK via logout', null, 'PhantomAuthButton');
        
        // Try both disconnect methods - usePhantom and useConnect
        let disconnected = false;
        
        // First try disconnect from usePhantom
        if (disconnect && typeof disconnect === 'function') {
          try {
            await disconnect();
            logger.info('Successfully disconnected from Phantom SDK (usePhantom)', null, 'PhantomAuthButton');
            disconnected = true;
          } catch (error) {
            logger.warn('Failed to disconnect via usePhantom, trying useConnect', {
              error: error instanceof Error ? error.message : String(error)
            }, 'PhantomAuthButton');
          }
        }
        
        // If that didn't work, try disconnect from useConnect
        if (!disconnected && disconnectFromConnect && typeof disconnectFromConnect === 'function') {
          try {
            await disconnectFromConnect();
            logger.info('Successfully disconnected from Phantom SDK (useConnect)', null, 'PhantomAuthButton');
            disconnected = true;
          } catch (error) {
            logger.warn('Failed to disconnect via useConnect', {
              error: error instanceof Error ? error.message : String(error)
            }, 'PhantomAuthButton');
          }
        }
        
        if (!disconnected) {
          logger.warn('No Phantom SDK disconnect function available', null, 'PhantomAuthButton');
        }
      } catch (error) {
        logger.error('Failed to disconnect from Phantom SDK', error, 'PhantomAuthButton');
        // Don't throw - allow logout to continue even if disconnect fails
      }
    };
    
    authService.registerDisconnectCallback(disconnectCallback);
    
    // Cleanup: unregister callback when component unmounts
    return () => {
      authService.unregisterDisconnectCallback();
    };
  }, [disconnect, disconnectFromConnect]);

  // Memoize handler to prevent recreation and infinite loops
  const handleSuccessfulConnection = useCallback(async (connectedUser: any) => {
    // Guard against concurrent processing
    if (processingRef.current || hasProcessedConnection || hasErrored) {
      logger.debug('Connection processing blocked', {
        isProcessing: processingRef.current,
        hasProcessed: hasProcessedConnection,
        hasErrored
      }, 'PhantomAuthButton');
      return;
    }

    try {
      processingRef.current = true;
      setProcessing(true);

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
        setHasProcessedConnection(true); // Only set on success
        setHasErrored(false); // Clear error state on success
        setLastError(null);
        onSuccess?.(result.user);
      } else {
        logger.error('Phantom authentication failed', { error: result.error }, 'PhantomAuthButton');
        // Don't reset hasProcessedConnection on error - prevents infinite loop
        // Set error state instead
        setHasErrored(true);
        setLastError(result.error || 'Failed to process authentication');
        onError?.(result.error || 'Failed to process authentication');
      }
    } catch (error) {
      logger.error('Error processing Phantom connection', { error }, 'PhantomAuthButton');
      // Don't reset hasProcessedConnection on error - prevents infinite loop
      // Set error state instead
      setHasErrored(true);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setLastError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, [hasProcessedConnection, hasErrored, onSuccess, onError]);

  // Listen for modal close after explicit user authentication (not auto-connect)
  useEffect(() => {
    // CRITICAL: Check logout flag FIRST before any processing
    const authService = PhantomAuthService.getInstance();
    const isLoggedOut = authService.getIsLoggedOut();
    
    // Only process if modal was opened and is now closed, and we have a connected user
    // But ignore auto-connect sources (session restoration)
    // CRITICAL: Don't process if already processed, errored, or currently processing
    if (!isOpened && !isConnecting && isConnected && user && !processing && !hasProcessedConnection && !hasErrored && !processingRef.current) {
      // Check if this is an explicit user authentication (not auto-connect)
      const userSource = (user as any).source;
      const isExplicitAuth = user.authUserId && user.authProvider && userSource !== 'auto-connect';

      if (isExplicitAuth) {
        // Explicit authentication - always process (user opened modal)
        logger.info('Modal closed with explicitly authenticated user, processing', {
          authUserId: user.authUserId,
          authProvider: user.authProvider,
          status: user.status,
          source: userSource
        }, 'PhantomAuthButton');

        handleSuccessfulConnection(user);
      } else if (userSource === 'auto-connect') {
        // CRITICAL: Block auto-connect if user has logged out
        if (isLoggedOut) {
          logger.info('Blocking auto-connect after logout - user needs to explicitly authenticate', {
            authUserId: user.authUserId,
            authProvider: user.authProvider,
            status: user.status,
            source: userSource,
            isLoggedOut
          }, 'PhantomAuthButton');
          return; // Don't process auto-connect if user just logged out
        }
        
        // Handle session restoration - restore user session when they log back in
        logger.info('Processing auto-connect session restoration', {
          authUserId: user.authUserId,
          authProvider: user.authProvider,
          status: user.status,
          source: userSource
        }, 'PhantomAuthButton');
        
        // Process the restored session to authenticate the user
        handleSuccessfulConnection(user);
      }
    }
  }, [isOpened, isConnecting, isConnected, user, processing, hasProcessedConnection, hasErrored, handleSuccessfulConnection]);


  // Get logout state and auto-connected session status (defined early for use in functions)
  const authService = PhantomAuthService.getInstance();
  const isLoggedOut = authService.getIsLoggedOut();
  
  // Check if user has an auto-connected session (restoring)
  // Only consider it an auto-connected session if:
  // 1. User is connected
  // 2. Has user data
  // 3. Source is 'auto-connect'
  // 4. Not yet processed
  // 5. User hasn't logged out
  const hasAutoConnectedSession = isConnected && 
                                   user && 
                                   (user as any).source === 'auto-connect' && 
                                   !hasProcessedConnection &&
                                   !isLoggedOut;

  const handlePress = () => {
    // Reset processed state and error state when user explicitly opens modal
    // This allows manual retry after errors
    setHasProcessedConnection(false);
    setHasErrored(false);
    setLastError(null);
    processingRef.current = false;

    // Reset logout flag when user explicitly opens modal (they want to authenticate)
    authService.resetLogoutFlag();

    // Always open the modal for explicit user authentication
    // Auto-connected sessions will be ignored until user explicitly chooses
    logger.info('Opening Phantom authentication modal for explicit user authentication', null, 'PhantomAuthButton');
    open();
  };

  const getButtonText = () => {
    if (processing) return 'Creating account...';
    if (hasProcessedConnection) return 'Account connected!';
    if (isConnecting) return 'Connecting to Phantom...';
    
    // If modal is opened, show selection text
    if (isOpened) return 'Select Google or Apple';
    
    // If user is logged out, always show normal connect text (not "existing session")
    if (isLoggedOut) {
      return 'Continue with Phantom';
    }
    
    // Check for auto-connected session (restoring) - only if not logged out
    // This means user has a restored session that hasn't been processed yet
    if (hasAutoConnectedSession) {
      return 'Continue with existing session';
    }
    
    // If connected but not auto-connect or already processed, show continue text
    if (isConnected && user) {
      return 'Continue with Phantom';
    }
    
    return 'Continue with Phantom';
  };

  const getButtonVariant = (): 'primary' | 'secondary' => {
    return isConnected ? 'secondary' : 'primary';
  };

  const isButtonLoading = processing || isConnecting || isOpened;

  // Reset processed state when connection changes (for re-authentication)
  // BUT: Don't reset if user has logged out (prevents auto-connect after logout)
  useEffect(() => {
    if (!isConnected || !user) {
      const authService = PhantomAuthService.getInstance();
      // Only reset if user hasn't logged out
      // If logged out, keep the processed state to prevent auto-connect
      if (!authService.getIsLoggedOut()) {
        setHasProcessedConnection(false);
        setHasErrored(false);
        setLastError(null);
        processingRef.current = false;
      }
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

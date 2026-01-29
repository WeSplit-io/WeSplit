/**
 * Registers Phantom SDK disconnect callback with PhantomAuthService so logout can disconnect the SDK.
 * Must be mounted inside PhantomProvider. Renders nothing.
 */

import React, { useEffect } from 'react';
import { usePhantom, useConnect } from '@phantom/react-native-sdk';
import { PhantomAuthService } from '../../services/auth/PhantomAuthService';
import { logger } from '../../services/analytics/loggingService';

export const PhantomDisconnectRegistration: React.FC = () => {
  const { disconnect } = usePhantom();
  const { disconnect: disconnectFromConnect } = useConnect();

  useEffect(() => {
    const authService = PhantomAuthService.getInstance();
    const disconnectCallback = async () => {
      try {
        logger.info('Disconnecting from Phantom SDK via logout', null, 'PhantomDisconnectRegistration');
        let disconnected = false;
        if (disconnect && typeof disconnect === 'function') {
          try {
            await disconnect();
            disconnected = true;
          } catch (e) {
            logger.warn('usePhantom.disconnect failed', { error: e }, 'PhantomDisconnectRegistration');
          }
        }
        if (!disconnected && disconnectFromConnect && typeof disconnectFromConnect === 'function') {
          try {
            await disconnectFromConnect();
            disconnected = true;
          } catch (e) {
            logger.warn('useConnect.disconnect failed', { error: e }, 'PhantomDisconnectRegistration');
          }
        }
        if (!disconnected) {
          logger.warn('No Phantom SDK disconnect available', null, 'PhantomDisconnectRegistration');
        }
      } catch (error) {
        logger.error('Phantom disconnect failed', error, 'PhantomDisconnectRegistration');
      }
    };
    authService.registerDisconnectCallback(disconnectCallback);
    return () => authService.unregisterDisconnectCallback();
  }, [disconnect, disconnectFromConnect]);

  return null;
};

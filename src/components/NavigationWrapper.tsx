import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';
import { logger } from '../services/core';
import { deepLinkHandler } from '../services/core/deepLinkHandler';
import { navigationService } from '../services/core/navigationService';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const NavigationWrapper: React.FC<NavigationWrapperProps> = ({ children }) => {
  const navigationRef = useRef<NavigationContainerRef<Record<string, object | undefined>>>(null);
  const { state } = useApp();
  const { currentUser } = state;
  const deepLinkSetupRef = useRef<boolean>(false);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only set up deep link listeners if:
    // 1. Navigation is ready
    // 2. User is authenticated
    // 3. User ID has changed (to prevent infinite loops)
    // 4. Deep link setup hasn't been done for this user
    if (
      navigationRef.current && 
      currentUser?.id && 
      currentUserIdRef.current !== currentUser.id && 
      !deepLinkSetupRef.current
    ) {
      logger.info('Setting up deep link listeners for user', { userId: currentUser.id }, 'NavigationWrapper');
      
      // Capture currentUser in closure to avoid stale closure issues
      const user = currentUser;
      const navRef = navigationRef.current;
      
      // Set up deep link listeners when navigation and user are available
      const subscription = deepLinkHandler.setupDeepLinkListeners(navRef, user);
      
      // Mark as set up to prevent multiple calls
      deepLinkSetupRef.current = true;
      currentUserIdRef.current = user.id;
      
      return () => {
        // Clean up subscription when component unmounts or user changes
        if (subscription) {
          subscription.remove();
        }
        deepLinkSetupRef.current = false;
      };
    }
    // Return undefined if condition not met
    return undefined;
  }, [currentUser?.id, currentUser]); // Include both ID and user object for proper dependency tracking

  // Handle initial URL when app starts
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const initialURL = await Linking.getInitialURL();
        if (initialURL) {
          if (__DEV__) {
            logger.info('App opened with URL', { initialURL }, 'NavigationWrapper');
          }
          // The deep link handler will process this URL
        }
      } catch (error) {
        console.error('🔥 Error getting initial URL:', error);
      }
    };

    handleInitialURL();
  }, []);

  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => {
        // Set the navigation reference in the navigation service
        try {
          if (navigationService && navigationService.instance) {
            navigationService.instance.setNavigationRef(navigationRef.current);
          } else {
            logger.warn('Navigation service not available', null, 'NavigationWrapper');
          }
        } catch (error) {
          logger.error('Failed to set navigation reference', { error }, 'NavigationWrapper');
        }
        if (__DEV__) {
          logger.debug('Navigation container is ready', null, 'NavigationWrapper');
        }
      }}
      theme={{
        dark: true,
        colors: {
          primary: colors.green,
          background: colors.black,
          card: colors.black,
          text: colors.white,
          border: colors.white10,
          notification: colors.green,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      {children}
    </NavigationContainer>
  );
};

export default NavigationWrapper; 
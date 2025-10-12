import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';
import { setupDeepLinkListeners } from '../services/deepLinkHandler';
import { useApp } from '../context/AppContext';
import { logger } from '../services/loggingService';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const NavigationWrapper: React.FC<NavigationWrapperProps> = ({ children }) => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
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
      
      // Set up deep link listeners when navigation and user are available
      const subscription = setupDeepLinkListeners(navigationRef.current, currentUser);
      
      // Mark as set up to prevent multiple calls
      deepLinkSetupRef.current = true;
      currentUserIdRef.current = currentUser.id;
      
      return () => {
        // Clean up subscription when component unmounts or user changes
        if (subscription) {
          subscription.remove();
        }
        deepLinkSetupRef.current = false;
      };
    }
  }, [currentUser?.id]); // Only depend on user ID, not the entire user object

  // Handle initial URL when app starts
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const initialURL = await Linking.getInitialURL();
        if (initialURL) {
          logger.info('App opened with URL', { initialURL }, 'NavigationWrapper');
          // The deep link handler will process this URL
        }
      } catch (error) {
        console.error('🔥 Error getting initial URL:', error);
      }
    };

    handleInitialURL();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      {children}
    </NavigationContainer>
  );
};

export default NavigationWrapper; 
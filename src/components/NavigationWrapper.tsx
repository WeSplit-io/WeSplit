import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';
import { setupDeepLinkListeners } from '../services/deepLinkHandler';
import { useApp } from '../context/AppContext';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

const NavigationWrapper: React.FC<NavigationWrapperProps> = ({ children }) => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { state } = useApp();
  const { currentUser } = state;
  const deepLinkSetupRef = useRef<boolean>(false);

  useEffect(() => {
    if (navigationRef.current && currentUser && !deepLinkSetupRef.current) {
      console.log('🔥 Setting up deep link listeners for user:', currentUser.id);
      
      // Set up deep link listeners when navigation and user are available
      const subscription = setupDeepLinkListeners(navigationRef.current, currentUser);
      
      // Mark as set up to prevent multiple calls
      deepLinkSetupRef.current = true;
      
      return () => {
        // Clean up subscription when component unmounts
        if (subscription) {
          subscription.remove();
        }
        deepLinkSetupRef.current = false;
      };
    }
  }, [currentUser]); // Remove navigationRef.current from dependencies

  // Handle initial URL when app starts
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const initialURL = await Linking.getInitialURL();
        if (initialURL) {
          console.log('🔥 App opened with URL:', initialURL);
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
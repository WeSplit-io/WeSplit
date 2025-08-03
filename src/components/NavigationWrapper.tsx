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
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    // Clean up previous subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    if (navigationRef.current && currentUser) {
      console.log('🔥 Setting up deep link listeners for user:', currentUser.id);
      
      // Set up deep link listeners when navigation and user are available
      subscriptionRef.current = setupDeepLinkListeners(navigationRef.current, currentUser);
    }

    return () => {
      // Clean up subscription when component unmounts or dependencies change
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [currentUser?.id]); // Only depend on currentUser.id, not the entire object

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
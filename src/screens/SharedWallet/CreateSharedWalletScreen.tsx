/**
 * Create Shared Wallet Screen
 * Entry point for shared wallet creation - redirects to multi-step flow
 */

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

const CreateSharedWalletScreen: React.FC = () => {
  const navigation = useNavigation();

  // Redirect to the new multi-step flow
  useEffect(() => {
    navigation.replace('SharedWalletName');
  }, [navigation]);

  return null;
};

export default CreateSharedWalletScreen;


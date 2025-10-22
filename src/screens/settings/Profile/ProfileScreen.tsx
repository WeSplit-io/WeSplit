import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, Switch, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import NavBar from '../../../components/NavBar';
import { useApp } from '../../../context/AppContext';
import { useWallet } from '../../../context/WalletContext';
import { walletService } from '../../../services/wallet';
import { styles } from './styles';
import { DEFAULT_AVATAR_URL } from '../../../config/constants/constants';
import UserAvatar from '../../../components/UserAvatar';
import { logger } from '../../../services/core';
import { Container } from '../../../components/shared';
import Header from '../../../components/shared/Header';

// Helper function to safely load images with fallback
const SafeImage = ({ source, style, fallbackSource }: any) => {
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      source={hasError ? fallbackSource : source}
      style={style}
      onError={() => setHasError(true)}
    />
  );
};

// Avatar component wrapper for backward compatibility
const AvatarComponent = ({ avatar, displayName, style }: { avatar?: string, displayName: string, style: any }) => {
  return (
    <UserAvatar
      avatarUrl={avatar}
      displayName={displayName}
      style={style}
    />
  );
};

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { state, logoutUser } = useApp();
  const { currentUser } = state;
  const { clearAppWalletState } = useWallet();
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);

  // Early return if no current user
  if (!currentUser) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    );
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (__DEV__) { logger.info('Starting logout process', null, 'ProfileScreen'); }

              // Import required services
              const { authService } = await import('../../../services/auth');
              const { walletService } = await import('../../../services/wallet');

              // Step 1: Sign out from Firebase Auth
              await authService.signOut();
              if (__DEV__) { logger.info('Firebase Auth signOut completed', null, 'ProfileScreen'); }

              // Step 2: Clear secure storage data for current user (EXCEPT wallet data)
              if (currentUser?.id) {
                try {
                  // Clear user data but preserve wallet credentials
                  // Note: Wallet data is now managed by walletService
                  logger.info('User data cleared (wallet preserved)', { userId: currentUser.id }, 'ProfileScreen');
                  if (__DEV__) { logger.info('Secure storage cleared for user (wallet preserved)', { userId: currentUser.id }, 'ProfileScreen'); }
                } catch (storageError) {
                  console.warn('⚠️ Failed to clear secure storage:', storageError);
                  // Continue with logout even if storage clearing fails
                }
              }

              // Step 2.5: Clear wallet balance cache for current user
              if (currentUser?.id) {
                try {
                  walletService.clearBalanceCache(String(currentUser.id));
                  if (__DEV__) { logger.info('Wallet balance cache cleared for user', { userId: currentUser.id }, 'ProfileScreen'); }
                } catch (cacheError) {
                  console.warn('⚠️ Failed to clear wallet balance cache:', cacheError);
                  // Continue with logout even if cache clearing fails
                }
              }

              // Step 3: Clear wallet context state (prevents wallet data leakage between users)
              try {
                clearAppWalletState();
                if (__DEV__) { logger.info('Wallet context state cleared', null, 'ProfileScreen'); }
              } catch (walletError) {
                console.warn('⚠️ Failed to clear wallet context state:', walletError);
                // Continue with logout even if wallet context clearing fails
              }

              // Step 4: Clear app context state (this also clears listeners and cache)
              logoutUser();
              if (__DEV__) { logger.info('App context cleared', null, 'ProfileScreen'); }

              if (__DEV__) { logger.info('Logout completed successfully', null, 'ProfileScreen'); }

              // Step 5: Navigate to auth methods screen
              navigation.replace('AuthMethods');

            } catch (error) {
              console.error('❌ Logout error:', error);
              // Still clear app context even if Firebase logout fails
              logoutUser();
              navigation.replace('AuthMethods');
            }
          }
        }
      ]
    );
  };

  const handleAccountInfo = () => {
    navigation.navigate('AccountSettings');
  };

  const handleSeedPhrase = async () => {
    try {
      if (!currentUser?.id) {return;}

      logger.info('Preparing secure seed phrase access', null, 'ProfileScreen');

      // Initialize secure wallet (generates if needed, retrieves if exists)
      const { address, isNew } = await walletService.initializeSecureWallet(currentUser.id.toString());

      if (isNew) {
        logger.info('New secure wallet created for user', { userId: currentUser.id }, 'ProfileScreen');
        Alert.alert(
          'Secure Wallet Created',
          'Your single app wallet has been created. Your 12-word seed phrase is stored securely on your device only and can be used to export your wallet to external providers like Phantom and Solflare.',
          [{ text: 'OK' }]
        );
      } else {
        logger.info('Existing app wallet seed phrase retrieved for user', { userId: currentUser.id }, 'ProfileScreen');
      }

      logger.info('Secure seed phrase access prepared successfully', null, 'ProfileScreen');

      navigation.navigate('SeedPhraseView');
    } catch (error) {
      console.error('🔐 ProfileScreen: Error preparing secure seed phrase access:', error);
      Alert.alert('Error', 'Failed to prepare secure seed phrase access. Please try again.');
    }
  };

  const handleTransactionHistory = () => {
    navigation.navigate('TransactionHistory');
  };

  const handleWalletManagement = () => {
    navigation.navigate('WalletManagement');
  };

  const handleVerifyAccount = () => {
    Alert.alert('Verify Account', 'Account verification feature coming soon!');
  };

  const handleReferralFriend = () => {
    Alert.alert('Referral', 'Refer a friend feature coming soon!');
  };

  const handleHelpCenter = () => {
    Linking.openURL('https://t.me/wesplit_support_bot');
  };

  const handleFAQ = () => {
    Alert.alert('FAQ', 'FAQ feature coming soon!');
  };

  const handleFaceIdToggle = () => {
    setFaceIdEnabled(!faceIdEnabled);
  };

  const displayName = currentUser?.name || 'PauluneMoon';
  const displayId = currentUser?.wallet_address ? `${currentUser.wallet_address.substring(0, 4)}.....${currentUser.wallet_address.substring(currentUser.wallet_address.length - 4)}` : 'B3gr.....sdgux';

  return (
    <Container>
      {/* Header */}
      <Header 
        title="Profile"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <TouchableOpacity style={styles.profileCard} onPress={handleAccountInfo}>
          <View style={styles.profileAvatar}>
            <AvatarComponent
              avatar={currentUser?.avatar}
              displayName={displayName}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileId}>{displayId}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleAccountInfo}>
            <Image
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ficon-edit-white70.png?alt=media&token=bc45a0b7-6fcd-45f1-8d65-c73fe2ef4a92' }}
              style={styles.editIcon}
            />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Account Details Section */}
        <Text style={styles.sectionTitle}>Account details</Text>
        <View style={styles.menuItemsContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleWalletManagement}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwallet-icon-default.png?alt=media&token=ec0f1589-4bc6-41a9-80d9-6ce68ab36448' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>Wallet</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleAccountInfo}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-account-icon.png?alt=media&token=29c78193-1d31-4c25-9cd6-ba301a241554' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>Account info</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSeedPhrase}>
            <SafeImage
              source={require('../../../../assets/eye-icon.png')}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>Seed phrase</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleTransactionHistory}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-history-icon.png?alt=media&token=95a8fbb7-1574-4f6b-8dc8-5bd02d0608e9' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>Transaction History</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleVerifyAccount}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-verify-icon.png?alt=media&token=abda6454-007c-495b-a64d-5169da43316e' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>Verify account</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleReferralFriend}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-referal-icon.png?alt=media&token=d8f12c3f-11ef-46bd-8f8f-013da5274a80' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>Referral Friend</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>
        </View>





        {/* Help and Support Section */}
        <Text style={styles.sectionTitle}>Help and Support</Text>
        <View style={styles.menuItemsContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleHelpCenter}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-help-icon.png?alt=media&token=b8848597-c8ee-415d-b689-22bd31397ad2' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>Help Center</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleFAQ}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-faq-icon.png?alt=media&token=afb4392e-da9e-4c53-bf59-2475eef7c40c' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>FAQ</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>

          {/* <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AuthDebug')}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-help-icon.png?alt=media&token=b8848597-c8ee-415d-b689-22bd31397ad2' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>🔧 Auth Debug</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity> */}

          <TouchableOpacity style={[styles.menuItem, { marginBottom: 0 }]} onPress={handleLogout}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-logout-icon.png?alt=media&token=5282a042-4105-445a-8ea2-1136245a59c6' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
              style={styles.chevronIcon}
              fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            />
          </TouchableOpacity>
        </View>


        {/* Extra space at bottom for NavBar */}
        <View style={{ height: 150 }} />
      </ScrollView>

      <NavBar currentRoute="Profile" navigation={navigation} />
    </Container>
  );
};

export default ProfileScreen; 
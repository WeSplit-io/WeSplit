import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import NavBar from '../../../components/shared/NavBar';
import { useApp } from '../../../context/AppContext';
import { useWallet } from '../../../context/WalletContext';
import { styles } from './styles';
import Avatar from '../../../components/shared/Avatar';
import { logger } from '../../../services/analytics/loggingService';
import { Container, PhosphorIcon } from '../../../components/shared';
import Header from '../../../components/shared/Header';
import { colors } from '../../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Avatar component wrapper for backward compatibility
const AvatarComponent = ({ avatar, displayName, style, userId }: { avatar?: string, displayName: string, style: any, userId?: string }) => {
  return (
    <Avatar
      avatarUrl={avatar}
      userName={displayName}
      userId={userId}
      size={60}
      style={style}
      // Explicitly render avatar without decorative profile border
    />
  );
};

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { state, logoutUser } = useApp();
  const { currentUser, isAuthenticated } = state;
  const { clearAppWalletState } = useWallet();

  // Phone reminder badge state
  const [needsPhoneReminder, setNeedsPhoneReminder] = useState(false);

  // Check phone prompt status
  useEffect(() => {
    const checkPhonePromptStatus = async () => {
      if (!currentUser?.id || !isAuthenticated) {
        return;
      }

      try {
        // Check if user has email but no phone number
        const hasEmail = !!currentUser.email;
        const hasPhone = !!currentUser.phone;

        if (hasEmail && !hasPhone) {
          // Check if user has seen the prompt before
          const promptShownKey = `phone_prompt_shown_${currentUser.id}`;
          const promptShown = await AsyncStorage.getItem(promptShownKey);

          if (promptShown) {
            // User has seen prompt but skipped - show reminder badge
            setNeedsPhoneReminder(true);
          } else {
            setNeedsPhoneReminder(false);
          }
        } else {
          setNeedsPhoneReminder(false);
        }
      } catch (error) {
        logger.error('Failed to check phone prompt status', error as Record<string, unknown>, 'ProfileScreen');
      }
    };

    checkPhonePromptStatus();
  }, [currentUser?.id, currentUser?.email, currentUser?.phone, isAuthenticated]);

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
              const { walletService } = await import('../../../services/blockchain/wallet');
              const { AuthPersistenceService } = await import('../../../services/core/authPersistenceService');
              const { clearAesKeyCache } = await import('../../../services/security/secureVault');

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
                    walletService.clearUserCache(String(currentUser.id));
                    if (__DEV__) { logger.info('Wallet balance cache cleared for user', { userId: currentUser.id }, 'ProfileScreen'); }
                  } catch (cacheError) {
                  console.warn('⚠️ Failed to clear wallet balance cache:', cacheError);
                  // Continue with logout even if cache clearing fails
                }
              }

              // Step 3: Clear AES key cache (prevents Face ID bypass after logout)
              try {
                clearAesKeyCache();
                if (__DEV__) { logger.info('AES key cache cleared', null, 'ProfileScreen'); }
              } catch (cacheError) {
                console.warn('⚠️ Failed to clear AES key cache:', cacheError);
                // Continue with logout even if cache clearing fails
              }

              // Step 4: Clear wallet context state (prevents wallet data leakage between users)
              try {
                clearAppWalletState();
                if (__DEV__) { logger.info('Wallet context state cleared', null, 'ProfileScreen'); }
              } catch (walletError) {
                console.warn('⚠️ Failed to clear wallet context state:', walletError);
                // Continue with logout even if wallet context clearing fails
              }

              // Step 5: Clear stored email and phone
              try {
                await AuthPersistenceService.clearEmail();
                await AuthPersistenceService.clearPhone();
                if (__DEV__) { logger.info('Stored email and phone cleared', null, 'ProfileScreen'); }
              } catch (authDataError) {
                console.warn('⚠️ Failed to clear stored auth data:', authDataError);
                // Continue with logout even if auth data clearing fails
              }

              // Step 6: Clear app context state (this also clears listeners and cache)
              logoutUser();
              if (__DEV__) { logger.info('App context cleared', null, 'ProfileScreen'); }

              if (__DEV__) { logger.info('Logout completed successfully', null, 'ProfileScreen'); }

              // Step 6: Navigate to auth methods screen
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

  const handleSeedPhrase = () => {
    // Navigate immediately - let SeedPhraseView handle the loading
    navigation.navigate('SeedPhraseView');
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
    navigation.navigate('Referral');
  };

  const handleHelpCenter = () => {
    Linking.openURL('https://t.me/wesplit_support_bot');
  };

  const handleFAQ = () => {
    Linking.openURL('https://wesplit.io').catch(() =>
      Alert.alert('Error', 'Unable to open wesplit.io')
    );
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
        <TouchableOpacity 
          style={styles.profileCard} 
          onPress={handleAccountInfo}
        >
          <View style={styles.profileAvatar}>
            <AvatarComponent
              avatar={currentUser?.avatar}
              displayName={displayName}
              userId={currentUser?.id}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileId}>{displayId}</Text>
            {currentUser?.points !== undefined && (
              <View style={styles.pointsContainer}>
                <Text style={styles.pointsLabel}>Points:</Text>
                <Text style={styles.pointsValue}>{currentUser.points || 0}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleAccountInfo}>
            <PhosphorIcon name="PencilSimpleLine" size={20} color={colors.white} weight="regular" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Account Details Section */}
        <Text style={styles.sectionTitle}>Account details</Text>
        <View style={styles.menuItemsContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleWalletManagement}>
            <PhosphorIcon name="Wallet" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Wallet</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleAccountInfo}>
            <PhosphorIcon name="UserCircle" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Account info</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSeedPhrase}>
            <PhosphorIcon name="Eye" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Seed phrase</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleTransactionHistory}>
            <PhosphorIcon name="Receipt" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Transaction History</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleVerifyAccount}>
            <PhosphorIcon name="ShieldCheck" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Verify account</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleReferralFriend}>
            <PhosphorIcon name="UserPlus" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Referral Friend</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>
        </View>





        {/* Help and Support Section */}
        <Text style={styles.sectionTitle}>Help and Support</Text>
        <View style={styles.menuItemsContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleHelpCenter}>
            <PhosphorIcon name="Question" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Help Center</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleFAQ}>
            <PhosphorIcon name="QuestionMark" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>FAQ</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
          </TouchableOpacity>

          {/* <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AuthDebug')}>
            <SafeImage
              source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-help-icon.png?alt=media&token=b8848597-c8ee-415d-b689-22bd31397ad2' }}
              style={styles.menuIcon}
              fallbackSource={{ uri: DEFAULT_AVATAR_URL }}
            />
            <Text style={styles.menuItemText}>🔧 Auth Debug</Text>
            <PhosphorIcon
              name="ChevronRight"
              size={20}
              color={colors.white70}
              style={styles.chevronIcon}
            />
          </TouchableOpacity> */}

          <TouchableOpacity style={[styles.menuItem, { marginBottom: 0 }]} onPress={handleLogout}>
            <PhosphorIcon name="SignOut" size={20} color={colors.white} weight="regular" />
            <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
            <PhosphorIcon name="CaretRight" size={16} color={colors.white70} weight="regular" />
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
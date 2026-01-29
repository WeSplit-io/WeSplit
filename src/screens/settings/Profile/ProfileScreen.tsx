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

              // ✅ CRITICAL: Set Phantom logout flag FIRST so GetStarted never auto-triggers Phantom
              try {
                const { PhantomAuthService } = await import('../../../services/auth/PhantomAuthService');
                const phantomService = PhantomAuthService.getInstance();
                phantomService.setLogoutFlag();
                if (__DEV__) { logger.info('Phantom logout flag set immediately', null, 'ProfileScreen'); }
              } catch (phantomFlagError) {
                logger.warn('Failed to set Phantom logout flag (non-critical)', {
                  error: phantomFlagError instanceof Error ? phantomFlagError.message : String(phantomFlagError)
                }, 'ProfileScreen');
              }

              // Import required services
              // ✅ CRITICAL: Import AuthService directly (not from index) to avoid module resolution issues
              // Use the same pattern as other screens (AuthMethodsScreen, DashboardScreen, etc.)
              let authService;
              try {
                const authServiceModule = await import('../../../services/auth/AuthService');
                // Handle both named export and default export
                authService = authServiceModule.authService || authServiceModule.default;
                
                if (!authService) {
                  logger.error('authService is undefined after import', {
                    hasAuthService: !!authServiceModule.authService,
                    hasDefault: !!authServiceModule.default,
                    moduleKeys: Object.keys(authServiceModule)
                  }, 'ProfileScreen');
                  throw new Error('authService is not available');
                }
                
                if (typeof authService.signOut !== 'function') {
                  logger.error('authService.signOut is not a function', {
                    authServiceType: typeof authService,
                    authServiceKeys: Object.keys(authService || {})
                  }, 'ProfileScreen');
                  throw new Error('authService.signOut method is missing');
                }
              } catch (importError) {
                logger.error('Failed to import authService', {
                  error: importError instanceof Error ? importError.message : String(importError)
                }, 'ProfileScreen');
                // Fallback: try importing from index
                try {
                  const indexModule = await import('../../../services/auth');
                  authService = indexModule.authService;
                  if (!authService || typeof authService.signOut !== 'function') {
                    throw new Error('authService not available from index');
                  }
                } catch (fallbackError) {
                  logger.error('Failed to import authService from index as fallback', {
                    error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                  }, 'ProfileScreen');
                  // Still try to continue with logout using AppContext
                  Alert.alert(
                    'Logout Error',
                    'Unable to import authentication service. Clearing app state and navigating to login screen.',
                    [{ text: 'OK' }]
                  );
                  logoutUser();
                  navigation.replace('GetStarted');
                  return;
                }
              }
              
              const { simplifiedWalletService } = await import('../../../services/blockchain/wallet/simplifiedWalletService');
              const { AuthPersistenceService } = await import('../../../services/core/authPersistenceService');
              const { clearAesKeyCache } = await import('../../../services/security/secureVault');
              const { PhantomAuthService } = await import('../../../services/auth/PhantomAuthService');

              // Step 0: Disconnect Phantom SDK on every logout so GetStarted does not auto sign-in with Phantom
              try {
                const phantomService = PhantomAuthService.getInstance();
                phantomService.setLogoutFlag();
                await phantomService.signOut();
                if (__DEV__) { logger.info('Phantom signOut completed', null, 'ProfileScreen'); }
              } catch (phantomError) {
                logger.warn('Failed to sign out from Phantom (non-critical)', {
                  error: phantomError instanceof Error ? phantomError.message : String(phantomError)
                }, 'ProfileScreen');
                try {
                  PhantomAuthService.getInstance().setLogoutFlag();
                } catch {
                  // ignore
                }
              }

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
                    simplifiedWalletService.clearUserCache(String(currentUser.id));
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

              // Step 5: Clear stored email/phone for session; do NOT clear PIN so it persists when user signs back in
              try {
                await AuthPersistenceService.clearEmail();
                await AuthPersistenceService.clearPhone();
                if (__DEV__) { logger.info('Stored email/phone cleared (PIN preserved)', null, 'ProfileScreen'); }
              } catch (authDataError) {
                console.warn('⚠️ Failed to clear stored auth data:', authDataError);
              }

              // Step 6: Clear app context state (this also clears listeners and cache)
              logoutUser();
              if (__DEV__) { logger.info('App context cleared', null, 'ProfileScreen'); }

              if (__DEV__) { logger.info('Logout completed successfully', null, 'ProfileScreen'); }

              // Step 6: Small delay before navigation to ensure logout flag is set and SDK is disconnected
              // This prevents race conditions where auto-connect might trigger during navigation
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Step 7: Navigate to auth methods screen
              navigation.replace('GetStarted');

            } catch (error) {
              console.error('❌ Logout error:', error);
              // Still clear app context even if Firebase logout fails
              logoutUser();
              navigation.replace('GetStarted');
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

  const handleCommunity = () => {
    navigation.navigate('HowToEarnPoints', { openToRedeem: true });
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

          <TouchableOpacity style={styles.menuItem} onPress={handleCommunity}>
            <PhosphorIcon name="UsersThree" size={20} color={colors.white} weight="regular" />
            <Text style={styles.menuItemText}>Community</Text>
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
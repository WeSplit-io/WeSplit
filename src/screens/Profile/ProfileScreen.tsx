import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Alert, SafeAreaView, Switch, ActivityIndicator, Linking } from 'react-native';
import Icon from '../../components/Icon';
import NavBar from '../../components/NavBar';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
import { styles } from './styles';

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

// Avatar component with loading state and error handling
const AvatarComponent = ({ avatar, displayName, style }: { avatar?: string, displayName: string, style: any }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (avatar && avatar.trim() !== '') {
      setIsLoading(true);
      setHasError(false);
    }
  }, [avatar]);

  if (!avatar || avatar.trim() === '' || hasError) {
    return (
      <View style={[style, styles.avatarFallback]}>
        <Text style={styles.avatarFallbackText}>
          {displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      {isLoading && (
        <View style={[style, styles.avatarLoadingContainer]}>
          <ActivityIndicator size="small" color="#A5EA15" />
        </View>
      )}
      <Image 
        source={{ uri: avatar }} 
        style={[style, { opacity: isLoading ? 0 : 1 }]}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </View>
  );
};

const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const { state, logoutUser } = useApp();
  const { currentUser } = state;
  const { clearAppWalletState } = useWallet();
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);

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
              if (__DEV__) { console.log('🔄 Starting logout process...'); }
              
              // Import required services
              const { consolidatedAuthService } = await import('../../services/consolidatedAuthService');
              const { secureStorageService } = await import('../../services/secureStorageService');
              const { userWalletService } = await import('../../services/userWalletService');
              
              // Step 1: Sign out from Firebase Auth
              await consolidatedAuthService.signOut();
              if (__DEV__) { console.log('✅ Firebase Auth signOut completed'); }
              
              // Step 2: Clear secure storage data for current user (EXCEPT wallet data)
              if (currentUser?.id) {
                try {
                  // Clear user data but preserve wallet credentials
                  await secureStorageService.clearUserDataExceptWallet(String(currentUser.id));
                  if (__DEV__) { console.log('✅ Secure storage cleared for user (wallet preserved):', currentUser.id); }
                } catch (storageError) {
                  console.warn('⚠️ Failed to clear secure storage:', storageError);
                  // Continue with logout even if storage clearing fails
                }
              }
              
              // Step 2.5: Clear wallet balance cache for current user
              if (currentUser?.id) {
                try {
                  userWalletService.clearBalanceCache(String(currentUser.id));
                  if (__DEV__) { console.log('✅ Wallet balance cache cleared for user:', currentUser.id); }
                } catch (cacheError) {
                  console.warn('⚠️ Failed to clear wallet balance cache:', cacheError);
                  // Continue with logout even if cache clearing fails
                }
              }
              
              // Step 3: Clear wallet context state (prevents wallet data leakage between users)
              try {
                clearAppWalletState();
                if (__DEV__) { console.log('✅ Wallet context state cleared'); }
              } catch (walletError) {
                console.warn('⚠️ Failed to clear wallet context state:', walletError);
                // Continue with logout even if wallet context clearing fails
              }
              
              // Step 4: Clear app context state (this also clears listeners and cache)
              logoutUser();
              if (__DEV__) { console.log('✅ App context cleared'); }
              
              if (__DEV__) { console.log('✅ Logout completed successfully'); }
              
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

  const handleWallet = () => {
    navigation.navigate('WalletManagement');
  };

  const handleTransactionHistory = () => {
    navigation.navigate('TransactionHistory');
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

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
        
        <TouchableOpacity style={styles.menuItem} onPress={handleAccountInfo}>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-account-icon.png?alt=media&token=29c78193-1d31-4c25-9cd6-ba301a241554' }} 
            style={styles.menuIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
          />
          <Text style={styles.menuItemText}>Account info</Text>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
            style={styles.chevronIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleWallet}>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-wallet-icon.png?alt=media&token=f88a0ca7-0c4f-4c67-919e-0c26b253317a' }} 
            style={styles.menuIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
          />
          <Text style={styles.menuItemText}>Wallet</Text>
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
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
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
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
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
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
          />
          <Text style={styles.menuItemText}>Referral Friend</Text>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
            style={styles.chevronIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
          />
        </TouchableOpacity>

        <View style={styles.menuItem}>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-scan-id.png?alt=media&token=25846ce1-e65a-4fe3-bbc3-1681575836c2' }} 
            style={styles.menuIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
          />
          <Text style={styles.menuItemText}>Set up Face ID</Text>
          <Switch
            value={faceIdEnabled}
            onValueChange={handleFaceIdToggle}
            trackColor={{ false: '#767577', true: '#A5EA15' }}
            thumbColor={faceIdEnabled ? '#212121' : '#f4f3f4'}
          />
        </View>

        {/* Help and Support Section */}
        <Text style={styles.sectionTitle}>Help and Support</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleHelpCenter}>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-help-icon.png?alt=media&token=b8848597-c8ee-415d-b689-22bd31397ad2' }} 
            style={styles.menuIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
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
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
          />
          <Text style={styles.menuItemText}>FAQ</Text>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
            style={styles.chevronIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
          />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { marginBottom: 0 }]} onPress={handleLogout}>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fprofil-logout-icon.png?alt=media&token=5282a042-4105-445a-8ea2-1136245a59c6' }} 
            style={styles.menuIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fuser.png?alt=media&token=2f63fec7-5324-4c87-8e31-4c7c6f789d6f' }}
          />
          <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
          <SafeImage 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fchevron-right.png?alt=media&token=687fb55d-49d9-4604-8597-6a8eed69208c' }}
            style={styles.chevronIcon}
            fallbackSource={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Farrow-left.png?alt=media&token=103ee202-f6fd-4303-97b5-fe0138186378' }}
          />
        </TouchableOpacity>
        
        {/* Extra space at bottom for NavBar */}
        <View style={{ height:150 }} />
      </ScrollView>
      
      <NavBar currentRoute="Profile" navigation={navigation} />
    </SafeAreaView>
  );
};

export default ProfileScreen; 
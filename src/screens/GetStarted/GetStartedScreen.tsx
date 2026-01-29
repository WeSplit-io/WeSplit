import React, { useState } from 'react';
import { View, Text, Image, StatusBar } from 'react-native';
import { styles } from './styles';
import { colors } from '../../theme';
import { Container } from '../../components/shared';
import Button from '../../components/shared/Button';
import AuthMethodSelectionModal from '../../components/auth/AuthMethodSelectionModal';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { authService } from '../../services/auth/AuthService';
import { PhantomAuthService } from '../../services/auth/PhantomAuthService';

interface GetStartedScreenProps {
  navigation: any;
} 

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { authenticateUser } = useApp();

  // Process Phantom authentication success - extracted from AuthMethodsScreen
  const processPhantomAuthSuccess = async (phantomUser: any) => {
    logger.info('Processing phantom auth success', {
      phantomUserId: phantomUser.id,
      socialProvider: phantomUser.socialProvider,
      hasFirebaseUserId: !!phantomUser.firebaseUserId,
      firebaseUserId: phantomUser.firebaseUserId
    }, 'GetStartedScreen');

    // Handle Google auth with Firebase users
    if (phantomUser.socialProvider === 'google' && phantomUser.firebaseUserId) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const { auth } = await import('../../config/firebase/firebase');
        const currentFirebaseUser = auth.currentUser;

        if (currentFirebaseUser && currentFirebaseUser.uid === phantomUser.firebaseUserId) {
          const existingUserData = await firebaseDataService.user.getCurrentUser(currentFirebaseUser.uid);
          const walletInfo = await authService.ensureUserWallet(currentFirebaseUser.uid);
          const appUser = {
            id: currentFirebaseUser.uid,
            name: existingUserData?.name || currentFirebaseUser.displayName || phantomUser.name || '',
            email: currentFirebaseUser.email || phantomUser.email || '',
            wallet_address: walletInfo?.walletAddress || existingUserData?.wallet_address || '',
            wallet_public_key: walletInfo?.walletPublicKey || existingUserData?.wallet_public_key || '',
            created_at: currentFirebaseUser.metadata.creationTime || new Date().toISOString(),
            avatar: existingUserData?.avatar || currentFirebaseUser.photoURL || phantomUser.avatar || '',
            emailVerified: currentFirebaseUser.emailVerified,
            lastLoginAt: currentFirebaseUser.metadata.lastSignInTime || new Date().toISOString(),
            hasCompletedOnboarding: existingUserData?.hasCompletedOnboarding || false
          };

          authenticateUser(appUser, 'social');

          const hasName = appUser.name && appUser.name.trim() !== '';
          const hasCompletedOnboarding = appUser.hasCompletedOnboarding === true;

          if (!hasName) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'CreateProfile', params: { email: appUser.email } }],
            });
          } else if (hasCompletedOnboarding) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Dashboard' }],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Dashboard' }],
            });
          }
          return;
        }
      } catch (error) {
        logger.warn('Failed to get Firebase user for Google Phantom auth', {
          error: error instanceof Error ? error.message : String(error)
        }, 'GetStartedScreen');
      }
    }

    // Fallback: handle phantom users
    let firebaseUserId = phantomUser.firebaseUserId;
    
    if (!firebaseUserId && phantomUser.socialProvider === 'apple') {
      try {
        const phantomAuthService = PhantomAuthService.getInstance();
        const appleEmail = phantomUser.email || `${phantomUser.id}@apple.phantom.app`;
        const result = await phantomAuthService.ensureFirebaseAuthUserForPhantom(phantomUser, appleEmail);
        if (result?.success && result?.firebaseUserId) {
          firebaseUserId = result.firebaseUserId;
        }
      } catch (error) {
        logger.warn('Failed to create Firebase Auth user for Apple Phantom auth', {
          error: error instanceof Error ? error.message : String(error)
        }, 'GetStartedScreen');
      }
    }

    const walletAddress = phantomUser.phantomWalletAddress;
    const walletPublicKey = phantomUser.phantomWalletAddress;
    
    if (firebaseUserId && walletAddress) {
      try {
        await firebaseDataService.user.updateUser(firebaseUserId, {
          wallet_address: walletAddress,
          wallet_public_key: walletPublicKey,
          wallet_type: 'external',
          wallet_status: 'healthy'
        });
      } catch (error) {
        logger.warn('Failed to update user record with Phantom wallet', {
          error: error instanceof Error ? error.message : String(error)
        }, 'GetStartedScreen');
      }
    }

    let existingUserData = null;
    if (firebaseUserId) {
      try {
        existingUserData = await firebaseDataService.user.getCurrentUser(firebaseUserId);
      } catch (error) {
        logger.warn('Failed to get user data from Firestore for Phantom auth', {
          error: error instanceof Error ? error.message : String(error)
        }, 'GetStartedScreen');
      }
    }

    const appUser = {
      id: firebaseUserId || phantomUser.id,
      name: existingUserData?.name || phantomUser.name || '',
      email: phantomUser.email || existingUserData?.email || '',
      wallet_address: walletAddress || existingUserData?.wallet_address || '',
      wallet_public_key: walletPublicKey || existingUserData?.wallet_public_key || '',
      created_at: typeof phantomUser.createdAt === 'number'
        ? new Date(phantomUser.createdAt).toISOString()
        : phantomUser.createdAt || existingUserData?.created_at || new Date().toISOString(),
      avatar: existingUserData?.avatar || phantomUser.avatar || '',
      hasCompletedOnboarding: existingUserData?.hasCompletedOnboarding || false
    };

    authenticateUser(appUser, 'social');

    const hasName = appUser.name && appUser.name.trim() !== '';
    const hasCompletedOnboarding = appUser.hasCompletedOnboarding === true;

    if (!hasName) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'CreateProfile', params: { email: appUser.email } }],
      });
    } else if (hasCompletedOnboarding) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
  };

  return (
    <Container>
      <StatusBar backgroundColor={colors.black} barStyle="light-content" />
      
      <View style={styles.content}>

        {/* Hero Spiral Image */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbg-getstarted.png?alt=media&token=5af05446-57a9-4b7d-9689-446fd382f5a3' }} 
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Main Content */}
        <View style={styles.messageSection}>
          <Text style={styles.headline}>Spend together</Text>
          <Text style={styles.headline}>Grow together</Text>
          
          <Text style={styles.subtitle}>
          The shared wallet for your inner circle. Pool your crypto earn interest, & pay instantly.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <Button
            title="Get Started"
            onPress={() => setModalVisible(true)}
            variant="primary"
            size="large"
            fullWidth={true}
          />
        </View>

        {/* Auth Method Selection Modal */}
        <AuthMethodSelectionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSelectEmail={() => {
            navigation.navigate('EmailPhoneInput', { authMethod: 'email' });
          }}
          onSelectPhone={() => {
            navigation.navigate('EmailPhoneInput', { authMethod: 'phone' });
          }}
          onPhantomSuccess={processPhantomAuthSuccess}
          onPhantomError={(error) => {
            logger.error('Phantom authentication failed', { error }, 'GetStartedScreen');
          }}
        />
      </View>
    </Container>
  );
};

export default GetStartedScreen;

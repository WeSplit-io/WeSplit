import React, { useEffect, useState } from 'react';
import { View, Image, Text, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { auth, firestoreService, db } from '../../config/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from '../../services/analytics/loggingService';
import { AuthPersistenceService } from '../../services/core/authPersistenceService';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { state, authenticateUser } = useApp();
  const { isAuthenticated, currentUser } = state;

  // Animation states
  const [progress] = useState(new Animated.Value(0));
  const [hasNavigated, setHasNavigated] = useState(false);
  const [logoOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    // Start animations immediately to prevent white screen
    const startAnimations = () => {
      logger.debug('Starting splash screen animations', null, 'SplashScreen');

      // Logo fade in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Progress bar animation
      Animated.timing(progress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start();
    };

    // Initialize app and start animations
    const initializeApp = async () => {
      try {
        // Start animations immediately
        startAnimations();

        // Initialize push notifications in background
        const notificationPromise = import('../../services/notifications')
          .then(({ notificationService }) => notificationService.instance.initializePushNotifications())
          .then((initialized) => {
            if (initialized) {
              if (__DEV__) {
                logger.info('Push notifications initialized successfully', null, 'SplashScreen');
              }
            } else {
              logger.warn('Push notifications initialization failed - permissions may be denied', null, 'SplashScreen');
            }
          })
          .catch((error) => {
            logger.warn('Push notifications initialization failed', error, 'SplashScreen');
          });

        logger.info('App initialized successfully', null, 'SplashScreen');
        
        // Let notifications initialize in background
        notificationPromise;
      } catch (error) {
        logger.warn('App initialization warnings (non-blocking)', error, 'SplashScreen');
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        // Prevent duplicate navigation
        if (hasNavigated) {
          logger.debug('Navigation already completed, skipping', null, 'SplashScreen');
          return;
        }

        // Wait for app initialization and minimum splash screen duration
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ✅ CRITICAL: Wait for Firebase Auth state to be fully restored
        // AsyncStorage may be cleared on app updates, so we need to wait for auth state restoration
        let firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          // Wait up to 3 seconds for auth state to restore from AsyncStorage
          logger.info('No immediate auth state, waiting for restoration', null, 'SplashScreen');
          await new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
              unsubscribe();
              firebaseUser = user;
              resolve(user);
            });
            // Timeout after 3 seconds
            setTimeout(() => {
              unsubscribe();
              resolve(null);
            }, 3000);
          });
        }

        if (firebaseUser) {
          // User is authenticated via Firebase (persisted session). Require PIN if set, then Dashboard.
          // We do not require emailVerified: custom-token (e.g. email code) login may leave it false.
          logger.info('User authenticated via Firebase, fetching fresh user data from Firestore', { uid: firebaseUser.uid }, 'SplashScreen');

          // CRITICAL: Fetch fresh user data from Firestore instead of relying on stale app context
          try {
            const userData = await firestoreService.getUserDocument(firebaseUser.uid);
            
            if (userData) {
              // Check if existing user should skip onboarding
              const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

              // Transform to app user format - include ALL user fields from Firestore
              const transformedUser = {
                // Spread all Firestore data first
                ...userData,
                // Then override with critical fields that need fallbacks
                id: userData.id || firebaseUser.uid,
                name: userData.name || '',
                email: userData.email || firebaseUser.email || '',
                wallet_address: userData.wallet_address || '',
                wallet_public_key: userData.wallet_public_key || userData.wallet_address || '',
                created_at: userData.created_at || new Date().toISOString(),
                avatar: userData.avatar || '',
                hasCompletedOnboarding: shouldSkipOnboarding,
                // Ensure asset fields are included with proper defaults
                badges: userData.badges || [],
                active_badge: userData.active_badge || undefined,
                profile_assets: userData.profile_assets || [],
                active_profile_asset: userData.active_profile_asset || undefined,
                profile_borders: userData.profile_borders || [],
                active_profile_border: userData.active_profile_border || undefined,
                wallet_backgrounds: userData.wallet_backgrounds || [],
                active_wallet_background: userData.active_wallet_background || undefined,
                points: userData.points || 0,
                total_points_earned: userData.total_points_earned || 0,
              };

              // Update app context with fresh data
              authenticateUser(transformedUser, 'email');

              // Check if user needs to create a profile
              // A user has a profile if they have a name AND have completed onboarding
              const hasName = transformedUser.name && transformedUser.name.trim() !== '';
              const hasCompletedOnboarding = transformedUser.hasCompletedOnboarding === true;
              
              logger.info('Checking user profile status on splash', {
                userId: transformedUser.id,
                hasName,
                hasCompletedOnboarding,
                name: transformedUser.name?.substring(0, 10) + '...',
                email: transformedUser.email?.substring(0, 10) + '...'
              }, 'SplashScreen');

              if (!hasName) {
                // User doesn't have a name - needs to create profile
                logger.info('User needs to create profile (no name), navigating to CreateProfile', { 
                  email: transformedUser.email,
                  userId: transformedUser.id
                }, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('CreateProfile', { email: transformedUser.email });
              } else {
                // User has profile: always go through PinUnlock (single gate). PinUnlock will redirect to Dashboard if no PIN set.
                const userId = transformedUser.id || firebaseUser.uid;
                logger.info('User has profile, routing through PinUnlock gate', { userId, name: transformedUser.name?.substring(0, 10) }, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('PinUnlock');
              }
            } else {
              // User document doesn't exist in Firestore - this shouldn't happen but handle gracefully
              logger.warn('Firebase user exists but Firestore document not found', { uid: firebaseUser.uid }, 'SplashScreen');
              const userEmail = firebaseUser.email || '';
              setHasNavigated(true);
              navigation.replace('CreateProfile', { email: userEmail });
            }
          } catch (error) {
            logger.error('Failed to fetch user data from Firestore', error, 'SplashScreen');
            // Fallback: navigate to CreateProfile with email from Firebase user
            const userEmail = firebaseUser.email || '';
            setHasNavigated(true);
            navigation.replace('CreateProfile', { email: userEmail });
          }
        } else if (isAuthenticated && currentUser && currentUser.id) {
          // User is authenticated in app context (but not in Firebase Auth)
          // This can happen if user was authenticated via Firestore-only flow
          logger.info('User authenticated in app context, verifying user data from Firestore', { userId: currentUser.id }, 'SplashScreen');

          // CRITICAL: Fetch fresh user data from Firestore to ensure we have latest info
          try {
            const userData = await firestoreService.getUserDocument(currentUser.id);
            
            if (userData) {
              // Check if existing user should skip onboarding
              const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

              // Transform to app user format - include ALL user fields from Firestore
              const transformedUser = {
                // Spread all Firestore data first
                ...userData,
                // Then override with critical fields that need fallbacks
                id: userData.id || currentUser.id,
                name: userData.name || '',
                email: userData.email || currentUser.email || '',
                wallet_address: userData.wallet_address || currentUser.wallet_address || '',
                wallet_public_key: userData.wallet_public_key || userData.wallet_address || currentUser.wallet_public_key || '',
                created_at: userData.created_at || currentUser.created_at || new Date().toISOString(),
                avatar: userData.avatar || currentUser.avatar || '',
                hasCompletedOnboarding: shouldSkipOnboarding,
                // Ensure asset fields are included with proper defaults
                badges: userData.badges || [],
                active_badge: userData.active_badge || undefined,
                profile_assets: userData.profile_assets || [],
                active_profile_asset: userData.active_profile_asset || undefined,
                profile_borders: userData.profile_borders || [],
                active_profile_border: userData.active_profile_border || undefined,
                wallet_backgrounds: userData.wallet_backgrounds || [],
                active_wallet_background: userData.active_wallet_background || undefined,
                points: userData.points || 0,
                total_points_earned: userData.total_points_earned || 0,
              };

              // Update app context with fresh data
              authenticateUser(transformedUser, state.authMethod || 'email');

              // Check if user needs to create a profile
              // A user has a profile if they have a name AND have completed onboarding
              const hasName = transformedUser.name && transformedUser.name.trim() !== '';
              const hasCompletedOnboarding = transformedUser.hasCompletedOnboarding === true;
              
              logger.info('Checking user profile status on splash (app context)', {
                userId: transformedUser.id,
                hasName,
                hasCompletedOnboarding,
                name: transformedUser.name?.substring(0, 10) + '...',
                email: transformedUser.email?.substring(0, 10) + '...'
              }, 'SplashScreen');

              if (!hasName) {
                // User doesn't have a name - needs to create profile
                logger.info('User needs to create profile (no name), navigating to CreateProfile', { 
                  email: transformedUser.email,
                  userId: transformedUser.id
                }, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('CreateProfile', { email: transformedUser.email });
              } else {
                // User has profile: always go through PinUnlock gate. PinUnlock will redirect to Dashboard if no PIN set.
                const userIdForPin = transformedUser.id || currentUser.id;
                logger.info('User has profile (app context), routing through PinUnlock gate', { userId: userIdForPin }, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('PinUnlock');
              }
            } else {
              // User document not found - use app context data
              logger.warn('User document not found in Firestore, using app context data', { userId: currentUser.id }, 'SplashScreen');
              const needsProfile = !currentUser.name || currentUser.name.trim() === '';
              if (needsProfile) {
                setHasNavigated(true);
                navigation.replace('CreateProfile', { email: currentUser.email || '' });
              } else {
                setHasNavigated(true);
                navigation.replace('PinUnlock');
              }
            }
          } catch (error) {
            logger.error('Failed to fetch user data from Firestore, using app context', error, 'SplashScreen');
            const needsProfile = !currentUser.name || currentUser.name.trim() === '';
            if (needsProfile) {
              setHasNavigated(true);
              navigation.replace('CreateProfile', { email: currentUser.email || '' });
            } else {
              setHasNavigated(true);
              navigation.replace('PinUnlock');
            }
          }
        } else {
          // User is not authenticated - all returning users (including email) go through same flow: GetStarted → OTP verification
          logger.info('User not authenticated, navigating to GetStarted', null, 'SplashScreen');
          setHasNavigated(true);
          navigation.replace('GetStarted');
        }
      } catch (error) {
        console.error('❌ SplashScreen: Error checking auth state:', error);
        // Fallback to GetStarted on error
        setHasNavigated(true);
        navigation.replace('GetStarted');
      }
    };

    checkAuthAndNavigate();
  }, [navigation, isAuthenticated, currentUser, hasNavigated]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.black} barStyle="light-content" />

      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
        <Image
          source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwesplit-logo-new.png?alt=media&token=f42ea1b1-5f23-419e-a499-931862819cbf' }}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <AnimatedLinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]}
          />
        </View>
      </View>

    </View>
  );
};

export default SplashScreen; 
import React, { useEffect, useState } from 'react';
import { View, Image, Text, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { auth, firestoreService, db } from '../../config/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from '../../services/analytics/loggingService';
import { EmailPersistenceService } from '../../services/core/emailPersistenceService';

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

        if (firebaseUser && firebaseUser.emailVerified) {
          // User is authenticated and email is verified
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

              // Check if user needs to create a profile (has no name/pseudo)
              const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

              if (needsProfile) {
                logger.info('User needs to create profile (no name), navigating to CreateProfile', { email: transformedUser.email }, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('CreateProfile', { email: transformedUser.email });
              } else if (transformedUser.hasCompletedOnboarding) {
                logger.info('User completed onboarding, navigating to Dashboard', null, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('Dashboard');
              } else {
                logger.info('User needs onboarding, navigating to Onboarding', null, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('Onboarding');
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

              // Check if user needs to create a profile (has no name/pseudo)
              const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

              if (needsProfile) {
                logger.info('User needs to create profile (no name), navigating to CreateProfile', { email: transformedUser.email }, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('CreateProfile', { email: transformedUser.email });
              } else if (transformedUser.hasCompletedOnboarding) {
                logger.info('User completed onboarding, navigating to Dashboard', null, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('Dashboard');
              } else {
                logger.info('User needs onboarding, navigating to Onboarding', null, 'SplashScreen');
                setHasNavigated(true);
                navigation.replace('Onboarding');
              }
            } else {
              // User document not found - use app context data
              logger.warn('User document not found in Firestore, using app context data', { userId: currentUser.id }, 'SplashScreen');
              const needsProfile = !currentUser.name || currentUser.name.trim() === '';
              if (needsProfile) {
                setHasNavigated(true);
                navigation.replace('CreateProfile', { email: currentUser.email || '' });
              } else if (currentUser.hasCompletedOnboarding) {
                setHasNavigated(true);
                navigation.replace('Dashboard');
              } else {
                setHasNavigated(true);
                navigation.replace('Onboarding');
              }
            }
          } catch (error) {
            logger.error('Failed to fetch user data from Firestore, using app context', error, 'SplashScreen');
            // Fallback to app context data
            const needsProfile = !currentUser.name || currentUser.name.trim() === '';
            if (needsProfile) {
              setHasNavigated(true);
              navigation.replace('CreateProfile', { email: currentUser.email || '' });
            } else if (currentUser.hasCompletedOnboarding) {
              setHasNavigated(true);
              navigation.replace('Dashboard');
            } else {
              setHasNavigated(true);
              navigation.replace('Onboarding');
            }
          }
        } else {
          // User is not authenticated, check for stored email
          logger.info('User not authenticated, checking for stored email', null, 'SplashScreen');
          
          try {
            const storedEmail = await EmailPersistenceService.loadEmail();
            if (storedEmail) {
              logger.info('Found stored email, checking verification status', { email: storedEmail }, 'SplashScreen');
              
              // Check if user has verified within 30 days
              const hasVerifiedRecently = await Promise.race([
                firestoreService.hasVerifiedWithin30Days(storedEmail),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Verification check timeout')), 10000)
                )
              ]) as boolean;

              if (hasVerifiedRecently) {
                logger.info('User has verified within 30 days, auto-authenticating', { email: storedEmail }, 'SplashScreen');
                
                // Get user data from Firestore
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', storedEmail));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                  const userDoc = querySnapshot.docs[0];
                  const userData = userDoc.data();

                  // Check if existing user should skip onboarding
                  const shouldSkipOnboarding = await firestoreService.shouldSkipOnboardingForExistingUser(userData);

                  // Transform to app user format - include ALL user fields from Firestore
                  const transformedUser = {
                    // Spread all Firestore data first
                    ...userData,
                    // Then override with critical fields
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    wallet_address: userData.wallet_address || '',
                    wallet_public_key: userData.wallet_public_key || '',
                    created_at: userData.created_at,
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

                  // Update the global app context with the authenticated user
                  authenticateUser(transformedUser, 'email');

                  // Check if user needs to create a profile (has no name/pseudo)
                  const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';

                  if (needsProfile) {
                    logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'SplashScreen');
                    setHasNavigated(true);
                    navigation.replace('CreateProfile', { email: transformedUser.email });
                  } else if (transformedUser.hasCompletedOnboarding) {
                    logger.info('User completed onboarding, navigating to Dashboard', null, 'SplashScreen');
                    setHasNavigated(true);
                    navigation.replace('Dashboard');
                  } else {
                    logger.info('User needs onboarding, navigating to Onboarding', null, 'SplashScreen');
                    setHasNavigated(true);
                    navigation.replace('Onboarding');
                  }
                  return;
                }
              } else {
                logger.info('User needs re-verification, navigating to AuthMethods with pre-filled email', null, 'SplashScreen');
                // Navigate to AuthMethods with the stored email pre-filled
                setHasNavigated(true);
                navigation.replace('AuthMethods');
                return;
              }
            }
          } catch (error) {
            logger.error('Error checking stored email', { error }, 'SplashScreen');
            // Continue to normal flow if check fails
          }

          // No stored email or verification failed, go through onboarding
          if (__DEV__) {
            logger.info('No stored email or verification failed, navigating to GetStarted', null, 'SplashScreen');
          }
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
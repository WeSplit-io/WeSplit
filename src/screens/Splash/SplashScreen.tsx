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

        // Check Firebase auth state
        const firebaseUser = auth.currentUser;

        if (firebaseUser && firebaseUser.emailVerified) {
          // User is authenticated and email is verified
          logger.info('User authenticated, checking profile and onboarding status', null, 'SplashScreen');

          // Check if user needs to create a profile (has no name/pseudo)
          const needsProfile = !currentUser?.name || currentUser.name.trim() === '';

          if (needsProfile) {
            logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'SplashScreen');
            setHasNavigated(true);
            navigation.replace('CreateProfile', { email: currentUser?.email || '' });
          } else if (currentUser?.hasCompletedOnboarding) {
            logger.info('User completed onboarding, navigating to Dashboard', null, 'SplashScreen');
            setHasNavigated(true);
            navigation.replace('Dashboard');
          } else {
            logger.info('User needs onboarding, navigating to Onboarding', null, 'SplashScreen');
            setHasNavigated(true);
            navigation.replace('Onboarding');
          }
        } else if (isAuthenticated && currentUser) {
          // User is authenticated in app context
          logger.info('User authenticated in app context, checking profile and onboarding status', null, 'SplashScreen');

          // Check if user needs to create a profile (has no name/pseudo)
          const needsProfile = !currentUser.name || currentUser.name.trim() === '';

          if (needsProfile) {
            logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'SplashScreen');
            setHasNavigated(true);
            navigation.replace('CreateProfile', { email: currentUser.email });
          } else if (currentUser.hasCompletedOnboarding) {
            logger.info('User completed onboarding, navigating to Dashboard', null, 'SplashScreen');
            setHasNavigated(true);
            navigation.replace('Dashboard');
          } else {
            logger.info('User needs onboarding, navigating to Onboarding', null, 'SplashScreen');
            setHasNavigated(true);
            navigation.replace('Onboarding');
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

                  // Transform to app user format
                  const transformedUser = {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    wallet_address: userData.wallet_address || '',
                    wallet_public_key: userData.wallet_public_key || '',
                    created_at: userData.created_at,
                    avatar: userData.avatar || '',
                    hasCompletedOnboarding: shouldSkipOnboarding
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
      <StatusBar backgroundColor={colors.darkBackground} barStyle="light-content" />

      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
        <Image
          source={require('../../../assets/wesplit-logo-new.png')}
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
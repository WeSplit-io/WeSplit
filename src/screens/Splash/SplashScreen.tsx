import React, { useEffect, useState } from 'react';
import { View, Image, Text, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { auth } from '../../config/firebase';
import { logger } from '../../services/loggingService';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { state } = useApp();
  const { isAuthenticated, currentUser } = state;

  // Animation states
  const [progress] = useState(new Animated.Value(0));
  const [logoOpacity] = useState(new Animated.Value(0));
  const [isAppInitialized, setIsAppInitialized] = useState(false);

  useEffect(() => {
    // Initialize app and start animations
    const initializeApp = async () => {
      try {
        // Initialize push notifications in background
        const notificationPromise = import('../../services/notificationService')
          .then(({ notificationService }) => notificationService.initializePushNotifications())
          .then((initialized) => {
            if (initialized) {
              logger.info('Push notifications initialized successfully', null, 'SplashScreen');
            } else {
              logger.warn('Push notifications initialization failed - permissions may be denied', null, 'SplashScreen');
            }
          })
          .catch((error) => {
            logger.warn('Push notifications initialization failed', error, 'SplashScreen');
          });

        // Mark app as initialized
        setIsAppInitialized(true);
        logger.info('App initialized successfully', null, 'SplashScreen');
        
        // Let notifications initialize in background
        notificationPromise;
      } catch (error) {
        logger.warn('App initialization warnings (non-blocking)', error, 'SplashScreen');
        setIsAppInitialized(true);
      }
    };

    // Start animations
    const startAnimations = () => {
      console.log('🎬 Starting splash screen animations');

      // Logo fade in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        console.log('✅ Logo fade in completed');
      });

      // Progress bar animation
      Animated.timing(progress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start(() => {
        console.log('✅ Progress bar animation completed');
      });
    };

    initializeApp();
    startAnimations();
  }, []);

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        // Wait for app initialization and minimum splash screen duration
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check Firebase auth state
        const firebaseUser = auth.currentUser;

        if (firebaseUser && firebaseUser.emailVerified) {
          // User is authenticated and email is verified
          console.log('✅ SplashScreen: User authenticated, checking profile and onboarding status');

          // Check if user needs to create a profile (has no name/pseudo)
          const needsProfile = !currentUser?.name || currentUser.name.trim() === '';

          if (needsProfile) {
            console.log('🔄 SplashScreen: User needs to create profile (no name), navigating to CreateProfile');
            navigation.replace('CreateProfile', { email: currentUser?.email || '' });
          } else if (currentUser?.hasCompletedOnboarding) {
            console.log('✅ SplashScreen: User completed onboarding, navigating to Dashboard');
            navigation.replace('Dashboard');
          } else {
            console.log('🔄 SplashScreen: User needs onboarding, navigating to Onboarding');
            navigation.replace('Onboarding');
          }
        } else if (isAuthenticated && currentUser) {
          // User is authenticated in app context
          console.log('✅ SplashScreen: User authenticated in app context, checking profile and onboarding status');

          // Check if user needs to create a profile (has no name/pseudo)
          const needsProfile = !currentUser.name || currentUser.name.trim() === '';

          if (needsProfile) {
            console.log('🔄 SplashScreen: User needs to create profile (no name), navigating to CreateProfile');
            navigation.replace('CreateProfile', { email: currentUser.email });
          } else if (currentUser.hasCompletedOnboarding) {
            console.log('✅ SplashScreen: User completed onboarding, navigating to Dashboard');
            navigation.replace('Dashboard');
          } else {
            console.log('🔄 SplashScreen: User needs onboarding, navigating to Onboarding');
            navigation.replace('Onboarding');
          }
        } else {
          // User is not authenticated, go through onboarding
          console.log('🔄 SplashScreen: User not authenticated, navigating to GetStarted');
          navigation.replace('GetStarted');
        }
      } catch (error) {
        console.error('❌ SplashScreen: Error checking auth state:', error);
        // Fallback to GetStarted on error
        navigation.replace('GetStarted');
      }
    };

    checkAuthAndNavigate();
  }, [navigation, isAuthenticated, currentUser]);

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
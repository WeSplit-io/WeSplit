import React, { useEffect } from 'react';
import { View, Image, Text, StatusBar } from 'react-native';
import { styles } from './styles';
import { colors } from '../../theme';
import { useApp } from '../../context/AppContext';
import { auth } from '../../config/firebase';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { state } = useApp();
  const { isAuthenticated, currentUser } = state;

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        // Wait a bit for Firebase auth to initialize
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
      
      <View style={styles.logoContainer}>
        <Image 
          source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FWeSplitLogoName.png?alt=media&token=f785d9b1-f4e8-4f51-abac-e17407e4a48f' }} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.taglineContainer}>
        <Text style={styles.tagline}>Split Expenses Seamlessly</Text>
        <Text style={styles.subtitle}>Track, Split, and Settle with Friends</Text>
      </View>
    </View>
  );
};

export default SplashScreen; 
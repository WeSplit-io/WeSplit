import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, Linking, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Header } from '../../components/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { verifyCode, sendVerificationCode } from '../../services/data';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';

const CODE_LENGTH = 4; // 4-digit code
const RESEND_SECONDS = 30;

const VerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { authenticateUser } = useApp();
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer === 0) {return;}
    const interval = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (val: string, idx: number) => {
    if (val.length === CODE_LENGTH && /^\d{4}$/.test(val)) {
      setCode(val.split(''));
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      return;
    }
    if (/^\d?$/.test(val)) {
      const newCode = [...code];
      newCode[idx] = val;
      setCode(newCode);
      if (val && idx < CODE_LENGTH - 1) {
        inputRefs.current[idx + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (code.join('').length !== CODE_LENGTH) {
      setError('Please enter the 4-digit code');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const email = route.params?.email;
      if (!email) {
        throw new Error('Email not found');
      }

      const codeString = code.join('');
      if (__DEV__) { logger.info('Verifying code', { codeString, email }, 'VerificationScreen'); }
      
      const authResponse = await verifyCode(email, codeString);

      if (!authResponse.success || !authResponse.user) {
        throw new Error(authResponse.error || 'Authentication failed');
      }

      // Code verified successfully and user is now authenticated
      if (__DEV__) { logger.info('Authentication successful', { user: authResponse.user }, 'VerificationScreen'); }
      
      // Transform API response to match User type (snake_case)
      // Keep Firebase user ID as string to match Firestore format
      let transformedUser = {
        id: authResponse.user.id, // Keep as string for Firebase compatibility
        name: authResponse.user.name,
        email: authResponse.user.email,
        wallet_address: authResponse.user.walletAddress,
        wallet_public_key: authResponse.user.walletPublicKey,
        created_at: authResponse.user.createdAt,
        avatar: authResponse.user.avatar,
        hasCompletedOnboarding: authResponse.user.hasCompletedOnboarding || false
      };
      
      // CRITICAL FIX: If Firebase Functions didn't return user data, fetch it from Firestore
      if (!transformedUser.name || !transformedUser.wallet_address) {
        if (__DEV__) { logger.info('Firebase Functions returned empty data, fetching from Firestore', null, 'VerificationScreen'); }
        
        try {
          const { firestoreService } = await import('../../config/firebase/firebase');
          const existingUserData = await firestoreService.getUserDocument(transformedUser.id);
          
          if (existingUserData && existingUserData.name && existingUserData.wallet_address) {
            if (__DEV__) { logger.info('Found existing user data in Firestore', { existingUserData }, 'VerificationScreen'); }
            
            // Update transformed user with existing data
            transformedUser = {
              ...transformedUser,
              name: existingUserData.name,
              wallet_address: existingUserData.wallet_address,
              wallet_public_key: existingUserData.wallet_public_key || existingUserData.wallet_address,
              hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false
            };
            
            if (__DEV__) { logger.info('Updated user data from Firestore', { transformedUser }, 'VerificationScreen'); }
          }
        } catch (firestoreError) {
          if (__DEV__) { console.warn('⚠️ Could not fetch user data from Firestore:', firestoreError); }
        }
      }
      
      if (__DEV__) {
        logger.debug('Raw API Response', { authResponse }, 'VerificationScreen');
        logger.debug('Transformed User', { transformedUser }, 'VerificationScreen');
        logger.debug('User Data Analysis', {
          id: transformedUser.id,
          name: transformedUser.name,
          nameType: typeof transformedUser.name,
          nameLength: transformedUser.name?.length,
          trimmedName: transformedUser.name?.trim(),
          trimmedNameLength: transformedUser.name?.trim()?.length,
          hasCompletedOnboarding: transformedUser.hasCompletedOnboarding,
          walletAddress: transformedUser.wallet_address,
          walletPublicKey: transformedUser.wallet_public_key
        });
      }
      
      // Update the global app context with the authenticated user
      authenticateUser(transformedUser, 'email');
      if (__DEV__) { logger.info('User authenticated in app context', null, 'VerificationScreen'); }
      
      // Check if user needs to create a profile (has no name/pseudo)
      const needsProfile = !transformedUser.name || transformedUser.name.trim() === '';
      
      if (__DEV__) {
        logger.debug('Profile Creation Check', {
          name: transformedUser.name,
          nameLength: transformedUser.name?.length,
          trimmedName: transformedUser.name?.trim(),
          trimmedNameLength: transformedUser.name?.trim()?.length,
          needsProfile,
          hasCompletedOnboarding: transformedUser.hasCompletedOnboarding,
          willNavigateTo: needsProfile ? 'CreateProfile' : 'Dashboard'
        });
      }
      
      if (needsProfile) {
        logger.info('User needs to create profile (no name), navigating to CreateProfile', null, 'VerificationScreen');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'CreateProfile', params: { email: transformedUser.email } }],
        });
      } else {
        // User already has a name, go directly to Dashboard
        logger.info('User already has name, navigating to Dashboard', { name: transformedUser.name }, 'VerificationScreen');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (timer === 0 && !resending) {
      setResending(true);
      setError('');
      
      try {
        const email = route.params?.email;
        if (!email) {
          throw new Error('Email not found');
        }

        const result = await sendVerificationCode(email);
        
        if (result.success) {
          setTimer(RESEND_SECONDS);
        // Show success message
        Alert.alert('Success', 'New verification code sent to your email');
        } else {
          throw new Error(result.error || 'Failed to resend code');
        }
        
      } catch (error) {
        console.error('Failed to resend code:', error);
        setError(error instanceof Error ? error.message : 'Failed to resend code');
      } finally {
        setResending(false);
      }
    }
  };

  const timerText = `00:${timer < 10 ? '0' : ''}${timer}`;

  return (
    <Container>
      <KeyboardAvoidingView 
        style={{flex: 1}} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.mainContainer}>
          {/* Header with Logo Centered */}
          <Header
            onBackPress={() => navigation.goBack()}
            showBackButton={true}
            variant="logoWithBack"
          />

          {/* Main Content - Scrollable */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerContent}>
        <View style={styles.mailIconBox}>
          <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fmail.png?alt=media&token=5e3ac6e7-79b1-47e7-8087-f7e4c070d222' }} style={styles.mailIcon} />
        </View>
        <Text style={styles.title}>Check your Email</Text>
        <Text style={styles.subtitle}>
          We sent a code to <Text style={styles.emailHighlight}>{route.params?.email || 'yourname@gmail.com'}</Text>
        </Text>
        
        <View style={styles.codeRow}>
          {code.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => {
                inputRefs.current[idx] = ref;
              }}
              style={styles.codeInput}
              value={digit}
              onChangeText={val => handleChange(val, idx)}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              onKeyPress={e => handleKeyPress(e, idx)}
              textContentType="oneTimeCode"
              returnKeyType="done"
              autoComplete="one-time-code"
              enablesReturnKeyAutomatically={true}
            />
          ))}
        </View>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={verifying}
        >
          <LinearGradient
            colors={verifying ? [colors.white10, colors.white10] : [colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {verifying ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Timer and resend */}
        <View style={styles.timerSection}>
        <Text style={styles.timer}>{timerText}</Text>
        <TouchableOpacity
          style={styles.resendLink}
          onPress={handleResend}
          disabled={timer !== 0 || resending}
        >
            <Text style={[styles.resendText, timer !== 0 || resending ? styles.resendTextDisabled : null]}>
              Resend Code
            </Text>
          </TouchableOpacity>
        </View>
            </View>
          </ScrollView>

          {/* Help Link - Fixed at bottom */}
          <View style={styles.helpSection}>
            <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
              <Text style={styles.helpText}>Need help?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

export default VerificationScreen; 

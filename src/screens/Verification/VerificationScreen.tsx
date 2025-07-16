import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './styles';
import { verifyCode, sendVerificationCode } from '../../services/firebaseAuthService';
import { useApp } from '../../context/AppContext';

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
    if (timer === 0) return;
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
      if (__DEV__) { console.log('🔐 Verifying code:', codeString, 'for email:', email); }
      
      const authResponse = await verifyCode(email, codeString);

      if (!authResponse.success || !authResponse.user) {
        throw new Error(authResponse.error || 'Authentication failed');
      }

      // Code verified successfully and user is now authenticated
      if (__DEV__) { console.log('✅ Authentication successful:', authResponse.user); }
      
      // Transform API response to match User type (snake_case)
      // Keep Firebase user ID as string to match Firestore format
      const transformedUser = {
        id: authResponse.user.id, // Keep as string for Firebase compatibility
        name: authResponse.user.name,
        email: authResponse.user.email,
        wallet_address: authResponse.user.walletAddress,
        wallet_public_key: authResponse.user.walletPublicKey,
        created_at: authResponse.user.createdAt,
        avatar: authResponse.user.avatar
      };
      
      // Update the global app context with the authenticated user
      authenticateUser(transformedUser, 'email');
      if (__DEV__) { console.log('📱 User authenticated in app context'); }
      
      // Navigate to dashboard as user is now logged in
      (navigation as any).reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
      
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

  const timerText = `00 : ${timer < 10 ? '0' : ''}${timer}`;

  return (
    <View style={styles.container}>
      {/* Logo row at top */}
      <View style={styles.logoRow}>
        <Image source={require('../../../assets/WeSplitLogo.png')} style={styles.logoIcon} />
        <Text style={styles.logoText}>
          We<Text style={styles.logoSplit}>Split</Text>
        </Text>
      </View>
      {/* Centered content */}
      <View style={styles.centerContent}>
        <View style={styles.mailIconBox}>
          <Image source={require('../../../assets/mail.png')} style={styles.mailIcon} />
        </View>
        <Text style={styles.title}>Check your Email</Text>
        <Text style={styles.subtitle}>We sent a code to {route.params?.email || 'your email'}</Text>
        <View style={styles.codeRow}>
          {code.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={ref => (inputRefs.current[idx] = ref)}
              style={styles.codeInput}
              value={digit}
              onChangeText={val => handleChange(val, idx)}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoFocus={idx === 0}
              onKeyPress={e => handleKeyPress(e, idx)}
              textContentType="oneTimeCode"
              returnKeyType="done"
            />
          ))}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity 
          style={[styles.submitButton, verifying && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
        {/* Timer and resend */}
        <Text style={styles.timer}>{timerText}</Text>
        <TouchableOpacity
          style={styles.resendLink}
          onPress={handleResend}
          disabled={timer !== 0 || resending}
        >
          <Text style={[styles.resendText, timer !== 0 || resending ? styles.resendTextDisabled : null]}>Resend Code</Text>
        </TouchableOpacity>
      </View>
      {/* Help link at bottom */}
      <TouchableOpacity style={styles.helpLink}>
        <Text style={styles.helpText}>Need help ?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default VerificationScreen; 
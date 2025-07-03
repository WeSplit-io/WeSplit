import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './VerificationScreen.styles';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 30;

const VerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
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

  const handleSubmit = () => {
    if (code.join('').length === CODE_LENGTH) {
      (navigation as any).navigate('CreateProfile', { email: route.params?.email });
    } else {
      setError('Please enter the 4-digit code');
    }
  };

  const handleResend = () => {
    if (timer === 0 && !resending) {
      setResending(true);
      // TODO: Call resend code API here if needed
      setTimer(RESEND_SECONDS);
      setTimeout(() => setResending(false), 1000);
    }
  };

  const timerText = `00 : ${timer < 10 ? '0' : ''}${timer}`;

  return (
    <View style={styles.container}>
      {/* Logo row at top */}
      <View style={styles.logoRow}>
        <Image source={require('../../assets/WeSplitLogo.png')} style={styles.logoIcon} />
        <Text style={styles.logoText}>
          We<Text style={styles.logoSplit}>Split</Text>
        </Text>
      </View>
      {/* Centered content */}
      <View style={styles.centerContent}>
        <View style={styles.mailIconBox}>
          <Image source={require('../../assets/mail.png')} style={styles.mailIcon} />
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
        {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
        {/* Timer and resend */}
        <Text style={styles.timer}>{timerText}</Text>
        <TouchableOpacity
          style={styles.resendLink}
          onPress={handleResend}
          disabled={timer !== 0 || resending}
        >
          <Text style={[styles.resendText, { opacity: timer === 0 && !resending ? 1 : 0.5 }]}>Resend Code</Text>
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
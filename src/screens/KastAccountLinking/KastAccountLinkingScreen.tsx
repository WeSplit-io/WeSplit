/**
 * Kast Account Linking Screen
 * Allows users to manually input their Kast wallet address for fund transfers
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface KastAccountLinkingScreenProps {
  navigation: any;
  route: any;
}

const KastAccountLinkingScreen: React.FC<KastAccountLinkingScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount, totalLocked } = route.params;
  
  const [kastAddress, setKastAddress] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const validateKastAddress = (address: string): boolean => {
    // Use proper Solana address validation
    try {
      const { PublicKey } = require('@solana/web3.js');
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleContinue = async () => {
    if (!kastAddress.trim()) {
      Alert.alert('Error', 'Please enter your Kast wallet address');
      return;
    }

    if (!validateKastAddress(kastAddress.trim())) {
      Alert.alert('Invalid Address', 'Please enter a valid Solana wallet address');
      return;
    }

    setIsValidating(true);
    
    try {
      // Simulate address validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to payment confirmation with the Kast address
      navigation.navigate('PaymentConfirmation', {
        billData,
        participants,
        totalAmount,
        totalLocked,
        kastAddress: kastAddress.trim(),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to validate address. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Kast Account',
      'You can link your Kast account later in your profile settings. The funds will remain in the split wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => {
            // Navigate back to splits list or dashboard
            navigation.navigate('SplitsList');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Link Kast Account</Text>
          
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Kast Icon and Title */}
          <View style={styles.iconContainer}>
            <View style={styles.kastIcon}>
              <Text style={styles.kastIconText}>K</Text>
            </View>
            <Text style={styles.title}>Connect Your Kast Account</Text>
            <Text style={styles.subtitle}>
              Enter your Kast wallet address to receive the split funds
            </Text>
          </View>

          {/* Bill Summary */}
          <View style={styles.billSummary}>
            <Text style={styles.billSummaryTitle}>Transfer Summary</Text>
            <View style={styles.billSummaryRow}>
              <Text style={styles.billSummaryLabel}>Amount to transfer:</Text>
              <Text style={styles.billSummaryAmount}>{totalAmount} USDC</Text>
            </View>
            <View style={styles.billSummaryRow}>
              <Text style={styles.billSummaryLabel}>From:</Text>
              <Text style={styles.billSummaryValue}>Split Wallet</Text>
            </View>
            <View style={styles.billSummaryRow}>
              <Text style={styles.billSummaryLabel}>To:</Text>
              <Text style={styles.billSummaryValue}>Your Kast Account</Text>
            </View>
          </View>

          {/* Address Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kast Wallet Address</Text>
            <TextInput
              style={[
                styles.addressInput,
                kastAddress && !validateKastAddress(kastAddress) && styles.addressInputError
              ]}
              value={kastAddress}
              onChangeText={setKastAddress}
              placeholder="Enter your Kast wallet address..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {kastAddress && !validateKastAddress(kastAddress) && (
              <Text style={styles.errorText}>Please enter a valid Solana wallet address</Text>
            )}
            {kastAddress && validateKastAddress(kastAddress) && (
              <Text style={styles.successText}>✓ Valid wallet address</Text>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Need help finding your Kast address?</Text>
            <Text style={styles.helpText}>
              • Open your Kast app{'\n'}
              • Go to your wallet section{'\n'}
              • Copy your wallet address{'\n'}
              • Paste it in the field above
            </Text>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!kastAddress.trim() || !validateKastAddress(kastAddress.trim()) || isValidating) && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!kastAddress.trim() || !validateKastAddress(kastAddress.trim()) || isValidating}
          >
            <Text style={[
              styles.continueButtonText,
              (!kastAddress.trim() || !validateKastAddress(kastAddress.trim()) || isValidating) && styles.continueButtonTextDisabled
            ]}>
              {isValidating ? 'Validating...' : 'Continue to Transfer'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  skipButton: {
    padding: spacing.sm,
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  kastIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  kastIconText: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },
  title: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  billSummary: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  billSummaryTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  billSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  billSummaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  billSummaryAmount: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  billSummaryValue: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  addressInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.white,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addressInputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  successText: {
    color: colors.green,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  helpContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  helpTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.black,
  },
  continueButton: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.surface,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  continueButtonTextDisabled: {
    color: colors.textSecondary,
  },
});

export default KastAccountLinkingScreen;

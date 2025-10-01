/**
 * Degen Result Screen
 * Shows the "loser" who has to pay the entire bill
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Share,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface DegenResultScreenProps {
  navigation: any;
  route: any;
}

interface SelectedParticipant {
  id: string;
  name: string;
  userId: string;
  avatar?: string;
}

const DegenResultScreen: React.FC<DegenResultScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount, selectedParticipant } = route.params;
  
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSettlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Payment Settled',
        `You have successfully paid ${totalAmount} USDC for the bill.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SplitsList'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayWithKast = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate Kast payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Payment Successful',
        `You have successfully paid ${totalAmount} USDC using your Kast account.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SplitsList'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process Kast payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareOnX = async () => {
    try {
      const message = `Just got selected to pay the entire bill of ${totalAmount} USDC in our Degen Split! 😅 Better luck next time! 🍀 #DegenSplit #WeSplit`;
      
      await Share.share({
        message,
        title: 'Degen Split Result',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBackToSplits = () => {
    navigation.navigate('SplitsList');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToSplits}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Degen Split Result</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Result Title */}
        <View style={styles.resultTitleContainer}>
          <Text style={styles.resultTitle}>You're the Loser!</Text>
        </View>

        {/* Loser Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🐒</Text>
          </View>
        </View>

        {/* Amount to Pay */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>-{totalAmount} USDC</Text>
        </View>

        {/* Result Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            You covered the total bill: {totalAmount} USDC.{'\n'}
            (Better luck next time 🍀)
          </Text>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareOnX}>
          <Text style={styles.shareButtonText}>Share on X</Text>
        </TouchableOpacity>

        {/* Payment Options */}
        <View style={styles.paymentOptionsContainer}>
          <TouchableOpacity
            style={[
              styles.paymentButton,
              styles.settleButton,
              isProcessing && styles.paymentButtonDisabled
            ]}
            onPress={handleSettlePayment}
            disabled={isProcessing}
          >
            <Text style={[
              styles.paymentButtonText,
              styles.settleButtonText,
              isProcessing && styles.paymentButtonTextDisabled
            ]}>
              {isProcessing ? 'Processing...' : 'Settle Payment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentButton,
              styles.kastButton,
              isProcessing && styles.paymentButtonDisabled
            ]}
            onPress={handlePayWithKast}
            disabled={isProcessing}
          >
            <Text style={[
              styles.paymentButtonText,
              styles.kastButtonText,
              isProcessing && styles.paymentButtonTextDisabled
            ]}>
              {isProcessing ? 'Processing...' : 'Pay with KAST'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bill Details */}
        <View style={styles.billDetailsContainer}>
          <Text style={styles.billDetailsTitle}>Bill Details</Text>
          <View style={styles.billDetailsRow}>
            <Text style={styles.billDetailsLabel}>Event:</Text>
            <Text style={styles.billDetailsValue}>{billData.name || 'Restaurant Night'}</Text>
          </View>
          <View style={styles.billDetailsRow}>
            <Text style={styles.billDetailsLabel}>Date:</Text>
            <Text style={styles.billDetailsValue}>{billData.date || '10 May 2025'}</Text>
          </View>
          <View style={styles.billDetailsRow}>
            <Text style={styles.billDetailsLabel}>Total Amount:</Text>
            <Text style={styles.billDetailsValue}>{totalAmount} USDC</Text>
          </View>
          <View style={styles.billDetailsRow}>
            <Text style={styles.billDetailsLabel}>Participants:</Text>
            <Text style={styles.billDetailsValue}>{participants.length} people</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
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
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  resultTitleContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  resultTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.green,
  },
  avatarText: {
    fontSize: 48,
  },
  amountContainer: {
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.error,
  },
  amountText: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  messageText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  shareButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  shareButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  paymentOptionsContainer: {
    width: '100%',
    marginBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  paymentButton: {
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  settleButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kastButton: {
    backgroundColor: colors.green,
  },
  paymentButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  settleButtonText: {
    color: colors.white,
  },
  kastButtonText: {
    color: colors.white,
  },
  paymentButtonTextDisabled: {
    color: colors.textSecondary,
  },
  billDetailsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
  },
  billDetailsTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  billDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  billDetailsLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  billDetailsValue: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
  },
});

export default DegenResultScreen;

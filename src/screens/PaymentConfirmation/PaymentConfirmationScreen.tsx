/**
 * Payment Confirmation Screen
 * Final step to transfer collected funds to Kast Card after bill split is complete
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { FallbackDataService } from '../../services/data';
import { Container } from '../../components/shared';
import Header from '../../components/shared/Header';

interface PaymentConfirmationScreenProps {
  navigation: any;
  route: any;
}

const PaymentConfirmationScreen: React.FC<PaymentConfirmationScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount, totalLocked, kastAddress } = route.params;
  
  const [isTransferring, setIsTransferring] = useState(false);
  const [userKastAddress, setUserKastAddress] = useState(kastAddress || null);

  // Check if user has linked Kast account
  useEffect(() => {
    if (!userKastAddress) {
      // Simulate checking user profile for linked Kast account
      // In real app, this would be an API call to get user's linked Kast address
      const checkLinkedKastAccount = async () => {
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // For demo purposes, assume user doesn't have linked Kast account
          // In real app, this would check the user's profile data
          const hasLinkedKast = false; // This would come from user profile
          
          if (!hasLinkedKast) {
            // Redirect to Kast account linking screen
            navigation.replace('KastAccountLinking', {
              billData,
              participants,
              totalAmount,
              totalLocked,
            });
          }
        } catch (error) {
          console.error('Error checking linked Kast account:', error);
        }
      };
      
      checkLinkedKastAccount();
    }
  }, [userKastAddress, navigation, billData, participants, totalAmount, totalLocked]);

  const handleTransferMoney = async () => {
    setIsTransferring(true);
    
    try {
      // Simulate transfer process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Transfer Successful',
        `${totalAmount} USDC has been successfully transferred to your Kast Card.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to splits list or dashboard
              navigation.navigate('SplitsList');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Transfer Failed', 'There was an error transferring the money. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <Header 
        title="Split the Bill"
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      <View style={styles.content}>
        {/* Blurred Bill Summary */}
        <View style={styles.blurredSection}>
          <View style={[styles.billCard, styles.blurredCard]}>
            <View style={styles.billHeader}>
              <View style={styles.billTitleContainer}>
                <Text style={styles.billIcon}>🧾</Text>
                <Text style={styles.billTitle}>{MockupDataService.getBillName()}</Text>
              </View>
              <Text style={styles.billDate}>{FallbackDataService.generateBillDate(processedBillData, billData, true)}</Text>
            </View>
            
            <View style={styles.billAmountContainer}>
              <Text style={styles.billAmountLabel}>Total Bil {totalAmount} USDC</Text>
            </View>
          </View>

          {/* Blurred Progress Indicator */}
          <View style={[styles.progressContainer, styles.blurredProgress]}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>(100%)</Text>
              <Text style={styles.progressAmount}>{totalAmount} USDC</Text>
              <Text style={styles.progressLabel}>Locked</Text>
            </View>
            <View style={styles.progressCircle}>
              <View style={[styles.progressFill, { 
                transform: [{ rotate: '360deg' }] 
              }]} />
            </View>
          </View>
        </View>

        {/* Transfer Action Section */}
        <View style={styles.transferSection}>
          {/* Modal Handle */}
          <View style={styles.modalHandle} />
          
          <View style={styles.transferContent}>
            <Text style={styles.transferTitle}>
              Transfer {totalAmount} USDC to your Kast Account
            </Text>
            <Text style={styles.transferSubtitle}>
              Top up your account in a few seconds to cover your share.
            </Text>
            
            {userKastAddress && (
              <View style={styles.kastAddressContainer}>
                <Text style={styles.kastAddressLabel}>Kast Address:</Text>
                <Text style={styles.kastAddressText}>{userKastAddress}</Text>
              </View>
            )}
            
            {/* Transfer Flow Visualization */}
            <View style={styles.transferFlow}>
              <View style={styles.transferIcon}>
                <Text style={styles.transferIconText}>K</Text>
              </View>
              
              <View style={styles.transferArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
              
              <View style={styles.transferIcon}>
                <Text style={styles.transferIconText}>K</Text>
              </View>
            </View>
            
            {/* Transfer Button */}
            <TouchableOpacity
              style={[styles.transferButton, isTransferring && styles.transferButtonDisabled]}
              onPress={handleTransferMoney}
              disabled={isTransferring}
            >
              <Text style={styles.transferButtonText}>
                {isTransferring ? 'Transferring...' : 'Transfer money'}
              </Text>
              {!isTransferring && <Text style={styles.transferButtonArrow}>→</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  content: {
    flex: 1,
  },
  blurredSection: {
    opacity: 0.3,
    marginBottom: spacing.xl,
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  blurredCard: {
    // Additional blur effect styling if needed
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  billTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  billIcon: {
    fontSize: typography.fontSize.lg,
    marginRight: spacing.sm,
  },
  billTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  billDate: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    opacity: 0.9,
  },
  billAmountContainer: {
    marginBottom: spacing.lg,
  },
  billAmountLabel: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  blurredProgress: {
    // Additional blur effect styling if needed
  },
  progressInfo: {
    flex: 1,
  },
  progressText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
  },
  progressAmount: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.green,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  transferSection: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  transferContent: {
    flex: 1,
  },
  transferTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  transferSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  transferFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  transferIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  transferIconText: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  transferArrow: {
    marginHorizontal: spacing.lg,
  },
  arrowText: {
    color: colors.green,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  transferButton: {
    backgroundColor: colors.green,
    borderRadius: 25,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginHorizontal: spacing.sm,
  },
  transferButtonDisabled: {
    backgroundColor: colors.surface,
  },
  transferButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  transferButtonArrow: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  kastAddressContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  kastAddressLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  kastAddressText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
  },
});

export default PaymentConfirmationScreen;

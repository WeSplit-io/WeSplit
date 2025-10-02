/**
 * Split Payment Screen
 * Allows participants to pay their share to the split wallet
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { SplitWalletService, SplitWallet, SplitWalletParticipant } from '../../services/splitWalletService';
import { priceManagementService } from '../../services/priceManagementService';
import { useApp } from '../../context/AppContext';

interface RouteParams {
  splitWalletId: string;
  billName?: string;
  totalAmount?: number;
}

const SplitPaymentScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { state } = useApp();
  const { currentUser } = state;
  const { splitWalletId, billName, totalAmount } = route.params as RouteParams;
  
  // Debug: Log the current user data
  console.log('🔍 SplitPaymentScreen: Current user from context:', {
    currentUser: currentUser ? {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      wallet_address: currentUser.wallet_address,
      wallet_public_key: currentUser.wallet_public_key
    } : null,
    isAuthenticated: state.isAuthenticated,
    authMethod: state.authMethod
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>(null);
  const [participant, setParticipant] = useState<SplitWalletParticipant | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSplitData();
  }, []);

  const loadSplitData = async () => {
    if (!currentUser?.id) {
      setError('User not authenticated');
      setIsLoading(false);
      return;
    }

    console.log('🔍 SplitPaymentScreen: Loading split data with:', {
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        wallet_address: currentUser.wallet_address
      },
      splitWalletId,
      billName,
      totalAmount
    });

    // Validate price consistency with centralized price management
    if (totalAmount) {
      // Try to extract bill ID from split wallet ID, or use the split wallet ID itself
      let billId = splitWalletId;
      if (splitWalletId.includes('_')) {
        const parts = splitWalletId.split('_');
        if (parts.length >= 3) {
          // Format: split_wallet_{billId}_{timestamp}
          billId = parts.slice(1, -1).join('_'); // Remove 'split_wallet' prefix and timestamp suffix
        }
      }
      
      console.log('💰 SplitPaymentScreen: Extracting bill ID:', {
        splitWalletId,
        extractedBillId: billId
      });
      
      const validation = priceManagementService.validatePriceConsistency(billId, totalAmount, 'SplitPaymentScreen');
      
      if (!validation.isValid) {
        console.warn('🔍 SplitPaymentScreen: Price inconsistency detected:', validation.message);
        // Use the authoritative price instead
        const authoritativePrice = priceManagementService.getBillPrice(billId);
        if (authoritativePrice) {
          console.log('🔍 SplitPaymentScreen: Using authoritative price:', authoritativePrice.amount);
          // Update the totalAmount to use the authoritative price
          // Note: This would require updating the route params, which is complex
          // For now, we'll just log the discrepancy
        }
      }
    }

    try {
      setIsLoading(true);
      
      // Get split wallet details
      const walletResult = await SplitWalletService.getSplitWallet(splitWalletId);
      if (!walletResult.success || !walletResult.wallet) {
        setError(walletResult.error || 'Split wallet not found');
        setIsLoading(false);
        return;
      }

      console.log('🔍 SplitPaymentScreen: Split wallet loaded:', {
        wallet: walletResult.wallet,
        participants: walletResult.wallet.participants
      });

      // If we have a split wallet with totalAmount but no authoritative price, set it now
      if (walletResult.wallet.totalAmount > 0) {
        const billId = walletResult.wallet.billId;
        const existingPrice = priceManagementService.getBillPrice(billId);
        
        if (!existingPrice) {
          console.log('💰 SplitPaymentScreen: Setting authoritative price from split wallet:', {
            billId,
            totalAmount: walletResult.wallet.totalAmount,
            currency: walletResult.wallet.currency || 'USDC'
          });
          
          priceManagementService.setBillPrice(
            billId, 
            walletResult.wallet.totalAmount, 
            walletResult.wallet.currency || 'USDC'
          );
        }
      }

      setSplitWallet(walletResult.wallet);

      // Get participant payment status
      console.log('🔍 SplitPaymentScreen: Getting participant payment status for:', {
        splitWalletId,
        currentUserId: currentUser.id.toString(),
        walletParticipants: walletResult.wallet.participants
      });

      const participantResult = await SplitWalletService.getParticipantPaymentStatus(
        splitWalletId,
        currentUser.id.toString()
      );

      console.log('🔍 SplitPaymentScreen: Participant payment status result:', participantResult);

      if (!participantResult.success || !participantResult.participant) {
        console.log('🔍 SplitPaymentScreen: Participant not found, checking wallet participants manually:', {
          walletParticipants: walletResult.wallet.participants,
          currentUserId: currentUser.id.toString(),
          participantIds: walletResult.wallet.participants.map(p => p.userId)
        });
        
        // Fallback: Try to find participant manually in wallet participants
        const manualParticipant = walletResult.wallet.participants.find(p => p.userId === currentUser.id.toString());
        if (manualParticipant) {
          console.log('🔍 SplitPaymentScreen: Found participant manually, using fallback data:', manualParticipant);
          
          // Validate and correct participant amount using centralized price management
          let billId = walletResult.wallet.billId || splitWalletId;
          // If billId is a split wallet ID, extract the actual bill ID
          if (billId.includes('split_wallet_')) {
            const parts = billId.split('_');
            if (parts.length >= 3) {
              billId = parts.slice(1, -1).join('_'); // Remove 'split_wallet' prefix and timestamp suffix
            }
          }
          
          console.log('💰 SplitPaymentScreen: Using bill ID for participant amount:', {
            originalBillId: walletResult.wallet.billId,
            splitWalletId,
            finalBillId: billId
          });
          
          const participantAmount = priceManagementService.getParticipantAmount(
            billId,
            currentUser.id.toString(),
            walletResult.wallet.participants.length,
            'equal'
          );
          
          // If no authoritative price found, use the split wallet's totalAmount as fallback
          if (participantAmount === 0 && walletResult.wallet.totalAmount > 0) {
            const fallbackAmount = walletResult.wallet.totalAmount / walletResult.wallet.participants.length;
            console.log('💰 SplitPaymentScreen: Using split wallet totalAmount as fallback (manual):', {
              walletTotalAmount: walletResult.wallet.totalAmount,
              participantsCount: walletResult.wallet.participants.length,
              fallbackAmount,
              originalAmount: manualParticipant.amountOwed
            });
            
            if (fallbackAmount !== manualParticipant.amountOwed) {
              manualParticipant.amountOwed = fallbackAmount;
            }
          } else if (participantAmount > 0 && participantAmount !== manualParticipant.amountOwed) {
            console.log('💰 SplitPaymentScreen: Correcting fallback participant amount:', {
              originalAmount: manualParticipant.amountOwed,
              correctedAmount: participantAmount
            });
            manualParticipant.amountOwed = participantAmount;
          }
          
          setParticipant(manualParticipant);
          setIsLoading(false);
          return;
        }
        
        setError(participantResult.error || 'You are not a participant in this split');
        setIsLoading(false);
        return;
      }

      console.log('🔍 SplitPaymentScreen: Participant loaded:', participantResult.participant);
      
      // Validate and correct participant amount using centralized price management
      let billId = walletResult.wallet.billId || splitWalletId;
      // If billId is a split wallet ID, extract the actual bill ID
      if (billId.includes('split_wallet_')) {
        const parts = billId.split('_');
        if (parts.length >= 3) {
          billId = parts.slice(1, -1).join('_'); // Remove 'split_wallet' prefix and timestamp suffix
        }
      }
      
      console.log('💰 SplitPaymentScreen: Using bill ID for participant amount (main):', {
        originalBillId: walletResult.wallet.billId,
        splitWalletId,
        finalBillId: billId
      });
      
      const participantAmount = priceManagementService.getParticipantAmount(
        billId,
        currentUser.id.toString(),
        walletResult.wallet.participants.length,
        'equal'
      );
      
      // If no authoritative price found, use the split wallet's totalAmount as fallback
      if (participantAmount === 0 && walletResult.wallet.totalAmount > 0) {
        const fallbackAmount = walletResult.wallet.totalAmount / walletResult.wallet.participants.length;
        console.log('💰 SplitPaymentScreen: Using split wallet totalAmount as fallback:', {
          walletTotalAmount: walletResult.wallet.totalAmount,
          participantsCount: walletResult.wallet.participants.length,
          fallbackAmount,
          originalAmount: participantResult.participant.amountOwed
        });
        
        if (fallbackAmount !== participantResult.participant.amountOwed) {
          participantResult.participant.amountOwed = fallbackAmount;
        }
      } else if (participantAmount > 0 && participantAmount !== participantResult.participant.amountOwed) {
        console.log('💰 SplitPaymentScreen: Correcting participant amount:', {
          originalAmount: participantResult.participant.amountOwed,
          correctedAmount: participantAmount
        });
        participantResult.participant.amountOwed = participantAmount;
      }

      setParticipant(participantResult.participant);
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading split data:', error);
      setError('Failed to load split information');
      setIsLoading(false);
    }
  };

  const handlePayFullAmount = async () => {
    if (!participant || !currentUser?.id) return;

    const remainingAmount = participant.amountOwed - participant.amountPaid;
    if (remainingAmount <= 0) {
      Alert.alert('Already Paid', 'You have already paid your full share.');
      return;
    }

    console.log('🔍 SplitPaymentScreen: Attempting to pay full amount:', {
      remainingAmount,
      participant,
      currentUser: {
        id: currentUser.id,
        wallet_address: currentUser.wallet_address
      }
    });

    await processPayment(remainingAmount);
  };

  const handlePayPartialAmount = async () => {
    if (!participant || !currentUser?.id) return;

    const remainingAmount = participant.amountOwed - participant.amountPaid;
    if (remainingAmount <= 0) {
      Alert.alert('Already Paid', 'You have already paid your full share.');
      return;
    }

    // For now, pay half of remaining amount
    // In a real app, you'd have an input field for custom amounts
    const partialAmount = remainingAmount / 2;
    await processPayment(partialAmount);
  };

  const processPayment = async (amount: number) => {
    if (!currentUser?.id || !splitWalletId) return;

    console.log('🔍 SplitPaymentScreen: Processing payment:', {
      amount,
      currentUserId: currentUser.id.toString(),
      splitWalletId,
      participant: participant
    });

    setIsProcessing(true);

    try {
      const result = await SplitWalletService.payParticipantShare(
        splitWalletId,
        currentUser.id.toString(),
        amount
      );
      
      console.log('🔍 SplitPaymentScreen: Payment result:', result);

      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `You have successfully paid ${amount} USDC to the split wallet.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reload data to show updated status
                loadSplitData();
              },
            },
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.loadingText}>Loading split information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!splitWallet || !participant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Not Found</Text>
          <Text style={styles.errorMessage}>Split information not found.</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const remainingAmount = participant.amountOwed - participant.amountPaid;
  const isFullyPaid = participant.status === 'paid';
  const progressPercentage = (participant.amountPaid / participant.amountOwed) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay Your Share</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Bill Info Card */}
        <View style={styles.billCard}>
          <View style={styles.billCardHeader}>
            <Text style={styles.billIcon}>🍽️</Text>
            <Text style={styles.billTitle}>{billName || splitWallet.billId}</Text>
          </View>
          <Text style={styles.billAmount}>
            {totalAmount || splitWallet.totalAmount} {splitWallet.currency}
          </Text>
        </View>

        {/* Payment Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Your Payment Status</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {participant.amountPaid.toFixed(2)} / {participant.amountOwed.toFixed(2)} {splitWallet.currency}
            </Text>
          </View>

          <View style={styles.statusInfo}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[
                styles.statusValue,
                { color: isFullyPaid ? colors.green : colors.orange }
              ]}>
                {isFullyPaid ? 'Paid' : 'Pending'}
              </Text>
            </View>
            
            {remainingAmount > 0 && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Remaining:</Text>
                <Text style={styles.statusValue}>
                  {remainingAmount.toFixed(2)} {splitWallet.currency}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Actions */}
        {!isFullyPaid && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.payButton, styles.payFullButton]}
              onPress={handlePayFullAmount}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay Full Amount ({remainingAmount.toFixed(2)} {splitWallet.currency})
                </Text>
              )}
            </TouchableOpacity>

            {remainingAmount > 1 && (
              <TouchableOpacity
                style={[styles.payButton, styles.payPartialButton]}
                onPress={handlePayPartialAmount}
                disabled={isProcessing}
              >
                <Text style={styles.payPartialButtonText}>
                  Pay Partial ({(remainingAmount / 2).toFixed(2)} {splitWallet.currency})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isFullyPaid && (
          <View style={styles.completedContainer}>
            <Text style={styles.completedIcon}>✅</Text>
            <Text style={styles.completedText}>You have paid your full share!</Text>
            <Text style={styles.completedSubtext}>
              The bill will be paid once all participants have contributed.
            </Text>
          </View>
        )}
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
    flex: 1,
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  billCard: {
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  billIcon: {
    fontSize: typography.fontSize.xl,
    marginRight: spacing.sm,
  },
  billTitle: {
    color: colors.white,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  billAmount: {
    color: colors.white,
    fontSize: typography.fontSize.xxl,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 4,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  statusInfo: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  statusValue: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: spacing.md,
  },
  payButton: {
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  payFullButton: {
    backgroundColor: colors.green,
  },
  payPartialButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  payButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  payPartialButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  completedContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
  },
  completedIcon: {
    fontSize: typography.fontSize.xxl,
    marginBottom: spacing.md,
  },
  completedText: {
    color: colors.green,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  completedSubtext: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
  },
});

export default SplitPaymentScreen;

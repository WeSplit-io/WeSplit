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
import { styles } from './DegenResultStyles';
import { SplitWalletService } from '../../services/splitWalletService';
import { CastIntegrationService } from '../../services/castIntegrationService';
import { NotificationService } from '../../services/notificationService';
import { FallbackDataService } from '../../utils/fallbackDataService';
import { useApp } from '../../context/AppContext';

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
  const { billData, participants, totalAmount, selectedParticipant, splitWallet, processedBillData, splitData } = route.params;
  const { state } = useApp();
  const { currentUser } = state;
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine if current user is the winner (winner pays nothing, losers pay their share)
  const isWinner = currentUser && selectedParticipant && 
    selectedParticipant.id === currentUser.id.toString();

  // Send winner/loser notifications when screen loads
  React.useEffect(() => {
    const sendResultNotifications = async () => {
      if (!selectedParticipant || !splitWallet) return;

      const billName = MockupDataService.getBillName(); // Use unified mockup data
      const winnerId = selectedParticipant.id;
      const loserIds = participants.filter(p => p.id !== winnerId).map(p => p.id);

      // Send winner notification
      await NotificationService.sendWinnerNotification(
        winnerId,
        splitWallet.id,
        billName
      );

      // Send loser notifications
      await NotificationService.sendBulkNotifications(
        loserIds,
        'split_loser',
        {
          splitWalletId: splitWallet.id,
          billName,
          amount: totalAmount / participants.length, // Each loser pays their share
        }
      );
    };

    sendResultNotifications();
  }, []);

  // Check if all losers have paid their shares
  React.useEffect(() => {
    const checkPaymentCompletion = async () => {
      if (!splitWallet || !selectedParticipant) return;

      try {
        const result = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (!result.success || !result.wallet) return;

        const wallet = result.wallet;
        const winnerId = selectedParticipant.id;
        const losers = wallet.participants.filter(p => p.userId !== winnerId);
        const allLosersPaid = losers.every(loser => loser.status === 'paid');

        if (allLosersPaid && losers.length > 0) {
          // Get merchant address if available
          const merchantAddress = processedBillData?.merchant?.address || billData?.merchant?.address;
          
          // Complete the split and send funds to merchant
          const completionResult = await SplitWalletService.completeSplitWallet(
            splitWallet.id,
            merchantAddress
          );

          if (completionResult.success) {
            // Send completion notifications
            await NotificationService.sendBulkNotifications(
              [winnerId, ...losers.map(l => l.userId)],
              'split_payment_required', // Use existing notification type
              {
                splitWalletId: splitWallet.id,
                billName: MockupDataService.getBillName(), // Use unified mockup data
                winnerName: selectedParticipant.name,
              }
            );

            // Show completion alert
            Alert.alert(
              'Degen Split Complete! 🎉',
              merchantAddress 
                ? `All losers have paid their shares. The total amount of ${wallet.totalAmount} USDC has been sent to the merchant. ${selectedParticipant.name} won and paid nothing!`
                : `All losers have paid their shares. ${selectedParticipant.name} won and paid nothing!`,
              [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('SplitsList'),
                },
              ]
            );
          } else {
            console.error('Failed to complete degen split:', completionResult.error);
            Alert.alert(
              'Degen Split Complete (Partial)',
              'All losers have paid their shares, but there was an issue sending funds to the merchant. Please contact support.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('SplitsList'),
                },
              ]
            );
          }
        }
      } catch (error) {
        console.error('Error checking payment completion:', error);
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkPaymentCompletion, 5000);
    return () => clearInterval(interval);
  }, [splitWallet, selectedParticipant]);

  const handleSettlePayment = async () => {
    if (!currentUser?.id || !splitWallet) {
      Alert.alert('Error', 'Missing required data for payment');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🔍 DegenResultScreen: Processing degen split payment...');
      
      if (isWinner) {
        // Winner pays nothing - just unlock their funds
        console.log('🔍 DegenResultScreen: Winner - unlocking funds');
        
        // Unlock the winner's funds (they get their money back)
        const unlockResult = await SplitWalletService.unlockSplitWallet(
          splitWallet.id,
          currentUser.id.toString()
        );

        if (!unlockResult.success) {
          Alert.alert('Error', unlockResult.error || 'Failed to unlock funds');
          return;
        }

        Alert.alert(
          'Congratulations! 🎉',
          'You won the degen split! Your locked funds have been returned to you.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SplitsList'),
            },
          ]
        );
      } else {
        // Loser pays their share - navigate to payment screen
        console.log('🔍 DegenResultScreen: Loser - navigating to payment screen');
        
        const loserShare = totalAmount / participants.length;
        
        // Navigate to payment screen for the loser to pay their share
        navigation.navigate('SplitPayment', {
          splitWalletId: splitWallet.id,
          billName: MockupDataService.getBillName(), // Use unified mockup data
          totalAmount: loserShare, // Loser only pays their share
          isDegenLoser: true,
          winnerName: selectedParticipant.name,
        });
      }

    } catch (error) {
      console.error('Error settling payment:', error);
      Alert.alert('Error', 'Failed to settle payment. Please try again.');
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
          <Text style={styles.resultTitle}>
            {isWinner ? "🎉 You're the Winner!" : "😅 You're the Loser!"}
          </Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isWinner && styles.winnerAvatar]}>
            <Text style={styles.avatarText}>
              {isWinner ? "🏆" : currentUser?.name?.charAt(0).toUpperCase() || "🐒"}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, isWinner && styles.winnerAmountText]}>
            {isWinner ? "FREE!" : `-${totalAmount} USDC`}
          </Text>
        </View>

        {/* Result Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            {isWinner 
              ? `Congratulations! You don't have to pay anything! 🍀\nThe bill of ${totalAmount} USDC will be split among the other participants.`
              : `You covered the total bill: ${totalAmount} USDC.\n(Better luck next time 🍀)`
            }
          </Text>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareOnX}>
          <Text style={styles.shareButtonText}>Share on X</Text>
        </TouchableOpacity>

        {/* Payment Options - Only show for losers */}
        {!isWinner && (
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
        )}

        {/* Bill Details */}
        <View style={styles.billDetailsContainer}>
          <Text style={styles.billDetailsTitle}>Bill Details</Text>
          <View style={styles.billDetailsRow}>
            <Text style={styles.billDetailsLabel}>Event:</Text>
            <Text style={styles.billDetailsValue}>{MockupDataService.getBillName()}</Text>
          </View>
          <View style={styles.billDetailsRow}>
            <Text style={styles.billDetailsLabel}>Date:</Text>
            <Text style={styles.billDetailsValue}>
              {(() => {
                try {
                  const date = FallbackDataService.generateBillDate(processedBillData, billData, true);
                  console.log('🔍 DegenResultScreen: Generated date:', date);
                  return date;
                } catch (error) {
                  console.error('🔍 DegenResultScreen: Error generating date:', error);
                  return new Date().toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                }
              })()}
            </Text>
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


export default DegenResultScreen;

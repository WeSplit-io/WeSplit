/**
 * Degen Result Screen
 * Uses modular hooks and components for better maintainability
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Linking,
  Animated,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenResultStyles';
import { SplitWalletService } from '../../services/split';
import { SplitWallet } from '../../services/split/types';
import { notificationService } from '../../services/notifications';
import { useApp } from '../../context/AppContext';
import { roundUsdcAmount, formatUsdcForDisplay } from '../../utils/ui/format/formatUtils';
import { getSplitStatusDisplayText, getParticipantStatusDisplayText } from '../../utils/statusUtils';

// Import our custom hooks and components
import { useDegenSplitState, useDegenSplitLogic, useDegenSplitRealtime } from './hooks';
import { DegenSplitHeader } from './components';
import { Container, Button, AppleSlider, Modal } from '@/components/shared';
import Avatar from '@/components/shared/Avatar';
import BadgeDisplay from '../../components/profile/BadgeDisplay';

interface DegenResultScreenProps {
  navigation: any;
  route: any;
}

interface SelectedParticipant {
  id: string;
  name: string;
  userId: string;
}


const DegenResultScreen: React.FC<DegenResultScreenProps> = ({ navigation, route }) => {
  const { billData, participants, totalAmount, selectedParticipant, splitWallet, processedBillData, splitData } = route.params;
  const { state } = useApp();
  const { currentUser } = state;
  
  // Initialize our custom hooks
  const degenState = useDegenSplitState(splitWallet);
  const degenLogic = useDegenSplitLogic(degenState, (updates) => {
    // Update state function
    Object.keys(updates).forEach(key => {
      const setter = (degenState as any)[`set${key.charAt(0).toUpperCase() + key.slice(1)}`];
      if (setter) {
        setter(updates[key as keyof typeof updates]);
      }
    });
  });

  // Initialize real-time updates
  const realtimeState = useDegenSplitRealtime(
    splitData?.id,
    degenState.splitWallet?.id,
    {
      onParticipantUpdate: (participants) => {
        console.log('🔍 DegenResultScreen: Real-time participant update:', participants);
        
        // Check if current user's status changed to 'paid' and exit loading state
        if (currentUser && degenState.isProcessing) {
          const currentUserParticipant = participants.find(
            (p: any) => p.userId === currentUser.id.toString()
          );
          
          if (currentUserParticipant?.status === 'paid') {
            console.log('✅ Real-time update: User status changed to paid, exiting loading state');
            
            // CRITICAL FIX: Only show success message if we were actually processing AND haven't already shown an alert
            // This prevents duplicate alerts when the transaction succeeds immediately
            const wasProcessing = degenState.isProcessing;
            degenState.setIsProcessing(false);
            
            // Only show alert if we were processing AND haven't already shown a success alert
            if (wasProcessing && !hasShownSuccessAlertRef.current) {
              hasShownSuccessAlertRef.current = true;
              
              // Show appropriate alert based on winner/loser status
              if (isLoser) {
                Alert.alert(
                  '✅ Transfer Complete!', 
                  `Your locked funds have been successfully transferred to your external card or wallet.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('SplitsList')
                    }
                  ]
                );
              } else {
                Alert.alert(
                  '🎉 Winner Payout Complete!', 
                  `Congratulations! You've received the full amount of ${formatUsdcForDisplay(totalAmount)} USDC from the degen split to your in-app wallet.`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        }
      },
      onSplitWalletUpdate: (splitWallet) => {
        console.log('🔍 DegenResultScreen: Real-time wallet update:', splitWallet);
        degenState.setSplitWallet(splitWallet);
        setCurrentSplitWallet(splitWallet);
      },
      onError: (error) => {
        console.error('🔍 DegenResultScreen: Real-time error:', error);
        degenState.setError(error.message);
      }
    }
  );

  // CRITICAL: Check if current user is the loser
  // degenLoser is the selected participant (the LOSER)
  // All other participants are winners
  const loserUserId = currentSplitWallet?.degenLoser?.userId || 
                      degenState.splitWallet?.degenLoser?.userId ||
                      currentSplitWallet?.degenWinner?.userId || // Fallback for backward compatibility
                      degenState.splitWallet?.degenWinner?.userId ||
                      selectedParticipant?.userId || 
                      selectedParticipant?.id;
  
  const isLoser = currentUser && loserUserId && 
    loserUserId === currentUser.id.toString();
  const isWinner = !isLoser && !!loserUserId; // If there's a loser and you're not it, you're a winner
  
  // Use degenLoser from wallet as source of truth for selectedParticipant
  const effectiveSelectedParticipant = currentSplitWallet?.degenLoser ? {
    id: currentSplitWallet.degenLoser.userId,
    name: currentSplitWallet.degenLoser.name,
    userId: currentSplitWallet.degenLoser.userId
  } : (currentSplitWallet?.degenWinner ? {
    id: currentSplitWallet.degenWinner.userId,
    name: currentSplitWallet.degenWinner.name,
    userId: currentSplitWallet.degenWinner.userId
  } : selectedParticipant);

  // State to track current split wallet data
  // CRITICAL FIX: Initialize from route params, but reload if degenWinner is missing
  const [currentSplitWallet, setCurrentSplitWallet] = React.useState<SplitWallet | null>(splitWallet || null);
  
  // CRITICAL FIX: Track if we've already shown success alert to prevent duplicates
  const hasShownSuccessAlertRef = React.useRef(false);

  // CRITICAL FIX: Reload wallet on mount to get latest status including degenLoser
  React.useEffect(() => {
    const initializeWallet = async () => {
      if (!splitWallet?.id) {return;}

      // Reload wallet to get latest participant status and loser information
      try {
        const { SplitWalletService } = await import('../../services/split');
        const result = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (result.success && result.wallet) {
          console.log('🔍 DegenResultScreen: Reloaded wallet on mount:', {
            status: result.wallet.status,
            participantsCount: result.wallet.participants.length,
            hasDegenLoser: !!result.wallet.degenLoser,
            degenLoser: result.wallet.degenLoser,
            hasDegenWinner: !!result.wallet.degenWinner
          });
          setCurrentSplitWallet(result.wallet);
          degenState.setSplitWallet(result.wallet);
        }
      } catch (error) {
        console.error('🔍 DegenResultScreen: Error reloading wallet:', error);
      }
    };

    initializeWallet();
  }, [splitWallet?.id]); // Only run once on mount

  // OPTIMIZED: Efficient state reset with proper dependency management
  React.useEffect(() => {
    if (currentSplitWallet && currentUser?.id) {
      const currentUserParticipant = currentSplitWallet.participants.find((p: any) => p.userId === currentUser.id.toString());
      
      // Only update state if there's actually a change needed
      if (currentUserParticipant?.status === 'paid' && degenState.isProcessing) {
        degenState.setIsProcessing(false);
      } else if (!currentUserParticipant && degenState.isProcessing) {
        // Reset processing state if user is not found in participants
        degenState.setIsProcessing(false);
      }
    }
  }, [currentSplitWallet?.participants, currentUser?.id, degenState.isProcessing]);

  // OPTIMIZED: Centralized claim validation
  const currentUserParticipant = currentSplitWallet?.participants.find((p: any) => p.userId === currentUser?.id.toString());
  const hasAlreadyClaimed = currentUserParticipant?.status === 'paid';
  const hasValidTransaction = currentUserParticipant?.transactionSignature && 
    !currentUserParticipant.transactionSignature.includes('timeout') &&
    !currentUserParticipant.transactionSignature.includes('failed');
  
  // Centralized function to check if user can claim funds
  const canUserClaimFunds = useCallback(() => {
    if (!currentUser || !currentSplitWallet) {return false;}
    
    const participant = currentSplitWallet.participants.find((p: any) => p.userId === currentUser.id.toString());
    return participant && participant.status !== 'paid';
  }, [currentUser, currentSplitWallet]);
  
  // Debug logging
  React.useEffect(() => {
    if (currentSplitWallet && currentUser) {
      console.log('🔍 DegenResultScreen Debug:', {
        splitWalletId: currentSplitWallet.id,
        currentUserId: currentUser.id,
        currentUserParticipant: currentUserParticipant,
        hasAlreadyClaimed,
        allParticipants: currentSplitWallet.participants.map(p => ({
          userId: p.userId,
          name: p.name,
          status: p.status,
          amountPaid: p.amountPaid,
          amountOwed: p.amountOwed
        }))
      });
    }
  }, [currentSplitWallet, currentUser, currentUserParticipant, hasAlreadyClaimed]);

  // OPTIMIZED: Real-time updates will handle data loading automatically
  // No need for manual data loading - this causes conflicts with real-time updates

  // Event handlers
  const handleBack = () => {
    navigation.navigate('SplitsList');
  };

  const handleExternalPayment = async () => {
    degenState.setIsProcessing(true);
    try {
      // NEW Degen Logic: Loser receives funds from split wallet to their KAST card/external wallet
      const { SplitWalletService } = await import('../../services/split');
      const result = await SplitWalletService.processDegenLoserPayment(
        splitWallet.id,
        currentUser!.id.toString(),
        'kast-card', // Payment method
        totalAmount, // Loser receives their locked funds back
        'Degen Split Loser Payment (KAST Card)'
      );
      
      if (result.success) {
        // Check if this is a withdrawal request (for non-creators)
        if (result.transactionSignature?.startsWith('WITHDRAWAL_REQUEST_')) {
          Alert.alert(
            '📋 Withdrawal Request Submitted', 
            result.message || 'Your withdrawal request has been submitted. The split creator will process your request.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SplitsList')
              }
            ]
          );
        } else {
          // Get the actual amount transferred (loser's locked amount, not total)
          const transferredAmount = result.amount || currentUserParticipant?.amountPaid || totalAmount;
          Alert.alert(
            '✅ Transfer Complete!', 
            `Your locked funds (${formatUsdcForDisplay(transferredAmount)} USDC) have been successfully transferred to your external card or wallet.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SplitsList')
              }
            ]
          );
        }
      } else {
        // Check if error is about missing external destination
        if (result.error?.includes('No external') || result.error?.includes('link a') || result.error?.includes('linked')) {
          Alert.alert(
            'External Card/Wallet Required', 
            result.error || 'Please link a KAST card or external wallet in Settings to transfer your funds.',
            [
              {
                text: 'Go to Settings',
                onPress: () => navigation.navigate('LinkedCards')
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Transfer Failed', result.error || 'Failed to transfer to external card/wallet. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process KAST payment. Please try again.');
    } finally {
      degenState.setIsProcessing(false);
    }
  };

  // Handle signature step
  const handleSignatureStep = async () => {
    if (!degenState.selectedPaymentMethod) {return;}
    
    degenState.setIsSigning(true);
    try {
      // Simulate signature process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // CRITICAL: Only external card transfers are allowed
      // Process the payment to external card
      await handleExternalPayment();
      
      // Close modals
      degenState.setShowSignatureStep(false);
      degenState.setShowPaymentOptionsModal(false);
      degenState.setSelectedPaymentMethod(null);
    } catch (error) {
      console.error('Error during signature process:', error);
      Alert.alert('Error', 'Failed to complete signature. Please try again.');
    } finally {
      degenState.setIsSigning(false);
    }
  };

  const handleInAppPayment = async () => {
    // CRITICAL: In-app wallet transfers are not allowed - must use external card
    Alert.alert(
      'External Card Required',
      'Funds must be transferred to your external linked card, not to your in-app wallet. Please use the "Transfer to External Card" option.',
      [{ text: 'OK' }]
    );
    return;
  };

  const handleClaimFunds = async () => {
    // CRITICAL FIX: Mark that we'll show success alert to prevent duplicates
    const success = await degenLogic.handleClaimFunds(
      currentUser, 
      splitWallet, 
      totalAmount,
      () => {
        // Callback to mark that success alert was shown
        hasShownSuccessAlertRef.current = true;
      }
    );
    if (success) {
      // Refresh split wallet data to show updated status
      try {
        const { SplitWalletService } = await import('../../services/split');
        const result = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (result.success && result.wallet) {
          setCurrentSplitWallet(result.wallet);
        }
      } catch (error) {
        console.error('Error refreshing split wallet data:', error);
      }
    }
  };

  const handleShowPrivateKey = async () => {
    if (degenState.isFetchingPrivateKey) {return;}
    await degenLogic.handleShowPrivateKey(splitWallet, currentUser);
  };

  const handleCopyWalletAddress = (address: string) => {
    degenLogic.handleCopyWalletAddress(address);
  };

  const handleClosePrivateKeyCustomModal = () => {
    degenState.setShowPrivateKeyModal(false);
  };

  const handleCopyPrivateKey = () => {
    if (degenState.privateKey) {
      degenLogic.handleCopyPrivateKey(degenState.privateKey);
    }
  };

  const handleShareOnX = () => {
    const message = isWinner 
      ? `Got spared ${formatUsdcForDisplay(totalAmount)}USDC by the split 🎉  @wesplit_io you’re a hero 🙏\nTry your luck next time, you never know…`
      : `RIP me 💀 lost the degen split on @wesplit_io and paid ${formatUsdcForDisplay(totalAmount)}USDC for the team 💸\nThink you can do better? Try your luck.`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    
    Linking.openURL(twitterUrl).catch(err => {
      console.error('Failed to open Twitter:', err);
      Alert.alert('Error', 'Failed to open Twitter. Please try again.');
    });
  };

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <DegenSplitHeader
        title="Degen Result"
        onBackPress={handleBack}
        isRealtimeActive={realtimeState.hasReceivedRealtimeData}
      />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Avatar Container */}
        <View style={styles.avatarContainer}>
          <Avatar
            userId={currentUser?.id.toString()}
            userName={currentUser?.name || currentUser?.email}
            size={120}
            avatarUrl={currentUser?.avatar}
            style={[
              styles.avatar,
              isWinner ? styles.winnerAvatar : styles.loserAvatar
            ]}
            showBorder={true}
            borderColor={isWinner ? colors.green : colors.red}
          />
          {currentUser?.badges && currentUser.badges.length > 0 && currentUser.active_badge && (
            <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <BadgeDisplay
                badges={currentUser.badges}
                activeBadge={currentUser.active_badge}
                showAll={false}
              />
            </View>
          )}
        </View>

        {/* Result Title */}
        <View style={styles.resultTitleContainer}>
          <Text style={styles.resultTitle}>
            {isWinner ? "Congrats, you pay nothing!" : "You're the one paying!"}
          </Text>
        </View>

        {/* Amount Container */}
        <View style={[
          styles.amountContainer,
          isWinner ? styles.winnerAmountContainer : styles.loserAmountContainer
        ]}>
          <Text style={styles.amountValue}>
            {isWinner 
              ? `+ ${formatUsdcForDisplay(totalAmount)} USDC` // Winner gets total from all participants
              : `${formatUsdcForDisplay(currentUserParticipant?.amountPaid || currentUserParticipant?.amountOwed || totalAmount)} USDC` // Loser gets their locked amount
            }
          </Text>
        </View>

        {/* Contextual Text */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            {isWinner 
              ? `You're safe! ${effectiveSelectedParticipant?.name || 'The loser'} is paying for you. You'll receive ${formatUsdcForDisplay(totalAmount)} USDC to your in-app wallet.`
              : `You covered the bill: ${formatUsdcForDisplay(currentUserParticipant?.amountPaid || currentUserParticipant?.amountOwed || totalAmount)} USDC. Transfer your locked funds to your external card or wallet to use them.`
            }
          </Text>
          {!isWinner && (
            <Text style={styles.luckMessage}>
              (Better luck next time 🍀)
            </Text>
          )}
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShareOnX}>
          <Text style={styles.shareButtonText}>Share on </Text>
          <Image
            source={require('../../../assets/twitter-x.png')}
            style={styles.twitterIcon}
            resizeMode="contain"
          />

        </TouchableOpacity>

      </View>

      {/* Action Buttons - Fixed at bottom */}
      <View style={styles.bottomActionButtonsContainer}>
        <View style={styles.actionButtonsContainer}>
          <Button
            title="Split Wallet"
            onPress={handleShowPrivateKey}
            variant="secondary"
            style={styles.splitWalletButton}
            disabled={hasAlreadyClaimed || degenState.isFetchingPrivateKey} // Disable after withdrawal (single withdrawal rule)
            loading={degenState.isFetchingPrivateKey}
          />
          
          {isWinner ? (
            // Winner - Claim button
            <Button
              title={degenState.isProcessing ? 'Claiming...' : 'Claim'}
              onPress={() => degenState.setShowClaimModal(true)}
              variant="primary"
              disabled={degenState.isProcessing}
              loading={degenState.isProcessing}
              style={{flex: 1}}
            />
          ) : (
            // Loser - Transfer to external card button
            <Button
              title={degenState.isProcessing ? 'Transferring...' : 'Transfer to External Card'}
              onPress={() => degenState.setShowPaymentOptionsModal(true)}
              variant="primary"
              disabled={degenState.isProcessing || hasAlreadyClaimed}
              loading={degenState.isProcessing}
              style={styles.claimButtonNew}
            />
          )}
        </View>
      </View>

      {/* Claim Modal - For Winners */}
      <Modal
        visible={degenState.showClaimModal}
        onClose={() => degenState.setShowClaimModal(false)}
        title={hasAlreadyClaimed ? 'Funds Already Claimed' : 'Claim Your Winnings'}
        description={hasAlreadyClaimed 
          ? `You have already claimed your ${formatUsdcForDisplay(totalAmount)} USDC winnings.`
          : `You won the degen split! Claim your ${formatUsdcForDisplay(totalAmount)} USDC winnings.`
        }
        showHandle={true}
        closeOnBackdrop={true}
      >
        <View style={styles.modalIconContainer}>
          <Text style={styles.modalIcon}>🎉</Text>
        </View>
        
        {hasAlreadyClaimed ? (
          <View style={styles.claimedStatusContainer}>
            {hasValidTransaction ? (
              <>
                <Text style={styles.claimedStatusText}>✅ Funds Claimed {getSplitStatusDisplayText('completed')}</Text>
                <Text style={styles.claimedStatusSubtext}>
                  Transaction: {currentUserParticipant?.transactionSignature?.slice(0, 8)}...
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.claimedStatusText}>⚠️ Claim {getSplitStatusDisplayText('cancelled')} or Timed Out</Text>
                <Text style={styles.claimedStatusSubtext}>
                  Your previous claim attempt failed. You can try again.
                </Text>
                <AppleSlider
                  onSlideComplete={handleClaimFunds}
                  disabled={degenState.isProcessing}
                  loading={degenState.isProcessing}
                  text="Retry Claim"
                />
              </>
            )}
          </View>
        ) : (
          <AppleSlider
            onSlideComplete={handleClaimFunds}
            disabled={degenState.isProcessing}
            loading={degenState.isProcessing}
            text="Slide to Claim"
          />
        )}
      </Modal>

      {/* Payment Options CustomModal */}
      <Modal
        visible={degenState.showPaymentOptionsModal}
        onClose={() => degenState.setShowPaymentOptionsModal(false)}
        title={!degenState.showSignatureStep ? 'Transfer to External Card' : 'Transfer Your Locked Funds'}
        description={!degenState.showSignatureStep 
          ? `Transfer your locked funds (${formatUsdcForDisplay(totalAmount)} USDC) to your external linked card to use them.`
          : 'Your locked funds will be sent from the split wallet to your external card.'
        }
        showHandle={true}
        closeOnBackdrop={true}
      >
        {!degenState.showSignatureStep ? (
          // Payment Method Selection Step - Only External Card
          <>
            <View style={styles.paymentOptionsModalContainer}>
              {/* CRITICAL: Only show external card option - no in-app wallet */}
              <TouchableOpacity 
                style={styles.paymentOptionButton}
                onPress={() => {
                  degenState.setSelectedPaymentMethod('kast-card');
                  degenState.setShowSignatureStep(true);
                }}
              >
                <View style={styles.paymentOptionIcon}>
                  <Text style={styles.paymentOptionIconText}>🏦</Text>
                </View>
                <View style={styles.paymentOptionContent}>
                  <Text style={styles.paymentOptionTitle}>External Card (KAST)</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Transfer to your linked external card
                  </Text>
                </View>
                <Text style={styles.paymentOptionArrow}>→</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentInfoContainer}>
              <Text style={styles.paymentInfoText}>
                💡 All participants must transfer funds to external cards. No in-app wallet transfers allowed.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => degenState.setShowPaymentOptionsModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Signature Step
          <>
            {/* Transfer Visualization */}
            <View style={styles.transferVisualization}>
              <View style={styles.transferIcon}>
                <Image 
                  source={require('../../../assets/wesplit-logo-card.png')} 
                  style={styles.transferIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.transferArrows}>
                <Text style={styles.transferArrowText}>{'>>>>'}</Text>
              </View>
              <View style={styles.transferIcon}>
                <Image 
                  source={require('../../../assets/kast-logo.png')} 
                  style={styles.transferIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <AppleSlider
              onSlideComplete={handleSignatureStep}
              disabled={degenState.isSigning}
              loading={degenState.isSigning}
              text="Slide to Transfer"
            />

            <TouchableOpacity 
              style={styles.modalBackButton}
              onPress={() => {
                degenState.setShowSignatureStep(false);
                degenState.setSelectedPaymentMethod(null);
              }}
            >
              <Image 
                source={require('../../../assets/chevron-left.png')} 
                style={styles.modalBackButtonIcon}
              />
              <Text style={styles.modalBackButtonText}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </Modal>

      {/* Private Key CustomModal */}
      <Modal
        visible={degenState.showPrivateKeyModal && !!degenState.privateKey}
        onClose={handleClosePrivateKeyCustomModal}
        title="🔑 Split Wallet Details"
        description="This is a shared private key for the Degen Split. All participants have access to this key to withdraw or move funds from the split wallet."
        showHandle={true}
        closeOnBackdrop={true}
      >
        {/* Wallet Address */}
        <View style={styles.walletAddressSection}>
          <Text style={styles.walletAddressLabel}>Wallet Address:</Text>
          <View style={styles.walletAddressContainer}>
            <Text style={styles.walletAddressText}>
              {degenLogic.formatWalletAddress(splitWallet.walletAddress)}
            </Text>
            <TouchableOpacity onPress={() => handleCopyWalletAddress(splitWallet.walletAddress)}>
              <Image
                source={require('../../../assets/copy-icon.png')}
                style={styles.copyIcon}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Private Key */}
        <View style={styles.privateKeySection}>
          <Text style={styles.privateKeyLabel}>Private Key:</Text>
          <View style={styles.privateKeyDisplay}>
            <Text style={styles.privateKeyText}>{degenState.privateKey}</Text>
          </View>
        </View>
        
        <View style={styles.privateKeyWarning}>
          <Text style={styles.privateKeyWarningText}>
            ⚠️ This is a shared private key for the Degen Split. All participants can use this key to access the split wallet funds.
          </Text>
        </View>
        
        <View style={styles.privateKeyButtons}>
          <TouchableOpacity 
            style={styles.copyPrivateKeyButton}
            onPress={handleCopyPrivateKey}
          >
            <Text style={styles.copyPrivateKeyButtonText}>Copy Key</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.closePrivateKeyButton}
            onPress={handleClosePrivateKeyCustomModal}
          >
            <Text style={styles.closePrivateKeyButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Container>
  );
};

export default DegenResultScreen;

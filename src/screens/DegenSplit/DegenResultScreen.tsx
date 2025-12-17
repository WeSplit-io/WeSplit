/**
 * Degen Result Screen
 * Uses modular hooks and components for better maintainability
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Linking,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenResultStyles';
import { useFocusEffect } from '@react-navigation/native';
import { SplitWallet, SplitWalletParticipant } from '../../services/split/types';
import { useApp } from '../../context/AppContext';
import { formatUsdcForDisplay } from '../../utils/ui/format/formatUtils';
import { LinkedWalletService, LinkedDestinations } from '../../services/blockchain/wallet/LinkedWalletService';
import { logger } from '../../services/analytics/loggingService';

// Import our custom hooks and components
import { useDegenSplitState, useDegenSplitLogic, useDegenSplitRealtime } from './hooks';
import { DegenSplitHeader } from './components';
import { Container, Button, AppleSlider, Modal, PhosphorIcon } from '@/components/shared';
import Avatar from '@/components/shared/Avatar';
import BadgeDisplay from '../../components/profile/BadgeDisplay';

interface DegenResultScreenProps {
  navigation: any;
  route: any;
}

const DegenResultScreen: React.FC<DegenResultScreenProps> = ({ navigation, route }) => {
  const { totalAmount, selectedParticipant, splitWallet, splitData, selectedCard } = route.params || {};
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
  const [currentSplitWallet, setCurrentSplitWallet] = React.useState<SplitWallet | null>(splitWallet || null);
  const [linkedDestinations, setLinkedDestinations] = React.useState<LinkedDestinations | null>(null);
  const [isCheckingLinkedDestinations, setIsCheckingLinkedDestinations] = React.useState(false);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);
  const linkedDestinationsRequestRef = React.useRef<Promise<LinkedDestinations | null> | null>(null);

  const hasActiveKastCard = React.useCallback((destinations?: LinkedDestinations | null) => {
    if (!destinations) {return false;}
    return (destinations.kastCards || []).some(
      (card) => card?.isActive !== false && card?.status === 'active'
    );
  }, []);

  const refreshLinkedDestinations = React.useCallback(async (): Promise<LinkedDestinations | null> => {
    if (!currentUser?.id) {
      setLinkedDestinations(null);
      linkedDestinationsRequestRef.current = null;
      return null;
    }

    if (linkedDestinationsRequestRef.current) {
      return linkedDestinationsRequestRef.current;
    }

    setIsCheckingLinkedDestinations(true);

    const executeFetch = async () => {
      try {
        const destinations = await LinkedWalletService.getLinkedDestinations(currentUser.id.toString());
        setLinkedDestinations(destinations);
        return destinations;
      } catch (error) {
        logger.error('Failed to load linked destinations', { error: error instanceof Error ? error.message : String(error) }, 'DegenResultScreen');
        setLinkedDestinations(null);
        return null;
      } finally {
        setIsCheckingLinkedDestinations(false);
      }
    };

    const fetchPromise = executeFetch();

    linkedDestinationsRequestRef.current = fetchPromise;
    fetchPromise.finally(() => {
      if (linkedDestinationsRequestRef.current === fetchPromise) {
        linkedDestinationsRequestRef.current = null;
      }
    });
    return fetchPromise;
  }, [currentUser?.id]);

  useFocusEffect(
    React.useCallback(() => {
      refreshLinkedDestinations();
    }, [refreshLinkedDestinations])
  );

  React.useEffect(() => {
    if (degenState.splitWallet && degenState.splitWallet.id !== currentSplitWallet?.id) {
      setCurrentSplitWallet(degenState.splitWallet);
    }
  }, [degenState.splitWallet, currentSplitWallet?.id]);

  // Initialize real-time updates
  const realtimeState = useDegenSplitRealtime(
    splitData?.id,
    degenState.splitWallet?.id,
    {
      onParticipantUpdate: (participants) => {
        logger.debug('Real-time participant update', { participantsCount: participants.length }, 'DegenResultScreen');
        
        // Check if current user's status changed to 'paid' and exit loading state
        if (currentUser && degenState.isProcessing) {
          const currentUserParticipant = participants.find(
            (p: any) => p.userId === currentUser.id.toString()
          );
          
          if (currentUserParticipant?.status === 'paid') {
            logger.info('Real-time update: User status changed to paid, exiting loading state', null, 'DegenResultScreen');
            
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
        logger.debug('Real-time wallet update', { walletId: splitWallet?.id }, 'DegenResultScreen');
        degenState.setSplitWallet(splitWallet);
        setCurrentSplitWallet(splitWallet);
      },
      onError: (error) => {
        logger.error('Real-time error', { error: error.message }, 'DegenResultScreen');
        degenState.setError(error.message);
      }
    }
  );

  const participants = React.useMemo<SplitWalletParticipant[]>(() => {
    if (currentSplitWallet?.participants?.length) {return currentSplitWallet.participants;}
    if (degenState.splitWallet?.participants?.length) {return degenState.splitWallet.participants;}
    return splitWallet?.participants || [];
  }, [currentSplitWallet?.participants, degenState.splitWallet?.participants, splitWallet?.participants]);

  const fallbackLoserFromParticipants = React.useMemo(() => {
    if (!participants.length) {return null;}
    const firstParticipant = participants[0];
    if (!firstParticipant) {return null;}
    if (participants.length === 1) {
      return firstParticipant.userId;
    }
    const lockedParticipant = participants.find(
      (participant: SplitWalletParticipant) => participant.status === 'locked'
    );
    const pendingParticipant = participants.find(
      (participant: SplitWalletParticipant) => participant.status === 'pending'
    );
    return lockedParticipant?.userId || pendingParticipant?.userId || firstParticipant.userId;
  }, [participants]);

  const loserUserId = React.useMemo(() => (
    currentSplitWallet?.degenLoser?.userId ||
    degenState.splitWallet?.degenLoser?.userId ||
    selectedParticipant?.userId ||
    selectedParticipant?.id ||
    fallbackLoserFromParticipants ||
    null
  ), [currentSplitWallet, degenState.splitWallet, selectedParticipant, fallbackLoserFromParticipants]);

  const winnerUserId = React.useMemo(() => {
    let candidate: string | null = null;
    if (currentSplitWallet?.degenWinner?.userId) {
      candidate = currentSplitWallet.degenWinner.userId;
    } else if (degenState.splitWallet?.degenWinner?.userId) {
      candidate = degenState.splitWallet.degenWinner.userId;
    } else if (participants.length > 1 && loserUserId) {
      const fallbackWinner = participants.find(
        (participant: SplitWalletParticipant) => participant.userId !== loserUserId
      );
      candidate = fallbackWinner?.userId || null;
    }

    if (candidate && loserUserId && candidate === loserUserId) {
      return null;
    }

    return candidate;
  }, [currentSplitWallet, degenState.splitWallet, loserUserId, participants]);

  const isLoser = React.useMemo(() => {
    if (!currentUser?.id || !loserUserId) {return false;}
    return loserUserId === currentUser.id.toString();
  }, [currentUser?.id, loserUserId]);

  const isWinner = React.useMemo(() => {
    if (!currentUser?.id || isLoser) {return false;}
    if (winnerUserId) {
      return winnerUserId === currentUser.id.toString();
    }
    return false;
  }, [currentUser?.id, winnerUserId, isLoser]);

  const effectiveSelectedParticipant = React.useMemo(() => {
    if (currentSplitWallet?.degenLoser) {
      return {
        id: currentSplitWallet.degenLoser.userId,
        name: currentSplitWallet.degenLoser.name,
        userId: currentSplitWallet.degenLoser.userId
      };
    }

    if (degenState.splitWallet?.degenLoser) {
      return {
        id: degenState.splitWallet.degenLoser.userId,
        name: degenState.splitWallet.degenLoser.name,
        userId: degenState.splitWallet.degenLoser.userId
      };
    }

    if (fallbackLoserFromParticipants) {
      const participant = participants.find(p => p.userId === fallbackLoserFromParticipants);
      if (participant) {
        return {
          id: participant.userId,
          name: participant.name,
          userId: participant.userId
        };
      }
    }

    return selectedParticipant;
  }, [currentSplitWallet, degenState.splitWallet, selectedParticipant, fallbackLoserFromParticipants, participants]);

  const combinedAvatarStyle = React.useMemo(
    () => StyleSheet.flatten([styles.avatar, isWinner ? styles.winnerAvatar : styles.loserAvatar]),
    [isWinner]
  );
  
  // CRITICAL FIX: Track if we've already shown success alert to prevent duplicates
  const hasShownSuccessAlertRef = React.useRef(false);

  const hasReloadedInitialWalletRef = React.useRef(false);

  // OPTIMIZED: Reload wallet on mount only when initial data is incomplete
  // Real-time updates will handle subsequent updates, so we only need initial load if data is missing
  React.useEffect(() => {
    const initializeWallet = async () => {
      if (!splitWallet?.id || hasReloadedInitialWalletRef.current) {return;}

      const needsReload = !splitWallet?.degenLoser || !splitWallet?.participants?.length;
      if (!needsReload) {
        // Data is complete, just set it
        setCurrentSplitWallet(splitWallet);
        degenState.setSplitWallet(splitWallet);
        return;
      }

      hasReloadedInitialWalletRef.current = true;

      // Only reload if data is incomplete - real-time updates will handle subsequent changes
      try {
        const { SplitWalletService } = await import('../../services/split');
        const result = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (result.success && result.wallet) {
          logger.debug('Reloaded wallet on mount (incomplete initial data)', {
            status: result.wallet.status,
            participantsCount: result.wallet.participants.length,
            hasDegenLoser: !!result.wallet.degenLoser,
            hasDegenWinner: !!result.wallet.degenWinner
          }, 'DegenResultScreen');
          setCurrentSplitWallet(result.wallet);
          degenState.setSplitWallet(result.wallet);
        }
      } catch (error) {
        logger.error('Error reloading wallet', { error: error instanceof Error ? error.message : String(error) }, 'DegenResultScreen');
      }
    };

    initializeWallet();
  }, [splitWallet?.id]); // Only depend on wallet ID - real-time updates handle the rest

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
  const currentUserParticipant = React.useMemo(() => {
    if (!currentSplitWallet || !currentUser?.id) {return undefined;}
    return currentSplitWallet.participants.find((p: any) => p.userId === currentUser.id.toString());
  }, [currentSplitWallet, currentUser?.id]);

  const hasAlreadyClaimed = currentUserParticipant?.status === 'paid';
  const transferButtonTitle = isCheckingLinkedDestinations
    ? 'Checking...'
    : (degenState.isProcessing ? 'Transferring...' : 'Transfer to External Card');
  
  const hasLinkedKastCard = React.useMemo(
    () => hasActiveKastCard(linkedDestinations),
    [linkedDestinations, hasActiveKastCard]
  );
  const selectedKastCard = React.useMemo(() => {
    if (!linkedDestinations?.kastCards?.length) {return null;}
    
    // If a card is explicitly selected, use that
    if (selectedCardId) {
      const selected = linkedDestinations.kastCards.find(
        (card) => card.id === selectedCardId && (card?.isActive !== false && card?.status === 'active')
      );
      if (selected) {return selected;}
    }
    
    // Otherwise, use the first active card
    return linkedDestinations.kastCards.find(
      (card) => card?.isActive !== false && card?.status === 'active'
    ) || null;
  }, [linkedDestinations?.kastCards, selectedCardId]);
  
  // Initialize selectedCardId when linkedDestinations loads or when returning from card selection
  React.useEffect(() => {
    // If a card was selected from LinkedCards screen, use that
    if (selectedCard?.id) {
      setSelectedCardId(selectedCard.id);
      return;
    }
    
    // Otherwise, initialize with first active card
    if (linkedDestinations?.kastCards?.length && !selectedCardId) {
      const firstActiveCard = linkedDestinations.kastCards.find(
        (card) => card?.isActive !== false && card?.status === 'active'
      );
      if (firstActiveCard) {
        setSelectedCardId(firstActiveCard.id);
      }
    }
  }, [linkedDestinations?.kastCards, selectedCardId, selectedCard]);

  const ensureLinkedDestinationOrPrompt = useCallback(async () => {
    const destinations = linkedDestinations ?? await refreshLinkedDestinations();
    const hasDestination = hasActiveKastCard(destinations);

    if (!hasDestination) {
      return false;
    }
    return true;
  }, [linkedDestinations, refreshLinkedDestinations, hasActiveKastCard]);

  const handleTransferButtonPress = useCallback(async () => {
    if (!isLoser) {
      Alert.alert('Not Available', 'Only the selected payer can transfer funds to an external card.');
      return;
    }
    if (degenState.isProcessing) {return;}

    const hasDestination = await ensureLinkedDestinationOrPrompt();
    degenState.setShowPaymentOptionsModal(true);
    if (!hasDestination) {
      degenState.setShowSignatureStep(false);
      degenState.setSelectedPaymentMethod(null);
    }
  }, [degenState, ensureLinkedDestinationOrPrompt, isLoser]);

  const handleManageLinkedCards = useCallback(() => {
    degenState.setShowPaymentOptionsModal(false);
    // Navigate to LinkedCards in selection mode so user can select a card
    navigation.navigate('LinkedCards', {
      returnRoute: 'DegenResult',
      returnParams: {
        totalAmount,
        selectedParticipant,
        splitWallet,
        splitData,
        selectCardMode: true
      }
    });
  }, [degenState, navigation, totalAmount, selectedParticipant, splitWallet, splitData]);

  const handleLinkExternalDestinations = useCallback(() => {
    degenState.setShowPaymentOptionsModal(false);
    navigation.navigate('LinkedCards');
  }, [degenState, navigation]);
  
  // Debug logging (only in development)
  React.useEffect(() => {
    if (currentSplitWallet && currentUser && __DEV__) {
      logger.debug('DegenResultScreen state', {
        splitWalletId: currentSplitWallet.id,
        currentUserId: currentUser.id,
        hasAlreadyClaimed,
        participantsCount: currentSplitWallet.participants.length
      }, 'DegenResultScreen');
    }
  }, [currentSplitWallet, currentUser, hasAlreadyClaimed]);

  // OPTIMIZED: Real-time updates will handle data loading automatically
  // No need for manual data loading - this causes conflicts with real-time updates

  // Event handlers
  const handleBack = () => {
    navigation.navigate('SplitsList');
  };

  const handleExternalPayment = async () => {
    if (!isLoser) {
      Alert.alert('Not Available', 'Only the selected payer can transfer funds to an external card.');
      return;
    }
    degenState.setIsProcessing(true);
    try {
      // NEW Degen Logic: Loser receives funds from split wallet to their KAST card/external wallet
      const { SplitWalletService } = await import('../../services/split');
      const result = await SplitWalletService.processDegenLoserPayment(
        splitWallet.id,
        currentUser!.id.toString(),
        'kast-card', // Payment method
        totalAmount, // Loser receives their locked funds back
        'Degen Split Loser Payment (KAST Card)',
        selectedKastCard?.id || undefined // Pass the selected card ID as the last parameter
      );
      
      if (result.success) {
        // Check if this is a withdrawal request (for non-creators)
        hasShownSuccessAlertRef.current = true;
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
    
    const hasDestination = await ensureLinkedDestinationOrPrompt();
    if (!hasDestination) {
      degenState.setShowSignatureStep(false);
      degenState.setSelectedPaymentMethod(null);
      return;
    }

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
      logger.error('Error during signature process', { error: error instanceof Error ? error.message : String(error) }, 'DegenResultScreen');
      Alert.alert('Error', 'Failed to complete signature. Please try again.');
    } finally {
      degenState.setIsSigning(false);
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
      logger.error('Failed to open Twitter', { error: err instanceof Error ? err.message : String(err) }, 'DegenResultScreen');
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
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Container */}
        <View style={styles.avatarContainer}>
          <Avatar
            userId={currentUser?.id.toString()}
            userName={currentUser?.name || currentUser?.email}
            size={120}
            avatarUrl={currentUser?.avatar}
            style={combinedAvatarStyle}
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
          <PhosphorIcon
            name="XLogo"
            size={20}
            color={colors.white}
            style={styles.twitterIcon}
          />

        </TouchableOpacity>

      </ScrollView>

      {/* Action Buttons - Fixed at bottom */}
      <View style={styles.bottomActionButtonsContainer}>
        <View style={styles.actionButtonsContainer}>
          <Button
            title="Split Wallet"
            onPress={handleShowPrivateKey}
            variant="secondary"
            fullWidth
            style={styles.splitWalletButton}
            disabled={hasAlreadyClaimed || degenState.isFetchingPrivateKey}
            loading={degenState.isFetchingPrivateKey}
          />

          {isLoser ? (
          <Button
            title={transferButtonTitle}
            onPress={handleTransferButtonPress}
            variant="primary"
            fullWidth
            disabled={degenState.isProcessing || hasAlreadyClaimed || isCheckingLinkedDestinations}
            loading={degenState.isProcessing || isCheckingLinkedDestinations}
            style={styles.primaryActionButton}
          />
          ) : (
            <View style={styles.transferInfoBanner}>
              <Text style={styles.transferInfoText}>
                Winners have nothing to transfer. Sit tight while the loser sends the funds to their external card.
              </Text>
            </View>
          )}
        </View>
      </View>

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
                style={[
                  styles.paymentOptionButton,
                  (!hasLinkedKastCard || isCheckingLinkedDestinations) && styles.paymentOptionButtonDisabled
                ]}
                onPress={() => {
                  if (!hasLinkedKastCard || isCheckingLinkedDestinations) {return;}
                  degenState.setSelectedPaymentMethod('kast-card');
                  degenState.setShowSignatureStep(true);
                }}
                disabled={!hasLinkedKastCard || isCheckingLinkedDestinations}
              >
                <View style={styles.paymentOptionIcon}>
                  <Text style={styles.paymentOptionIconText}>🏦</Text>
                </View>
                <View style={styles.paymentOptionContent}>
                  <Text style={styles.paymentOptionTitle}>External Card (KAST)</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Transfer to your linked external card
                  </Text>
                  {!hasLinkedKastCard && !isCheckingLinkedDestinations && (
                    <Text style={styles.paymentOptionWarning}>
                      No linked KAST cards found
                    </Text>
                  )}
                </View>
                <Text style={styles.paymentOptionArrow}>→</Text>
              </TouchableOpacity>
            </View>
            
            {(!hasLinkedKastCard && !isCheckingLinkedDestinations) ? (
              <>
                <View style={styles.missingDestinationBanner}>
                  <Text style={styles.missingDestinationTitle}>
                    No KAST cards linked
                  </Text>
                  <Text style={styles.missingDestinationText}>
                    Link a KAST card to withdraw your locked funds.
                  </Text>
                </View>
                <Button
                  title="Link KAST Card"
                  onPress={handleLinkExternalDestinations}
                  variant="primary"
                  fullWidth
                  style={styles.linkCardButton}
                />
              </>
            ) : (
              <>
                <View style={styles.selectedCardContainer}>
                  <Text style={styles.selectedCardLabel}>Select a card to receive funds</Text>
                  
                  {/* List of available cards for selection */}
                  {linkedDestinations?.kastCards?.filter(
                    (card) => card?.isActive !== false && card?.status === 'active'
                  ).map((card) => {
                    const isSelected = selectedKastCard?.id === card.id;
                    return (
                      <TouchableOpacity
                        key={card.id}
                        style={[
                          styles.cardSelectionItem,
                          isSelected && styles.cardSelectionItemSelected
                        ]}
                        onPress={() => {
                          setSelectedCardId(card.id);
                          logger.info('Card selected for degen loser payment', {
                            cardId: card.id,
                            cardLabel: card.label
                          }, 'DegenResultScreen');
                        }}
                      >
                        <View style={styles.cardSelectionContent}>
                          <PhosphorIcon 
                            name={isSelected ? "CheckCircle" : "Circle"} 
                            size={20} 
                            color={isSelected ? colors.green : colors.textSecondary} 
                            weight={isSelected ? "fill" : "regular"}
                          />
                          <View style={styles.cardSelectionInfo}>
                            <Text style={[
                              styles.cardSelectionName,
                              isSelected && styles.cardSelectionNameSelected
                            ]}>
                              {card.label}
                            </Text>
                            {card.address ? (
                              <Text style={styles.cardSelectionAddress}>
                                {card.address.slice(0, 6)}...{card.address.slice(-4)}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  
                  <Button
                    title="Manage linked cards"
                    variant="secondary"
                    fullWidth
                    style={styles.manageCardsButton}
                    onPress={handleManageLinkedCards}
                  />
                </View>
                <View style={styles.paymentInfoContainer}>
                  <Text style={styles.paymentInfoText}>
                    💡 All participants must transfer funds to a linked KAST card. No in-app wallet transfers allowed.
                  </Text>
                </View>
              </>
            )}

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
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fwesplit-logo-card.png?alt=media&token=aca93398-0e99-4f22-800f-f74252ab078d' }} 
                  style={styles.transferIconImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.transferArrows}>
                <Text style={styles.transferArrowText}>{'>>>>'}</Text>
              </View>
              <View style={styles.transferIcon}>
                <Image 
                  source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fkast-logo.png?alt=media&token=e338e812-0bb1-4725-b6ef-2a59b2bd696f' }} 
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
              <PhosphorIcon 
                name="ChevronLeft" 
                size={24}
                color={colors.white}
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
              <PhosphorIcon
                name="Copy"
                size={20}
                color={colors.white}
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

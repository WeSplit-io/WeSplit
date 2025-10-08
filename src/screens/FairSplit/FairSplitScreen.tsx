/**
 * Fair Split Screen
 * Allows users to configure and manage fair bill splitting with equal or manual options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './styles';
import { SplitWalletService, SplitWallet } from '../../services/splitWalletService';
import { NotificationService } from '../../services/notificationService';
import { priceManagementService } from '../../services/priceManagementService';
import { FallbackDataService } from '../../utils/fallbackDataService';
import { MockupDataService } from '../../data/mockupData';
import { useApp } from '../../context/AppContext';
import { SplitWalletMigrationService } from '../../services/splitWalletMigrationService';
import { PriceManagerDebugger } from '../../utils/priceManagerDebugger';

interface Participant {
  id: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountLocked: number;
  status: 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined';
}

interface FairSplitScreenProps {
  navigation: any;
  route: any;
}

const FairSplitScreen: React.FC<FairSplitScreenProps> = ({ navigation, route }) => {
  const { billData, processedBillData, splitWallet: existingSplitWallet, splitData } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  // Debug route params
  console.log('🔍 FairSplitScreen: Route params received:', {
    hasBillData: !!billData,
    hasProcessedBillData: !!processedBillData,
    hasExistingSplitWallet: !!existingSplitWallet,
    hasSplitData: !!splitData,
    routeParamsKeys: Object.keys(route.params || {}),
    existingSplitWallet: existingSplitWallet ? {
      id: existingSplitWallet.id,
      totalAmount: existingSplitWallet.totalAmount,
      participants: existingSplitWallet.participants?.length || 0
    } : 'No existing split wallet'
  });
  
  // Debug: Log the current user data
  console.log('🔍 FairSplitScreen: Current user from context:', {
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
  
  console.log('FairSplitScreen received billData:', billData);
  console.log('🔍 FairSplitScreen: Received existing split wallet:', existingSplitWallet ? {
    id: existingSplitWallet.id,
    walletAddress: existingSplitWallet.walletAddress,
    participants: existingSplitWallet.participants?.length || 0
  } : 'No existing wallet');
  
  console.log('🔍 FairSplitScreen: Route params:', {
    hasBillData: !!billData,
    hasProcessedBillData: !!processedBillData,
    hasExistingSplitWallet: !!existingSplitWallet,
    hasSplitData: !!splitData,
    routeParamsKeys: Object.keys(route.params || {})
  });
  
  const [splitMethod, setSplitMethod] = useState<'equal' | 'manual'>('equal');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>((existingSplitWallet as SplitWallet) || null);
  const [isSplitConfirmed, setIsSplitConfirmed] = useState(false); // Track if split has been confirmed
  const [isSendingPayment, setIsSendingPayment] = useState(false); // Track if user is sending payment
  
  // Helper function to check if current user is the creator
  const isCurrentUserCreator = () => {
    if (!currentUser || !splitData) return false;
    return splitData.creatorId === currentUser.id.toString();
  };

  // Initialize split confirmation status
  useEffect(() => {
    if (splitData) {
      // Check if split is already confirmed (status is 'active' and has splitType)
      const isConfirmed = splitData.status === 'active' && splitData.splitType === 'fair';
      setIsSplitConfirmed(isConfirmed);
      console.log('🔍 FairSplitScreen: Split confirmation status:', {
        splitId: splitData.id,
        status: splitData.status,
        splitType: splitData.splitType,
        isConfirmed
      });
    }
  }, [splitData]);
  
  // Debug splitWallet initialization
  console.log('🔍 FairSplitScreen: splitWallet state initialized:', {
    hasExistingSplitWallet: !!existingSplitWallet,
    splitWalletState: splitWallet ? {
      id: splitWallet.id,
      totalAmount: splitWallet.totalAmount,
      participants: splitWallet.participants?.length || 0
    } : 'null'
  });
  
  // Initialize participants from route params or use current user as creator
  const [participants, setParticipants] = useState<Participant[]>(() => {
    console.log('🔍 FairSplitScreen: Initializing participants with currentUser:', {
      currentUser: currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        wallet_address: currentUser.wallet_address,
        email: currentUser.email
      } : null,
      billDataParticipants: billData?.participants,
      processedBillDataParticipants: processedBillData?.participants
    });

    // Priority: processedBillData.participants > billData.participants > current user only
    let sourceParticipants = null;
    if (processedBillData?.participants && processedBillData.participants.length > 0) {
      sourceParticipants = processedBillData.participants;
      console.log('🔍 FairSplitScreen: Using participants from processedBillData');
    } else if (billData?.participants && billData.participants.length > 0) {
      sourceParticipants = billData.participants;
      console.log('🔍 FairSplitScreen: Using participants from billData');
    }

    if (sourceParticipants) {
      // Convert BillParticipant to FairSplitScreen Participant format
      const mappedParticipants = sourceParticipants.map((p: any, index: number) => {
        // If this participant is the current user, use real data
        if (currentUser && (p.name === 'You' || p.id === currentUser.id.toString())) {
          return {
            id: currentUser.id.toString(),
            name: currentUser.name,
            walletAddress: currentUser.wallet_address || 'No wallet address',
            amountOwed: p.amountOwed || 0, // Use existing amountOwed if available
            amountLocked: 0, // Start with no locked amounts
            status: (p.status === 'accepted' ? 'accepted' : 'pending') as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
          };
        }
        
        // For other participants, use the provided data
        return {
          id: p.id || `participant_${index}`,
          name: p.name || `Participant ${index + 1}`,
          walletAddress: p.walletAddress || p.wallet_address || 'Unknown wallet',
          amountOwed: p.amountOwed || 0, // Use existing amountOwed if available
          amountLocked: 0, // Start with no locked amounts
          status: (p.status === 'accepted' ? 'accepted' : 'pending') as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
        };
      });
      
      console.log('🔍 FairSplitScreen: Mapped participants:', mappedParticipants);
      return mappedParticipants;
    }
    
    // If no participants provided, start with just the current user as creator
    if (currentUser) {
      const currentUserParticipant = {
        id: currentUser.id.toString(),
        name: currentUser.name,
        walletAddress: currentUser.wallet_address || 'No wallet address',
        amountOwed: 0, // Will be calculated
        amountLocked: 0,
        status: 'accepted' as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
      };
      
      console.log('🔍 FairSplitScreen: Created current user participant:', currentUserParticipant);
      return [currentUserParticipant];
    }
    
    // Fallback if no current user
    console.log('🔍 FairSplitScreen: No current user, returning empty participants');
    return [];
  });

  // Get the authoritative price from centralized price management
  // Use consistent bill ID format that matches SplitDetailsScreen
  const billId = processedBillData?.id || splitData?.billId || `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const authoritativePrice = priceManagementService.getBillPrice(billId);
  
  if (__DEV__) {
    console.log('💰 FairSplitScreen: Authoritative price:', {
      billId,
      amount: authoritativePrice?.amount,
      source: authoritativePrice?.source
    });
  }
  
  // Always use unified mockup data for consistency - ignore route params
  const totalAmount = MockupDataService.getBillAmount();
  
  // Set authoritative price when component loads
  useEffect(() => {
    const setAuthoritativePrice = () => {
      const unifiedAmount = MockupDataService.getBillAmount();
      
      // Force set the authoritative price for this bill (overrides any existing)
      priceManagementService.forceSetBillPrice(
        billId,
        unifiedAmount,
        'USDC'
      );
      
      if (__DEV__) {
        console.log('💰 FairSplitScreen: Set authoritative price:', {
          billId,
          totalAmount: unifiedAmount
        });
      }
      
      // Debug price management after setting
      PriceManagerDebugger.debugPriceManagement(billId);
      
      // Debug split wallet data if available
      if (existingSplitWallet) {
        PriceManagerDebugger.debugSplitWalletData(existingSplitWallet);
        
        if (__DEV__) {
          console.log('🔍 FairSplitScreen: Split wallet data:', {
            id: existingSplitWallet.id,
            totalAmount: existingSplitWallet.totalAmount,
            participants: existingSplitWallet.participants?.length || 0
          });
        }
      }
      
      // Check if existing split wallet needs migration
      if (existingSplitWallet && SplitWalletMigrationService.needsMigration(existingSplitWallet)) {
        const migrationRecommendations = SplitWalletMigrationService.getMigrationRecommendations(existingSplitWallet);
        
        if (__DEV__) {
          console.warn('⚠️ FairSplitScreen: Split wallet needs migration:', {
            walletAmount: existingSplitWallet.totalAmount,
            expectedAmount: unifiedAmount,
            walletId: existingSplitWallet.id
          });
        }
        
        // Attempt to migrate the wallet
        SplitWalletMigrationService.migrateSplitWallet(existingSplitWallet)
          .then(result => {
            if (result.success && result.migrated) {
              if (__DEV__) {
                console.log('✅ FairSplitScreen: Split wallet migrated successfully');
              }
              
              // Reload the split wallet data to get the updated amount
              loadSplitWalletData();
            } else if (result.success && !result.migrated) {
              if (__DEV__) {
                console.log('ℹ️ FairSplitScreen: Split wallet migration not needed');
              }
            } else {
              console.error('❌ FairSplitScreen: Split wallet migration failed:', result.error);
            }
          })
          .catch(error => {
            console.error('❌ FairSplitScreen: Error during split wallet migration:', error);
          });
      }
    };
    
    setAuthoritativePrice();
  }, [billId, existingSplitWallet]);
  
  // Debug bill amount consistency
  if (typeof window !== 'undefined') {
    const { PriceDebugger } = require('../../utils/priceDebugger');
    PriceDebugger.debugBillAmounts(billId, {
      processedBillData,
      billData,
      routeParams: { totalAmount },
      splitWallet: existingSplitWallet
    });
  }
  
  // Validate price consistency
  if (authoritativePrice) {
    const billDataAmount = billData?.totalAmount || 0;
    const processedAmount = processedBillData?.totalAmount || 0;
    
    if (billDataAmount > 0) {
      const validation = priceManagementService.validatePriceConsistency(billId, billDataAmount, 'billData');
      if (!validation.isValid) {
        console.warn('🔍 FairSplitScreen: Price inconsistency with billData:', validation.message);
      }
    }
    
    if (processedAmount > 0) {
      const validation = priceManagementService.validatePriceConsistency(billId, processedAmount, 'processedBillData');
      if (!validation.isValid) {
        console.warn('🔍 FairSplitScreen: Price inconsistency with processedBillData:', validation.message);
      }
    }
  }
  
  if (__DEV__) {
    console.log('🔍 FairSplitScreen: Total amount calculation:', {
      billId,
      finalTotalAmount: totalAmount,
      authoritativePrice: authoritativePrice?.amount
    });
  }
  const totalLocked = participants.reduce((sum, p) => sum + p.amountLocked, 0);
  const progressPercentage = Math.round((totalLocked / totalAmount) * 100);
  
  // State for completion tracking
  const [completionData, setCompletionData] = useState<{
    completionPercentage: number;
    totalAmount: number;
    collectedAmount: number;
    remainingAmount: number;
    participantsPaid: number;
    totalParticipants: number;
  } | null>(null);
  const [isLoadingCompletionData, setIsLoadingCompletionData] = useState(false);

  // Calculate amounts when split method or total amount changes
  useEffect(() => {
    if (splitMethod === 'equal' && participants.length > 0) {
      // Use centralized price management for consistent calculations
      const splitData = priceManagementService.calculateSplitAmounts(billId, participants.length, 'equal');
      const amountPerPerson = splitData?.amountPerParticipant || (totalAmount / participants.length);
      
      if (__DEV__) {
        console.log('🔍 FairSplitScreen: Calculating equal split amounts:', {
          billId,
          totalAmount,
          participantsCount: participants.length,
          amountPerPerson
        });
      }
      
      // Only update if the amount actually changed to prevent infinite loops
      setParticipants(prev => {
        const needsUpdate = prev.some(p => Math.abs(p.amountOwed - amountPerPerson) > 0.01);
        if (!needsUpdate) return prev;
        
        return prev.map(p => ({ ...p, amountOwed: amountPerPerson }));
      });
    }
  }, [splitMethod, totalAmount, billId, participants.length]); // Added participants.length to prevent stale closures

  // Load completion data when split wallet is available
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 FairSplitScreen: useEffect triggered, splitWallet:', {
        hasSplitWallet: !!splitWallet,
        splitWalletId: splitWallet?.id
      });
    }
    
    if (splitWallet?.id) {
      if (__DEV__) {
        console.log('🔍 FairSplitScreen: Loading completion data for split wallet:', splitWallet.id);
      }
      loadCompletionData();
      checkAndRepairData();
      checkPaymentCompletion();
      
      // Set up periodic payment completion check
      const interval = setInterval(checkPaymentCompletion, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [splitWallet?.id]);

  // Check if all participants have paid their shares
  const checkPaymentCompletion = async () => {
    if (!splitWallet?.id) return;

    try {
      const result = await SplitWalletService.getSplitWallet(splitWallet.id);
      if (!result.success || !result.wallet) return;

      const wallet = result.wallet;
      const allParticipantsPaid = wallet.participants.every(p => p.status === 'paid');

      if (allParticipantsPaid && wallet.participants.length > 0) {
        // Get merchant address if available
        const merchantAddress = processedBillData?.merchant?.address || billData?.merchant?.address;
        
        // Complete the split and send funds to merchant
        const completionResult = await SplitWalletService.completeSplitWallet(
          splitWallet.id,
          merchantAddress
        );

        if (completionResult.success) {
          // Send completion notifications
          const { NotificationService } = await import('../../services/notificationService');
          await NotificationService.sendBulkNotifications(
            wallet.participants.map(p => p.userId),
            'split_payment_required', // Use existing notification type
            {
              splitWalletId: splitWallet.id,
              billName: MockupDataService.getBillName(), // Use unified mockup data
            }
          );

          // Show completion alert
          Alert.alert(
            'Split Complete! 🎉',
            merchantAddress 
              ? `All participants have paid their shares. The total amount of ${wallet.totalAmount} USDC has been sent to the merchant.`
              : 'All participants have paid their shares. The split is now complete!',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('SplitsList'),
              },
            ]
          );
        } else {
          console.error('Failed to complete split:', completionResult.error);
          Alert.alert(
            'Split Complete (Partial)',
            'All participants have paid their shares, but there was an issue sending funds to the merchant. Please contact support.',
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

  const checkAndRepairData = async () => {
    if (!splitWallet?.id) return;
    
    try {
      console.log('🔧 FairSplitScreen: Checking for data corruption...');
      const repairResult = await SplitWalletService.repairSplitWalletData(splitWallet.id);
      
      if (repairResult.success && repairResult.repaired) {
        console.log('🔧 FairSplitScreen: Data corruption detected and repaired');
        Alert.alert(
          'Data Repaired',
          'We detected and fixed a data issue with your split. You can now proceed with payment.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reload the split wallet data
                loadSplitWalletData();
              }
            }
          ]
        );
      } else if (repairResult.success && !repairResult.repaired) {
        console.log('🔧 FairSplitScreen: No data corruption found');
      } else {
        console.error('🔧 FairSplitScreen: Data repair failed:', repairResult.error);
      }
    } catch (error) {
      console.error('🔧 FairSplitScreen: Error checking data corruption:', error);
    }
  };

  const loadSplitWalletData = async () => {
    if (!splitWallet?.id) return;
    
    try {
      const result = await SplitWalletService.getSplitWallet(splitWallet.id);
      if (result.success && result.wallet) {
        setSplitWallet(result.wallet);
        loadCompletionData();
      }
    } catch (error) {
      console.error('Failed to reload split wallet data:', error);
    }
  };

  const loadCompletionData = async () => {
    if (!splitWallet?.id) return;
    
    setIsLoadingCompletionData(true);
    try {
      console.log('🔍 FairSplitScreen: Loading completion data for wallet:', splitWallet.id);
      const result = await SplitWalletService.getSplitWalletCompletion(splitWallet.id);
      console.log('🔍 FairSplitScreen: Completion data result:', result);
      
      if (result.success) {
        const newCompletionData = {
          completionPercentage: result.completionPercentage || 0,
          totalAmount: result.totalAmount || 0,
          collectedAmount: result.collectedAmount || 0,
          remainingAmount: result.remainingAmount || 0,
          participantsPaid: result.participantsPaid || 0,
          totalParticipants: result.totalParticipants || 0,
        };
        console.log('🔍 FairSplitScreen: Setting completion data:', newCompletionData);
        setCompletionData(newCompletionData);
      } else {
        console.error('❌ FairSplitScreen: Failed to load completion data:', result.error);
        // Set default completion data on error
        setCompletionData({
          completionPercentage: 0,
          totalAmount: totalAmount,
          collectedAmount: 0,
          remainingAmount: totalAmount,
          participantsPaid: 0,
          totalParticipants: participants.length,
        });
      }
    } catch (error) {
      console.error('❌ FairSplitScreen: Error loading completion data:', error);
      // Set default completion data on error
      setCompletionData({
        completionPercentage: 0,
        totalAmount: totalAmount,
        collectedAmount: 0,
        remainingAmount: totalAmount,
        participantsPaid: 0,
        totalParticipants: participants.length,
      });
    } finally {
      setIsLoadingCompletionData(false);
    }
  };

  const handleSplitMethodChange = (method: 'equal' | 'manual') => {
    setSplitMethod(method);
  };

  const handleAmountChange = (participantId: string, amount: string) => {
    const newAmount = parseFloat(amount) || 0;
    setParticipants(prev =>
      prev.map(p => 
        p.id === participantId 
          ? { ...p, amountOwed: newAmount }
          : p
      )
    );
  };

  const handleCreateSplitWallet = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Check if we already have a split wallet
    if (splitWallet) {
      if (__DEV__) {
        console.log('🔍 FairSplitScreen: Split wallet already exists:', splitWallet.id);
      }
      Alert.alert(
        'Split Wallet Ready!',
        'Your split wallet is already created. Participants can now send their payments.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Send notifications to participants
              sendPaymentNotifications(splitWallet);
            },
          },
        ]
      );
      return;
    }

    // Ensure amounts are calculated before creating wallet
    let participantsWithAmounts = [...participants];
    if (splitMethod === 'equal' && participants.length > 0) {
      const amountPerPerson = totalAmount / participants.length;
      participantsWithAmounts = participants.map(p => ({ ...p, amountOwed: amountPerPerson }));
      setParticipants(participantsWithAmounts);
    }

    if (__DEV__) {
      console.log('🔍 FairSplitScreen: Creating split wallet with participants:', {
        currentUser: {
          id: currentUser.id,
          name: currentUser.name
        },
        participants: participantsWithAmounts.length,
        totalAmount
      });
    }

    // Use existing split wallet - wallet should already be created during bill processing
    if (!splitWallet) {
      if (__DEV__) {
        console.error('🔍 FairSplitScreen: No existing wallet found! Wallet should have been created during bill processing.');
      }
      Alert.alert('Error', 'No split wallet found. Please go back and create the split again.');
      return;
    }

    setIsCreatingWallet(true);

    try {
      const wallet = splitWallet as SplitWallet; // Type assertion since we've already checked for existence
      
      if (__DEV__) {
        console.log('🔍 FairSplitScreen: Using existing split wallet:', {
          walletId: wallet.id,
          participants: wallet.participants?.length || 0
        });
      }

        // Set the authoritative price in the price management service
        if (wallet) {
          const walletBillId = wallet.billId;
          const unifiedAmount = MockupDataService.getBillAmount();
          
          if (__DEV__) {
            console.log('💰 FairSplitScreen: Setting authoritative price:', {
              billId: walletBillId,
              totalAmount: unifiedAmount
            });
          }
          
          priceManagementService.setBillPrice(
            walletBillId,
            unifiedAmount, // Use unified mockup data amount
            'USDC'
          );
        }
      Alert.alert(
        'Split Wallet Ready!',
        'Your split wallet is ready. Participants can now send their payments.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Send notifications to participants
              sendPaymentNotifications(wallet);
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error creating split wallet:', error);
      Alert.alert('Error', 'Failed to create split wallet. Please try again.');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const sendPaymentNotifications = async (wallet: SplitWallet) => {
    const participantIds = wallet.participants.map(p => p.userId);
    const billName = MockupDataService.getBillName(); // Use unified mockup data

    await NotificationService.sendBulkNotifications(
      participantIds,
      'split_payment_required',
      {
        splitWalletId: wallet.id,
        billName,
        amount: totalAmount / participants.length, // Equal split amount
      }
    );
  };

  const handlePayMyShare = () => {
    if (!splitWallet || !currentUser?.id) {
      Alert.alert('Error', 'Split wallet not created yet');
      return;
    }

    console.log('🔍 FairSplitScreen: handlePayMyShare - Checking participant lookup:', {
      currentUserId: currentUser.id.toString(),
      splitWalletParticipants: splitWallet.participants,
      splitWalletId: splitWallet.id
    });

    const participant = splitWallet.participants.find(p => p.userId === currentUser.id.toString());
    if (!participant) {
      console.log('🔍 FairSplitScreen: Participant not found in splitWallet, checking local participants:', {
        localParticipants: participants,
        currentUserId: currentUser.id.toString()
      });
      
      // Fallback: check if user exists in local participants
      const localParticipant = participants.find(p => p.id === currentUser.id.toString());
      if (!localParticipant) {
        Alert.alert('Error', 'You are not a participant in this split');
        return;
      }
      
      console.log('🔍 FairSplitScreen: Using local participant data for navigation');
    } else {
      // Check if participant data looks incorrect (amountOwed = 0, amountPaid > 0)
      if (participant.amountOwed === 0 && participant.amountPaid > 0) {
        console.log('🔍 FairSplitScreen: Detected incorrect participant data, showing warning:', {
          participant,
          expectedAmountOwed: totalAmount / participants.length
        });
        
        Alert.alert(
          'Data Issue Detected',
          'There seems to be an issue with your payment data. The system shows you have already paid, but the amount owed is incorrect. Please contact support or try creating a new split.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue Anyway', 
              onPress: () => {
                // Navigate to payment screen anyway
                navigation.navigate('SplitPayment', {
                  splitWalletId: splitWallet.id,
                  billName: MockupDataService.getBillName(), // Use unified mockup data
                  totalAmount: totalAmount,
                });
              }
            }
          ]
        );
        return;
      }
    }

    // Navigate to payment screen
    navigation.navigate('SplitPayment', {
      splitWalletId: splitWallet.id,
      billName: processedBillData?.title || billData?.title || 'Restaurant Night',
      totalAmount: totalAmount,
    });
  };

  // Phase 1: Creator confirms the split repartition
  const handleConfirmSplit = async () => {
    if (!splitWallet) {
      Alert.alert('Error', 'Please create the split wallet first');
      return;
    }

    if (!isCurrentUserCreator()) {
      Alert.alert('Error', 'Only the split creator can confirm the repartition');
      return;
    }

    // Validate that all participants have amounts assigned
    const hasInvalidAmounts = participants.some(p => !p.amountOwed || p.amountOwed <= 0);
    if (hasInvalidAmounts) {
      Alert.alert('Error', 'All participants must have valid amounts assigned');
      return;
    }

    // Validate that total amounts match the bill total
    const totalAssigned = participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
    if (Math.abs(totalAssigned - totalAmount) > 0.01) { // Allow small rounding differences
      Alert.alert('Error', `Total assigned amounts (${totalAssigned.toFixed(2)}) must equal bill total (${totalAmount.toFixed(2)})`);
      return;
    }

    try {
      setIsCreatingWallet(true);
      
      // Update the split in the database with the confirmed repartition
      const { SplitStorageService } = await import('../../services/splitStorageService');
      const updateResult = await SplitStorageService.updateSplit(splitData!.id, {
        status: 'active',
        participants: participants.map(p => ({
          userId: p.id,
          name: p.name,
          email: '', // Email not available in Participant type
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
          amountPaid: 0,
          status: 'accepted' as const,
        })),
        splitType: 'fair',
      });

      if (updateResult.success) {
        setIsSplitConfirmed(true);
        Alert.alert(
          'Split Confirmed!',
          'The repartition has been locked. Participants can now send their payments.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', updateResult.error || 'Failed to confirm split');
      }
    } catch (error) {
      console.error('Error confirming split:', error);
      Alert.alert('Error', 'Failed to confirm split');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Phase 2: User sends their payment
  const handleSendMyShares = async () => {
    if (!splitWallet || !currentUser) {
      Alert.alert('Error', 'Unable to process payment');
      return;
    }

    const userParticipant = participants.find(p => p.id === currentUser.id.toString());
    if (!userParticipant) {
      Alert.alert('Error', 'You are not a participant in this split');
      return;
    }

    if (!userParticipant.amountOwed || userParticipant.amountOwed <= 0) {
      Alert.alert('Error', 'No amount to pay');
      return;
    }

    try {
      setIsSendingPayment(true);
      
      // Navigate to payment screen with user's specific amount
      navigation.navigate('PaymentConfirmation', {
        billData,
        participants: [userParticipant], // Only show current user's payment
        totalAmount: userParticipant.amountOwed,
        totalLocked: 0,
        splitWallet,
        isIndividualPayment: true,
      });
    } catch (error) {
      console.error('Error initiating payment:', error);
      Alert.alert('Error', 'Failed to initiate payment');
    } finally {
      setIsSendingPayment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'locked':
      case 'confirmed':
        return colors.green;
      case 'accepted':
        return colors.info;
      case 'pending':
        return colors.textSecondary;
      case 'declined':
        return colors.red;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'locked':
        return 'Locked';
      case 'confirmed':
        return 'Confirmed';
      case 'accepted':
        return 'Accepted';
      case 'pending':
        return 'Pending';
      case 'declined':
        return 'Declined';
      default:
        return 'Pending';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Fair Split</Text>
        
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Summary Card */}
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billIcon}>🍽️</Text>
              <Text style={styles.billTitle}>
                {billData?.title || processedBillData?.title || 'Restaurant Bill'}
              </Text>
            </View>
            <Text style={styles.billDate}>
              {billData?.date || processedBillData?.date || new Date().toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <Text style={styles.billAmountUSDC}>
              {totalAmount.toFixed(1)} USDC
            </Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>
                {completionData?.completionPercentage || 0}%
              </Text>
              <Text style={styles.progressAmount}>
                {completionData?.collectedAmount?.toFixed(1) || 0} USDC
              </Text>
              <Text style={styles.progressLabel}>
                {isSplitConfirmed ? 'Paid' : 'Locked'}
              </Text>
            </View>
          </View>
        </View>

        {/* Split Method Selection - Only for creator before confirmation */}
        {!isSplitConfirmed && isCurrentUserCreator() && (
          <View style={styles.splitMethodContainer}>
            <Text style={styles.splitMethodLabel}>Split between:</Text>
            <View style={styles.splitMethodOptions}>
              <TouchableOpacity
                style={[
                  styles.splitMethodOption,
                  splitMethod === 'equal' && styles.splitMethodOptionActive
                ]}
                onPress={() => handleSplitMethodChange('equal')}
              >
                <Text style={[
                  styles.splitMethodOptionText,
                  splitMethod === 'equal' && styles.splitMethodOptionTextActive
                ]}>
                  Equal
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.splitMethodOption,
                  splitMethod === 'manual' && styles.splitMethodOptionActive
                ]}
                onPress={() => handleSplitMethodChange('manual')}
              >
                <Text style={[
                  styles.splitMethodOptionText,
                  splitMethod === 'manual' && styles.splitMethodOptionTextActive
                ]}>
                  Manual
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Show current split method if confirmed */}
        {isSplitConfirmed && (
          <View style={styles.splitMethodContainer}>
            <Text style={styles.splitMethodLabel}>Split method:</Text>
            <View style={styles.splitMethodOptions}>
              <View style={[styles.splitMethodOption, styles.splitMethodOptionActive]}>
                <Text style={[styles.splitMethodOptionText, styles.splitMethodOptionTextActive]}>
                  {splitMethod === 'equal' ? 'Equal' : 'Manual'} (Locked)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Participants List */}
        <View style={styles.participantsContainer}>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantCard}>
              <View style={styles.participantAvatar}>
                <Text style={styles.participantAvatarText}>
                  {participant.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantWallet}>
                  {participant.walletAddress.length > 10 
                    ? `${participant.walletAddress.slice(0, 4)}...${participant.walletAddress.slice(-4)}`
                    : participant.walletAddress
                  }
                </Text>
              </View>
              <View style={styles.participantAmountContainer}>
                <Text style={styles.participantAmount}>
                  ${participant.amountOwed.toFixed(3)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomContainer}>
        {!splitWallet ? (
          <TouchableOpacity 
            style={styles.createWalletButton} 
            onPress={handleCreateSplitWallet}
            disabled={isCreatingWallet}
          >
            {isCreatingWallet ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.createWalletButtonText}>
                Create Split Wallet
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButtonsContainer}>
            {!isSplitConfirmed ? (
              // Phase 1: Creator can confirm split repartition
              isCurrentUserCreator() ? (
                <TouchableOpacity 
                  style={[
                    styles.confirmButton,
                    isCreatingWallet && styles.confirmButtonDisabled
                  ]} 
                  onPress={handleConfirmSplit}
                  disabled={isCreatingWallet}
                >
                  <Text style={[
                    styles.confirmButtonText,
                    isCreatingWallet && styles.confirmButtonTextDisabled
                  ]}>
                    {isCreatingWallet ? 'Confirming...' : 'Confirm Split'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.waitingContainer}>
                  <Text style={styles.waitingText}>
                    Waiting for creator to confirm the split repartition...
                  </Text>
                </View>
              )
            ) : (
              // Phase 2: Users can send their payments
              <TouchableOpacity 
                style={[
                  styles.payButton,
                  isSendingPayment && styles.payButtonDisabled
                ]} 
                onPress={handleSendMyShares}
                disabled={isSendingPayment}
              >
                <Text style={[
                  styles.payButtonText,
                  isSendingPayment && styles.payButtonTextDisabled
                ]}>
                  {isSendingPayment ? 'Sending...' : 'Send My Shares'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};


export default FairSplitScreen;



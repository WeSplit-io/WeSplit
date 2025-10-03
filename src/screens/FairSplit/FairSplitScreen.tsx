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
  
  console.log('💰 FairSplitScreen: Looking for authoritative price:', {
    billId,
    processedBillDataId: processedBillData?.id,
    splitDataBillId: splitData?.billId,
    authoritativePrice: authoritativePrice ? {
      amount: authoritativePrice.amount,
      currency: authoritativePrice.currency,
      source: authoritativePrice.source
    } : null
  });
  
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
      
      console.log('💰 FairSplitScreen: Set authoritative price with unified data:', {
        billId,
        totalAmount: unifiedAmount,
        currency: 'USDC'
      });
      
      // Debug price management after setting
      PriceManagerDebugger.debugPriceManagement(billId);
      
      // Debug split wallet data if available
      if (existingSplitWallet) {
        PriceManagerDebugger.debugSplitWalletData(existingSplitWallet);
        
        // Additional debug: Log the actual split wallet data from database
        console.log('🔍 FairSplitScreen: Raw split wallet data from database:', {
          id: existingSplitWallet.id,
          totalAmount: existingSplitWallet.totalAmount,
          currency: existingSplitWallet.currency,
          participants: existingSplitWallet.participants?.map((p: any) => ({
            userId: p.userId,
            amountOwed: p.amountOwed,
            amountPaid: p.amountPaid,
            status: p.status
          })) || []
        });
      }
      
      // Check if existing split wallet needs migration
      if (existingSplitWallet && SplitWalletMigrationService.needsMigration(existingSplitWallet)) {
        const migrationRecommendations = SplitWalletMigrationService.getMigrationRecommendations(existingSplitWallet);
        
        console.warn('⚠️ FairSplitScreen: Existing split wallet needs migration:', {
          walletAmount: existingSplitWallet.totalAmount,
          expectedAmount: unifiedAmount,
          walletId: existingSplitWallet.id,
          recommendation: migrationRecommendations.recommendation
        });
        
        // Attempt to migrate the wallet
        SplitWalletMigrationService.migrateSplitWallet(existingSplitWallet)
          .then(result => {
            if (result.success && result.migrated) {
              console.log('✅ FairSplitScreen: Split wallet migrated successfully:', {
                walletId: result.walletId,
                oldAmount: result.oldAmount,
                newAmount: result.newAmount
              });
              
              // Reload the split wallet data to get the updated amount
              loadSplitWalletData();
            } else if (result.success && !result.migrated) {
              console.log('ℹ️ FairSplitScreen: Split wallet migration not needed:', {
                walletId: result.walletId,
                amount: result.newAmount
              });
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
  
  // Debug: Log the amount calculation
  console.log('🔍 FairSplitScreen: Total amount calculation:', {
    billId,
    authoritativePrice: authoritativePrice ? {
      amount: authoritativePrice.amount,
      currency: authoritativePrice.currency,
      source: authoritativePrice.source
    } : null,
    processedBillDataTotalAmount: processedBillData?.totalAmount,
    billDataTotalAmount: billData?.totalAmount,
    finalTotalAmount: totalAmount,
    processedBillData: processedBillData ? {
      title: processedBillData.title,
      totalAmount: processedBillData.totalAmount,
      participants: processedBillData.participants?.length || 0
    } : null,
    billData: billData ? {
      title: billData.title,
      totalAmount: billData.totalAmount,
      participants: billData.participants?.length || 0
    } : null
  });
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
      
      console.log('🔍 FairSplitScreen: Calculating equal split amounts:', {
        billId,
        totalAmount,
        participantsCount: participants.length,
        amountPerPerson,
        splitMethod,
        splitData: splitData ? {
          totalAmount: splitData.totalAmount,
          amountPerParticipant: splitData.amountPerParticipant,
          source: splitData.source
        } : null
      });
      
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
    console.log('🔍 FairSplitScreen: useEffect triggered, splitWallet:', {
      hasSplitWallet: !!splitWallet,
      splitWalletId: splitWallet?.id,
      splitWalletTotalAmount: splitWallet?.totalAmount
    });
    
    if (splitWallet?.id) {
      console.log('🔍 FairSplitScreen: Loading completion data for split wallet:', splitWallet.id);
      loadCompletionData();
      checkAndRepairData();
      checkPaymentCompletion();
      
      // Set up periodic payment completion check
      const interval = setInterval(checkPaymentCompletion, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    } else {
      console.log('🔍 FairSplitScreen: No split wallet available, skipping completion data load');
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
      console.log('🔍 FairSplitScreen: Split wallet already exists, using existing wallet:', splitWallet.id);
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

    console.log('🔍 FairSplitScreen: Creating split wallet with participants:', {
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        wallet_address: currentUser.wallet_address
      },
      participants: participantsWithAmounts.map(p => ({
        id: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        amountOwed: p.amountOwed
      })),
      totalAmount
    });

    setIsCreatingWallet(true);

    try {
      const billId = processedBillData?.id || splitData?.billId || `split_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const mappedParticipants = participantsWithAmounts.map(p => ({
        userId: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        amountOwed: p.amountOwed,
      }));
      
      console.log('🔍 FairSplitScreen: Creating split wallet with participants:', {
        billId,
        creatorId: currentUser.id.toString(),
        totalAmount,
        participants: mappedParticipants,
        originalParticipants: participantsWithAmounts
      });
      
      const splitWalletResult = await SplitWalletService.createSplitWallet(
        billId,
        currentUser.id.toString(),
        MockupDataService.getBillAmount(), // Use unified mockup data
        'USDC',
        mappedParticipants
      );

      if (!splitWalletResult.success) {
        Alert.alert('Error', splitWalletResult.error || 'Failed to create split wallet');
        setIsCreatingWallet(false);
        return;
      }

        console.log('🔍 FairSplitScreen: Split wallet created successfully:', {
          wallet: splitWalletResult.wallet,
          participants: splitWalletResult.wallet?.participants
        });

        // Set the authoritative price in the price management service
        if (splitWalletResult.wallet) {
          const walletBillId = splitWalletResult.wallet.billId;
          const unifiedAmount = MockupDataService.getBillAmount();
          
          console.log('💰 FairSplitScreen: Setting authoritative price with unified data:', {
            billId: walletBillId,
            totalAmount: unifiedAmount,
            currency: 'USDC'
          });
          
          priceManagementService.setBillPrice(
            walletBillId,
            unifiedAmount, // Use unified mockup data amount
            'USDC'
          );
        }

        setSplitWallet(splitWalletResult.wallet || null);
      Alert.alert(
        'Split Wallet Created!',
        'Your split wallet has been created. Participants can now send their payments.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Send notifications to participants
              sendPaymentNotifications(splitWalletResult.wallet!);
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

  const handleConfirmSplit = () => {
    if (!splitWallet) {
      Alert.alert('Error', 'Please create the split wallet first');
      return;
    }

    if (totalLocked < totalAmount) {
      Alert.alert(
        'Incomplete Payment',
        `Only ${progressPercentage}% of the bill has been locked. Please wait for all participants to send their payments.`
      );
      return;
    }

    // Navigate to payment confirmation screen
    navigation.navigate('PaymentConfirmation', {
      billData,
      participants,
      totalAmount,
      totalLocked,
      splitWallet,
    });
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
              <Text style={styles.billIcon}>🧾</Text>
              <Text style={styles.billTitle}>
                {MockupDataService.getBillName()}
              </Text>
            </View>
            <Text style={styles.billDate}>
              {(() => {
                try {
                  const date = FallbackDataService.generateBillDate(processedBillData, billData, true);
                  console.log('🔍 FairSplitScreen: Generated date:', date);
                  return date;
                } catch (error) {
                  console.error('🔍 FairSplitScreen: Error generating date:', error);
                  return new Date().toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                }
              })()}
            </Text>
          </View>
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <Text style={styles.billAmountUSDC}>{totalAmount} USDC</Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            {/* Only show progress fill when there's actual progress */}
            {((completionData?.completionPercentage || progressPercentage) > 0) && (
              <View style={[styles.progressFill, { 
                transform: [{ rotate: `${((completionData?.completionPercentage || progressPercentage) / 100) * 360}deg` }] 
              }]} />
            )}
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>{completionData?.completionPercentage || progressPercentage}%</Text>
              <Text style={styles.progressAmount}>{completionData?.collectedAmount || totalLocked} USDC</Text>
              <Text style={styles.progressLabel}>
                {completionData ? 'Collected' : 'Locked'}
              </Text>
              {completionData && (
                <Text style={{
                  color: colors.textSecondary,
                  fontSize: typography.fontSize.xs,
                  marginTop: spacing.xs,
                }}>
                  {completionData.participantsPaid}/{completionData.totalParticipants} paid
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Split Method Selection */}
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

        {/* Participants List */}
        <View style={styles.participantsContainer}>
          {participants.map((participant) => {
            const isCurrentUser = currentUser && participant.id === currentUser.id.toString();
            const displayName = isCurrentUser ? `${participant.name} (You)` : participant.name;
            
            // Better wallet address handling
            let shortWalletAddress = 'No wallet';
            if (participant.walletAddress && participant.walletAddress !== 'No wallet address' && participant.walletAddress !== 'Unknown wallet') {
              if (participant.walletAddress.length > 8) {
                shortWalletAddress = `${participant.walletAddress.substring(0, 4)}...${participant.walletAddress.substring(participant.walletAddress.length - 4)}`;
              } else {
                shortWalletAddress = participant.walletAddress;
              }
            }
            
            console.log('🔍 FairSplitScreen: Rendering participant:', {
              participant,
              isCurrentUser,
              displayName,
              shortWalletAddress,
              originalWalletAddress: participant.walletAddress
            });
            
            return (
              <View key={participant.id} style={styles.participantCard}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {participant.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{displayName}</Text>
                  <Text style={styles.participantWallet}>{shortWalletAddress}</Text>
                </View>
                
                <View style={styles.participantAmountContainer}>
                  {splitMethod === 'manual' ? (
                    <TextInput
                      style={styles.amountInput}
                      value={participant.amountOwed.toString()}
                      onChangeText={(text) => handleAmountChange(participant.id, text)}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  ) : (
                    <Text style={styles.participantAmount}>
                      ${participant.amountOwed.toFixed(2)}
                    </Text>
                  )}
                  <Text style={[styles.participantStatus, { color: getStatusColor(participant.status) }]}>
                    {getStatusText(participant.status)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.bottomContainer}>
        {!splitWallet ? (
          <View style={styles.testButtonsContainer}>
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
            
            <TouchableOpacity 
              style={[styles.createWalletButton, { backgroundColor: colors.buttonSecondary, marginTop: spacing.sm }]} 
              onPress={async () => {
                console.log('🧪 Testing split wallet creation...');
                const result = await SplitWalletService.testSplitWalletCreation();
                Alert.alert(
                  result.success ? 'Test Successful!' : 'Test Failed',
                  result.success ? `Wallet created with ID: ${result.walletId}` : result.error || 'Unknown error'
                );
              }}
            >
              <Text style={styles.createWalletButtonText}>
                Test Split Wallet Creation
              </Text>
            </TouchableOpacity>
            
            {splitWallet && (
              <TouchableOpacity 
                style={[styles.createWalletButton, { backgroundColor: colors.red, marginTop: spacing.sm }]} 
                onPress={async () => {
                  Alert.alert(
                    'Repair Split Data',
                    'This will detect and fix any data corruption in your split. Are you sure?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Repair',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            console.log('🔧 Manually repairing split wallet data...');
                            if (splitWallet && (splitWallet as SplitWallet).id) {
                              const result = await SplitWalletService.repairSplitWalletData((splitWallet as SplitWallet).id);
                              
                              if (result.success) {
                                if (result.repaired) {
                                  Alert.alert('Success', 'Data corruption detected and repaired. You can now pay your share.');
                                } else {
                                  Alert.alert('Info', 'No data corruption found. Your split data is already correct.');
                                }
                                
                                // Reload the split wallet data
                                await loadSplitWalletData();
                              } else {
                                Alert.alert('Error', result.error || 'Failed to repair data');
                              }
                            } else {
                              Alert.alert('Error', 'Missing wallet information');
                            }
                          } catch (error) {
                            console.error('Error repairing data:', error);
                            Alert.alert('Error', 'Failed to repair data');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.createWalletButtonText}>
                  Repair Split Data
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Debug: Show amount discrepancy warning */}
            {billData?.totalAmount && processedBillData?.totalAmount && 
             Math.abs(billData.totalAmount - processedBillData.totalAmount) > 10 && (
              <TouchableOpacity 
                style={[styles.createWalletButton, { backgroundColor: '#FF6B35', marginTop: spacing.sm }]} 
                onPress={() => {
                  Alert.alert(
                    'Amount Discrepancy Detected',
                    `Bill amount: ${billData.totalAmount} USDC\nProcessed amount: ${processedBillData.totalAmount} USDC\n\nUsing: ${totalAmount} USDC`,
                    [
                      { text: 'OK' }
                    ]
                  );
                }}
              >
                <Text style={styles.createWalletButtonText}>
                  Amount Issue: {totalAmount} USDC
                </Text>
              </TouchableOpacity>
            )}

            {/* Debug: Force migration button */}
            {splitWallet && SplitWalletMigrationService.needsMigration(splitWallet) && (
              <TouchableOpacity 
                style={[styles.createWalletButton, { backgroundColor: '#4CAF50', marginTop: spacing.sm }]} 
                onPress={async () => {
                  try {
                    const result = await SplitWalletMigrationService.migrateSplitWallet(splitWallet);
                    if (result.success && result.migrated) {
                      Alert.alert(
                        'Migration Successful',
                        `Split wallet migrated from ${result.oldAmount} to ${result.newAmount} USDC`,
                        [
                          { 
                            text: 'OK',
                            onPress: () => loadSplitWalletData()
                          }
                        ]
                      );
                    } else {
                      Alert.alert('Migration Failed', result.error || 'Unknown error');
                    }
                  } catch (error) {
                    Alert.alert('Migration Error', error instanceof Error ? error.message : 'Unknown error');
                  }
                }}
              >
                <Text style={styles.createWalletButtonText}>
                  🔧 Fix Wallet Amount: {(splitWallet as SplitWallet).totalAmount} → {MockupDataService.getBillAmount()} USDC
                </Text>
              </TouchableOpacity>
            )}

            {/* Debug: Force reset button - for when migration doesn't work */}
            {splitWallet && (
              <TouchableOpacity 
                style={[styles.createWalletButton, { backgroundColor: '#FF5722', marginTop: spacing.sm }]} 
                onPress={async () => {
                  Alert.alert(
                    'Force Reset Split Wallet',
                    `This will completely reset the split wallet to use the correct amount (${MockupDataService.getBillAmount()} USDC) and clear all payment data. This action cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Reset', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const result = await SplitWalletService.forceResetSplitWallet((splitWallet as SplitWallet).id);
                            if (result.success) {
                              Alert.alert(
                                'Reset Successful',
                                'Split wallet has been completely reset with correct amounts and cleared payment data.',
                                [
                                  { 
                                    text: 'OK',
                                    onPress: () => loadSplitWalletData()
                                  }
                                ]
                              );
                            } else {
                              Alert.alert('Reset Failed', result.error || 'Unknown error');
                            }
                          } catch (error) {
                            Alert.alert('Reset Error', error instanceof Error ? error.message : 'Unknown error');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.createWalletButtonText}>
                  🔄 Force Reset Wallet (Clear All Payments)
                </Text>
              </TouchableOpacity>
            )}

            {/* Debug: Show current split wallet data */}
            {splitWallet && (
              <TouchableOpacity 
                style={[styles.createWalletButton, { backgroundColor: '#2196F3', marginTop: spacing.sm }]} 
                onPress={() => {
                  const wallet = splitWallet as SplitWallet;
                  const walletData = {
                    id: wallet.id,
                    totalAmount: wallet.totalAmount,
                    currency: wallet.currency,
                    participants: wallet.participants?.map((p: any) => ({
                      userId: p.userId,
                      amountOwed: p.amountOwed,
                      amountPaid: p.amountPaid,
                      status: p.status
                    })) || []
                  };
                  
                  const totalPaid = wallet.participants?.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0) || 0;
                  const completionPercentage = wallet.totalAmount > 0 ? Math.round((totalPaid / wallet.totalAmount) * 100) : 0;
                  
                  Alert.alert(
                    'Current Split Wallet Data',
                    `Total Amount: ${wallet.totalAmount} ${wallet.currency}\nTotal Paid: ${totalPaid} ${wallet.currency}\nCompletion: ${completionPercentage}%\n\nParticipants:\n${wallet.participants?.map((p: any) => `• ${p.userId}: Owed ${p.amountOwed}, Paid ${p.amountPaid}, Status ${p.status}`).join('\n') || 'None'}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.createWalletButtonText}>
                  🔍 Show Current Wallet Data
                </Text>
              </TouchableOpacity>
            )}

            {/* Debug: Force refresh completion data */}
            {splitWallet && (
              <TouchableOpacity 
                style={[styles.createWalletButton, { backgroundColor: '#9C27B0', marginTop: spacing.sm }]} 
                onPress={async () => {
                  console.log('🔄 FairSplitScreen: Force refreshing completion data...');
                  await loadCompletionData();
                  await loadSplitWalletData();
                  Alert.alert('Refresh Complete', 'Completion data and split wallet data have been refreshed.');
                }}
              >
                <Text style={styles.createWalletButtonText}>
                  🔄 Force Refresh Data
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.payButton} 
              onPress={handlePayMyShare}
            >
              <Text style={styles.payButtonText}>
                Pay My Share
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.confirmButton,
                totalLocked < totalAmount && styles.confirmButtonDisabled
              ]} 
              onPress={handleConfirmSplit}
              disabled={totalLocked < totalAmount}
            >
              <Text style={[
                styles.confirmButtonText,
                totalLocked < totalAmount && styles.confirmButtonTextDisabled
              ]}>
                Confirm Split
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};


export default FairSplitScreen;



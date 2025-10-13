/**
 * Fair Split Screen
 * Allows users to configure and manage fair bill splitting with equal or manual options
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './styles';
import { SplitWalletService, SplitWallet } from '../../services/split';
import { notificationService } from '../../services/notificationService';
import { priceManagementService } from '../../services/priceManagementService';
import { useApp } from '../../context/AppContext';
import { AmountCalculationService, Participant } from '../../services/amountCalculationService';
import { DataSourceService } from '../../services/dataSourceService';
import { logger } from '../../services/loggingService';
import FairSplitHeader from './components/FairSplitHeader';
import FairSplitProgress from './components/FairSplitProgress';
import FairSplitParticipants from './components/FairSplitParticipants';

// Remove local image mapping - now handled in FairSplitHeader component

interface FairSplitScreenProps {
  navigation: any;
  route: any;
}

const FairSplitScreen: React.FC<FairSplitScreenProps> = ({ navigation, route }) => {
  const { billData, processedBillData, splitWallet: existingSplitWallet, splitData } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  const [splitMethod, setSplitMethod] = useState<'equal' | 'manual'>('equal');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>((existingSplitWallet as SplitWallet) || null);
  const [isSplitConfirmed, setIsSplitConfirmed] = useState(false); // Track if split has been confirmed
  const [isSendingPayment, setIsSendingPayment] = useState(false); // Track if user is sending payment
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null); // Track which participant is being edited
  const [editAmount, setEditAmount] = useState(''); // Track the amount being edited
  const [showEditModal, setShowEditModal] = useState(false); // Track if edit modal is shown
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Track if payment modal is shown
  const [paymentAmount, setPaymentAmount] = useState(''); // Track the payment amount
  const [isInitializing, setIsInitializing] = useState(false); // Track if initialization is in progress
  const [showSplitModal, setShowSplitModal] = useState(false); // Track if split modal is shown
  const [selectedTransferMethod, setSelectedTransferMethod] = useState<'external-wallet' | 'in-app-wallet' | null>(null);
  const [showSignatureStep, setShowSignatureStep] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  
  // Error state management
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Wallet recap modal state
  const [showWalletRecapModal, setShowWalletRecapModal] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  
  // Wallet management state
  const [externalWallets, setExternalWallets] = useState<Array<{id: string, address: string, name?: string}>>([]);
  const [inAppWallet, setInAppWallet] = useState<{address: string} | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<{id: string, address: string, type: 'external' | 'in-app', name?: string} | null>(null);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);
  
  // Helper function to check if current user is the creator
  const isCurrentUserCreator = () => {
    if (!currentUser || !splitData) return false;
    return splitData.creatorId === currentUser.id.toString();
  };

  // Wallet recap functions
  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleShowPrivateKey = async () => {
    if (splitWallet?.id && currentUser?.id) {
      try {
        const { SplitWalletService } = await import('../../services/split');
        const result = await SplitWalletService.getSplitWalletPrivateKey(splitWallet.id, currentUser.id.toString());
        if (result.success && result.privateKey) {
          setPrivateKey(result.privateKey);
          setShowPrivateKeyModal(true);
        } else {
          Alert.alert('Error', 'Could not retrieve private key');
        }
      } catch (error) {
        console.error('Error getting private key:', error);
        Alert.alert('Error', 'Could not retrieve private key');
      }
    }
  };

  const handleClosePrivateKeyModal = () => {
    setShowPrivateKeyModal(false);
  };

  const handleCopyPrivateKey = () => {
    if (privateKey) {
      const { Clipboard } = require('react-native');
      Clipboard.setString(privateKey);
      Alert.alert('Copied', 'Private key copied to clipboard');
    }
  };

  const handleCopyWalletAddress = (address: string) => {
    const { Clipboard } = require('react-native');
    Clipboard.setString(address);
    Alert.alert('Success', 'Wallet address copied to clipboard');
  };

  // Helper functions for common calculations
  const calculateTotalLocked = () => participants.reduce((sum, p) => sum + p.amountLocked, 0);
  const calculateTotalAssigned = () => participants.reduce((sum, p) => sum + (p.amountOwed || 0), 0);
  const calculateTotalPaid = (walletParticipants: any[]) => walletParticipants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const hasInvalidAmounts = () => participants.some(p => !p.amountOwed || p.amountOwed <= 0);
  const hasZeroAmounts = () => participants.some(p => p.amountOwed === 0);

  // Use ref to prevent infinite loops
  const isInitializingRef = useRef(false);


  // Load split wallet data when component mounts and split wallet exists
  useEffect(() => {
    if (splitWallet && splitWallet.id) {
      loadSplitWalletData();
    }
  }, []); // Run once on mount

  // Initialize split confirmation status and method
  useEffect(() => {
    const initializeSplitData = async () => {
      if (splitData && !isInitializing && !isInitializingRef.current) {
        isInitializingRef.current = true;
        setIsInitializing(true);
        // Always load fresh data from database to ensure we have the latest participant information
        if (splitData.id) {
          try {
            const { SplitStorageService } = await import('../../services/splitStorageService');
            const result = await SplitStorageService.getSplit(splitData.id);
            if (result.success && result.split) {
              // Update the split data with full information
              const fullSplitData = result.split;
              
              // Check if split is already confirmed
              const isConfirmed = fullSplitData.status === 'active' && fullSplitData.splitType === 'fair';
      setIsSplitConfirmed(isConfirmed);
              
              // Set the split method from stored data if confirmed
              if (isConfirmed && fullSplitData.splitMethod) {
                setSplitMethod(fullSplitData.splitMethod as 'equal' | 'manual');
              }
              
              // Transform participants to local format and ensure correct amounts
              // CRITICAL: Always use split data amount as the source of truth, not split wallet amount
              const totalAmount = fullSplitData.totalAmount; // Use split data amount as source of truth
              const amountPerPerson = totalAmount / fullSplitData.participants.length;
              
              // Fetch latest user data for all participants to get current wallet addresses
              const participantsWithLatestData = await Promise.all(
                fullSplitData.participants.map(async (p: any) => {
                  try {
                    const { firebaseDataService } = await import('../../services/firebaseDataService');
                    const latestUserData = await firebaseDataService.user.getCurrentUser(p.userId);
                    
                    return {
                      ...p,
                      walletAddress: latestUserData?.wallet_address || p.walletAddress || ''
                    };
                  } catch (error) {
                    console.warn(`Could not fetch latest data for participant ${p.userId}:`, error);
                    return p; // Return original participant data if fetch fails
                  }
                })
              );
              
              // Using split data amount as source of truth for calculations
              
              const transformedParticipants = participantsWithLatestData.map((p: any) => ({
                id: p.userId,
                name: p.name,
                walletAddress: p.walletAddress,
                amountOwed: p.amountOwed > 0 ? p.amountOwed : amountPerPerson, // Use existing amount or calculate equal split
                amountPaid: p.amountPaid || 0,
                amountLocked: 0,
                status: p.status,
              }));
              setParticipants(transformedParticipants);
              
              // Load split wallet if wallet ID is available
              if (fullSplitData.walletId) {
                try {
                  const { SplitWalletService } = await import('../../services/split');
              const walletResult = await SplitWalletService.getSplitWallet(fullSplitData.walletId);
              if (walletResult.success && walletResult.wallet) {
                const wallet = walletResult.wallet;
                
                // Check if the wallet has been burned (completed and cleaned up)
                // Only block access if the wallet status is completed AND it's been cleaned up
                if (wallet.status === 'completed') {
                  // Check if the wallet still exists in Firebase (not burned yet)
                  // If it exists, it's just completed but not burned, so allow access
                  if (__DEV__) {
                  }
                }
                    
                    // Check if wallet participants match split participants
                    const splitParticipantIds = fullSplitData.participants.map(p => p.userId);
                    const walletParticipantIds = wallet.participants.map(p => p.userId);
                    
                    // If participants don't match, we need to sync them
                    if (splitParticipantIds.length !== walletParticipantIds.length || 
                        !splitParticipantIds.every(id => walletParticipantIds.includes(id))) {
                      if (__DEV__) {
                      }
                      
                      // Create updated wallet participants from split data with correct amounts
                      // CRITICAL: Use split data amount as source of truth, not split wallet amount
                      const totalAmount = fullSplitData.totalAmount; // Use split data amount as source of truth
                      const amountPerPerson = totalAmount / fullSplitData.participants.length;
                      
                      
                      const updatedWalletParticipants = fullSplitData.participants.map(p => {
                        const existingWalletParticipant = wallet.participants.find(wp => wp.userId === p.userId);
                        return {
                          userId: p.userId,
                          name: p.name,
                          walletAddress: p.walletAddress,
                          amountOwed: p.amountOwed > 0 ? p.amountOwed : amountPerPerson, // Use existing amount or calculate equal split
                          amountPaid: existingWalletParticipant?.amountPaid || 0,
                          status: existingWalletParticipant?.status || 'locked' as const,
                          transactionSignature: existingWalletParticipant?.transactionSignature,
                          paidAt: existingWalletParticipant?.paidAt,
                        };
                      });
                      
                      // Update the wallet with synced participants using the existing method
                      const participantsForUpdate = updatedWalletParticipants.map(p => ({
                        userId: p.userId,
                        name: p.name,
                        walletAddress: p.walletAddress,
                        amountOwed: p.amountOwed, // This now has the correct calculated amount
                      }));
                      
                      const updateResult = await SplitWalletService.updateSplitWalletParticipants(fullSplitData.walletId, participantsForUpdate);
                      
                      if (updateResult.success) {
                        // Reload the wallet to get updated data
                        const reloadResult = await SplitWalletService.getSplitWallet(fullSplitData.walletId);
                        if (reloadResult.success && reloadResult.wallet) {
                          setSplitWallet(reloadResult.wallet);
                        }
                      } else {
                        if (__DEV__) {
                          console.error('🔍 FairSplitScreen: Failed to sync wallet participants:', updateResult.error);
                        }
                        setSplitWallet(wallet); // Use original wallet data
                      }
                    } else {
                      setSplitWallet(wallet);
                    }
                  } else {
                    if (__DEV__) {
                      console.error('🔍 FairSplitScreen: Failed to load split wallet:', walletResult.error);
                    }
                  }
                } catch (error) {
                  if (__DEV__) {
                    console.error('🔍 FairSplitScreen: Error loading split wallet:', error);
                  }
                }
              }
              
            }
          } catch (error) {
            if (__DEV__) {
              console.error('🔍 FairSplitScreen: Error loading split data:', error);
            }
            setIsInitializing(false);
            isInitializingRef.current = false;
          }
        } else {
          // We have full split data, proceed normally
          const isConfirmed = splitData.status === 'active' && splitData.splitType === 'fair';
          setIsSplitConfirmed(isConfirmed);
          
          // Set the split method from stored data if confirmed
          if (isConfirmed && splitData.splitMethod) {
            setSplitMethod(splitData.splitMethod as 'equal' | 'manual');
          }
          
          // Load split wallet if wallet ID is available
          if (splitData.walletId) {
            try {
              const { SplitWalletService } = await import('../../services/split');
              const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
              if (walletResult.success && walletResult.wallet) {
                const wallet = walletResult.wallet;
                
                // Check if the wallet has been burned (completed and cleaned up)
                // Only block access if the wallet status is completed AND it's been cleaned up
                if (wallet.status === 'completed') {
                  // Check if the wallet still exists in Firebase (not burned yet)
                  // If it exists, it's just completed but not burned, so allow access
                  if (__DEV__) {
                  }
                }
                
                setSplitWallet(wallet);
              } else {
                if (__DEV__) {
                  console.error('🔍 FairSplitScreen: Failed to load split wallet from full data:', walletResult.error);
                }
              }
            } catch (error) {
              if (__DEV__) {
                console.error('🔍 FairSplitScreen: Error loading split wallet from full data:', error);
              }
              setIsInitializing(false);
              isInitializingRef.current = false;
            }
          }
        }
        setIsInitializing(false);
        isInitializingRef.current = false;
      }
    };

    initializeSplitData();
    
    // Cleanup function to reset ref when component unmounts
    return () => {
      isInitializingRef.current = false;
    };
  }, [splitData?.id]); // Removed isInitializing to prevent infinite loops
  
  // Initialize participants from route params or use current user as creator
  const [participants, setParticipants] = useState<Participant[]>(() => {
    // Priority: splitData.participants > processedBillData.participants > billData.participants > current user only
    let sourceParticipants = null;
    if (splitData?.participants && splitData.participants.length > 0) {
      sourceParticipants = splitData.participants;
    } else if (processedBillData?.participants && processedBillData.participants.length > 0) {
      sourceParticipants = processedBillData.participants;
    } else if (billData?.participants && billData.participants.length > 0) {
      sourceParticipants = billData.participants;
    }

    if (sourceParticipants) {
      // Convert BillParticipant to FairSplitScreen Participant format
      const mappedParticipants = sourceParticipants.map((p: any, index: number) => {
        // Handle different participant formats (splitData uses userId, billData uses id)
        const participantId = p.userId || p.id || `participant_${index}`;
        
        // Calculate amount per person for equal split
        const totalAmount = splitData?.totalAmount || 0; // Use split data if available
        const amountPerPerson = totalAmount / sourceParticipants.length;
        
        // If this participant is the current user, use real data
        if (currentUser && (p.name === 'You' || participantId === currentUser.id.toString())) {
          return {
            id: currentUser.id.toString(),
            name: currentUser.name,
            walletAddress: currentUser.wallet_address || 'No wallet address',
            amountOwed: p.amountOwed || amountPerPerson, // Use existing amountOwed or calculate equal split
            amountPaid: p.amountPaid || 0, // Use existing amountPaid if available
            amountLocked: 0, // Start with no locked amounts
            status: (p.status === 'accepted' ? 'accepted' : 'pending') as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
          };
        }
        
        // For other participants, use the provided data
        return {
          id: participantId,
          name: p.name || `Participant ${index + 1}`,
          walletAddress: p.walletAddress || p.wallet_address || 'Unknown wallet',
          amountOwed: p.amountOwed || amountPerPerson, // Use existing amountOwed or calculate equal split
          amountPaid: p.amountPaid || 0, // Use existing amountPaid if available
          amountLocked: 0, // Start with no locked amounts
          status: (p.status === 'accepted' ? 'accepted' : 'pending') as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
        };
      });
      
      
      return mappedParticipants;
    }
    
    // If no participants provided, start with just the current user as creator
    if (currentUser) {
      const totalAmount = splitData?.totalAmount || 0; // Use split data if available
      const currentUserParticipant = {
        id: currentUser.id.toString(),
        name: currentUser.name,
        walletAddress: currentUser.wallet_address || 'No wallet address',
        amountOwed: totalAmount, // Single participant gets the full amount
        amountPaid: 0,
        amountLocked: 0,
        status: 'accepted' as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
      };
      
      return [currentUserParticipant];
    }
    
    // Fallback if no current user
    return [];
  });

  // Get the authoritative price from centralized price management
  // Use consistent bill ID format that matches SplitDetailsScreen
  const billId = processedBillData?.id || splitData?.billId || `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const authoritativePrice = priceManagementService.getBillPrice(billId);
  
  // Use DataSourceService for consistent data access
  const billInfo = DataSourceService.getBillInfo(splitData, processedBillData, billData);
  const totalAmount = billInfo.amount.data;
  
  // Set authoritative price when component loads
  useEffect(() => {
    const setAuthoritativePrice = () => {
      // Force set the authoritative price for this bill (overrides any existing)
      priceManagementService.forceSetBillPrice(
        billId,
        totalAmount,
        billInfo.currency.data
      );
      
      // Log data source usage for debugging
      if (__DEV__) {
        DataSourceService.logDataSourceUsage(splitData, processedBillData, billData, 'FairSplitScreen');
      }
    };
    
    setAuthoritativePrice();
  }, [billId, totalAmount, billInfo.currency.data]);
  
  // Debug bill amount consistency - Removed to prevent infinite logs
  
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
  
  // Total amount calculation
  const totalLocked = calculateTotalLocked();
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
      // Check if participants have zero amounts and trigger repair if needed
      if (hasZeroAmounts() && splitWallet?.id) {
        checkAndRepairData();
        return; // Let the repair handle the update
      }
      
      // Use AmountCalculationService for consistent calculations
      const updatedParticipants = AmountCalculationService.calculateParticipantAmounts(
        totalAmount,
        participants,
        'equal'
      );
      
      // Only update if the amount actually changed to prevent infinite loops
      setParticipants(prev => {
        const needsUpdate = prev.some((p, index) => 
          Math.abs(p.amountOwed - updatedParticipants[index]?.amountOwed || 0) > 0.01
        );
        
        if (!needsUpdate) return prev;
        
        return updatedParticipants;
      });
    }
  }, [splitMethod, totalAmount, participants.length, splitWallet?.id]);


  // Load completion data when split wallet is available
  useEffect(() => {
    if (splitWallet?.id) {
      loadCompletionData();
      checkAndRepairData();
      checkPaymentCompletion();
      
      // Set up periodic progress updates (only if not completed to avoid infinite loops)
      const progressInterval = setInterval(() => {
        if (splitWallet?.status !== 'completed') {
          loadCompletionData();
        }
      }, 5000); // Update progress every 5 seconds
      
      const completionInterval = setInterval(() => {
        if (splitWallet?.status !== 'completed') {
          checkPaymentCompletion();
        }
      }, 10000); // Check completion every 10 seconds
      
      return () => {
        clearInterval(progressInterval);
        clearInterval(completionInterval);
      };
    }
  }, [splitWallet?.id]); // Removed splitWallet?.status to prevent infinite loops

  // Load user wallets when component mounts
  useEffect(() => {
    if (currentUser?.id) {
      loadUserWallets();
    }
  }, [currentUser?.id]);

  // Reload wallets when screen comes back into focus (e.g., after adding a wallet)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (currentUser?.id) {
        loadUserWallets();
      }
    });

    return unsubscribe;
  }, [navigation, currentUser?.id]);

  // Check if all participants have paid their shares
  const checkPaymentCompletion = async () => {
    if (!splitWallet?.id) return;

    try {
      const result = await SplitWalletService.getSplitWallet(splitWallet.id);
      if (!result.success || !result.wallet) return;

      const wallet = result.wallet;
      const allParticipantsPaid = wallet.participants.every(p => p.status === 'paid');

      // Only proceed if all participants have paid AND the wallet is not already completed
      if (allParticipantsPaid && wallet.participants.length > 0 && wallet.status !== 'completed') {
        
        // Get merchant address if available
        const merchantAddress = processedBillData?.merchant?.address || billData?.merchant?.address;
        
        // Complete the split and send funds to merchant
        const completionResult = await SplitWalletService.completeSplitWallet(
          splitWallet.id,
          merchantAddress
        );

        if (completionResult.success) {
          
          // Update local state to reflect completion
          setSplitWallet(prev => prev ? { ...prev, status: 'completed' as const } : null);
          
          // Send completion notifications (only if not already sent)
          try {
            const { notificationService } = await import('../../services/notificationService');
            await notificationService.sendBulkNotifications(
              wallet.participants.map(p => p.userId),
              'split_payment_required', // Use existing notification type
              {
                splitWalletId: splitWallet.id,
                billName: billInfo.name.data,
                amount: wallet.totalAmount // Use amount field for total amount
              }
            );
          } catch (notificationError) {
            console.warn('⚠️ Failed to send completion notifications:', notificationError);
            // Don't fail the entire process for notification errors
          }

          // Show completion alert (but don't redirect automatically)
          Alert.alert(
            'Split Complete! 🎉',
            merchantAddress 
              ? `All participants have paid their shares. The total amount of ${wallet.totalAmount} USDC has been sent to the merchant.`
              : 'All participants have paid their shares. The split is now complete!',
            [
              {
                text: 'Stay Here',
                style: 'default',
                onPress: () => {
                  // Just reload the completion data to show updated status
                  loadCompletionData();
                }
              },
              {
                text: 'View Splits',
                style: 'default',
                onPress: () => navigation.navigate('SplitsList'),
              },
            ]
          );
        } else {
          console.error('❌ Failed to complete split:', completionResult.error);
          Alert.alert(
            'Split Complete (Partial)',
            'All participants have paid their shares, but there was an issue sending funds to the merchant. Please contact support.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Don't redirect automatically, let user decide
                }
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error checking payment completion:', error);
    }
  };

  const checkAndRepairData = async () => {
    if (!splitWallet?.id) return;
    
    try {
      // First validate the data
      const { SplitDataValidationService } = await import('../../services/splitDataValidationService');
      const validationResult = SplitDataValidationService.validateSplitWallet(splitWallet);
      
      if (!validationResult.isValid) {
        console.warn('🔧 FairSplitScreen: Data validation issues found:', validationResult.issues);
        
        // Try to repair the data
        const repairResult = await SplitWalletService.repairSplitWalletData(splitWallet.id);
        
        if (repairResult.success && repairResult.repaired) {
          Alert.alert(
            'Data Repaired',
            'We detected and fixed data issues with your split. You can now proceed with payment.',
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
          // No repair needed, but validation issues exist
          const summary = SplitDataValidationService.getValidationSummary(validationResult);
          logger.debug('Validation summary', { summary }, 'FairSplitScreen');
        } else {
          console.error('🔧 FairSplitScreen: Data repair failed:', repairResult.error);
        }
      }
    } catch (error) {
      console.error('🔧 FairSplitScreen: Error checking data corruption:', error);
    }
  };

  const loadSplitWalletData = async () => {
    if (!splitWallet?.id) return;
    
    try {
      // First, fix any precision issues in the split wallet data
      const { fixSplitWalletPrecision, fixSplitWalletDataConsistency } = await import('../../services/split/SplitWalletManagement');
      await fixSplitWalletPrecision(splitWallet.id);
      
      // Then, fix any data consistency issues (participants marked as paid but no funds on-chain)
      const consistencyResult = await fixSplitWalletDataConsistency(splitWallet.id);
      if (consistencyResult.success && consistencyResult.fixed) {
        console.log('🔧 Fixed data consistency issues in split wallet');
        logger.info('Data consistency fix applied', {
          splitWalletId: splitWallet.id,
          fixed: consistencyResult.fixed
        }, 'FairSplitScreen');
      } else if (consistencyResult.success && !consistencyResult.fixed) {
        console.log('✅ No data consistency issues found in split wallet');
      } else {
        console.warn('⚠️ Data consistency fix failed:', consistencyResult.error);
      }
      
      const result = await SplitWalletService.getSplitWallet(splitWallet.id);
      if (result.success && result.wallet) {
        setSplitWallet(result.wallet);
        
        // Update participants with the repaired data
        const totalAmount = splitData?.totalAmount || 0;
        const amountPerPerson = totalAmount / result.wallet.participants.length;
        
        const updatedParticipants = result.wallet.participants.map((p: any) => {
          // Import roundUsdcAmount to fix precision issues
          const { roundUsdcAmount } = require('../../utils/formatUtils');
          const roundedAmountOwed = p.amountOwed > 0 ? roundUsdcAmount(p.amountOwed) : roundUsdcAmount(amountPerPerson);
          
          return {
            id: p.userId,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: roundedAmountOwed,
            amountPaid: p.amountPaid || 0,
            amountLocked: 0,
            status: p.status as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
          };
        });
        
        setParticipants(updatedParticipants);
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
      const result = await SplitWalletService.getSplitWalletCompletion(splitWallet.id);
      
      if (result.success) {
        const newCompletionData = {
          completionPercentage: result.completionPercentage || 0,
          totalAmount: result.totalAmount || 0,
          collectedAmount: result.collectedAmount || 0,
          remainingAmount: result.remainingAmount || 0,
          participantsPaid: result.participantsPaid || 0,
          totalParticipants: result.totalParticipants || 0,
        };
        setCompletionData(newCompletionData);
        
        // Only log in development and when there are significant changes
        if (__DEV__ && (newCompletionData.completionPercentage === 100 || newCompletionData.completionPercentage === 0)) {
          logger.debug('Completion data updated', { newCompletionData }, 'FairSplitScreen');
        }
      } else {
        if (__DEV__) {
          console.error('❌ FairSplitScreen: Failed to load completion data:', result.error);
        }
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
      if (__DEV__) {
        console.error('❌ FairSplitScreen: Error loading completion data:', error);
      }
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
    logger.info('Creating split wallet with participants', {
      currentUserId: currentUser.id,
      currentUserName: currentUser.name,
      participantsCount: participantsWithAmounts.length,
      totalAmount
    }, 'FairSplitScreen');
    }

    setIsCreatingWallet(true);

    try {
      // Create split wallet if it doesn't exist
      if (!splitWallet) {
        logger.info('Creating new split wallet for fair split', null, 'FairSplitScreen');
        
        const { SplitWalletService } = await import('../../services/split');
        const walletResult = await SplitWalletService.createSplitWallet(
          splitData!.id,
          currentUser!.id.toString(),
          totalAmount,
          'USDC',
          participantsWithAmounts.map(p => ({
            userId: p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: p.amountOwed,
          }))
        );
        
        if (!walletResult.success || !walletResult.wallet) {
          throw new Error(walletResult.error || 'Failed to create split wallet');
        }
        
        const newWallet = walletResult.wallet;
        setSplitWallet(newWallet);
        logger.info('Split wallet created successfully', { splitWalletId: newWallet.id }, 'FairSplitScreen');
        
        // Set the authoritative price in the price management service
        const walletBillId = newWallet.billId;
        const unifiedAmount = totalAmount;
        
        if (__DEV__) {
          logger.debug('Setting authoritative price', {
            billId: walletBillId,
            totalAmount: unifiedAmount
          }, 'FairSplitScreen');
        }
        
        priceManagementService.setBillPrice(
          walletBillId,
          unifiedAmount,
          'USDC'
        );
        
        Alert.alert(
          'Split Wallet Created!',
          'Your split wallet has been created successfully. Participants can now send their payments.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Send notifications to participants
                sendPaymentNotifications(newWallet);
              },
            },
          ]
        );
      }

    } catch (error) {
      handleError(error, 'create split wallet');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const sendPaymentNotifications = async (wallet: SplitWallet) => {
    const participantIds = wallet.participants.map(p => p.userId);
    const billName = billInfo.name.data; // Use DataSourceService

    await notificationService.sendBulkNotifications(
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

    logger.debug('Checking participant lookup for payment', {
      currentUserId: currentUser.id.toString(),
      splitWalletId: splitWallet.id,
      participantsCount: splitWallet.participants.length
    }, 'FairSplitScreen');

    const participant = splitWallet.participants.find(p => p.userId === currentUser.id.toString());
    if (!participant) {
      logger.debug('Participant not found in splitWallet, checking local participants', {
        localParticipantsCount: participants.length,
        currentUserId: currentUser.id.toString()
      }, 'FairSplitScreen');
      
      // Fallback: check if user exists in local participants
      const localParticipant = participants.find(p => p.id === currentUser.id.toString());
      if (!localParticipant) {
        Alert.alert('Error', 'You are not a participant in this split');
        return;
      }
      
      logger.debug('Using local participant data for navigation', null, 'FairSplitScreen');
    } else {
      // Check if participant data looks incorrect (amountOwed = 0, amountPaid > 0)
      if (participant.amountOwed === 0 && participant.amountPaid > 0) {
        logger.warn('Detected incorrect participant data', {
          participantId: participant.userId,
          amountOwed: participant.amountOwed,
          amountPaid: participant.amountPaid,
          expectedAmountOwed: totalAmount / participants.length
        }, 'FairSplitScreen');
        
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
                  billName: billInfo.name.data, // Use DataSourceService
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

  // Load user's wallets from Firebase
  const loadUserWallets = async () => {
    if (!currentUser?.id) return;
    
    setIsLoadingWallets(true);
    try {
      const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      
      // Load external wallets from subcollection
      const externalWalletsRef = collection(db, 'users', currentUser.id, 'externalWallets');
      const externalWalletsSnapshot = await getDocs(externalWalletsRef);
      
      const externalWalletsData = externalWalletsSnapshot.docs.map(doc => ({
        id: doc.id,
        address: doc.data().address,
        name: doc.data().name || `External Wallet ${doc.id.slice(-4)}`
      }));
      
      setExternalWallets(externalWalletsData);
      
      // Load in-app wallet from user document
      const userDocRef = doc(db, 'users', currentUser.id);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        if (userData.wallet_address) {
          setInAppWallet({ address: userData.wallet_address });
        }
      }
      
      logger.debug('Loaded user wallets', {
        externalWalletsCount: externalWalletsData.length,
        hasInAppWallet: userDocSnapshot.exists() && userDocSnapshot.data().wallet_address
      }, 'FairSplitScreen');
      
    } catch (error) {
      console.error('❌ FairSplitScreen: Error loading user wallets:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setIsLoadingWallets(false);
    }
  };

  // Helper function to reload wallets (used in multiple places)
  const reloadWallets = async () => {
    await loadUserWallets();
  };

  // Helper function for common error handling
  const handleError = (error: any, context: string, showAlert: boolean = true) => {
    console.error(`❌ FairSplitScreen: ${context}:`, error);
    setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    setIsLoading(false);
    setIsSendingPayment(false);
    setIsCreatingWallet(false);
    if (showAlert) {
      Alert.alert('Error', `Failed to ${context.toLowerCase()}. Please try again.`);
    }
  };

  // Debug USDC balance to identify balance query issues
  const debugUsdcBalance = async () => {
    if (!splitWallet) {
      Alert.alert('Error', 'No split wallet available');
      return;
    }

    try {
      logger.debug('Starting USDC balance debug', {
        splitWalletAddress: splitWallet.walletAddress
      }, 'FairSplitScreen');

      const { SplitWalletService } = await import('../../services/split');
      const debugResult = await SplitWalletService.debugUsdcBalance(splitWallet.walletAddress);

      if (debugResult.success) {
        logger.debug('USDC balance debug results', debugResult.results, 'FairSplitScreen');
        
        // Show results in a detailed alert
        const results = debugResult.results;
        let message = `USDC Balance Debug Results:\n\n`;
        message += `Wallet: ${results.walletAddress}\n`;
        message += `USDC Mint: ${results.usdcMint}\n\n`;
        
        if (results.method1) {
          message += `Method 1 (getAssociatedTokenAddress):\n`;
          message += `Token Account: ${results.method1.tokenAccount}\n`;
          message += `Balance: ${results.method1.balance || 0} USDC\n`;
          message += `Raw Amount: ${results.method1.rawAmount || 'N/A'}\n`;
          message += `Success: ${results.method1.success}\n\n`;
        }
        
        if (results.method2) {
          message += `Method 2 (getAccountInfo):\n`;
          message += `Exists: ${results.method2.exists}\n`;
          message += `Owner: ${results.method2.owner || 'N/A'}\n`;
          message += `Manual Balance: ${results.method2.manualBalance || 0} USDC\n`;
          message += `Manual Raw: ${results.method2.manualRawAmount || 'N/A'}\n\n`;
        }
        
        if (results.method3) {
          message += `Method 3 (getTokenAccountsByOwner):\n`;
          message += `Total Accounts: ${results.method3.totalAccounts}\n`;
          if (results.method3.usdcAccount) {
            message += `USDC Account Found: ${results.method3.usdcAccount.pubkey}\n`;
            message += `USDC Balance: ${results.method3.usdcAccount.balance} USDC\n`;
            message += `USDC Raw: ${results.method3.usdcAccount.rawAmount}\n`;
          } else {
            message += `No USDC account found\n`;
          }
        }
        
        Alert.alert('USDC Balance Debug Results', message, [
          { text: 'OK' }
        ]);
      } else {
        Alert.alert('Debug Failed', debugResult.error || 'Failed to debug USDC balance');
      }
    } catch (error) {
      console.error('❌ FairSplitScreen: Error debugging USDC balance:', error);
      Alert.alert('Error', 'Failed to debug USDC balance');
    }
  };

  // Repair split wallet when synchronization issues are detected
  const repairSplitWallet = async () => {
    if (!splitWallet || !currentUser) {
      Alert.alert('Error', 'Unable to repair split wallet');
      return;
    }

    try {
      logger.info('Starting split wallet repair', {
        splitWalletId: splitWallet.id,
        creatorId: currentUser.id.toString()
      }, 'FairSplitScreen');

      const { SplitWalletService } = await import('../../services/split');
      const repairResult = await SplitWalletService.repairSplitWalletSynchronization(
        splitWallet.id,
        currentUser.id.toString()
      );

      if (repairResult.success && repairResult.repaired) {
        logger.info('Split wallet repaired successfully', null, 'FairSplitScreen');
        
        Alert.alert(
          'Split Wallet Repaired!',
          'The split wallet data has been repaired. Participant payment status has been reset, and they can now retry their payments.\n\nYou can now try to withdraw funds again once participants have paid.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reload the split wallet data to reflect the repair
                loadSplitWalletData();
                // Close any open modals
                setShowSignatureStep(false);
                setShowSplitModal(false);
                setSelectedTransferMethod(null);
                setSelectedWallet(null);
              }
            }
          ]
        );
      } else if (repairResult.success && !repairResult.repaired) {
        Alert.alert(
          'No Repair Needed',
          'The split wallet data appears to be correct. The issue might be temporary. Please try the withdrawal again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Repair Failed',
          repairResult.error || 'Failed to repair split wallet. Please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ FairSplitScreen: Error repairing split wallet:', error);
      Alert.alert('Error', 'Failed to repair split wallet. Please contact support.');
    }
  };

  // Helper function to validate creator permissions
  const validateCreatorPermission = (action: string): boolean => {
    if (!isCurrentUserCreator()) {
      Alert.alert('Error', `Only the split creator can ${action}`);
      return false;
    }
    return true;
  };

  // DEV FUNCTION: Independent fund withdrawal for testing
  const handleDevWithdraw = () => {
    if (!splitWallet) {
      Alert.alert('Error', 'Split wallet not created yet');
      return;
    }

    // Ensure only the creator can use the dev withdrawal
    if (!validateCreatorPermission('withdraw funds')) {
      return;
    }

    logger.info('Independent fund withdrawal triggered', {
      splitWalletId: splitWallet.id,
      billName: billInfo.name.data,
      totalAmount: totalAmount,
      collectedAmount: completionData?.collectedAmount || 0,
      completionPercentage: completionData?.completionPercentage || 0,
      participantsCount: participants.length,
      isCreator: isCurrentUserCreator(),
      currentUserId: currentUser?.id,
      creatorId: splitWallet.creatorId
    }, 'FairSplitScreen');

    // Show confirmation dialog
    Alert.alert(
      '🚀 DEV: Independent Fund Withdrawal',
      `This will withdraw ${completionData?.collectedAmount || 0} USDC from the split wallet.\n\nCurrent Progress: ${completionData?.completionPercentage || 0}%\nCollected: ${completionData?.collectedAmount || 0} USDC\nTotal: ${totalAmount} USDC\n\nThis is a development feature for testing purposes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Withdraw Funds', 
          style: 'destructive',
          onPress: () => {
            // Load wallets first, then trigger the split funds modal
            reloadWallets();
            setShowSplitModal(true);
          }
        }
      ]
    );
  };

  // Phase 1: Creator confirms the split repartition
  const handleConfirmSplit = async () => {
    if (!validateCreatorPermission('confirm the repartition')) {
      return;
    }

    // Validate that all participants have amounts assigned
    if (hasInvalidAmounts()) {
      Alert.alert('Error', 'All participants must have valid amounts assigned');
      return;
    }

    // Validate that total amounts match the bill total
    const totalAssigned = calculateTotalAssigned();
    if (Math.abs(totalAssigned - totalAmount) > 0.01) { // Allow small rounding differences
      Alert.alert('Error', `Total assigned amounts (${totalAssigned.toFixed(2)}) must equal bill total (${totalAmount.toFixed(2)})`);
      return;
    }

    try {
      setIsCreatingWallet(true);
      
      // Create split wallet if it doesn't exist
      let finalSplitWallet = splitWallet;
      if (!finalSplitWallet) {
        logger.info('Creating split wallet for confirmed split', null, 'FairSplitScreen');
        
        const { SplitWalletService } = await import('../../services/split');
        const walletResult = await SplitWalletService.createSplitWallet(
          splitData!.id,
          currentUser!.id.toString(),
          totalAmount,
          'USDC',
          participants.map(p => ({
            userId: p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: p.amountOwed,
          }))
        );
        
        if (!walletResult.success || !walletResult.wallet) {
          throw new Error(walletResult.error || 'Failed to create split wallet');
        }
        
        finalSplitWallet = walletResult.wallet;
        setSplitWallet(finalSplitWallet);
        logger.info('Split wallet created successfully', { splitWalletId: finalSplitWallet.id }, 'FairSplitScreen');
      }
      
      // Update the split in the database with the confirmed repartition
      const { SplitStorageService } = await import('../../services/splitStorageService');
      const updateResult = await SplitStorageService.updateSplit(splitData!.id, {
        status: 'active',
        splitMethod: splitMethod, // Store the locked split method
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
        // Store wallet information in the split data
        walletId: finalSplitWallet.id,
        walletAddress: finalSplitWallet.walletAddress,
      });

      if (updateResult.success) {
        setIsSplitConfirmed(true);
        
        // Send notifications to all participants (except the creator)
        const { notificationService } = await import('../../services/notificationService');
        const notificationPromises = participants
          .filter(p => p.id !== currentUser?.id.toString()) // Don't notify the creator
          .map(async (participant) => {
            try {
              await notificationService.sendNotification(
                participant.id,
                'Split Confirmed - Time to Pay!',
                `The split for "${processedBillData?.title || billData?.title || 'Restaurant Night'}" has been confirmed. You owe ${participant.amountOwed.toFixed(2)} USDC. Tap to pay your share!`,
                'payment_request',
                {
                  splitId: splitData!.id,
                  splitWalletId: finalSplitWallet.id,
                  splitWalletAddress: finalSplitWallet.walletAddress,
                  billName: processedBillData?.title || billData?.title || 'Restaurant Night',
                  totalAmount: totalAmount,
                  currency: processedBillData?.currency || 'USDC',
                  participantAmount: participant.amountOwed,
                  creatorName: currentUser?.name || 'Unknown',
                  creatorId: currentUser?.id.toString() || '',
                  // Navigation data to redirect to FairSplitScreen
                  navigation: {
                    screen: 'FairSplit',
                    params: {
                      billData: processedBillData ? {
                        id: processedBillData.id,
                        title: processedBillData.title,
                        totalAmount: processedBillData.totalAmount,
                        currency: processedBillData.currency,
                        date: processedBillData.date,
                        merchant: processedBillData.merchant,
                        location: processedBillData.location,
                        participants: processedBillData.participants.map((p: any) => ({
                          id: p.id,
                          name: p.name,
                          walletAddress: p.walletAddress,
                          amountOwed: p.amountOwed,
                          amountPaid: p.amountPaid || 0,
                          status: p.status,
                          items: p.items || []
                        }))
                      } : undefined,
                      processedBillData: processedBillData,
                      splitWallet: {
                        id: finalSplitWallet.id,
                        walletAddress: finalSplitWallet.walletAddress,
                        totalAmount: finalSplitWallet.totalAmount,
                        currency: finalSplitWallet.currency,
                        participants: finalSplitWallet.participants
                      },
                      splitData: {
                        id: splitData!.id,
                        title: splitData!.title,
                        totalAmount: splitData!.totalAmount,
                        currency: splitData!.currency,
                        splitType: splitData!.splitType,
                        status: splitData!.status,
                        creatorId: splitData!.creatorId,
                        creatorName: splitData!.creatorName,
                        participants: splitData!.participants,
                        walletId: finalSplitWallet.id,
                        walletAddress: finalSplitWallet.walletAddress
                      }
                    }
                  }
                }
              );
              logger.info('Notification sent to participant', { participantName: participant.name }, 'FairSplitScreen');
            } catch (notificationError) {
              console.error(`❌ Failed to send notification to ${participant.name}:`, notificationError);
            }
          });

        // Wait for all notifications to be sent
        await Promise.all(notificationPromises);
        
        // Show wallet recap modal after successful wallet creation
        setShowWalletRecapModal(true);
      } else {
        Alert.alert('Error', updateResult.error || 'Failed to confirm split');
      }
    } catch (error) {
      handleError(error, 'confirm split');
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Handle editing participant amount (creator only)
  const handleEditParticipantAmount = (participant: Participant) => {
    if (!isCurrentUserCreator() || isSplitConfirmed || splitMethod !== 'manual') {
      return;
    }
    
    setEditingParticipant(participant);
    setEditAmount(participant.amountOwed.toString());
    setShowEditModal(true);
  };

  // Handle saving edited amount
  const handleSaveEditedAmount = () => {
    if (!editingParticipant || !editAmount) {
      return;
    }

    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    // Check if the total would exceed the bill total
    const otherParticipantsTotal = participants
      .filter(p => p.id !== editingParticipant.id)
      .reduce((sum, p) => sum + p.amountOwed, 0);
    
    const newTotal = otherParticipantsTotal + newAmount;
    if (newTotal > totalAmount) {
      Alert.alert(
        'Amount Too High', 
        `The total amount (${newTotal.toFixed(2)} USDC) cannot exceed the bill total (${totalAmount.toFixed(2)} USDC)`
      );
      return;
    }

    // Update the participant's amount
    setParticipants(prev => prev.map(p => 
      p.id === editingParticipant.id 
        ? { ...p, amountOwed: newAmount }
        : p
    ));

    setShowEditModal(false);
    setEditingParticipant(null);
    setEditAmount('');
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingParticipant(null);
    setEditAmount('');
  };

  // Handle payment modal close
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setPaymentAmount('');
    setIsSendingPayment(false);
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

    // Check if user has already made any payment (prevent multiple payments)
    if (userParticipant.status === 'paid' || userParticipant.amountPaid > 0) {
      Alert.alert('Already Paid', 'You have already made a payment for this split. Each participant can only pay once.');
      return;
    }

    if (!userParticipant.amountOwed || userParticipant.amountOwed <= 0) {
      Alert.alert('Error', 'No amount to pay');
      return;
    }

    // Show payment modal with the user's exact share amount (no partial payments allowed)
    // Use roundUsdcAmount to fix floating point precision issues
    const { roundUsdcAmount } = await import('../../utils/formatUtils');
    const exactShareAmount = roundUsdcAmount(userParticipant.amountOwed);
    setPaymentAmount(exactShareAmount.toString());
    setShowPaymentModal(true);
  };

  // Handle split funds action
  const handleSplitFunds = () => {
    setShowSplitModal(true);
  };

  const handleSelectWallet = (wallet: {id: string, address: string, type: 'external' | 'in-app', name?: string}) => {
    setSelectedWallet(wallet);
    setSelectedTransferMethod(wallet.type === 'external' ? 'external-wallet' : 'in-app-wallet');
    setShowSignatureStep(true);
  };

  // Handle signature step
  const handleSignatureStep = async () => {
    if (!selectedWallet || !splitWallet || !currentUser) return;
    
    // Show confirmation dialog before transfer
    Alert.alert(
      'Confirm Transfer',
      `Are you sure you want to transfer ${splitWallet.totalAmount.toFixed(2)} USDC to ${selectedWallet.name || (selectedWallet.type === 'external' ? 'external wallet' : 'in-app wallet')}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Transfer', 
          style: 'default',
          onPress: () => executeTransfer()
        }
      ]
    );
  };

  // Execute the actual transfer
  const executeTransfer = async () => {
    if (!selectedWallet || !splitWallet || !currentUser) return;
    
    setIsSigning(true);
    try {
      logger.info('Processing transfer to selected wallet', {
        selectedWallet,
        totalAmount,
        splitWalletId: splitWallet.id,
        currentUserId: currentUser.id,
        creatorId: splitWallet.creatorId
      });
      
      // Validate that only the creator can withdraw funds
      if (currentUser.id.toString() !== splitWallet.creatorId) {
        console.error('❌ FairSplitScreen: Non-creator attempted to withdraw funds:', {
          currentUserId: currentUser.id.toString(),
          creatorId: splitWallet.creatorId
        });
        Alert.alert('Error', 'Only the split creator can withdraw funds.');
        return;
      }
      
      // Check if split wallet is already completed (temporarily disabled for debugging)
      if (splitWallet.status === 'completed') {
        console.log('ℹ️ FairSplitScreen: Split wallet is marked as completed, but continuing for debugging', {
          status: splitWallet.status,
          completedAt: splitWallet.completedAt
        });
        
        // Continue with the withdrawal process to see what happens
        // This will help us debug why the balance is 0
      }

      // Validate that split wallet has sufficient funds
      if (splitWallet.totalAmount <= 0) {
        console.error('❌ FairSplitScreen: Split wallet has no funds:', {
          totalAmount: splitWallet.totalAmount
        });
        Alert.alert('Error', 'Split wallet has no funds to transfer.');
        return;
      }
      
      // Check if participants have actually paid their shares
      const totalPaid = calculateTotalPaid(splitWallet.participants);
      const tolerance = 0.001; // 0.001 USDC tolerance for rounding differences
      
      logger.info('Fund collection check', {
        totalAmount: splitWallet.totalAmount,
        totalPaid,
        tolerance,
        difference: Math.abs(totalPaid - splitWallet.totalAmount),
        participants: splitWallet.participants.map(p => ({
          name: p.name,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status
        }))
      });
      
      if (totalPaid < (splitWallet.totalAmount - tolerance)) {
        console.error('❌ FairSplitScreen: Insufficient funds collected:', {
          required: splitWallet.totalAmount,
          collected: totalPaid,
          missing: splitWallet.totalAmount - totalPaid,
          tolerance
        });
        Alert.alert(
          'Insufficient Funds', 
          `Not all participants have paid their shares. Required: ${splitWallet.totalAmount} USDC, Collected: ${totalPaid} USDC. Please ensure all participants have paid before withdrawing funds.`
        );
        return;
      }

      // CRITICAL: Verify actual on-chain balance before allowing withdrawal
      logger.info('Verifying actual on-chain balance before withdrawal', {
        splitWalletAddress: splitWallet.walletAddress,
        expectedAmount: splitWallet.totalAmount,
        splitWalletId: splitWallet.id,
        status: splitWallet.status
      }, 'FairSplitScreen');
      
      // Debug: Check if the split wallet address is correct
      console.log('🔍 Split wallet details:', {
        id: splitWallet.id,
        address: splitWallet.walletAddress,
        publicKey: splitWallet.publicKey,
        totalAmount: splitWallet.totalAmount,
        status: splitWallet.status,
        participants: splitWallet.participants.map(p => ({
          name: p.name,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status,
          transactionSignature: p.transactionSignature
        }))
      });
      
      try {
        const { consolidatedTransactionService } = await import('../../services/consolidatedTransactionService');
        const balanceResult = await consolidatedTransactionService.getUsdcBalance(splitWallet.walletAddress);
        
        if (balanceResult.success) {
          logger.info('On-chain balance verification', {
            onChainBalance: balanceResult.balance,
            expectedBalance: splitWallet.totalAmount,
            difference: Math.abs(balanceResult.balance - splitWallet.totalAmount),
            tolerance
          }, 'FairSplitScreen');
          
          // If there's a significant difference, try to fix data consistency
          const balanceDifference = Math.abs(balanceResult.balance - splitWallet.totalAmount);
          if (balanceDifference > tolerance) {
            logger.warn('Balance discrepancy detected, attempting data consistency fix', {
              onChainBalance: balanceResult.balance,
              expectedBalance: splitWallet.totalAmount,
              difference: balanceDifference
            }, 'FairSplitScreen');
            
            try {
              const { fixSplitWalletDataConsistency } = await import('../../services/split/SplitWalletManagement');
              const fixResult = await fixSplitWalletDataConsistency(splitWallet.id);
              if (fixResult.success && fixResult.fixed) {
                logger.info('Data consistency fix applied during withdrawal check', {
                  splitWalletId: splitWallet.id
                }, 'FairSplitScreen');
                
                // Reload the split wallet data after the fix
                await loadSplitWalletData();
              }
            } catch (fixError) {
              logger.warn('Failed to apply data consistency fix during withdrawal check', {
                error: fixError
              }, 'FairSplitScreen');
            }
          }
          
          // Debug: Check transaction history if balance is 0 but expected > 0
          if (balanceResult.balance === 0 && splitWallet.totalAmount > 0) {
            console.log('🔍 Balance is 0 but expected > 0, checking transaction history...');
            try {
              const { Connection, PublicKey } = await import('@solana/web3.js');
              const { getConfig } = await import('../../config/unified');
              const connection = new Connection(getConfig().blockchain.rpcUrl);
              const publicKey = new PublicKey(splitWallet.walletAddress);
              
              // Get recent signatures to see if there were any outgoing transactions
              const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
              console.log('🔍 Recent transactions for split wallet:', {
                address: splitWallet.walletAddress,
                signatureCount: signatures.length,
                signatures: signatures.map(sig => ({
                  signature: sig.signature,
                  blockTime: sig.blockTime,
                  err: sig.err,
                  memo: sig.memo
                }))
              });
            } catch (error) {
              console.error('❌ Error checking transaction history:', error);
            }
          }
          
          // Check if on-chain balance is sufficient (with tolerance)
          if (balanceResult.balance < (splitWallet.totalAmount - tolerance)) {
            console.error('❌ FairSplitScreen: On-chain balance insufficient for withdrawal:', {
              onChainBalance: balanceResult.balance,
              expectedBalance: splitWallet.totalAmount,
              difference: splitWallet.totalAmount - balanceResult.balance,
              tolerance
            });
            
            Alert.alert(
              'Insufficient On-Chain Balance', 
              `The split wallet only has ${balanceResult.balance.toFixed(6)} USDC on-chain, but ${splitWallet.totalAmount} USDC is required. This indicates that participants haven't actually sent their payments yet, even though they may be marked as paid in the system. Please ensure all participants have sent their actual payments before withdrawing.`
            );
            return;
          }
        } else {
          console.warn('⚠️ FairSplitScreen: Could not verify on-chain balance:', balanceResult.error);
          Alert.alert(
            'Balance Verification Failed', 
            'Could not verify the actual balance in the split wallet. Please try again or contact support if the issue persists.'
          );
          return;
        }
      } catch (error) {
        console.error('❌ FairSplitScreen: Error checking on-chain balance:', error);
        Alert.alert(
          'Balance Check Error', 
          'Failed to verify the split wallet balance. Please try again or contact support if the issue persists.'
        );
        return;
      }

      // Process the transfer - both external and in-app use the same method
      const description = `Split funds transfer to ${selectedWallet.name || (selectedWallet.type === 'external' ? 'external wallet' : 'in-app wallet')}`;
      
      logger.info('Initiating blockchain transfer', {
        splitWalletId: splitWallet.id,
        splitWalletAddress: splitWallet.walletAddress,
        destinationAddress: selectedWallet.address,
        destinationType: selectedWallet.type,
        destinationName: selectedWallet.name,
        amount: splitWallet.totalAmount,
        currency: splitWallet.currency,
        description,
        creatorId: splitWallet.creatorId,
        billId: splitWallet.billId
      });
      
      // Use extractFairSplitFunds for Fair Split transfers
      const transferResult = await SplitWalletService.extractFairSplitFunds(
        splitWallet.id,
        selectedWallet.address,
        currentUser.id.toString(),
        description
      );
      
      logger.info('Transfer result received', {
        success: transferResult.success,
        transactionSignature: transferResult.transactionSignature,
        amount: transferResult.amount,
        error: transferResult.error
      });
      
      // Debug: Log detailed transfer result for troubleshooting
      console.log('🔍 Detailed transfer result:', {
        success: transferResult.success,
        transactionSignature: transferResult.transactionSignature,
        amount: transferResult.amount,
        error: transferResult.error,
        splitWalletId: splitWallet.id,
        destinationAddress: selectedWallet.address,
        creatorId: currentUser.id.toString()
      });
      
        if (transferResult.success) {
          logger.info('Transfer successful', {
            transactionSignature: transferResult.transactionSignature,
            amount: transferResult.amount,
            destination: selectedWallet.address
          });
          
          // Update local state to reflect completion
          setSplitWallet(prev => prev ? { 
            ...prev, 
            status: 'completed' as const,
            completedAt: new Date().toISOString()
          } : null);
          
          // Show success message with cleanup information
          Alert.alert(
            'Transfer Successful!', 
            `Funds have been transferred to ${selectedWallet.name || (selectedWallet.type === 'external' ? 'external wallet' : 'in-app wallet')} successfully!\n\nTransaction: ${transferResult.transactionSignature?.slice(0, 8)}...\n\n🔥 The split wallet will be automatically burned and cleaned up once the transfer is confirmed.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Close modals and reset state
                  setShowSignatureStep(false);
                  setShowSplitModal(false);
                  setSelectedTransferMethod(null);
                  setSelectedWallet(null);
                  
                  // Navigate back to splits list - this will trigger a refresh
                  navigation.navigate('SplitsList');
                }
              }
            ]
          );
        } else {
        console.error('❌ FairSplitScreen: Transfer failed:', transferResult.error);
        
        // Check if this is a synchronization issue that can be repaired
        if (transferResult.error?.includes('Transaction synchronization issue detected')) {
          Alert.alert(
            'Synchronization Issue Detected',
            'We detected that participants are marked as paid but the funds aren\'t actually in the split wallet. This can happen due to transaction delays or failures.\n\nWould you like to repair the split wallet data? This will reset participant payment status so they can retry their payments.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Repair Split Wallet', 
                style: 'default',
                onPress: () => repairSplitWallet()
              }
            ]
          );
        } else {
          Alert.alert('Transfer Failed', transferResult.error || 'Failed to transfer funds. Please try again.');
        }
      }
      
    } catch (error) {
      handleError(error, 'complete transfer');
    } finally {
      setIsSigning(false);
    }
  };


  const handlePaymentModalConfirm = async () => {
    if (!splitWallet || !currentUser) {
      Alert.alert('Error', 'Unable to process payment');
      return;
    }

    const userParticipant = participants.find(p => p.id === currentUser.id.toString());
    if (!userParticipant) {
      Alert.alert('Error', 'You are not a participant in this split');
      return;
    }

    // Check if user has already paid their full share
    if (userParticipant.status === 'paid' || userParticipant.amountPaid >= userParticipant.amountOwed) {
      Alert.alert('Already Paid', 'You have already paid your full share for this split');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    const remainingAmount = userParticipant.amountOwed - userParticipant.amountPaid;
    // Use roundUsdcAmount to fix floating point precision issues
    const { roundUsdcAmount } = await import('../../utils/formatUtils');
    const roundedRemainingAmount = roundUsdcAmount(remainingAmount);
    if (amount > roundedRemainingAmount) {
      Alert.alert('Amount Too High', `You can only pay up to ${roundedRemainingAmount.toFixed(2)} USDC`);
      return;
    }

    try {
      setIsSendingPayment(true);
      setShowPaymentModal(false);
      
      // Process payment using SplitWalletService
      const { SplitWalletService } = await import('../../services/split');
      const result = await SplitWalletService.payParticipantShare(
        splitWallet.id,
        currentUser.id.toString(),
        amount
      );
      
      if (result.success) {
        logger.info('Payment successful', {
          amount: amount,
          transactionSignature: result.transactionSignature
        });
        
        // Reload split wallet to get latest data
        const walletResult = await SplitWalletService.getSplitWallet(splitWallet.id);
        if (walletResult.success && walletResult.wallet) {
          setSplitWallet(walletResult.wallet);
          
          // Update participants with the latest split wallet data
          const updatedParticipants = participants.map((p: any) => {
            const walletParticipant = walletResult.wallet.participants.find((wp: any) => wp.userId === p.id);
            if (walletParticipant) {
              return {
                ...p,
                amountPaid: walletParticipant.amountPaid,
                status: walletParticipant.status === 'paid' ? 'confirmed' as const : p.status
              };
            }
            return p;
          });
          setParticipants(updatedParticipants);
        }
        
        // Update completion data immediately
        await loadCompletionData();
        
        // Also reload split wallet data to get the latest state
        await loadSplitWalletData();
        
        Alert.alert(
          'Payment Successful!',
          `Your payment of ${amount.toFixed(2)} USDC has been successfully sent to the split wallet. The transaction has been processed on the blockchain.`,
          [{ text: 'OK' }]
        );
      } else {
        const errorMessage = result.error || 'Failed to process payment';
        Alert.alert(
          'Payment Failed', 
          errorMessage.includes('could not be confirmed') 
            ? 'Your payment could not be confirmed on the blockchain. The transaction may have failed or is still pending. Please try again or check the transaction status.'
            : errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      handleError(error, 'process payment');
    } finally {
      setIsSendingPayment(false);
      setPaymentAmount('');
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

  // Show error state if there's an error
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => setError(null)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with Bill Information */}
        <FairSplitHeader
          billName={billInfo.name.data}
          billDate={billInfo.date.data}
          totalAmount={totalAmount}
          category={splitData?.category || processedBillData?.category || billData?.category}
          onBackPress={() => navigation.goBack()}
        />

        {/* Progress Indicator */}
        <FairSplitProgress
          completionData={completionData}
          totalAmount={totalAmount}
          isLoading={isLoadingCompletionData}
        />

        {/* Split Wallet Section - Show when wallet exists */}
        {splitWallet && (
          <View style={styles.splitWalletSection}>
            <Text style={styles.splitWalletTitle}>Split Wallet</Text>
            <View style={styles.splitWalletCard}>
              <View style={styles.splitWalletInfo}>
                <Text style={styles.splitWalletLabel}>Wallet Address</Text>
                <View style={styles.walletAddressContainer}>
                  <Text style={styles.splitWalletAddress}>
                    {formatWalletAddress(splitWallet.walletAddress)}
                  </Text>
                  <TouchableOpacity onPress={() => handleCopyWalletAddress(splitWallet.walletAddress)}>
                    <Image
                      source={require('../../../assets/copy-icon.png')}
                      style={styles.copyIcon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.privateKeyButton}
                onPress={handleShowPrivateKey}
              >
                <Image
                  source={require('../../../assets/id-icon-white.png')}
                  style={styles.privateKeyButtonIcon}
                />
                <Text style={styles.privateKeyButtonText}>View Private Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Split Method Selection - Only for creator before confirmation */}
        {!isSplitConfirmed && isCurrentUserCreator() && (
          <View style={styles.splitMethodContainer}>
            <Text style={styles.splitMethodLabel}>Split between:</Text>
            <View style={styles.splitMethodOptions}>
              {splitMethod === 'equal' ? (
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  style={[styles.splitMethodOption, styles.splitMethodOptionActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    style={styles.splitMethodOptionTouchable}
                    onPress={() => handleSplitMethodChange('equal')}
                  >
                    <Text style={[
                      styles.splitMethodOptionText,
                      styles.splitMethodOptionTextActive
                    ]}>
                      Equal
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <TouchableOpacity
                  style={styles.splitMethodOption}
                  onPress={() => handleSplitMethodChange('equal')}
                >
                  <Text style={styles.splitMethodOptionText}>
                    Equal
                  </Text>
                </TouchableOpacity>
              )}
              
              {splitMethod === 'manual' ? (
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  style={[styles.splitMethodOption, styles.splitMethodOptionActive]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <TouchableOpacity
                    style={styles.splitMethodOptionTouchable}
                    onPress={() => handleSplitMethodChange('manual')}
                  >
                    <Text style={[
                      styles.splitMethodOptionText,
                      styles.splitMethodOptionTextActive
                    ]}>
                      Manual
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <TouchableOpacity
                  style={styles.splitMethodOption}
                  onPress={() => handleSplitMethodChange('manual')}
                >
                  <Text style={styles.splitMethodOptionText}>
                    Manual
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Show current split method if confirmed */}
        {isSplitConfirmed && (
          <View style={styles.splitMethodContainer}>
            <Text style={styles.splitMethodLabel}>Split method:</Text>
            <View style={styles.splitMethodOptions}>
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                style={[styles.splitMethodOption, styles.splitMethodOptionActive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.splitMethodOptionText, styles.splitMethodOptionTextActive]}>
                  {splitMethod === 'equal' ? 'Equal' : 'Manual'} (Locked)
                </Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Participants List */}
        <FairSplitParticipants
          participants={participants}
          isSplitConfirmed={isSplitConfirmed}
          isCurrentUserCreator={isCurrentUserCreator()}
          splitMethod={splitMethod}
          onEditParticipantAmount={handleEditParticipantAmount}
        />
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
            <LinearGradient
              colors={[colors.green, colors.greenBlue]}
              style={[
                styles.confirmButton,
                isCreatingWallet && styles.confirmButtonDisabled
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity 
                style={styles.confirmButtonTouchable}
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
            </LinearGradient>
              ) : (
                <View style={styles.waitingContainer}>
                  <Text style={styles.waitingText}>
                    Waiting for creator to confirm the split repartition...
                  </Text>
                </View>
              )
            ) : (
              // Phase 2: Show different buttons based on coverage and user role
              (() => {
                const isFullyCovered = (completionData?.completionPercentage || 0) >= 100;
                const isCreator = isCurrentUserCreator();
                
                if (isFullyCovered && isCreator) {
                  // Creator can split when 100% covered
                  return (
              <TouchableOpacity 
                      style={styles.splitButton} 
                      onPress={handleSplitFunds}
                    >
                      <Text style={styles.splitButtonText}>
                        Split
                      </Text>
                    </TouchableOpacity>
                  );
                } else if (isFullyCovered && !isCreator) {
                  // Non-creators see waiting message when fully covered
                  return (
                    <View style={styles.waitingContainer}>
                      <Text style={styles.waitingText}>
                        Waiting for creator to split the funds...
                      </Text>
                    </View>
                  );
                } else {
                  // Check if current user has already made any payment (prevent multiple payments)
                  const currentUserParticipant = participants.find(p => p.id === currentUser?.id?.toString());
                  const hasUserPaidFully = currentUserParticipant && 
                    (currentUserParticipant.status === 'paid' || 
                     currentUserParticipant.amountPaid > 0);
                  
                  if (hasUserPaidFully) {
                    // User has paid their full share - show waiting message
                    return (
                      <View style={styles.waitingContainer}>
                        <Text style={styles.waitingText}>
                          ✅ You have paid your share! Waiting for other participants to complete their payments...
                        </Text>
                      </View>
                    );
                  }
                  
                  // Users can send their payments when not fully covered and haven't paid their full share
                  return (
                    <View style={styles.buttonContainer}>
                      <LinearGradient
                        colors={[colors.green, colors.greenBlue]}
                        style={[
                          styles.payButton,
                          isSendingPayment && styles.payButtonDisabled
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <TouchableOpacity 
                          style={styles.payButtonTouchable}
                          onPress={handleSendMyShares}
                          disabled={isSendingPayment}
                        >
                          <Text style={[
                            styles.payButtonText,
                            isSendingPayment && styles.payButtonTextDisabled
                          ]}>
                            {isSendingPayment ? 'Sending...' : 'Pay My Share'}
                          </Text>
                        </TouchableOpacity>
                      </LinearGradient>
                      
                      {/* DEV BUTTONS - Only show in development and to creators */}
                      {__DEV__ && isCurrentUserCreator() && (
                        <View style={styles.buttonContainer}>
                          <TouchableOpacity 
                            style={styles.devButton} 
                            onPress={handleDevWithdraw}
                          >
                            <Text style={styles.devButtonText}>
                              🚀 DEV: Withdraw Funds
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.devButton, { backgroundColor: colors.warning }]} 
                            onPress={repairSplitWallet}
                          >
                            <Text style={styles.devButtonText}>
                              🔧 DEV: Repair Split Wallet
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.devButton, { backgroundColor: colors.info }]} 
                            onPress={debugUsdcBalance}
                          >
                            <Text style={styles.devButtonText}>
                              🔍 DEV: Debug USDC Balance
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }
              })()
            )}
          </View>
        )}
      </View>

      {/* Edit Amount Modal */}
      {showEditModal && editingParticipant && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Amount for {editingParticipant.name}</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Amount (USDC):</Text>
              <TextInput
                style={styles.modalInput}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="0.00"
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                style={styles.modalSaveButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity 
                  style={styles.modalSaveButtonTouchable}
                  onPress={handleSaveEditedAmount}
                >
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Pay Your Share</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputLabel}>Amount to Pay (USDC):</Text>
              <TextInput
                style={styles.modalInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0.00"
                keyboardType="numeric"
                autoFocus
              />
              <Text style={styles.modalHelperText}>
                You owe: {(() => {
                  const currentUserParticipant = participants.find(p => p.id === currentUser?.id?.toString());
                  return currentUserParticipant?.amountOwed?.toFixed(2) || '0.00';
                })()} USDC
              </Text>
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={handlePaymentModalClose}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                style={[
                  styles.modalSaveButton,
                  isSendingPayment && styles.modalSaveButtonDisabled
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity 
                  style={styles.modalSaveButtonTouchable}
                  onPress={handlePaymentModalConfirm}
                  disabled={isSendingPayment}
                >
                  {isSendingPayment ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Pay Now</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}

      {/* Split Modal */}
      {showSplitModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {!showSignatureStep ? (
              // Transfer Method Selection Step
              <>
                <Text style={styles.modalTitle}>Transfer Funds</Text>
                <Text style={styles.modalSubtitle}>
                  All participants have covered their share. Choose how to transfer the funds:
                </Text>
                
                {isLoadingWallets ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.green} size="large" />
                    <Text style={styles.loadingText}>Loading your wallets...</Text>
                  </View>
                ) : (
                  <View style={styles.splitOptionsContainer}>
                    {/* External Wallets */}
                    {externalWallets.map((wallet) => (
                      <TouchableOpacity 
                        key={wallet.id}
                        style={styles.splitOptionButton}
                        onPress={() => handleSelectWallet({
                          id: wallet.id,
                          address: wallet.address,
                          type: 'external',
                          name: wallet.name
                        })}
                      >
                        <View style={styles.splitOptionIcon}>
                          <Text style={styles.splitOptionIconText}>🏦</Text>
                        </View>
                        <View style={styles.splitOptionContent}>
                          <Text style={styles.splitOptionTitle}>{wallet.name}</Text>
                          <Text style={styles.splitOptionDescription}>
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                          </Text>
                        </View>
                        <Text style={styles.splitOptionArrow}>→</Text>
                      </TouchableOpacity>
                    ))}

                    {/* In-App Wallet */}
                    {inAppWallet && (
                      <TouchableOpacity 
                        style={styles.splitOptionButton}
                        onPress={() => handleSelectWallet({
                          id: 'in-app',
                          address: inAppWallet.address,
                          type: 'in-app',
                          name: 'In-App Wallet'
                        })}
                      >
                        <View style={styles.splitOptionIcon}>
                          <Text style={styles.splitOptionIconText}>💳</Text>
                        </View>
                        <View style={styles.splitOptionContent}>
                          <Text style={styles.splitOptionTitle}>In-App Wallet</Text>
                          <Text style={styles.splitOptionDescription}>
                            {inAppWallet.address.slice(0, 8)}...{inAppWallet.address.slice(-8)}
                          </Text>
                        </View>
                        <Text style={styles.splitOptionArrow}>→</Text>
                      </TouchableOpacity>
                    )}

                    {/* Add External Wallet Button - Show when no external wallets */}
                    {externalWallets.length === 0 && (
                      <TouchableOpacity 
                        style={styles.addWalletButton}
                        onPress={() => {
                          setShowSplitModal(false);
                          navigation.navigate('LinkedCards');
                        }}
                      >
                        <View style={styles.addWalletIcon}>
                          <Text style={styles.addWalletIconText}>+</Text>
                        </View>
                        <View style={styles.addWalletContent}>
                          <Text style={styles.addWalletTitle}>Add External Wallet</Text>
                          <Text style={styles.addWalletDescription}>
                            {inAppWallet 
                              ? 'Link a Kast card or external wallet for more transfer options'
                              : 'Link a Kast card or external wallet to receive funds'
                            }
                          </Text>
                        </View>
                        <Text style={styles.addWalletArrow}>→</Text>
                      </TouchableOpacity>
                    )}

                    {/* No wallets available - only show if no external wallets AND no in-app wallet */}
                    {externalWallets.length === 0 && !inAppWallet && (
                      <View style={styles.noWalletsContainer}>
                        <Text style={styles.noWalletsText}>
                          No wallets found. Please add a wallet to your profile first.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setShowSplitModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Signature Step
              <>
                <Text style={styles.modalTitle}>
                  Transfer {totalAmount.toFixed(1)} USDC to {selectedWallet?.name || 'Selected Wallet'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Transfer funds to your selected wallet address.
                </Text>
                
                {/* Selected Wallet Info */}
                {selectedWallet && (
                  <View style={styles.selectedWalletInfo}>
                    <Text style={styles.selectedWalletLabel}>Destination:</Text>
                    <Text style={styles.selectedWalletAddress}>
                      {selectedWallet.address}
                    </Text>
                  </View>
                )}
                
                {/* Transfer Visualization */}
                <View style={styles.transferVisualization}>
                  <View style={styles.transferIcon}>
                    <Text style={styles.transferIconText}>💳</Text>
                </View>
                  <View style={styles.transferArrows}>
                    <Text style={styles.transferArrowText}>{'>>>>'}</Text>
                  </View>
                  <View style={styles.transferIcon}>
                    <Text style={styles.transferIconText}>
                      {selectedTransferMethod === 'external-wallet' ? '🏦' : '💳'}
                    </Text>
                  </View>
                </View>

              <TouchableOpacity 
                style={[
                    styles.transferButton,
                    isSigning && styles.transferButtonDisabled
                  ]}
                  onPress={handleSignatureStep}
                  disabled={isSigning}
                >
                  <View style={styles.transferButtonContent}>
                    <View style={styles.transferButtonIcon}>
                      <Text style={styles.transferButtonIconText}>→</Text>
                    </View>
                    <Text style={styles.transferButtonText}>
                      {isSigning ? 'Transferring...' : 'Transfer Funds'}
                </Text>
                  </View>
              </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowSignatureStep(false);
                    setSelectedTransferMethod(null);
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
      </View>
      )}

      {/* Wallet Recap Modal */}
      {showWalletRecapModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.walletRecapModal}>
            <Text style={styles.walletRecapTitle}>🎉 Split Wallet Created!</Text>
            <Text style={styles.walletRecapSubtitle}>
              Your split wallet has been created and is ready for payments. Keep your private key secure!
            </Text>
            
            {splitWallet && (
              <View style={styles.walletRecapContent}>
                <View style={styles.walletInfoCard}>
                  <Text style={styles.walletInfoLabel}>Wallet Address</Text>
                  <View style={styles.walletAddressContainer}>
                    <Text style={styles.walletAddressText}>
                      {formatWalletAddress(splitWallet.walletAddress)}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        const { Clipboard } = require('react-native');
                        Clipboard.setString(splitWallet.walletAddress);
                        Alert.alert('Copied', 'Wallet address copied to clipboard');
                      }}
                      style={styles.copyButton}
                    >
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.privateKeyButton} 
                  onPress={handleShowPrivateKey}
                >
                  <Text style={styles.privateKeyButtonText}>🔑 View Private Key</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.walletRecapButtons}>
              <TouchableOpacity 
                style={styles.walletRecapButton}
                onPress={() => setShowWalletRecapModal(false)}
              >
                <Text style={styles.walletRecapButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Private Key Modal */}
      {showPrivateKeyModal && privateKey && (
        <View style={styles.modalOverlay}>
          <View style={styles.privateKeyModal}>
            <Text style={styles.privateKeyModalTitle}>🔑 Private Key</Text>
            <Text style={styles.privateKeyModalSubtitle}>
              Keep this private key secure. Anyone with access to this key can control your split wallet.
            </Text>
            
            <View style={styles.privateKeyDisplay}>
              <Text style={styles.privateKeyText}>{privateKey}</Text>
            </View>
            
            <View style={styles.privateKeyWarning}>
              <Text style={styles.privateKeyWarningText}>
                ⚠️ Never share your private key with anyone. Store it in a secure location.
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
                onPress={handleClosePrivateKeyModal}
              >
                <Text style={styles.closePrivateKeyButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};


export default FairSplitScreen;



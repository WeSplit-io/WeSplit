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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import UserAvatar from '../../components/UserAvatar';
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

// Local image mapping for category icons
const CATEGORY_IMAGES_LOCAL: { [key: string]: any } = {
  trip: require('../../../assets/trip-icon-black.png'),
  food: require('../../../assets/food-icon-black.png'),
  home: require('../../../assets/house-icon-black.png'),
  event: require('../../../assets/event-icon-black.png'),
  rocket: require('../../../assets/rocket-icon-black.png'),
};

interface Participant {
  id: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountPaid: number;
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

  // Initialize split confirmation status and method
  useEffect(() => {
    const initializeSplitData = async () => {
      if (splitData && !isInitializing) {
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
              const totalAmount = fullSplitData.totalAmount; // Use actual split amount
              const amountPerPerson = totalAmount / fullSplitData.participants.length;
              
              const transformedParticipants = fullSplitData.participants.map((p: any) => ({
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
                  const { SplitWalletService } = await import('../../services/splitWalletService');
                  const walletResult = await SplitWalletService.getSplitWallet(fullSplitData.walletId);
                  if (walletResult.success && walletResult.wallet) {
                    const wallet = walletResult.wallet;
                    
                    // Check if wallet participants match split participants
                    const splitParticipantIds = fullSplitData.participants.map(p => p.userId);
                    const walletParticipantIds = wallet.participants.map(p => p.userId);
                    
                    // If participants don't match, we need to sync them
                    if (splitParticipantIds.length !== walletParticipantIds.length || 
                        !splitParticipantIds.every(id => walletParticipantIds.includes(id))) {
                      if (__DEV__) {
                        console.log('🔍 FairSplitScreen: Participants mismatch detected, syncing wallet participants...');
                      }
                      
                      // Create updated wallet participants from split data with correct amounts
                      const totalAmount = fullSplitData.totalAmount; // Use actual split amount
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
              const { SplitWalletService } = await import('../../services/splitWalletService');
              const walletResult = await SplitWalletService.getSplitWallet(splitData.walletId);
              if (walletResult.success && walletResult.wallet) {
                setSplitWallet(walletResult.wallet);
              } else {
                if (__DEV__) {
                  console.error('🔍 FairSplitScreen: Failed to load split wallet from full data:', walletResult.error);
                }
              }
            } catch (error) {
              if (__DEV__) {
                console.error('🔍 FairSplitScreen: Error loading split wallet from full data:', error);
              }
            }
          }
        }
        setIsInitializing(false);
      }
    };

    initializeSplitData();
  }, [splitData?.id, isInitializing]); // Use splitData.id instead of splitData to prevent re-renders
  
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
        const totalAmount = splitData?.totalAmount || MockupDataService.getBillAmount(); // Use split data if available
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
      const totalAmount = splitData?.totalAmount || MockupDataService.getBillAmount(); // Use split data if available
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
  
  
  // Use split data if available, otherwise fall back to mockup data
  const totalAmount = splitData?.totalAmount || MockupDataService.getBillAmount();
  
  // Set authoritative price when component loads
  useEffect(() => {
    const setAuthoritativePrice = () => {
      const unifiedAmount = splitData?.totalAmount || MockupDataService.getBillAmount();
      
      // Force set the authoritative price for this bill (overrides any existing)
      priceManagementService.forceSetBillPrice(
        billId,
        unifiedAmount,
        'USDC'
      );
      
      // Debug price management after setting (only in development)
      if (__DEV__) {
        PriceManagerDebugger.debugPriceManagement(billId);
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
      // Check if participants have zero amounts and trigger repair if needed
      const hasZeroAmounts = participants.some(p => p.amountOwed === 0);
      if (hasZeroAmounts && splitWallet?.id) {
        console.log('🔧 FairSplitScreen: Detected participants with zero amounts, triggering repair...');
        checkAndRepairData();
        return; // Let the repair handle the update
      }
      
      // Use centralized price management for consistent calculations
      const splitData = priceManagementService.calculateSplitAmounts(billId, participants.length, 'equal');
      const amountPerPerson = splitData?.amountPerParticipant || (totalAmount / participants.length);
      
      // Only update if the amount actually changed to prevent infinite loops
      setParticipants(prev => {
        const needsUpdate = prev.some(p => Math.abs(p.amountOwed - amountPerPerson) > 0.01);
        
        if (!needsUpdate) return prev;
        
        return prev.map(p => ({ ...p, amountOwed: amountPerPerson }));
      });
    }
  }, [splitMethod, totalAmount, billId, participants.length, splitWallet?.id]); // Added splitWallet?.id to trigger repair


  // Load completion data when split wallet is available
  useEffect(() => {
    if (splitWallet?.id) {
      loadCompletionData();
      checkAndRepairData();
      checkPaymentCompletion();
      
      // Set up periodic payment completion check
      const interval = setInterval(checkPaymentCompletion, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [splitWallet?.id]);

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
              billName: splitData?.title || MockupDataService.getBillName(), // Use unified mockup data
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
          console.log('🔧 FairSplitScreen: Validation summary:', summary);
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
      const result = await SplitWalletService.getSplitWallet(splitWallet.id);
      if (result.success && result.wallet) {
        setSplitWallet(result.wallet);
        
        // Update participants with the repaired data
        const totalAmount = splitData?.totalAmount || MockupDataService.getBillAmount();
        const amountPerPerson = totalAmount / result.wallet.participants.length;
        
        const updatedParticipants = result.wallet.participants.map(p => ({
          id: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed > 0 ? p.amountOwed : amountPerPerson,
          amountPaid: p.amountPaid || 0,
          amountLocked: 0,
          status: p.status as 'pending' | 'locked' | 'confirmed' | 'accepted' | 'declined',
        }));
        
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
          const unifiedAmount = splitData?.totalAmount || MockupDataService.getBillAmount();
          
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
    const billName = splitData?.title || MockupDataService.getBillName(); // Use unified mockup data

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
                  billName: splitData?.title || MockupDataService.getBillName(), // Use unified mockup data
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
      
      console.log('🔍 FairSplitScreen: Loaded user wallets:', {
        externalWallets: externalWalletsData,
        inAppWallet: userDocSnapshot.exists() ? { address: userDocSnapshot.data().wallet_address } : null
      });
      
    } catch (error) {
      console.error('❌ FairSplitScreen: Error loading user wallets:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setIsLoadingWallets(false);
    }
  };

  // DEV FUNCTION: Bypass all checks and trigger split behavior directly
  const handleDevBypass = () => {
    if (!splitWallet) {
      Alert.alert('Error', 'Split wallet not created yet');
      return;
    }

    // Ensure only the creator can use the dev bypass
    if (!isCurrentUserCreator()) {
      Alert.alert('Error', 'Only the split creator can withdraw funds');
      return;
    }

    console.log('🚀 DEV: Bypassing all checks and triggering split behavior directly:', {
      splitWalletId: splitWallet.id,
      billName: splitData?.title || MockupDataService.getBillName(),
      totalAmount: totalAmount,
      participants: participants,
      splitWallet: splitWallet,
      billId: billId,
      splitData: splitData,
      processedBillData: processedBillData,
      isCreator: isCurrentUserCreator(),
      isFullyCovered: completionData?.completionPercentage === 100,
      currentUserId: currentUser?.id,
      creatorId: splitWallet.creatorId
    });

    // Load wallets first, then trigger the split funds modal
    loadUserWallets();
    setShowSplitModal(true);
  };

  // Phase 1: Creator confirms the split repartition
  const handleConfirmSplit = async () => {
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
      
      // Create split wallet if it doesn't exist
      let finalSplitWallet = splitWallet;
      if (!finalSplitWallet) {
        console.log('🔍 FairSplitScreen: Creating split wallet for confirmed split...');
        
        const { SplitWalletService } = await import('../../services/splitWalletService');
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
        console.log('🔍 FairSplitScreen: Split wallet created successfully:', finalSplitWallet.id);
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
        const { sendNotification } = await import('../../services/firebaseNotificationService');
        const notificationPromises = participants
          .filter(p => p.id !== currentUser?.id.toString()) // Don't notify the creator
          .map(async (participant) => {
            try {
              await sendNotification(
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
                }
              );
              console.log(`🔔 Notification sent to participant: ${participant.name}`);
            } catch (notificationError) {
              console.error(`❌ Failed to send notification to ${participant.name}:`, notificationError);
            }
          });

        // Wait for all notifications to be sent
        await Promise.all(notificationPromises);
        
        Alert.alert(
          'Split Confirmed!',
          'The repartition has been locked and all participants have been notified to pay their share.',
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

    // Show payment modal with the user's amount
    setPaymentAmount(userParticipant.amountOwed.toString());
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
      console.log('🔍 FairSplitScreen: Processing transfer to selected wallet:', {
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
      
      // Validate that split wallet has sufficient funds
      if (splitWallet.totalAmount <= 0) {
        console.error('❌ FairSplitScreen: Split wallet has no funds:', {
          totalAmount: splitWallet.totalAmount
        });
        Alert.alert('Error', 'Split wallet has no funds to transfer.');
        return;
      }
      
      // Check if participants have actually paid their shares
      const totalPaid = splitWallet.participants.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      console.log('🔍 FairSplitScreen: Fund collection check:', {
        totalAmount: splitWallet.totalAmount,
        totalPaid,
        participants: splitWallet.participants.map(p => ({
          name: p.name,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid,
          status: p.status
        }))
      });
      
      if (totalPaid < splitWallet.totalAmount) {
        console.error('❌ FairSplitScreen: Insufficient funds collected:', {
          required: splitWallet.totalAmount,
          collected: totalPaid,
          missing: splitWallet.totalAmount - totalPaid
        });
        Alert.alert(
          'Insufficient Funds', 
          `Not all participants have paid their shares. Required: ${splitWallet.totalAmount} USDC, Collected: ${totalPaid} USDC. Please ensure all participants have paid before withdrawing funds.`
        );
        return;
      }
      
      // Process the transfer - both external and in-app use the same method
      const description = `Split funds transfer to ${selectedWallet.name || (selectedWallet.type === 'external' ? 'external wallet' : 'in-app wallet')}`;
      
      console.log('🚀 FairSplitScreen: Initiating blockchain transfer:', {
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
      
      // Use sendDegenSplitPayment for both external and in-app transfers
      const transferResult = await SplitWalletService.sendDegenSplitPayment(
        splitWallet.id,
        selectedWallet.address,
        description
      );
      
      console.log('🔍 FairSplitScreen: Transfer result received:', {
        success: transferResult.success,
        transactionSignature: transferResult.transactionSignature,
        amount: transferResult.amount,
        error: transferResult.error
      });
      
      if (transferResult.success) {
        console.log('✅ FairSplitScreen: Transfer successful:', {
          transactionSignature: transferResult.transactionSignature,
          amount: transferResult.amount,
          destination: selectedWallet.address
        });
        
        // Show success message
        Alert.alert(
          'Transfer Successful!', 
          `Funds have been transferred to ${selectedWallet.name || (selectedWallet.type === 'external' ? 'external wallet' : 'in-app wallet')} successfully!\n\nTransaction: ${transferResult.transactionSignature?.slice(0, 8)}...`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Close modals and reset state
                setShowSignatureStep(false);
                setShowSplitModal(false);
                setSelectedTransferMethod(null);
                setSelectedWallet(null);
                
                // Navigate back to splits list or previous screen
                navigation.navigate('SplitsList');
              }
            }
          ]
        );
      } else {
        console.error('❌ FairSplitScreen: Transfer failed:', transferResult.error);
        Alert.alert('Transfer Failed', transferResult.error || 'Failed to transfer funds. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ FairSplitScreen: Error during transfer process:', error);
      Alert.alert('Error', 'Failed to complete transfer. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  // Handle payment modal actions
  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setPaymentAmount('');
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

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    const remainingAmount = userParticipant.amountOwed - userParticipant.amountPaid;
    if (amount > remainingAmount) {
      Alert.alert('Amount Too High', `You can only pay up to ${remainingAmount.toFixed(2)} USDC`);
      return;
    }

    try {
      setIsSendingPayment(true);
      setShowPaymentModal(false);
      
      // Process payment using SplitWalletService
      const { SplitWalletService } = await import('../../services/splitWalletService');
      const result = await SplitWalletService.payParticipantShare(
        splitWallet.id,
        currentUser.id.toString(),
        amount
      );
      
      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `You have successfully paid ${amount.toFixed(2)} USDC to the split wallet.`,
          [{ text: 'OK' }]
        );
        
        // Reload participants to show updated payment status
        // This would typically trigger a refresh of the participants data
        console.log('🔍 FairSplitScreen: Payment successful, should refresh participant data');
      } else {
        Alert.alert('Payment Failed', result.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../../../assets/chevron-left.png')} 
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Fair Split</Text>
        
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Summary Card */}
        <LinearGradient
          colors={[colors.green, colors.greenBlue]}
          style={styles.billCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.billHeader}>
            <Image
              source={CATEGORY_IMAGES_LOCAL[splitData?.category || processedBillData?.category || billData?.category || 'food']}
              style={styles.billIconImage}
              resizeMode="contain"
            />
            <View style={styles.billTitleContainer}>
              <Text style={styles.billTitle}>
                {billData?.title || processedBillData?.title || 'Restaurant Bill'}
              </Text>
              <Text style={styles.billDate}>
                {billData?.date || processedBillData?.date || new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <Text style={styles.billAmountUSDC}>
              {totalAmount.toFixed(1)} USDC
            </Text>
          </View>
          <View style={styles.billCardDotLeft}/>
          <View style={styles.billCardDotRight}/>
        </LinearGradient>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>
                ({completionData?.completionPercentage || 0}%)
              </Text>
              <Text style={styles.progressAmount}>
                {completionData?.collectedAmount?.toFixed(1) || 0} USDC
              </Text>
              <Text style={styles.progressLabel}>
                Locked
              </Text>
            </View>
          </View>
        </View>

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
        <View style={styles.participantsContainer}>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantCard}>
            <UserAvatar
              displayName={participant.name}
              size={40}
              style={styles.participantAvatar}
            />
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
                {!isSplitConfirmed && isCurrentUserCreator() && splitMethod === 'manual' ? (
                  // Creator can edit amounts in manual mode
                  <TouchableOpacity 
                    style={styles.editableAmountButton}
                    onPress={() => handleEditParticipantAmount(participant)}
                  >
                    <Text style={styles.editableAmountText}>
                      ${participant.amountOwed.toFixed(3)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  // Read-only amount display
                  <View style={styles.readOnlyAmountContainer}>
                    <Text style={styles.readOnlyAmountText}>
                      ${participant.amountOwed.toFixed(3)}
                    </Text>
                    {isSplitConfirmed && (
                      <Text style={styles.lockedIndicator}>🔒</Text>
                    )}
            </View>
                )}
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
                  // Users can send their payments when not fully covered
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
                            {isSendingPayment ? 'Sending...' : 'Send My Shares'}
                          </Text>
                        </TouchableOpacity>
                      </LinearGradient>
                      
                      {/* DEV BUTTON - Only show in development and to creators */}
                      {__DEV__ && isCurrentUserCreator() && (
                        <TouchableOpacity 
                          style={styles.devButton} 
                          onPress={handleDevBypass}
                        >
                          <Text style={styles.devButtonText}>
                            🚀 DEV: Split Funds
                          </Text>
                        </TouchableOpacity>
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
                You owe: {participants.find(p => p.id === currentUser?.id.toString())?.amountOwed.toFixed(2) || '0.00'} USDC
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
    </SafeAreaView>
  );
};


export default FairSplitScreen;



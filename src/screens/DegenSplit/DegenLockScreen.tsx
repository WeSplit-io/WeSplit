/**
 * Degen Lock Screen
 * Users must lock the full bill amount before the degen split can begin
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  ScrollView,
  Image,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './DegenLockStyles';
import UserAvatar from '../../components/UserAvatar';
import { SplitWalletService } from '../../services/split';
import { notificationService } from '../../services/notificationService';
import { FallbackDataService } from '../../utils/fallbackDataService';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/loggingService';

// AppleSlider component adapted from SendConfirmationScreen
interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled: boolean;
  loading: boolean;
  text?: string;
}

const AppleSlider: React.FC<AppleSliderProps> = ({ onSlideComplete, disabled, loading, text = 'Slide to Lock' }) => {
  const maxSlideDistance = 300;
  const sliderValue = useRef(new Animated.Value(0)).current;
  const [isSliderActive, setIsSliderActive] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !loading,
    onMoveShouldSetPanResponder: () => !disabled && !loading,
    onPanResponderGrant: () => {
      setIsSliderActive(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
      sliderValue.setValue(newValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > maxSlideDistance * 0.6) {
        Animated.timing(sliderValue, {
          toValue: maxSlideDistance,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          if (onSlideComplete) onSlideComplete();
          setTimeout(() => {
            sliderValue.setValue(0);
            setIsSliderActive(false);
          }, 1000);
        });
      } else {
        Animated.timing(sliderValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setIsSliderActive(false);
        });
      }
    },
  });

  return (
    <LinearGradient
      colors={[colors.green, colors.greenBlue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.appleSliderGradientBorder}
    >
      <View style={[styles.appleSliderContainer, disabled && { opacity: 0.5 }]} {...panResponder.panHandlers}>
        <Animated.View style={styles.appleSliderTrack}>
          <Animated.View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: sliderValue.interpolate({ inputRange: [0, maxSlideDistance], outputRange: [0, 1] }) as any,
              borderRadius: 999,
            }}
          >
            <LinearGradient
              colors={[colors.green, colors.greenBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                ...StyleSheet.absoluteFillObject,
                borderRadius: 999,
              }}
            />
          </Animated.View>
          <Animated.Text
            style={[
              styles.appleSliderText,
              { color: colors.white }
            ]}
          >
            {loading ? 'Locking...' : text}
          </Animated.Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.appleSliderThumb,
            {
              transform: [{ translateX: sliderValue }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.green, colors.greenBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 30,
            }}
          />
          <Image 
            source={require('../../../assets/chevron-right.png')} 
            style={styles.appleSliderThumbIcon}
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

// Category image mapping
const CATEGORY_IMAGES: { [key: string]: any } = {
  trip: require('../../../assets/trip-icon-black.png'),
  food: require('../../../assets/food-icon-black.png'),
  house: require('../../../assets/house-icon-black.png'),
  event: require('../../../assets/event-icon-black.png'),
  rocket: require('../../../assets/rocket-icon-black.png'),
  lamp: require('../../../assets/lamp-icon-black.png'),
  award: require('../../../assets/award-icon-black.png'),
  user: require('../../../assets/user-icon-black.png'),
};

interface DegenLockScreenProps {
  navigation: any;
  route: any;
}

const DegenLockScreen: React.FC<DegenLockScreenProps> = ({ navigation, route }) => {
  // Safely destructure route params with fallbacks
  const routeParams = route?.params || {};
  const { 
    billData, 
    participants: routeParticipants, 
    totalAmount: routeTotalAmount, 
    processedBillData, 
    splitData, 
    splitWallet: existingSplitWallet 
  } = routeParams;
  
  // Extract participants from splitData if not provided directly
  const [participants, setParticipants] = useState(routeParticipants || splitData?.participants || []);
  
  // Use route params if available, otherwise fallback to split data
  const totalAmount = routeTotalAmount || splitData?.totalAmount || 0;
  const { state } = useApp();
  const { currentUser } = state;

  // Debug logging for route params
  useEffect(() => {
    console.log('🔍 DegenLockScreen route params:', {
      hasRoute: !!route,
      hasParams: !!route?.params,
      routeParams: routeParams,
      splitData: splitData,
      participants: participants,
      totalAmount: totalAmount
    });
  }, [route, routeParams, splitData, participants, totalAmount]);
  
  const insets = useSafeAreaInsets();

  // Early return if essential data is missing
  if (!splitData && !billData) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading split data...</Text>
      </SafeAreaView>
    );
  }

  // Wallet recap functions
  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleShowPrivateKey = async () => {
    if (splitWallet?.id && currentUser?.id) {
      try {
        console.log('🔍 Attempting to retrieve private key:', {
          splitWalletId: splitWallet.id,
          userId: currentUser.id.toString(),
          splitType: splitData?.splitType
        });
        
        const { SplitWalletService } = await import('../../services/split');
        const result = await SplitWalletService.getSplitWalletPrivateKey(splitWallet.id, currentUser.id.toString());
        
        console.log('🔍 Private key retrieval result:', {
          success: result.success,
          hasPrivateKey: !!result.privateKey,
          error: result.error
        });
        
        if (result.success && result.privateKey) {
          setPrivateKey(result.privateKey);
          setShowPrivateKeyModal(true);
        } else {
          console.error('🔍 Private key retrieval failed:', result.error);
          Alert.alert('Error', `Could not retrieve private key: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('🔍 Error getting private key:', error);
        Alert.alert('Error', `Could not retrieve private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.error('🔍 Missing required data for private key retrieval:', {
        hasSplitWallet: !!splitWallet,
        hasSplitWalletId: !!splitWallet?.id,
        hasCurrentUser: !!currentUser,
        hasCurrentUserId: !!currentUser?.id
      });
      Alert.alert('Error', 'Missing required data to retrieve private key');
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
  
  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [splitWallet, setSplitWallet] = useState(existingSplitWallet || null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  
  // Refresh participant data with latest wallet addresses when component loads
  useEffect(() => {
    const refreshParticipantData = async () => {
      if (participants.length > 0) {
        try {
          const participantsWithLatestData = await Promise.all(
            participants.map(async (participant: any) => {
              try {
                const { firebaseDataService } = await import('../../services/firebaseDataService');
                const latestUserData = await firebaseDataService.user.getCurrentUser(participant.userId || participant.id);
                
                return {
                  ...participant,
                  walletAddress: latestUserData?.wallet_address || participant.walletAddress || ''
                };
              } catch (error) {
                console.warn(`Could not fetch latest data for participant ${participant.userId || participant.id}:`, error);
                return participant; // Return original participant data if fetch fails
              }
            })
          );
          
          setParticipants(participantsWithLatestData);
        } catch (error) {
          console.error('Error refreshing participant data:', error);
        }
      }
    };

    refreshParticipantData();
  }, []); // Run once when component mounts
  
  // Wallet recap modal state
  const [showWalletRecapModal, setShowWalletRecapModal] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [lockedParticipants, setLockedParticipants] = useState<string[]>([]);
  const [allParticipantsLocked, setAllParticipantsLocked] = useState(false);
  const [isCheckingLocks, setIsCheckingLocks] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  
  const lockProgress = useRef(new Animated.Value(0)).current;
  const circleProgress = useRef(new Animated.Value(0)).current;

  // Memoize the bill date to prevent excessive FallbackDataService calls
  const billDate = useMemo(() => {
    try {
      return FallbackDataService.generateBillDate(processedBillData, billData, true);
    } catch (error) {
      return new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  }, [processedBillData, billData]);

  // Get category image based on data
  const getCategoryImage = () => {
    // Try to get category from different sources
    const category = splitData?.category || 
                    billData?.category || 
                    processedBillData?.category || 
                    'food'; // Default to food
    
    return CATEGORY_IMAGES[category] || CATEGORY_IMAGES['food'];
  };

  // Calculate progress percentage and update animation
  const updateCircleProgress = useCallback(() => {
    let lockedCount = 0;
    
    if (splitWallet?.participants) {
      // Use wallet participants for accurate count
      lockedCount = splitWallet.participants.filter((p: any) => 
        p.amountPaid > 0
      ).length;
    } else {
      // Fallback to local state
      lockedCount = lockedParticipants.length;
    }
    
    const totalCount = participants.length;
    const progressPercentage = totalCount > 0 ? lockedCount / totalCount : 0;
    
    logger.debug('Updating circle progress', {
      lockedCount,
      totalCount,
      progressPercentage: (progressPercentage * 100).toFixed(1) + '%',
      animatedValue: progressPercentage,
      shouldShowGreen: progressPercentage > 0
    });
    
    // Animate to the new progress value
    Animated.timing(circleProgress, {
      toValue: progressPercentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [splitWallet?.participants, lockedParticipants.length, participants.length, circleProgress]);

  

  // Validate required data
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    Alert.alert('Error', 'Invalid participants data. Please try again.');
    navigation.goBack();
    return null;
  }

  const handleLockMyShare = async () => {
    if (isLocked || isLocking || isLoadingWallet) return;
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Additional validation for participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      Alert.alert('Error', 'No participants found. Please try again.');
      return;
    }

    // Check user's actual USDC balance
    try {
      const { walletService } = await import('../../services/WalletService');
      const balanceResult = await walletService.getUserWalletBalance(currentUser.id.toString());
      
      const userBalance = balanceResult?.usdcBalance || 0;
      
      if (userBalance < totalAmount) {
        Alert.alert(
          'Insufficient Funds',
          `You need ${totalAmount} USDC to lock your share, but your current balance is ${userBalance} USDC. Please add more funds to your wallet.`,
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
      
      // User has sufficient funds, show confirmation modal
      setShowLockModal(true);
      
    } catch (error) {
      console.error('Error checking user balance:', error);
      // If balance check fails, still allow the user to attempt the lock
      Alert.alert(
        'Balance Check Failed',
        'Unable to verify your balance. You can still attempt to lock your share, but the transaction may fail if you have insufficient funds.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => setShowLockModal(true) }
        ]
      );
    }
  };


  const handleConfirmLock = async () => {
    setIsLocking(true);
    setShowLockModal(false);
    
    try {
      // Create split wallet if it doesn't exist
      let walletToUse = splitWallet;
      
      if (!walletToUse) {
        logger.info('Creating split wallet for degen split', null, 'DegenLockScreen');
        setIsCreatingWallet(true);
        
        const { SplitWalletService } = await import('../../services/split');
        const walletResult = await SplitWalletService.createDegenSplitWallet(
          splitData!.id,
          currentUser!.id.toString(),
          totalAmount,
          'USDC',
          participants.map(p => ({
            userId: p.userId || p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: totalAmount, // Each participant needs to lock the full amount for degen split
          }))
        );
        
        if (!walletResult.success || !walletResult.wallet) {
          throw new Error(walletResult.error || 'Failed to create split wallet');
        }
        
        walletToUse = walletResult.wallet;
        setSplitWallet(walletToUse);
        setIsCreatingWallet(false);
        
        // Show wallet recap modal after successful wallet creation
        setShowWalletRecapModal(true);
        
        logger.info('Split wallet created successfully for degen split', { splitWalletId: walletToUse.id }, 'DegenLockScreen');
      }

      // Sync participants between split data and split wallet if needed
      const splitParticipantIds = participants.map((p: any) => p.userId || p.id);
      const walletParticipantIds = walletToUse.participants.map((p: any) => p.userId);
      
      if (splitParticipantIds.length !== walletParticipantIds.length || 
          !splitParticipantIds.every(id => walletParticipantIds.includes(id))) {
        const participantsForUpdate = participants.map(p => ({
          userId: p.userId || p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: totalAmount, // Each participant needs to lock the full amount for degen split
        }));
        
        const syncResult = await SplitWalletService.updateSplitWalletParticipants(
          walletToUse.id,
          participantsForUpdate
        );
        
        if (!syncResult.success) {
          Alert.alert('Error', 'Failed to sync participants. Please try again.');
          setIsLocking(false);
          return;
        }
        
        // Reload the wallet to get updated participants
        const reloadResult = await SplitWalletService.getSplitWallet(walletToUse.id);
        if (reloadResult.success && reloadResult.wallet) {
          walletToUse = reloadResult.wallet;
          setSplitWallet(walletToUse);
        }
      }

      // Lock the current user's amount in the split wallet
      const lockResult = await SplitWalletService.lockParticipantAmount(
        walletToUse.id,
        currentUser!.id.toString(),
        totalAmount
      );

      if (!lockResult.success) {
        Alert.alert(
          'Lock Failed', 
          lockResult.error || 'Failed to lock amount. This might be due to insufficient funds or network issues.',
          [{ text: 'OK' }]
        );
        setIsLocking(false);
        return;
      }

      // Update locked participants list
      setLockedParticipants((prev: string[]) => [...prev, currentUser!.id.toString()]);

      // Update circle progress animation
      updateCircleProgress();

      // Send lock required notifications to all other participants
      const otherParticipantIds = participants
        .filter(p => (p.userId || p.id) !== currentUser!.id.toString())
        .map(p => p.userId || p.id);
      
      const billName = splitData?.title || billData?.title || 'Degen Split';

      if (otherParticipantIds.length > 0) {
        await notificationService.sendBulkNotifications(
          otherParticipantIds,
          'split_lock_required',
          {
            splitWalletId: walletToUse.id,
            billName,
            amount: totalAmount,
          }
        );
      }

      // Lock the split method in the split data
      if (splitData && splitData.id) {
        try {
          const { SplitStorageService } = await import('../../services/splitStorageService');
          await SplitStorageService.updateSplit(splitData.id, {
            splitType: 'degen',
            status: 'active',
          });
        } catch (error) {
          // Non-critical error, continue
        }
      }

      // Set locked state immediately (no animation)
      setIsLocked(true);
      setIsLocking(false);
      
      // Reload wallet to get updated participant status
      const updatedWalletResult = await SplitWalletService.getSplitWallet(walletToUse.id);
      if (updatedWalletResult.success && updatedWalletResult.wallet) {
        setSplitWallet(updatedWalletResult.wallet);
      }
      
      // Check if all participants have locked their funds
      checkAllParticipantsLocked();

    } catch (error) {
      Alert.alert('Error', 'Failed to lock amount. Please try again.');
      setIsLocking(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // Function to check if all participants have locked their funds
  const checkAllParticipantsLocked = useCallback(async () => {
    if (!splitWallet || !currentUser?.id) {
      return;
    }

    setIsCheckingLocks(true);
    try {
      // Get the current wallet status to check locked participants
      const walletResult = await SplitWalletService.getSplitWallet(splitWallet.id);
      
      if (walletResult.success && walletResult.wallet) {
        const wallet = walletResult.wallet;
        
        // Sync participants between split data and wallet if needed
        const splitParticipantIds = participants.map((p: any) => p.userId || p.id);
        const walletParticipantIds = wallet.participants.map((p: any) => p.userId);
        
        // Check if we need to sync participants
        const needsSync = splitParticipantIds.length !== walletParticipantIds.length || 
                         !splitParticipantIds.every(id => walletParticipantIds.includes(id));
        
        if (needsSync) {
          logger.info('Syncing participants between split data and wallet', null, 'DegenLockScreen');
          const participantsForUpdate = participants.map(p => ({
            userId: p.userId || p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: totalAmount, // Each participant needs to lock the full amount for degen split
            amountPaid: 0, // Start with 0 paid
            status: 'pending' as const
          }));
          
          const syncResult = await SplitWalletService.updateSplitWalletParticipants(
            wallet.id,
            participantsForUpdate
          );
          
          if (syncResult.success) {
            // Reload the wallet to get updated participants
            const reloadResult = await SplitWalletService.getSplitWallet(wallet.id);
            if (reloadResult.success && reloadResult.wallet) {
              wallet = reloadResult.wallet;
            }
          }
        }
        
        const totalParticipants = participants.length;
        
        // Check for locked participants - use amountPaid > 0 as the indicator
        const lockedCount = wallet.participants.filter((p: any) => 
          p.amountPaid > 0
        ).length;
        
        // Update locked participants list for UI
        const lockedParticipantIds = wallet.participants
          .filter((p: any) => p.amountPaid > 0)
          .map((p: any) => p.userId);
        
        // Only update state if there's a change to avoid unnecessary re-renders
        setLockedParticipants(prev => {
          const prevIds = prev.sort();
          const newIds = lockedParticipantIds.sort();
          if (prevIds.length !== newIds.length || !prevIds.every((id, index) => id === newIds[index])) {
            return lockedParticipantIds;
          }
          return prev;
        });
        
        // Check if all participants are locked
        const allLocked = lockedCount === totalParticipants;
        setAllParticipantsLocked(prev => {
          if (prev !== allLocked) {
            return allLocked;
          }
          return prev;
        });

        // Update the splitWallet state with fresh data
        setSplitWallet(wallet);
        
        // Update circle progress animation
        updateCircleProgress();
        
        logger.info('Participant lock status updated', {
          totalParticipants,
          lockedCount,
          allLocked,
          lockedParticipantIds
        });
      }
    } catch (error) {
      console.error('Error checking participant locks:', error);
    } finally {
      setIsCheckingLocks(false);
    }
  }, [splitWallet, currentUser?.id, participants, totalAmount, updateCircleProgress]);

  // Function to handle roulette button press
  const handleRollRoulette = () => {
    if (!allParticipantsLocked || !splitWallet) {
      return;
    }
    
    try {
      // Navigate to Degen Spin screen
      navigation.navigate('DegenSpin', {
        billData,
        participants,
        totalAmount,
        splitWallet,
        processedBillData,
        splitData,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start the roulette. Please try again.');
    }
  };

  const progressPercentage = lockProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Load split wallet if not provided and check lock status
  useEffect(() => {
    const loadSplitWallet = async () => {
      // For Degen Split, try to find the wallet by split ID if no walletId is provided
      let walletIdToLoad = splitData?.walletId;
      
      if (!walletIdToLoad && splitData?.id && splitData?.splitType === 'degen') {
        // Try to find the split wallet by billId (which should match the split ID for Degen Split)
        try {
          const { SplitWalletService } = await import('../../services/split');
          const searchResult = await SplitWalletService.getSplitWalletByBillId(splitData.id);
          if (searchResult.success && searchResult.wallet) {
            walletIdToLoad = searchResult.wallet.id;
            logger.info('Found Degen Split wallet by bill ID', { 
              splitId: splitData.id, 
              walletId: walletIdToLoad 
            });
          }
        } catch (error) {
          logger.warn('Could not find split wallet by bill ID', { 
            splitId: splitData.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      
      if (!splitWallet && walletIdToLoad) {
        setIsLoadingWallet(true);
        try {
          const walletResult = await SplitWalletService.getSplitWallet(walletIdToLoad);
          if (walletResult.success && walletResult.wallet) {
            setSplitWallet(walletResult.wallet);
            
            // Check if current user has already locked their funds
            if (currentUser?.id) {
              const userParticipant = walletResult.wallet.participants.find(
                p => p.userId === currentUser.id.toString()
              );
              
              if (userParticipant && userParticipant.amountPaid > 0) {
                setIsLocked(true);
                setLockedParticipants(prev => [...prev, currentUser.id.toString()]);
                logger.info('Current user already locked funds', {
                  userId: currentUser.id.toString(),
                  amountPaid: userParticipant.amountPaid
                });
              }
            }
            
            // Immediately check all participants' lock status to avoid flicker
            await checkAllParticipantsLocked();
            
            // Update circle progress animation
            updateCircleProgress();
          }
        } catch (error) {
          // Silent error handling
        } finally {
          setIsLoadingWallet(false);
        }
      }
    };

    loadSplitWallet();
  }, [splitData?.walletId, checkAllParticipantsLocked, updateCircleProgress]);

  // For non-creators in Degen Split, periodically check for wallet creation
  useEffect(() => {
    if (!splitWallet && splitData?.splitType === 'degen' && currentUser?.id !== splitData?.creatorId) {
      const interval = setInterval(async () => {
        try {
          const { SplitWalletService } = await import('../../services/split');
          const searchResult = await SplitWalletService.getSplitWalletByBillId(splitData.id);
          if (searchResult.success && searchResult.wallet) {
            setSplitWallet(searchResult.wallet);
            clearInterval(interval);
            logger.info('Degen Split wallet found for non-creator', { 
              splitId: splitData.id, 
              walletId: searchResult.wallet.id 
            });
          }
        } catch (error) {
          logger.warn('Error checking for Degen Split wallet', { 
            splitId: splitData.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [splitWallet, splitData?.splitType, splitData?.id, splitData?.creatorId, currentUser?.id]);

  // Update allParticipantsLocked when splitWallet changes
  useEffect(() => {
    if (splitWallet?.participants) {
      // Check for locked participants using amountPaid > 0
      const lockedCount = splitWallet.participants.filter((p: any) => 
        p.amountPaid > 0
      ).length;
      const allLocked = lockedCount === participants.length;
      setAllParticipantsLocked(allLocked);
      
      // Update circle progress animation
      updateCircleProgress();
      
      logger.info('Wallet participants updated', {
        totalParticipants: participants.length,
        lockedCount,
        allLocked
      });
    }
  }, [splitWallet, participants.length, updateCircleProgress]);

  // Periodic check for participant locks when user has locked their funds
  useEffect(() => {
    if (!isLocked || allParticipantsLocked) {
      return;
    }

    const interval = setInterval(() => {
      checkAllParticipantsLocked();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isLocked, allParticipantsLocked]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Image 
            source={require('../../../assets/chevron-left.png')} 
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Degen Split</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Bill Info Card with Gradient */}
        <LinearGradient
          colors={[colors.green, colors.greenBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.billCard}
        >
          <View style={styles.billCardHeader}>
            <View style={styles.billIconContainer}>
              <Image 
                source={getCategoryImage()} 
                style={styles.billIcon}
                tintColor={colors.white}
                resizeMode="contain"
              />
            </View>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billTitle}>{splitData?.title || billData?.title || 'Degen Split'}</Text>
              <Text style={styles.billDate}>
                {billDate}
              </Text>
            </View>
          </View>
          <View style={styles.totalBillRow}>
            <Text style={styles.totalBillLabel}>Total Bill</Text>
            <Text style={styles.totalBillAmount}>{totalAmount} USDC</Text>
          </View>
          <View style={styles.billCardDotLeft}/>
          <View style={styles.billCardDotRight}/>
        </LinearGradient>

        {/* Split Wallet Section - Show when wallet exists OR for Degen Split participants */}
        {(splitWallet || (splitData?.splitType === 'degen' && splitData)) && (
          <View style={styles.splitWalletSection}>
            <Text style={styles.splitWalletTitle}>Split Wallet</Text>
            <View style={styles.splitWalletCard}>
              <View style={styles.splitWalletInfo}>
                <Text style={styles.splitWalletLabel}>Wallet Address</Text>
                <View style={styles.walletAddressContainer}>
                  <Text style={styles.splitWalletAddress}>
                    {splitWallet ? formatWalletAddress(splitWallet.walletAddress) : 'Wallet not created yet'}
                  </Text>
                  <TouchableOpacity onPress={() => splitWallet && handleCopyWalletAddress(splitWallet.walletAddress)}>
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

        {/* Lock Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            {/* Background circle */}
            <View style={styles.progressBackground} />
            
            {/* Progress fill using a simpler approach */}
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  borderColor: 'transparent',
                  borderTopColor: circleProgress.interpolate({
                    inputRange: [0, 0.01, 1],
                    outputRange: ['transparent', colors.green, colors.green],
                  }),
                  borderRightColor: circleProgress.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: ['transparent', 'transparent', colors.green],
                  }),
                  borderBottomColor: circleProgress.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ['transparent', 'transparent', colors.green],
                  }),
                  borderLeftColor: circleProgress.interpolate({
                    inputRange: [0, 0.75, 1],
                    outputRange: ['transparent', 'transparent', colors.green],
                  }),
                }
              ]} 
            />
            
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>
                {(() => {
                  // Use wallet data for accurate count if available
                  if (splitWallet?.participants) {
                    const lockedCount = splitWallet.participants.filter((p: any) => 
                      p.amountPaid > 0
                    ).length;
                    return `${lockedCount}/${participants.length}`;
                  }
                  return `${lockedParticipants.length}/${participants.length}`;
                })()}
              </Text>
              <Text style={styles.progressAmount}>
                Locked
              </Text>
            </View>
          </View>
        </View>

        {/* Participants List */}
        <View style={styles.participantsContainer}>
          {participants.map((participant, index) => {
            // Use wallet participant data if available for accurate lock status
            const walletParticipant = splitWallet?.participants?.find((p: any) => p.userId === (participant.userId || participant.id));
            const isParticipantLocked = walletParticipant ? 
              walletParticipant.amountPaid > 0 : 
              lockedParticipants.includes(participant.userId || participant.id);
            
            // Check if this is the current user
            const isCurrentUser = currentUser?.id && (participant.userId || participant.id) === currentUser.id.toString();
            
            return (
              <View key={participant.userId || participant.id || `participant_${index}`} style={styles.participantCard}>
                <UserAvatar
                  displayName={participant.name || `Participant ${index + 1}`}
                  size={40}
                  style={styles.participantAvatar}
                />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {participant.name || `Participant ${index + 1}`}
                    {isCurrentUser && ' (You)'}
                  </Text>
                  <Text style={styles.participantWallet}>
                    {participant.walletAddress && participant.walletAddress.length > 8 ? 
                      `${participant.walletAddress.slice(0, 4)}...${participant.walletAddress.slice(-4)}` : 
                      participant.walletAddress || 'No wallet address'
                    }
                  </Text>
                </View>
                <View style={styles.participantAmountContainer}>
                  <Text style={styles.participantAmount}>{totalAmount} USDC</Text>
                  {isParticipantLocked ? (
                    <View style={styles.lockedIndicator}>
                      <Text style={styles.lockedIndicatorText}>🔒 Locked</Text>
                    </View>
                  ) : (
                    <View style={styles.unlockedIndicator}>
                      <Text style={styles.unlockedIndicatorText}>⏳ Pending</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Removed instructions section to match design */}

        {/* Lock Button - Pushed to bottom */}
        <View style={[styles.lockButtonContainer]}>
          {!splitWallet && currentUser?.id === splitData?.creatorId ? (
            // Creator and no wallet yet - show "Lock the Split" button
            <TouchableOpacity
              onPress={handleConfirmLock}
              disabled={isCreatingWallet}
            >
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.lockButton}
              >
                <Text style={styles.lockButtonText}>
                  {isCreatingWallet ? 'Creating Split...' : 'Lock the Split'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : !isLocked ? (
            // Not locked yet - show lock button
            <TouchableOpacity
              onPress={handleLockMyShare}
              disabled={isLocking || isLoadingWallet}
            >
              <LinearGradient
                colors={[colors.green, colors.greenBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.lockButton}
              >
                <Text style={styles.lockButtonText}>
                  {isLocking ? 'Locking...' : isLoadingWallet ? 'Loading...' : 'Lock my share'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : currentUser?.id === splitData?.creatorId ? (
            // Creator and locked - show waiting or start spinning
            allParticipantsLocked ? (
              // All locked - show start spinning button
              <TouchableOpacity
                style={styles.lockButton}
                onPress={handleRollRoulette}
                disabled={isCheckingLocks}
              >
                <LinearGradient
                  colors={[colors.green, colors.greenBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.lockButton}
                >
                  <Text style={styles.lockButtonText}>
                    {isCheckingLocks ? 'Checking...' : 'Start Spinning'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              // Not all locked - show waiting message
              <View style={[styles.lockButton, styles.lockButtonDisabled]}>
                <Text style={[styles.lockButtonText, styles.lockButtonTextDisabled]}>
                  {(() => {
                    // Use wallet data for accurate count
                    if (splitWallet?.participants) {
                      const lockedCount = splitWallet.participants.filter((p: any) => 
                        p.amountPaid > 0
                      ).length;
                      const remaining = participants.length - lockedCount;
                      return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
                    }
                    const remaining = participants.length - lockedParticipants.length;
                    return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
                  })()}
                </Text>
              </View>
            )
          ) : (
            // Not creator but locked - show waiting message
            <View style={[styles.lockButton, styles.lockButtonDisabled]}>
              <Text style={[styles.lockButtonText, styles.lockButtonTextDisabled]}>
                {allParticipantsLocked 
                  ? 'Waiting for the creator to spin!' 
                  : (() => {
                      // Use wallet data for accurate count
                      if (splitWallet?.participants) {
                        const lockedCount = splitWallet.participants.filter((p: any) => 
                          p.amountPaid > 0
                        ).length;
                        const remaining = participants.length - lockedCount;
                        return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
                      }
                      const remaining = participants.length - lockedParticipants.length;
                      return `Waiting for ${remaining} more participant${remaining !== 1 ? 's' : ''} to lock`;
                    })()
                }
              </Text>
            </View>
          )}
        </View>

        {/* Roulette section removed - integrated into main button */}
      </ScrollView>

      {/* Lock Confirmation Modal */}
      {showLockModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Image 
                  source={require('../../../assets/lock-check-icon.png')} 
                  style={styles.modalLockIcon}
                />
              </View>
              <Text style={styles.modalTitle}>
                Lock {totalAmount} USDC to split the Bill
              </Text>
              <Text style={styles.modalSubtitle}>
                Your share is unlocked after the split is done!
              </Text>
              
              <AppleSlider
                onSlideComplete={handleConfirmLock}
                disabled={isLocking}
                loading={isLocking}
                text="Slide to Lock"
              />
            </View>
          </View>
        </View>
      )}

      {/* Wallet Recap Modal */}
      {showWalletRecapModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.walletRecapModal}>
            <Text style={styles.walletRecapTitle}>🎉 Split Wallet Created!</Text>
            <Text style={styles.walletRecapSubtitle}>
              Your Degen Split wallet has been created with shared private key access. All participants can access the private key to withdraw or move funds.
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

      {/* Shared Private Key Access Info */}
      {splitWallet && (
        <View style={styles.sharedAccessSection}>
          <Text style={styles.sharedAccessTitle}>🔑 Shared Private Key Access</Text>
          <Text style={styles.sharedAccessSubtitle}>
            All participants in this Degen Split have access to the private key and can withdraw or move funds from the split wallet.
          </Text>
          
          <View style={styles.participantsList}>
            {participants.map((participant: any, index: number) => (
              <View key={participant.userId || participant.id} style={styles.participantAccessCard}>
                <UserAvatar
                  userId={participant.userId || participant.id}
                  displayName={participant.name}
                  size={32}
                  style={styles.participantAccessAvatar}
                />
                <View style={styles.participantAccessInfo}>
                  <Text style={styles.participantAccessName}>{participant.name}</Text>
                  <Text style={styles.participantAccessStatus}>✅ Has private key access</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Private Key Modal */}
      {showPrivateKeyModal && privateKey && (
        <View style={styles.modalOverlay}>
          <View style={styles.privateKeyModal}>
            <Text style={styles.privateKeyModalTitle}>🔑 Private Key</Text>
            <Text style={styles.privateKeyModalSubtitle}>
              This is a shared private key for the Degen Split. All participants have access to this key to withdraw or move funds from the split wallet.
            </Text>
            
            <View style={styles.privateKeyDisplay}>
              <Text style={styles.privateKeyText}>{privateKey}</Text>
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


export default DegenLockScreen;




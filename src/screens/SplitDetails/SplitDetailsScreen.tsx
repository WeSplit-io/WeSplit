/**
 * Split Details Screen
 * Screen for editing bill split details, managing participants, and configuring split methods
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './styles';
import { ProcessedBillData } from '../../services/billing';
import { BillAnalysisResult } from '../../types/billAnalysis';
import { consolidatedBillAnalysisService } from '../../services/billing';
import { convertFiatToUSDC, formatCurrencyAmount } from '../../services/core';
import { nfcService } from '../../services/core';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';
import { debugSplitData, validateSplitData, clearSplitCaches } from '../../services/shared/splitDataUtils';
import { firebaseDataService } from '../../services/data';
import { splitStorageService, Split, SplitStorageService, splitInvitationService } from '../../services/splits';
import { SplitInvitationService } from '../../services/splits/splitInvitationService';
import { splitRealtimeService, SplitRealtimeUpdate } from '../../services/splits';
// Removed SplitWalletService import - wallets are now created only when split type is selected
import FallbackDataService from '../../services/data';
import { MockupDataService } from '../../services/data/mockupData';
import { notificationService } from '../../services/notifications';
import UserAvatar from '../../components/UserAvatar';
import QrCodeView from '../../services/core/QrCodeView';
import {
  SplitDetailsNavigationParams,
  SplitDataConverter,
  UnifiedBillData,
  UnifiedParticipant
} from '../../types/splitNavigation';
import { Container, Header, Button } from '../../components/shared';
import CustomModal from '../../components/shared/Modal';

// Image mapping for category icons
const CATEGORY_IMAGES: { [key: string]: any } = {
  trip: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftrip-icon-black.png?alt=media&token=3afeb768-566f-4fd7-a550-a19c5c4f5caf' },
  food: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffood-icon-black.png?alt=media&token=ef382697-bf78-49e6-b3b3-f669378ebd36' },
  home: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhouse-icon-black.png?alt=media&token=03406723-1c5b-45fd-a20b-dda8c49a2f83' },
  event: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fevent-icon-black.png?alt=media&token=b11d12c2-c4d9-4029-be12-0ddde31ad0d1' },
  rocket: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Frocket-icon-black.png?alt=media&token=90fabb5a-8110-4fd9-9753-9c785fa953a4' },
};

// Local image mapping for category icons (for tintColor support)
const CATEGORY_IMAGES_LOCAL: { [key: string]: any } = {
  trip: require('../../../assets/trip-icon-black.png'),
  food: require('../../../assets/food-icon-black.png'),
  home: require('../../../assets/house-icon-black.png'),
  event: require('../../../assets/event-icon-black.png'),
  rocket: require('../../../assets/rocket-icon-black.png'),
};

interface SplitDetailsScreenProps {
  navigation: any;
  route?: {
    params?: SplitDetailsNavigationParams & {
      imageUri?: string;
      isNewBill?: boolean;
      isManualCreation?: boolean;
      selectedContact?: any;
      selectedContacts?: any[];
      shareableLink?: string;
      splitInvitationData?: string;
      currentSplitData?: Split;
    };
  };
}

const SplitDetailsScreen: React.FC<SplitDetailsScreenProps> = ({ navigation, route }) => {
  // Get data from route params - support both new splits and existing splits
  const {
    billData,
    processedBillData,
    analysisResult,
    splitId,
    splitData,
    isEditing,
    imageUri,
    isNewBill,
    isManualCreation,
    selectedContact,
    isFromNotification,
    notificationId,
    shareableLink,
    splitInvitationData,
    currentSplitData: routeCurrentSplitData
  } = route?.params || {};

  // CRITICAL: Override splitId if this is a new bill to prevent loading old splits
  // Fallback: If isNewBill/isManualCreation are undefined but we have processedBillData, treat as new bill
  const isActuallyNewBill = isNewBill === true || (isNewBill === undefined && processedBillData && !splitId);
  const isActuallyManualCreation = isManualCreation === true || (isManualCreation === undefined && processedBillData && !splitId);
  
  const effectiveSplitId = (isActuallyNewBill || isActuallyManualCreation) ? undefined : splitId;
  
  console.log('🔍 SplitDetailsScreen: Effective splitId determined', {
    originalSplitId: splitId,
    effectiveSplitId,
    isNewBill,
    isManualCreation,
    isActuallyNewBill,
    isActuallyManualCreation,
    hasProcessedBillData: !!processedBillData,
    reason: (isActuallyNewBill || isActuallyManualCreation) ? 'New bill - splitId overridden' : 'Existing split - using original splitId'
  });

  // Utility function to format wallet address
  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) {return address;}
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const { state } = useApp();
  const { currentUser } = state;

  // State to track if we've initialized with new bill data
  const [hasInitializedWithNewBillData, setHasInitializedWithNewBillData] = useState(false);

  // Debug logging for OCR AI flow
  useEffect(() => {
    console.log('🔍 SplitDetailsScreen: Route params received', {
      originalSplitId: splitId,
      effectiveSplitId,
      isNewBill,
      isManualCreation,
      hasProcessedBillData: !!processedBillData,
      hasBillData: !!billData,
      hasSplitData: !!splitData,
      hasCurrentSplitData: !!routeCurrentSplitData,
      isEditing,
      imageUri: !!imageUri,
      // Additional debugging
      allRouteParams: route?.params,
      navigationState: navigation.getState?.()?.routes?.map(r => ({ name: r.name, params: r.params })),
      // CRITICAL: Check if this is a duplicate navigation
      isDuplicateNavigation: !processedBillData && splitId && !isNewBill && !isManualCreation
    });
    
    // CRITICAL: Check if isNewBill and isManualCreation are undefined
    if (isNewBill === undefined && isManualCreation === undefined) {
      console.log('🚨 SplitDetailsScreen: CRITICAL - isNewBill and isManualCreation are undefined!', {
        routeParams: route?.params,
        isNewBill,
        isManualCreation,
        splitId
      });
    }
    
    // CRITICAL: Check if processedBillData is missing
    if (!processedBillData && splitId) {
      console.log('🚨 SplitDetailsScreen: CRITICAL - No processedBillData but have splitId! This suggests navigation from SplitsList, not OCR flow!', {
        splitId,
        hasProcessedBillData: !!processedBillData,
        hasBillData: !!billData,
        navigationSource: 'Likely from SplitsList or other source, not OCR flow'
      });
      
      // CRITICAL: If this is a duplicate navigation with old split data, ignore it
      if (!isNewBill && !isManualCreation && !processedBillData && splitId) {
        console.log('🚨 SplitDetailsScreen: BLOCKING duplicate navigation with old split data!', {
          splitId,
          isNewBill,
          isManualCreation,
          hasProcessedBillData: !!processedBillData,
          hasInitializedWithNewBillData,
          navigationStack: navigation.getState?.()?.routes?.map(r => ({ name: r.name, params: r.params }))
        });
        
        // If we've already initialized with new bill data, ignore this old split navigation
        if (hasInitializedWithNewBillData) {
          console.log('🔍 SplitDetailsScreen: Already initialized with new bill data, ignoring old split navigation');
          return;
        }
        
        // Instead of navigating back, let's just ignore this navigation
        // and keep the current state (which should be the new split data)
        console.log('🔍 SplitDetailsScreen: Ignoring duplicate navigation, keeping current state');
        return;
      }
    }
  }, [splitId, effectiveSplitId, isNewBill, isManualCreation, processedBillData, billData, splitData, routeCurrentSplitData, isEditing, imageUri, hasInitializedWithNewBillData]);

  const [billName, setBillName] = useState(() => {
    console.log('🔍 SplitDetailsScreen: billName initialization', {
      routeCurrentSplitDataTitle: routeCurrentSplitData?.title,
      splitDataTitle: splitData?.title,
      processedBillDataTitle: processedBillData?.title,
      billDataTitle: billData?.title,
      isActuallyNewBill,
      isActuallyManualCreation
    });
    
    // For new bills, prioritize processed data over existing split data
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (processedBillData?.title) {
        console.log('🔍 SplitDetailsScreen: Using processedBillData title for new bill:', processedBillData.title);
        return processedBillData.title;
      }
      if (billData?.title) {
        console.log('🔍 SplitDetailsScreen: Using billData title for new bill:', billData.title);
        return billData.title;
      }
    }
    
    // Use data from existing split if available, otherwise use processed data
    if (routeCurrentSplitData?.title) {
      console.log('🔍 SplitDetailsScreen: Using routeCurrentSplitData title:', routeCurrentSplitData.title);
      return routeCurrentSplitData.title;
    }
    if (splitData?.title) {
      console.log('🔍 SplitDetailsScreen: Using splitData title:', splitData.title);
      return splitData.title;
    }
    if (processedBillData?.title) {
      console.log('🔍 SplitDetailsScreen: Using processedBillData title:', processedBillData.title);
      return processedBillData.title;
    }
    if (billData?.title) {
      console.log('🔍 SplitDetailsScreen: Using billData title:', billData.title);
      return billData.title;
    }
    console.log('🔍 SplitDetailsScreen: Using default title: New Split');
    return 'New Split'; // Default fallback instead of mockup data
  });

  const [totalAmount, setTotalAmount] = useState(() => {
    console.log('🔍 SplitDetailsScreen: totalAmount initialization', {
      routeCurrentSplitDataTotalAmount: routeCurrentSplitData?.totalAmount,
      splitDataTotalAmount: splitData?.totalAmount,
      processedBillDataTotalAmount: processedBillData?.totalAmount,
      billDataTotalAmount: billData?.totalAmount,
      isActuallyNewBill,
      isActuallyManualCreation
    });
    
    // For new bills, prioritize processed data over existing split data
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (processedBillData?.totalAmount) {
        console.log('🔍 SplitDetailsScreen: Using processedBillData totalAmount for new bill:', processedBillData.totalAmount);
        return processedBillData.totalAmount.toString();
      }
      if (billData?.totalAmount) {
        console.log('🔍 SplitDetailsScreen: Using billData totalAmount for new bill:', billData.totalAmount);
        return billData.totalAmount.toString();
      }
    }
    
    // Use data from existing split if available, otherwise use processed data
    if (routeCurrentSplitData?.totalAmount) {
      console.log('🔍 SplitDetailsScreen: Using routeCurrentSplitData totalAmount:', routeCurrentSplitData.totalAmount);
      return routeCurrentSplitData.totalAmount.toString();
    }
    if (splitData?.totalAmount) {
      console.log('🔍 SplitDetailsScreen: Using splitData totalAmount:', splitData.totalAmount);
      return splitData.totalAmount.toString();
    }
    if (processedBillData?.totalAmount) {
      console.log('🔍 SplitDetailsScreen: Using processedBillData totalAmount:', processedBillData.totalAmount);
      return processedBillData.totalAmount.toString();
    }
    if (billData?.totalAmount) {
      console.log('🔍 SplitDetailsScreen: Using billData totalAmount:', billData.totalAmount);
      return billData.totalAmount.toString();
    }
    console.log('🔍 SplitDetailsScreen: Using default totalAmount: 0');
    return '0'; // Default fallback instead of mockup data
  });
  const [showSplitModalState, setShowSplitModalState] = useState(false);
  const [selectedSplitType, setSelectedSplitType] = useState<'fair' | 'degen' | null>(() => {
    // Initialize with existing split type if available
    if (routeCurrentSplitData?.splitType) {
      return routeCurrentSplitData.splitType;
    }
    if (splitData?.splitType) {
      return splitData.splitType;
    }
    return null;
  });
  // Private key modal state moved to FairSplit/DegenLock screens
  const [showAddFriendsModalState, setShowAddFriendsModalState] = useState(false);

  // Animation refs for modals
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const splitModalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const splitModalOpacity = useRef(new Animated.Value(0)).current;
  const addFriendsModalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const addFriendsModalOpacity = useRef(new Animated.Value(0)).current;
  // Private key modal animation refs moved to FairSplit/DegenLock screens
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [currentSplitData, setCurrentSplitData] = useState<Split | null>(() => {
    console.log('🔍 SplitDetailsScreen: currentSplitData initialization', {
      splitData: !!splitData,
      routeCurrentSplitData: !!routeCurrentSplitData,
      splitDataId: splitData?.id,
      routeCurrentSplitDataId: routeCurrentSplitData?.id,
      isActuallyNewBill,
      isActuallyManualCreation
    });
    
    // For new bills, don't initialize with any existing split data
    if (isActuallyNewBill || isActuallyManualCreation) {
      console.log('🔍 SplitDetailsScreen: New bill - not initializing with existing split data');
      return null;
    }
    
    return splitData || routeCurrentSplitData || null;
  });
  const [splitWallet, setSplitWallet] = useState<any>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isProcessingNewBill, setIsProcessingNewBill] = useState(false);
  const [newBillProcessingResult, setNewBillProcessingResult] = useState<BillAnalysisResult | null>(null);
  const [hasAttemptedProcessing, setHasAttemptedProcessing] = useState(false); // Prevent infinite retry loops
  const [currentProcessedBillData, setCurrentProcessedBillData] = useState<ProcessedBillData | null>(() => {
    console.log('🔍 SplitDetailsScreen: currentProcessedBillData initialization', {
      hasProcessedBillData: !!processedBillData,
      hasSplitData: !!splitData,
      splitDataId: splitData?.id,
      isActuallyNewBill,
      isActuallyManualCreation
    });
    
    // For new bills, only use processedBillData, not splitData
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (processedBillData) {
        console.log('🔍 SplitDetailsScreen: Using processedBillData for new bill');
        // Set flag to indicate we've initialized with new bill data
        setTimeout(() => setHasInitializedWithNewBillData(true), 0);
        return processedBillData;
      }
      console.log('🔍 SplitDetailsScreen: No processedBillData for new bill, returning null');
      return null;
    }
    
    // Use processedBillData if available, otherwise create from splitData
    if (processedBillData) {
      console.log('🔍 SplitDetailsScreen: Using processedBillData for existing split');
      return processedBillData;
    }
    if (splitData) {
      console.log('🔍 SplitDetailsScreen: Creating ProcessedBillData from splitData');
      // Create ProcessedBillData from splitData
      return {
        id: splitData.billId || splitData.id,
        title: splitData.title,
        merchant: splitData.merchant?.name || 'Unknown Merchant',
        location: splitData.merchant?.address || 'Unknown Location',
        date: splitData.date,
        time: new Date().toLocaleTimeString(),
        currency: splitData.currency,
        totalAmount: splitData.totalAmount,
        subtotal: splitData.totalAmount * 0.9, // Estimate
        tax: splitData.totalAmount * 0.1, // Estimate
        items: (splitData.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1, // Default quantity
          category: 'Other', // Default category
          participants: item.participants || [],
          isSelected: true,
        })),
        participants: splitData.participants.map(p => ({
          id: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          status: (p.status === 'invited' || p.status === 'paid' || p.status === 'locked') ? 'pending' as const : p.status as ('pending' | 'accepted' | 'declined'),
          amountOwed: p.amountOwed,
          items: [],
        })),
        settings: {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal' as const,
          taxIncluded: true,
        },
        originalAnalysis: {} as any,
      };
    }
    return null;
  });
  const [isInvitingUsers, setIsInvitingUsers] = useState(false);
  const [createdSplitId, setCreatedSplitId] = useState<string | null>(null);
  const [isJoiningSplit, setIsJoiningSplit] = useState(false);
  const [hasJustJoinedSplit, setHasJustJoinedSplit] = useState(false);
  const [usdcEquivalent, setUsdcEquivalent] = useState<number | null>(null);

  // Real-time update states
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  // useEffect hooks for data loading and initialization
  useEffect(() => {
    // Handle notification navigation
    if (isFromNotification && effectiveSplitId) {
      handleJoinSplitFromNotification();
    }
  }, [isFromNotification, effectiveSplitId]);

  useEffect(() => {
    // Load split data if we have an effective splitId (only for existing splits)
    if (effectiveSplitId) {
      console.log('🔍 SplitDetailsScreen: Loading existing split data', { effectiveSplitId, isActuallyNewBill, isActuallyManualCreation });
      loadSplitData();
    } else if (isActuallyNewBill || isActuallyManualCreation) {
      console.log('🔍 SplitDetailsScreen: Creating new split from bill data', { isActuallyNewBill, isActuallyManualCreation, hasProcessedData: !!processedBillData });
    }
  }, [effectiveSplitId, isActuallyNewBill, isActuallyManualCreation]);

  // Handle returning from Contacts screen - reload split data if we have effectiveSplitId but no currentSplitData
  useEffect(() => {
    if (effectiveSplitId && !currentSplitData && route?.params?.selectedContacts) {
      console.log('🔍 SplitDetailsScreen: Reloading split data after contacts selection', { effectiveSplitId, isActuallyNewBill, isActuallyManualCreation });
      loadSplitData();
    } else if (route?.params?.selectedContacts && (isActuallyNewBill || isActuallyManualCreation)) {
      console.log('🔍 SplitDetailsScreen: Contacts selected for new bill, not reloading split data', { isActuallyNewBill, isActuallyManualCreation });
    }
  }, [route?.params?.selectedContacts]);

  // Update state when currentSplitData is loaded
  useEffect(() => {
    if (currentSplitData) {
      setBillName(currentSplitData.title);
      setTotalAmount(currentSplitData.totalAmount.toString());
      setSelectedSplitType(currentSplitData.splitType || null);

      // No longer managing separate invited users state - all participants are shown in the main list
    }
  }, [currentSplitData]);

  // Removed automatic wallet creation - wallets should only be created when split type is selected

  useEffect(() => {
    // Convert currency to USDC
    if (totalAmount && !isConvertingCurrency) {
      convertCurrencyToUSDC();
    }
  }, [totalAmount]);

  useEffect(() => {
    // Generate QR code data
    if (currentSplitData || createdSplitId) {
      generateQRCodeData();
    }
  }, [currentSplitData, createdSplitId]);

  useEffect(() => {
    // Handle split invitation data
    if (splitInvitationData) {
      handleSplitInvitation();
    }
  }, [splitInvitationData]);

  useEffect(() => {
    // Check for existing split
    if (isNewBill && !hasAttemptedProcessing) {
      checkExistingSplit();
    }
  }, [isNewBill]);

  useEffect(() => {
    // Invite contact if selected
    if (selectedContact) {
      inviteContact(selectedContact);
    }
  }, [selectedContact]);

  // Handle selected contacts from Contacts screen
  useEffect(() => {
    if (route?.params?.selectedContacts && Array.isArray(route.params.selectedContacts)) {
      // Add all selected contacts to invited users
      route.params.selectedContacts.forEach((contact: any) => {
        inviteContact(contact);
      });

      // Clear the selected contacts from route params to avoid re-processing
      navigation.setParams({ selectedContacts: undefined });
    }
  }, [route?.params?.selectedContacts]);

  useEffect(() => {
    // Check if split is already active/locked and redirect accordingly
    const checkSplitStateAndRedirect = async () => {
      if (!currentSplitData || !currentSplitData.splitType) {return;}

      // Only redirect if the split is already active/locked and we're not from a notification
      if (currentSplitData.status === 'active' || currentSplitData.status === 'locked') {
        // Split is already active/locked, redirecting to appropriate screen

        // Small delay to ensure UI is ready
        setTimeout(() => {
          if (currentSplitData.splitType === 'fair') {
            navigation.navigate('FairSplit', {
              splitData: currentSplitData,
              billData: billData,
              processedBillData: currentProcessedBillData,
              splitWallet: splitWallet,
              isFromNotification: isFromNotification,
              notificationId: notificationId
            });
          } else if (currentSplitData.splitType === 'degen') {
            navigation.navigate('DegenLock', {
              splitData: currentSplitData,
              billData: billData,
              processedBillData: currentProcessedBillData,
              splitWallet: splitWallet,
              isFromNotification: isFromNotification,
              notificationId: notificationId
            });
          }
        }, 100);
      }
    };

    checkSplitStateAndRedirect();
  }, [currentSplitData, navigation, billData, currentProcessedBillData, splitWallet, isFromNotification, notificationId]);

  // Async function implementations
  const loadSplitData = async () => {
    if (!effectiveSplitId) {
      console.log('🔍 SplitDetailsScreen: loadSplitData called but no effectiveSplitId');
      return;
    }

    try {
      // Clear any potential caches first
      clearSplitCaches();
      
      logger.info('Loading split data for details screen', { splitId: effectiveSplitId }, 'SplitDetailsScreen');
      
      const result = await SplitStorageService.forceRefreshSplit(effectiveSplitId);
      if (result.success && result.split) {
        const splitData = result.split;
        
        // Debug the loaded split data
        debugSplitData(splitData, 'SplitDetailsScreen-loaded');
        
        // Validate the split data
        const validation = validateSplitData(splitData);
        if (!validation.isValid) {
          logger.error('Invalid split data loaded in details screen', { errors: validation.errors }, 'SplitDetailsScreen');
        }

        // Fetch latest user data for all participants to get current wallet addresses
        const updatedParticipants = await Promise.all(
          splitData.participants.map(async (participant: any) => {
            try {
              const { firebaseDataService } = await import('../../services/data');
              const latestUserData = await firebaseDataService.user.getCurrentUser(participant.userId);

              // Debug logging for user data
              console.log(`🔍 User data for ${participant.userId}:`, {
                name: latestUserData?.name,
                wallet_address: latestUserData?.wallet_address,
                originalWalletAddress: participant.walletAddress
              });

              // Use latest wallet address if available, otherwise keep existing data
              return {
                ...participant,
                walletAddress: latestUserData?.wallet_address || participant.walletAddress || participant.wallet_address || ''
              };
            } catch (error) {
              console.warn(`Could not fetch latest data for participant ${participant.userId}:`, error);
              return participant; // Return original participant data if fetch fails
            }
          })
        );

        // Update split data with refreshed participant information
        const updatedSplitData = {
          ...splitData,
          participants: updatedParticipants
        };

        setCurrentSplitData(updatedSplitData);

        // Debug logging for split data
        console.log('🔍 Loaded split data:', {
          splitId: splitData.id,
          title: splitData.title,
          participantsCount: updatedParticipants.length,
          participants: updatedParticipants.map(p => ({
            name: p.name,
            status: p.status,
            walletAddress: p.walletAddress
          }))
        });

        // No longer managing separate invited users state - all participants are shown in the main list
      }
    } catch (error) {
      console.error('Error loading split data:', error);
    }
  };

  // Real-time update functions
  const startRealtimeUpdates = useCallback(async () => {
    if (!effectiveSplitId || isRealtimeActive) {
      console.log('🔍 Real-time updates not started:', { effectiveSplitId, isRealtimeActive, originalSplitId: splitId });
      return;
    }

    try {
      console.log('🔍 Starting real-time updates for split:', effectiveSplitId);
      logger.info('Starting real-time updates for split', { splitId: effectiveSplitId }, 'SplitDetailsScreen');

      const cleanup = await splitRealtimeService.startListening(
        effectiveSplitId,
        {
          onSplitUpdate: (update: SplitRealtimeUpdate) => {
            console.log('🔍 Real-time split update received:', {
              splitId: effectiveSplitId,
              hasChanges: update.hasChanges,
              participantsCount: update.participants.length,
              splitTitle: update.split?.title
            });
            logger.debug('Real-time split update received', {
              splitId: effectiveSplitId,
              hasChanges: update.hasChanges,
              participantsCount: update.participants.length
            }, 'SplitDetailsScreen');

            if (update.split) {
              // Update the current split data
              setCurrentSplitData(update.split);
              setBillName(update.split.title);
              setTotalAmount(update.split.totalAmount.toString());
              setSelectedSplitType(update.split.splitType || null);
              setLastRealtimeUpdate(update.lastUpdated);

              // Convert currency to USDC if needed
              if (update.split.currency !== 'USDC') {
                setIsConvertingCurrency(true);
                convertFiatToUSDC(update.split.totalAmount, update.split.currency)
                  .then(usdcAmount => {
                    setUsdcEquivalent(usdcAmount);
                  })
                  .catch(error => {
                    console.error('Error converting currency:', error);
                    // Fallback to original amount if conversion fails
                    setUsdcEquivalent(update.split?.totalAmount || 0);
                  })
                  .finally(() => {
                    setIsConvertingCurrency(false);
                  });
              } else {
                // If already USDC, set equivalent to the amount
                setUsdcEquivalent(update.split?.totalAmount || 0);
              }
            }
          },
          onParticipantUpdate: (participants) => {
            console.log('🔍 Real-time participant update received:', {
              splitId,
              participantsCount: participants.length,
              participants: participants.map(p => ({ name: p.name, status: p.status }))
            });
            logger.debug('Real-time participant update received', {
              splitId,
              participantsCount: participants.length
            }, 'SplitDetailsScreen');

            // Update current split data with new participants
            setCurrentSplitData(prev => prev ? { ...prev, participants } : null);
          },
          onError: (error) => {
            console.error('🔍 Real-time update error:', error);
            logger.error('Real-time update error', {
              splitId: effectiveSplitId,
              error: error.message
            }, 'SplitDetailsScreen');
          }
        }
      );

      realtimeCleanupRef.current = cleanup;
      setIsRealtimeActive(true);
      console.log('🔍 Real-time updates started successfully');

    } catch (error) {
      console.error('🔍 Failed to start real-time updates:', error);
      logger.error('Failed to start real-time updates', {
        splitId: effectiveSplitId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'SplitDetailsScreen');
    }
  }, [effectiveSplitId, isRealtimeActive]);

  const stopRealtimeUpdates = () => {
    if (!isRealtimeActive) {return;}

    try {
      logger.info('Stopping real-time updates for split', { splitId: effectiveSplitId }, 'SplitDetailsScreen');

      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
        realtimeCleanupRef.current = null;
      }

      if (splitId) {
        splitRealtimeService.stopListening(splitId);
      }
      setIsRealtimeActive(false);
      setLastRealtimeUpdate(null);

    } catch (error) {
      logger.error('Failed to stop real-time updates', {
        splitId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'SplitDetailsScreen');
    }
  };

  // Start real-time updates when split data is loaded
  useEffect(() => {
    if (effectiveSplitId && !isRealtimeActive) {
      startRealtimeUpdates().catch((error: any) => {
        console.error('🔍 Failed to start real-time updates:', error);
      });
    }
  }, [effectiveSplitId, isRealtimeActive, startRealtimeUpdates]);

  // Cleanup real-time updates on unmount
  useEffect(() => {
    return () => {
      if (realtimeCleanupRef.current) {
        realtimeCleanupRef.current();
      }
    };
  }, []);

  // Removed ensureSplitWithWalletExists - wallets should only be created when split type is selected

  const convertCurrencyToUSDC = async () => {
    if (!totalAmount) {return;}

    try {
      setIsConvertingCurrency(true);
      const amount = parseFloat(totalAmount);
      const currency = splitData?.currency || processedBillData?.currency || billData?.currency || 'USDC';

      // If currency is already USDC, no conversion needed
      if (currency === 'USDC') {
        setUsdcEquivalent(amount);
        return;
      }

      // Only convert if currency is not USDC
      if (currency !== 'USD' && currency !== 'USDC') {
        const usdcAmount = await convertFiatToUSDC(amount, currency);
        setUsdcEquivalent(usdcAmount);
      } else {
        setUsdcEquivalent(amount);
      }
    } catch (error) {
      console.error('Error converting currency:', error);
      // Fallback to original amount if conversion fails
      setUsdcEquivalent(parseFloat(totalAmount));
    } finally {
      setIsConvertingCurrency(false);
    }
  };

  const generateQRCodeData = () => {
    const splitIdToUse = createdSplitId || currentSplitData?.id || splitId;
    const titleToUse = billName || currentSplitData?.title || 'Split';
    const amountToUse = totalAmount || currentSplitData?.totalAmount || '0';
    const creatorName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';
    const creatorId = currentUser?.id?.toString() || '';

    if (splitIdToUse) {
      // Create split invitation data
      const invitationData = {
        type: 'split_invitation' as const,
        splitId: splitIdToUse,
        billName: titleToUse,
        totalAmount: parseFloat(amountToUse.toString()),
        currency: 'USDC',
        creatorId: creatorId,
        creatorName: creatorName,
        participantCount: currentSplitData?.participants?.length || 1,
        splitType: currentSplitData?.splitType || 'fair',
        walletAddress: currentUser?.wallet_address || '',
        invitationCode: `ws_inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString()
      };

      // Generate shareable link
      const shareableLink = SplitInvitationService.generateShareableLink(invitationData);
      setQrCodeData(shareableLink);
    } else {
      // Set a fallback QR code data if no split ID is available
      setQrCodeData('wesplit://join-split?data=' + encodeURIComponent(JSON.stringify({
        type: 'split_invitation',
        message: 'Join this split'
      })));
    }
  };

  const handleJoinSplitFromNotification = async () => {
    if (!splitId || !currentUser) {return;}

    try {
      setIsJoiningSplit(true);
      const result = await SplitInvitationService.joinSplit({
        type: 'split_invitation',
        splitId: splitId,
        billName: currentSplitData?.title || billName,
        totalAmount: currentSplitData?.totalAmount || parseFloat(totalAmount),
        currency: currentSplitData?.currency || 'USDC',
        creatorId: currentSplitData?.creatorId || '',
        creatorName: currentSplitData?.creatorName || '',
        timestamp: new Date().toISOString()
      }, currentUser.id);
      if (result.success) {
        setHasJustJoinedSplit(true);
        // Reload split data
        await loadSplitData();
      }
    } catch (error) {
      console.error('Error joining split:', error);
    } finally {
      setIsJoiningSplit(false);
    }
  };

  const handleSplitInvitation = async () => {
    if (!splitInvitationData) {return;}

    try {
      const invitationData = JSON.parse(splitInvitationData);
      if (invitationData.splitId) {
        // Navigate to join the split
        navigation.navigate('SplitDetails', {
          splitId: invitationData.splitId,
          isFromNotification: true
        });
      }
    } catch (error) {
      console.error('Error handling split invitation:', error);
    }
  };

  const checkExistingSplit = async () => {
    if (!currentUser || hasAttemptedProcessing) {return;}

    try {
      setHasAttemptedProcessing(true);
      // Check if user already has an active split
      const result = await SplitStorageService.getUserSplits(currentUser.id);
      if (result.success && result.splits && result.splits.length > 0) {
        // Navigate to existing split
        navigation.navigate('SplitDetails', {
          splitId: result.splits[0].id,
          splitData: result.splits[0]
        });
      }
    } catch (error) {
      console.error('Error checking existing split:', error);
    }
  };

  const inviteContact = async (contact: any) => {
    if (!contact || !currentUser || !splitId) {return;}

    try {
      setIsInvitingUsers(true);

      // Check if contact is already a participant
      const isAlreadyParticipant = participants.some((p: any) => (p.userId || p.id) === (contact.id || contact.userId));
      if (isAlreadyParticipant) {
        Alert.alert('Already Added', `${contact.name} is already in this split.`);
        return;
      }

      // Fetch the latest user data to get current wallet address
      let latestWalletAddress = contact.walletAddress || contact.wallet_address || '';
      try {
        const { firebaseDataService } = await import('../../services/data');
        const latestUserData = await firebaseDataService.user.getCurrentUser(contact.id || contact.userId);
        if (latestUserData?.wallet_address) {
          latestWalletAddress = latestUserData.wallet_address;
        }
      } catch (error) {
        console.warn('Could not fetch latest user data, using contact data:', error);
      }

      // No longer managing local invited users state - participants are managed through the database

      // Add participant to the split in the database
      const participantData = {
        userId: contact.id || contact.userId,
        name: contact.name,
        email: contact.email || '',
        walletAddress: latestWalletAddress,
        amountOwed: 0, // Will be calculated when split is finalized
        amountPaid: 0,
        status: 'invited' as const,
        avatar: contact.avatar
      };

      const addParticipantResult = await SplitStorageService.addParticipant(splitId, participantData);

      if (!addParticipantResult.success) {
        console.error('Failed to add participant to split:', addParticipantResult.error);
        Alert.alert('Error', 'Failed to add participant to split. Please try again.');
        return;
      }

      // Reload split data to show the newly added participant
      await loadSplitData();

      // Update split wallet participants if we have a split wallet
      if (currentSplitData?.walletId) {
        try {
          const { SplitWalletManagement } = await import('../../services/split/SplitWalletManagement');

          // Get current split data to get all participants
          const updatedSplitResult = await SplitStorageService.getSplit(splitId);
          if (updatedSplitResult.success && updatedSplitResult.split) {
            const allParticipants = updatedSplitResult.split.participants.map(p => ({
              userId: p.userId,
              name: p.name,
              walletAddress: p.walletAddress,
              amountOwed: p.amountOwed
            }));

            await SplitWalletManagement.updateSplitWalletParticipants(
              currentSplitData.walletId,
              allParticipants
            );
          }
        } catch (walletError) {
          console.warn('Failed to update split wallet participants:', walletError);
          // Don't fail the entire operation if wallet update fails
        }
      }

      // Send notification to the invited user
      logger.info('Sending split invitation notification', {
        toUserId: contact.id || contact.userId,
        fromUserId: currentUser.id.toString(),
        splitId: splitId,
        billName: billName
      }, 'SplitDetailsScreen');

      const notificationResult = await notificationService.instance.sendNotification(
        contact.id || contact.userId,
        'Split Invitation',
        `${currentUser.name} has invited you to split "${billName}"`,
        'split_invite',
        {
          splitId: splitId,
          billName: billName,
          totalAmount: parseFloat(totalAmount),
          currency: 'USDC',
          invitedBy: currentUser.id.toString(),
          invitedByName: currentUser.name,
          participantName: contact.name,
          status: 'pending'
        }
      );

      if (notificationResult) {
        logger.info('Split invitation sent successfully', {
          splitId,
          invitedUserId: contact.id || contact.userId,
          invitedUserName: contact.name,
          billName
        }, 'SplitDetailsScreen');

        Alert.alert(
          'Invitation Sent!',
          `${contact.name} has been invited to the split and will receive a notification.`
        );
      } else {
        logger.warn('Failed to send notification, but participant was added', {
          splitId,
          invitedUserId: contact.id || contact.userId,
          invitedUserName: contact.name
        }, 'SplitDetailsScreen');

        Alert.alert(
          'Participant Added',
          `${contact.name} has been added to the split, but the notification may not have been sent.`
        );
      }

    } catch (error) {
      console.error('Error inviting contact:', error);
      Alert.alert('Error', 'Failed to invite contact. Please try again.');
    } finally {
      setIsInvitingUsers(false);
    }
  };

  // Helper function to check if current user is the creator
  const isCurrentUserCreator = () => {
    if (!currentUser) {return false;}

    // Check currentSplitData first (for joined splits)
    if (currentSplitData?.creatorId) {
      const isCreator = currentSplitData.creatorId === currentUser.id.toString();
      // Check if current user is creator
      return isCreator;
    }

    // Check splitData (for existing splits)
    if (splitData?.creatorId) {
      const isCreator = splitData.creatorId === currentUser.id.toString();
      // Check if current user is creator
      return isCreator;
    }

    // For new splits, the current user is always the creator
    return true;
  };

  // Get participants from current split data
  const participants = (() => {
    if (currentSplitData?.participants) {
      return currentSplitData.participants;
    }
    if (splitData?.participants) {
      return splitData.participants;
    }
    if (currentProcessedBillData?.participants) {
      return currentProcessedBillData.participants;
    }
    return [];
  })();

  // Helper function to check if all participants have accepted
  const areAllParticipantsAccepted = () => {
    const participants = currentSplitData?.participants || [];
    if (participants.length === 0) {return true;}

    // Check if all participants have 'accepted' status
    const acceptedParticipants = participants.filter((participant: any) =>
      participant.status === 'accepted'
    );

    return acceptedParticipants.length === participants.length;
  };

  // Missing function implementations - these would be added from the original implementation
  const handleEditBill = () => {
    // Implementation for editing bill
  };

  const handleAddContacts = () => {
    showAddFriendsModal();
  };

  const handleAddFromContacts = () => {
    // Close the current modal
    hideAddFriendsModal();

    // Navigate to contacts screen for adding participants
    navigation.navigate('Contacts', {
      action: 'split',
      splitId: splitId,
      splitName: billName,
      returnRoute: 'SplitDetails',
      // Pass current split data to preserve state
      currentSplitData: currentSplitData
    });
  };

  // Test function to manually create a notification (for debugging)
  const testNotification = async () => {
    if (!currentUser) {return;}

    try {
      // Test notification removed - use actual split invitation instead
      logger.info('Test notification functionality removed', { userId: currentUser.id }, 'SplitDetailsScreen');
      Alert.alert('Info', 'Test notification functionality has been removed. Use actual split invitations instead.');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const handleSplitBill = () => {
    showSplitModal();
  };

  const handleCloseModal = () => {
    hideSplitModal();
  };

  const handleCloseAddFriendsModal = () => {
    hideAddFriendsModal();
  };

  // Private key modal functions moved to FairSplit/DegenLock screens

  const handleSplitTypeSelection = async (type: 'fair' | 'degen') => {
    setSelectedSplitType(type);
  };

  const handleContinue = async () => {
    if (!selectedSplitType) {return;}

    try {
      // Continue with selected split type
      hideSplitModal();

      // Create or update the split with the selected type
      const splitIdToUse = createdSplitId || currentSplitData?.id || splitId;
      
      console.log('🔍 SplitDetailsScreen: handleContinue called', {
        selectedSplitType,
        splitIdToUse,
        createdSplitId,
        currentSplitDataId: currentSplitData?.id,
        splitId,
        isActuallyNewBill,
        isActuallyManualCreation,
        hasProcessedBillData: !!currentProcessedBillData
      });

      if (splitIdToUse) {
        // Update existing split with split type
        const updatedSplitData = {
          ...currentSplitData,
          splitType: selectedSplitType,
          status: 'pending' as const // Keep as pending until wallet is created
        };

        const updateResult = await SplitStorageService.updateSplit(splitIdToUse, updatedSplitData);

        if (updateResult.success) {
          // Split updated with type

          // Navigate to the appropriate screen based on split type
          if (selectedSplitType === 'fair') {
            navigation.navigate('FairSplit', {
              splitData: updateResult.split,
              billData: billData,
              processedBillData: currentProcessedBillData,
              // NO splitWallet passed - will be created in FairSplit
            });
          } else if (selectedSplitType === 'degen') {
            navigation.navigate('DegenLock', {
              splitData: updateResult.split,
              billData: billData,
              processedBillData: currentProcessedBillData,
              // NO splitWallet passed - will be created in DegenLock
            });
          }
        } else {
          console.error('🔍 SplitDetailsScreen: Failed to update split:', updateResult.error);
          Alert.alert('Error', 'Failed to update split type');
        }
      } else {
        // Create new split
        console.log('🔍 SplitDetailsScreen: Creating new split', {
          splitIdToUse,
          hasCurrentSplitData: !!currentSplitData,
          hasSplitId: !!splitId,
          isActuallyNewBill,
          isActuallyManualCreation,
          hasProcessedBillData: !!currentProcessedBillData
        });
        
        const newSplitData = {
          billId: currentProcessedBillData?.id || 'new-bill',
          title: billName,
          totalAmount: parseFloat(totalAmount),
          currency: currentProcessedBillData?.currency || 'USDC',
          splitType: selectedSplitType,
          status: 'pending' as const, // Keep as pending until wallet is created
          creatorId: currentUser?.id?.toString() || '',
          creatorName: currentUser?.name || 'Unknown',
          participants: participants.map((p: any) => ({
            userId: 'userId' in p ? p.userId : p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: p.amountOwed || 0,
            amountPaid: 0,
            status: p.status
          })),
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        console.log('🔍 SplitDetailsScreen: New split data prepared', {
          title: newSplitData.title,
          totalAmount: newSplitData.totalAmount,
          currency: newSplitData.currency,
          splitType: newSplitData.splitType,
          participantsCount: newSplitData.participants.length
        });

        const createResult = await SplitStorageService.createSplit(newSplitData);

        if (createResult.success && createResult.split) {
          // New split created with type
          setCreatedSplitId(createResult.split.id);

          // Navigate to the appropriate screen based on split type
          if (selectedSplitType === 'fair') {
            navigation.navigate('FairSplit', {
              splitData: createResult.split,
              billData: billData,
              processedBillData: currentProcessedBillData,
              // NO splitWallet passed - will be created in FairSplit
            });
          } else if (selectedSplitType === 'degen') {
            navigation.navigate('DegenLock', {
              splitData: createResult.split,
              billData: billData,
              processedBillData: currentProcessedBillData,
              // NO splitWallet passed - will be created in DegenLock
            });
          }
        } else {
          console.error('🔍 SplitDetailsScreen: Failed to create split:', createResult.error);
          Alert.alert('Error', 'Failed to create split');
        }
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);
      Alert.alert('Error', 'An error occurred while processing the split');
    }
  };

  // Private key handling moved to FairSplit/DegenLock screens

  // Private key copy function moved to FairSplit/DegenLock screens

  const handleLinkShare = async () => {
    try {
      if (!splitId || !currentUser) {
        Alert.alert('Error', 'Split information is missing');
        return;
      }

      // Generate invitation data
      const invitationData = SplitInvitationService.generateInvitationData(
        splitId,
        billName,
        parseFloat(totalAmount),
        'USDC',
        currentUser.id.toString(),
        24 // 24 hours expiry
      );

      // Generate shareable link
      const shareableLink = SplitInvitationService.generateShareableLink(invitationData);

      // Copy to clipboard and show success message
      await Clipboard.setStringAsync(shareableLink);
      Alert.alert(
        'Link Copied!',
        'The split invitation link has been copied to your clipboard. Share it with friends to invite them to join the split.',
        [{ text: 'OK' }]
      );

      logger.info('Shareable link generated and copied', {
        splitId,
        link: shareableLink
      }, 'SplitDetailsScreen');

    } catch (error) {
      console.error('Error generating shareable link:', error);
      Alert.alert('Error', 'Failed to generate shareable link. Please try again.');
    }
  };

  // Modal animation functions
  const showSplitModal = () => {
    setShowSplitModalState(true);
    Animated.parallel([
      Animated.timing(splitModalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(splitModalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideSplitModal = () => {
    Animated.parallel([
      Animated.timing(splitModalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(splitModalOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSplitModalState(false);
    });
  };

  const showAddFriendsModal = () => {
    // Generate QR code data if not already available
    if (!qrCodeData) {
      generateQRCodeData();
    }

    setShowAddFriendsModalState(true);
    Animated.parallel([
      Animated.timing(addFriendsModalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(addFriendsModalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideAddFriendsModal = () => {
    Animated.parallel([
      Animated.timing(addFriendsModalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(addFriendsModalOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowAddFriendsModalState(false);
    });
  };

  // Private key modal animations moved to FairSplit/DegenLock screens

  // Animation handlers - simplified versions
  const handleSplitModalGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: splitModalTranslateY } }],
    { useNativeDriver: true }
  );

  const handleSplitModalStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;
    if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) {
        hideSplitModal();
      } else {
        Animated.spring(splitModalTranslateY, { toValue: 0, useNativeDriver: true }).start();
      }
    }
  };

  const handleAddFriendsModalGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: addFriendsModalTranslateY } }],
    { useNativeDriver: true }
  );

  const handleAddFriendsModalStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;
    if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) {
        hideAddFriendsModal();
      } else {
        Animated.spring(addFriendsModalTranslateY, { toValue: 0, useNativeDriver: true }).start();
      }
    }
  };

  // Private key modal gesture handlers moved to FairSplit/DegenLock screens

  // Show processing screen for new bills
  if (isProcessingNewBill) {
      return (
      <Container>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.processingSubtitle}>Processing your bill...</Text>
      </Container>
    );
  }

  return (
    <Container>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />

      <Header
        title="Split the Bill"
        onBackPress={() => navigation.navigate('SplitsList')}
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isRealtimeActive && (
              <View style={styles.realtimeIndicator}>
                <View style={styles.realtimeDot} />
                <Text style={styles.realtimeText}>Live</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editButton} onPress={handleEditBill}>
              <Image
                source={require('../../../assets/edit-icon.png')}
                style={styles.editButtonIcon}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Details Card */}
        <LinearGradient
          colors={[colors.green, colors.greenLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.billCard}
        >
          {/*=== Bill Card Top ===*/}
          <View style={styles.billCardTop}>
            <View style={styles.billHeader}>
              <View style={styles.billTitleContainer}>
                <View style={styles.billIconContainer}>
                  <Image
                    source={CATEGORY_IMAGES[splitData?.category || currentSplitData?.category || 'food']}
                    style={styles.billIcon}
                  />
                </View>
                <View style={styles.billHeaderContent}>
                  <Text
                    style={styles.billTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {billName}
                  </Text>

                  <Text style={styles.billDate}>
                    {(() => {
                      // Use data from existing split if available, otherwise use mockup data
                      if (splitData?.date) {
                        return splitData.date;
                      }
                      if (processedBillData?.date) {
                        return processedBillData.date;
                      }
                      if (billData?.date) {
                        return billData.date;
                      }
                      const { MockupDataService } = require('../../services/data');
                      return MockupDataService.getBillDate();
                    })()}
                  </Text>
                </View>

              </View>

            </View>

            <View style={styles.billAmountContainer}>
              <Text style={styles.billAmountLabel}>Total Bill</Text>
              <View style={styles.billAmountRow}>
                {(() => {
                  const currency = splitData?.currency || processedBillData?.currency || billData?.currency || 'USDC';
                  const amount = parseFloat(totalAmount);

                  // If currency is already USDC, show only USDC amount
                  if (currency === 'USDC') {
                    return (
                      <Text style={styles.billAmountUSDC}>
                        {formatCurrencyAmount(amount, 'USDC')}
                      </Text>
                    );
                  }

                  // Show original currency first, then USDC equivalent
                  return (
                    <>
                      <Text style={styles.billAmountUSDC}>
                        {formatCurrencyAmount(amount, currency)}
                      </Text>
                      <Text style={styles.billAmountEUR}>
                        {isConvertingCurrency ? (
                          'Converting...'
                        ) : usdcEquivalent !== null ? (
                          `${usdcEquivalent.toFixed(2)} USDC`
                        ) : (
                          'Loading...'
                        )}
                      </Text>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>


          {/*=== Bill Card Bottom ===*/}
          <View style={styles.billCardBottom}>
            <View style={styles.splitInfoContainer}>
              <View style={styles.splitInfoLeft}>
                <Text style={styles.splitInfoLabel}>Split between:</Text>
                <View style={styles.avatarContainer}>
                  {participants.slice(0, 4).map((participant: any, index: number) => {
                    const avatarStyle = index > 0
                      ? [styles.avatar, styles.avatarOverlap] as any
                      : styles.avatar;

                    return (
                      <UserAvatar
                        key={participant.userId || participant.id || index}
                        userId={participant.userId || participant.id}
                        displayName={participant.name}
                        size={32}
                        style={avatarStyle}
                      />
                    );
                  })}
                  {participants.length > 4 && (
                    <View style={styles.avatarOverlay}>
                      <Text style={styles.avatarOverlayText}>+{participants.length - 4}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={handleAddContacts}>
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Split Wallet Section - MOVED TO FAIR/DEGEN SCREENS */}
        {/* Wallet creation and recap now happens in FairSplit/DegenLock screens */}

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <Text style={styles.participantsTitle}>In the pool:</Text>

          {participants.map((participant: any) => (
            <View key={participant.userId || participant.id} style={styles.participantCard}>
              <UserAvatar
                userId={participant.userId || participant.id}
                displayName={participant.name}
                avatarUrl={participant.avatar}
                size={40}
                style={styles.participantAvatar}
              />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantWallet}>
                  {participant.walletAddress ?
                    formatWalletAddress(participant.walletAddress) :
                    'No wallet address'
                  }
                </Text>
              </View>
              <View style={styles.participantStatus}>
                {participant.status === 'accepted' ? (
                  <Image
                    source={require('../../../assets/check-circle-icon.png')}
                    style={styles.statusAcceptedIcon}
                  />
                ) : (
                  <Text style={styles.statusPending}>Pending</Text>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addButtonLong} onPress={handleAddContacts}>
            <Text style={styles.addButtonTextLong}>+ Add more friends</Text>
          </TouchableOpacity>

        </View>


        {/* Loading indicator when creating wallet - MOVED TO FAIR/DEGEN SCREENS */}
      </ScrollView>

      {/* Bottom Action Button - Only visible to creators */}
      {isCurrentUserCreator() && (
        <View style={styles.bottomContainer}>
          <Button
            title={(() => {
              const allAccepted = areAllParticipantsAccepted();
              const participants = currentSplitData?.participants || [];
              const acceptedParticipants = participants.filter((participant: any) =>
                participant.status === 'accepted'
              );
              const usersNeedingAcceptance = participants.length - acceptedParticipants.length;

              if (allAccepted) {
                return 'Split';
              } else if (usersNeedingAcceptance > 0) {
                return `Waiting for ${usersNeedingAcceptance} user${usersNeedingAcceptance !== 1 ? 's' : ''} to accept`;
              } else {
                return 'Split';
              }
            })()}
            onPress={handleSplitBill}
            variant="primary"
            disabled={!areAllParticipantsAccepted()}
            fullWidth={true}
          />
        </View>
      )}

      {/* Split Type Selection Modal */}
      <CustomModal
        visible={showSplitModalState}
        onClose={handleCloseModal}
        title="Choose your splitting style"
        description="Pick how you want to settle the bill with friends."
        showHandle={true}
        closeOnBackdrop={true}
      >
        {/* Split Type Options */}
        <View style={styles.splitOptionsContainer}>
          {/* Fair Split Option */}
          <TouchableOpacity
            style={[
              styles.splitOption,
              selectedSplitType === 'fair' && styles.splitOptionSelected
            ]}
            onPress={() => handleSplitTypeSelection('fair')}
          >
            <Image
              source={require('../../../assets/fair-split-icon.png')}
              style={styles.splitOptionIconImage}
            />
            <Text style={styles.splitOptionTitle}>Fair Split</Text>
            <Text style={styles.splitOptionDescription}>Split the bill equally among all participants</Text>
          </TouchableOpacity>

          {/* Degen Split Option */}
          <TouchableOpacity
            style={[
              styles.splitOption,
              selectedSplitType === 'degen' && styles.splitOptionSelected
            ]}
            onPress={() => handleSplitTypeSelection('degen')}
          >
            <Image
              source={require('../../../assets/degen-split-icon.png')}
              style={styles.splitOptionIconImage}
            />
            <Text style={styles.splitOptionTitle}>Degen Split</Text>
            <Text style={styles.splitOptionDescription}>Winner takes all - high risk, high reward</Text>
            <View style={styles.riskyModeLabel}>
              <Text style={styles.riskyModeIcon}>🔥</Text>
              <Text style={styles.riskyModeText}>Risky</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          disabled={!selectedSplitType}
          fullWidth={true}
          style={styles.continueButton}
        />
      </CustomModal>

      {/* Add Friends Modal */}
      <CustomModal
        visible={showAddFriendsModalState}
        onClose={handleCloseAddFriendsModal}
        title="Add Friends"
        showHandle={true}
        closeOnBackdrop={true}
      >
        <View style={styles.qrCodeSection}>
          <View style={styles.qrCodeContainer}>
            {qrCodeData && qrCodeData.length > 0 ? (
              <QrCodeView
                value={qrCodeData}
                size={250}
                backgroundColor="white"
                color="black"
                showAddress={false}
                showButtons={false}
                caption="Scan to join this split"
              />
            ) : (
              <View style={styles.qrCodePlaceholder}>
                <Text style={styles.qrCodeText}>Loading...</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.addFriendsModalButtons}>
          <Button
            title="Share Link"
            onPress={handleLinkShare}
            variant="secondary"
            fullWidth={true}
            style={styles.shareLinkButton}
          />
          
          <Button
            title="Contact List"
            onPress={handleAddFromContacts}
            variant="primary"
            fullWidth={true}
            style={styles.doneButton}
          />
        </View>
      </CustomModal>

      {/* Private Key Modal - MOVED TO FAIR/DEGEN SCREENS */}

    </Container>
  );
};

// Styles are imported from ./styles.ts

export default SplitDetailsScreen;

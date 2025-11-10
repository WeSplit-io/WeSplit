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
import Avatar from '../../components/shared/Avatar';
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
  
  // Log effective splitId determination (only in dev mode)
  if (__DEV__) {
    logger.debug('Effective splitId determined', {
      originalSplitId: splitId,
      effectiveSplitId,
      isNewBill,
      isManualCreation,
      isActuallyNewBill,
      isActuallyManualCreation,
      hasProcessedBillData: !!processedBillData,
      reason: (isActuallyNewBill || isActuallyManualCreation) ? 'New bill - splitId overridden' : 'Existing split - using original splitId'
    }, 'SplitDetailsScreen');
  }

  // Utility function to format wallet address
  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) {return address;}
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const { state } = useApp();
  const { currentUser } = state;

  // State to track if we've initialized with new bill data
  const [hasInitializedWithNewBillData, setHasInitializedWithNewBillData] = useState(false);

  // Debug logging for OCR AI flow (only in dev mode)
  useEffect(() => {
    if (__DEV__) {
      logger.debug('Route params received', {
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
      }, 'SplitDetailsScreen');
      
      // CRITICAL: Check if isNewBill and isManualCreation are undefined
      if (isNewBill === undefined && isManualCreation === undefined) {
        logger.warn('CRITICAL - isNewBill and isManualCreation are undefined', {
          routeParams: route?.params,
          isNewBill,
          isManualCreation,
          splitId
        }, 'SplitDetailsScreen');
      }
      
      // CRITICAL: Check if processedBillData is missing
      if (!processedBillData && splitId) {
        logger.warn('CRITICAL - No processedBillData but have splitId', {
          splitId,
          hasProcessedBillData: !!processedBillData,
          hasBillData: !!billData,
          navigationSource: 'Likely from SplitsList or other source, not OCR flow'
        }, 'SplitDetailsScreen');
        
        // CRITICAL: If this is a duplicate navigation with old split data, ignore it
        if (!isNewBill && !isManualCreation && !processedBillData && splitId) {
          logger.warn('BLOCKING duplicate navigation with old split data', {
            splitId,
            isNewBill,
            isManualCreation,
            hasProcessedBillData: !!processedBillData,
            hasInitializedWithNewBillData,
            navigationStack: navigation.getState?.()?.routes?.map(r => ({ name: r.name, params: r.params }))
          }, 'SplitDetailsScreen');
          
          // If we've already initialized with new bill data, ignore this old split navigation
          if (hasInitializedWithNewBillData) {
            if (__DEV__) {
              logger.debug('Already initialized with new bill data, ignoring old split navigation', null, 'SplitDetailsScreen');
            }
            return;
          }
          
          // Instead of navigating back, let's just ignore this navigation
          // and keep the current state (which should be the new split data)
          if (__DEV__) {
            logger.debug('Ignoring duplicate navigation, keeping current state', null, 'SplitDetailsScreen');
          }
          return;
        }
      }
    }
  }, [splitId, effectiveSplitId, isNewBill, isManualCreation, processedBillData, billData, splitData, routeCurrentSplitData, isEditing, imageUri, hasInitializedWithNewBillData]);

  const [billName, setBillName] = useState(() => {
    if (__DEV__) {
      logger.debug('billName initialization', {
        routeCurrentSplitDataTitle: routeCurrentSplitData?.title,
        splitDataTitle: splitData?.title,
        processedBillDataTitle: processedBillData?.title,
        billDataTitle: billData?.title,
        isActuallyNewBill,
        isActuallyManualCreation
      }, 'SplitDetailsScreen');
    }
    
    // For new bills, prioritize processed data over existing split data
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (processedBillData?.title) {
        if (__DEV__) {
          logger.debug('Using processedBillData title for new bill', { title: processedBillData.title }, 'SplitDetailsScreen');
        }
        return processedBillData.title;
      }
      if (billData?.title) {
        if (__DEV__) {
          logger.debug('Using billData title for new bill', { title: billData.title }, 'SplitDetailsScreen');
        }
        return billData.title;
      }
    }
    
    // Use data from existing split if available, otherwise use processed data
    if (routeCurrentSplitData?.title) {
      if (__DEV__) {
        logger.debug('Using routeCurrentSplitData title', { title: routeCurrentSplitData.title }, 'SplitDetailsScreen');
      }
      return routeCurrentSplitData.title;
    }
    if (splitData?.title) {
      if (__DEV__) {
        logger.debug('Using splitData title', { title: splitData.title }, 'SplitDetailsScreen');
      }
      return splitData.title;
    }
    if (processedBillData?.title) {
      if (__DEV__) {
        logger.debug('Using processedBillData title', { title: processedBillData.title }, 'SplitDetailsScreen');
      }
      return processedBillData.title;
    }
    if (billData?.title) {
      if (__DEV__) {
        logger.debug('Using billData title', { title: billData.title }, 'SplitDetailsScreen');
      }
      return billData.title;
    }
    if (__DEV__) {
      logger.debug('Using default title: New Split', null, 'SplitDetailsScreen');
    }
    return 'New Split'; // Default fallback instead of mockup data
  });

  const [totalAmount, setTotalAmount] = useState(() => {
    if (__DEV__) {
      logger.debug('totalAmount initialization', {
        routeCurrentSplitDataTotalAmount: routeCurrentSplitData?.totalAmount,
        splitDataTotalAmount: splitData?.totalAmount,
        processedBillDataTotalAmount: processedBillData?.totalAmount,
        billDataTotalAmount: billData?.totalAmount,
        isActuallyNewBill,
        isActuallyManualCreation
      }, 'SplitDetailsScreen');
    }
    
    // For new bills, prioritize processed data over existing split data
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (processedBillData?.totalAmount) {
        if (__DEV__) {
          logger.debug('Using processedBillData totalAmount for new bill', { totalAmount: processedBillData.totalAmount }, 'SplitDetailsScreen');
        }
        return processedBillData.totalAmount.toString();
      }
      if (billData?.totalAmount) {
        if (__DEV__) {
          logger.debug('Using billData totalAmount for new bill', { totalAmount: billData.totalAmount }, 'SplitDetailsScreen');
        }
        return billData.totalAmount.toString();
      }
    }
    
    // Use data from existing split if available, otherwise use processed data
    if (routeCurrentSplitData?.totalAmount) {
      if (__DEV__) {
        logger.debug('Using routeCurrentSplitData totalAmount', { totalAmount: routeCurrentSplitData.totalAmount }, 'SplitDetailsScreen');
      }
      return routeCurrentSplitData.totalAmount.toString();
    }
    if (splitData?.totalAmount) {
      if (__DEV__) {
        logger.debug('Using splitData totalAmount', { totalAmount: splitData.totalAmount }, 'SplitDetailsScreen');
      }
      return splitData.totalAmount.toString();
    }
    if (processedBillData?.totalAmount) {
      if (__DEV__) {
        logger.debug('Using processedBillData totalAmount', { totalAmount: processedBillData.totalAmount }, 'SplitDetailsScreen');
      }
      return processedBillData.totalAmount.toString();
    }
    if (billData?.totalAmount) {
      if (__DEV__) {
        logger.debug('Using billData totalAmount', { totalAmount: billData.totalAmount }, 'SplitDetailsScreen');
      }
      return billData.totalAmount.toString();
    }
    if (__DEV__) {
      logger.debug('Using default totalAmount: 0', null, 'SplitDetailsScreen');
    }
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
    if (__DEV__) {
      logger.debug('currentSplitData initialization', {
        splitData: !!splitData,
        routeCurrentSplitData: !!routeCurrentSplitData,
        splitDataId: splitData?.id,
        routeCurrentSplitDataId: routeCurrentSplitData?.id,
        isActuallyNewBill,
        isActuallyManualCreation
      }, 'SplitDetailsScreen');
    }
    
    // For new bills, don't initialize with any existing split data
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (__DEV__) {
        logger.debug('New bill - not initializing with existing split data', null, 'SplitDetailsScreen');
      }
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
    if (__DEV__) {
      logger.debug('currentProcessedBillData initialization', {
        hasProcessedBillData: !!processedBillData,
        hasSplitData: !!splitData,
        splitDataId: splitData?.id,
        isActuallyNewBill,
        isActuallyManualCreation
      }, 'SplitDetailsScreen');
    }
    
    // For new bills, only use processedBillData, not splitData
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (processedBillData) {
        if (__DEV__) {
          logger.debug('Using processedBillData for new bill', null, 'SplitDetailsScreen');
        }
        // Set flag to indicate we've initialized with new bill data
        setTimeout(() => setHasInitializedWithNewBillData(true), 0);
        return processedBillData;
      }
      if (__DEV__) {
        logger.debug('No processedBillData for new bill, returning null', null, 'SplitDetailsScreen');
      }
      return null;
    }
    
    // Use processedBillData if available, otherwise create from splitData
    if (processedBillData) {
      if (__DEV__) {
        logger.debug('Using processedBillData for existing split', null, 'SplitDetailsScreen');
      }
      return processedBillData;
    }
    if (splitData) {
      if (__DEV__) {
        logger.debug('Creating ProcessedBillData from splitData', null, 'SplitDetailsScreen');
      }
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
        participants: splitData.participants.map((p: any) => ({
          id: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          status: (p.status === 'invited' || p.status === 'paid' || p.status === 'locked') ? 'pending' as const : p.status as ('pending' | 'accepted' | 'declined'),
          amountOwed: p.amountOwed,
          items: [],
          avatar: p.avatar || '',
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

  // Consolidated effect to handle split data loading - prevents duplicate calls
  // Only loads when effectiveSplitId changes or when returning from Contacts screen
  useEffect(() => {
    // Load split data if we have an effective splitId (only for existing splits)
    if (effectiveSplitId) {
      logger.debug('Loading existing split data', { effectiveSplitId, isActuallyNewBill, isActuallyManualCreation }, 'SplitDetailsScreen');
      loadSplitData();
    } else if (isActuallyNewBill || isActuallyManualCreation) {
      logger.debug('Creating new split from bill data', { isActuallyNewBill, isActuallyManualCreation, hasProcessedData: !!processedBillData }, 'SplitDetailsScreen');
    }
    
    // Handle returning from Contacts screen - reload split data if we have effectiveSplitId but no currentSplitData
    if (effectiveSplitId && !currentSplitData && route?.params?.selectedContacts) {
      logger.debug('Reloading split data after contacts selection', { effectiveSplitId, isActuallyNewBill, isActuallyManualCreation }, 'SplitDetailsScreen');
      loadSplitData();
    }
  }, [effectiveSplitId, isActuallyNewBill, isActuallyManualCreation, route?.params?.selectedContacts, loadSplitData, currentSplitData]);

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
            // Degen Split is disabled - redirect to FairSplit instead
            logger.warn('Degen Split is disabled, redirecting to FairSplit', null, 'SplitDetailsScreen');
            Alert.alert(
              'Degen Split Disabled',
              'Degen Split is currently disabled. Redirecting to Fair Split.',
              [{ text: 'OK' }]
            );
            navigation.navigate('FairSplit', {
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

  // Track if loadSplitData is currently running to prevent duplicate calls
  const isLoadingSplitDataRef = useRef(false);
  
  // Async function implementations - wrapped in useCallback to prevent recreation
  const loadSplitData = useCallback(async () => {
    if (!effectiveSplitId) {
      logger.debug('loadSplitData called but no effectiveSplitId', null, 'SplitDetailsScreen');
      return;
    }
    
    // Prevent duplicate calls
    if (isLoadingSplitDataRef.current) {
      logger.debug('loadSplitData already in progress, skipping duplicate call', { splitId: effectiveSplitId }, 'SplitDetailsScreen');
      return;
    }
    
    isLoadingSplitDataRef.current = true;

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
              logger.debug(`User data for participant`, {
                userId: participant.userId,
                name: latestUserData?.name,
                wallet_address: latestUserData?.wallet_address,
                originalWalletAddress: participant.walletAddress
              }, 'SplitDetailsScreen');

              // Use latest wallet address and avatar if available, otherwise keep existing data
              return {
                ...participant,
                walletAddress: latestUserData?.wallet_address || participant.walletAddress || participant.wallet_address || '',
                avatar: latestUserData?.avatar || participant.avatar || ''
              };
            } catch (error) {
              logger.warn(`Could not fetch latest data for participant`, { userId: participant.userId, error: error as Record<string, unknown> }, 'SplitDetailsScreen');
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
        logger.debug('Loaded split data', {
          splitId: splitData.id,
          title: splitData.title,
          participantsCount: updatedParticipants.length,
          participants: updatedParticipants.map(p => ({
            name: p.name,
            status: p.status,
            walletAddress: p.walletAddress
          }))
        }, 'SplitDetailsScreen');

        // No longer managing separate invited users state - all participants are shown in the main list
      }
    } catch (error) {
      logger.error('Error loading split data', error as Record<string, unknown>, 'SplitDetailsScreen');
    } finally {
      isLoadingSplitDataRef.current = false;
    }
  }, [effectiveSplitId]);

  // Real-time update functions
  const startRealtimeUpdates = useCallback(async () => {
    if (!effectiveSplitId || isRealtimeActive) {
      logger.debug('Real-time updates not started', { effectiveSplitId, isRealtimeActive, originalSplitId: splitId }, 'SplitDetailsScreen');
      return;
    }

    try {
      logger.info('Starting real-time updates for split', { splitId: effectiveSplitId }, 'SplitDetailsScreen');

      const cleanup = await splitRealtimeService.startListening(
        effectiveSplitId,
        {
          onSplitUpdate: (update: SplitRealtimeUpdate) => {
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
                    logger.error('Error converting currency', error as Record<string, unknown>, 'SplitDetailsScreen');
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
            logger.debug('Real-time participant update received', {
              splitId,
              participantsCount: participants.length
            }, 'SplitDetailsScreen');

            // Update current split data with new participants
            setCurrentSplitData(prev => prev ? { ...prev, participants } : null);
          },
          onError: (error) => {
            logger.error('Real-time update error', {
              splitId: effectiveSplitId,
              error: error.message
            }, 'SplitDetailsScreen');
          }
        }
      );

      realtimeCleanupRef.current = cleanup;
      setIsRealtimeActive(true);
      logger.debug('Real-time updates started successfully', null, 'SplitDetailsScreen');

    } catch (error) {
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

  // Start real-time updates when split data is loaded - use ref to prevent duplicate calls
  const startRealtimeUpdatesRef = useRef(startRealtimeUpdates);
  useEffect(() => {
    startRealtimeUpdatesRef.current = startRealtimeUpdates;
  }, [startRealtimeUpdates]);
  
  useEffect(() => {
    if (effectiveSplitId && !isRealtimeActive) {
      startRealtimeUpdatesRef.current().catch((error: unknown) => {
        logger.error('Failed to start real-time updates', error as Record<string, unknown>, 'SplitDetailsScreen');
      });
    }
  }, [effectiveSplitId, isRealtimeActive]);

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
      logger.error('Error converting currency', error as Record<string, unknown>, 'SplitDetailsScreen');
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
      logger.error('Error joining split', error as Record<string, unknown>, 'SplitDetailsScreen');
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
      logger.error('Error handling split invitation', error as Record<string, unknown>, 'SplitDetailsScreen');
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
      logger.error('Error checking existing split', error as Record<string, unknown>, 'SplitDetailsScreen');
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
        logger.warn('Could not fetch latest user data, using contact data', error as Record<string, unknown>, 'SplitDetailsScreen');
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
        logger.error('Failed to add participant to split', { error: addParticipantResult.error }, 'SplitDetailsScreen');
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
          logger.warn('Failed to update split wallet participants', { error: walletError }, 'SplitDetailsScreen');
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
      logger.error('Error inviting contact', error as Record<string, unknown>, 'SplitDetailsScreen');
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
      logger.error('Error sending test notification', error as Record<string, unknown>, 'SplitDetailsScreen');
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
    // Degen split is disabled - do nothing when clicked
    if (type === 'degen') {
      return;
    }
    setSelectedSplitType(type);
  };

  const handleContinue = async () => {
    if (!selectedSplitType) {return;}

    try {
      // Continue with selected split type
      hideSplitModal();

      // Create or update the split with the selected type
      const splitIdToUse = createdSplitId || currentSplitData?.id || splitId;
      
      if (__DEV__) {
        logger.debug('handleContinue called', {
          selectedSplitType,
          splitIdToUse,
          createdSplitId,
          currentSplitDataId: currentSplitData?.id,
          splitId,
          isActuallyNewBill,
          isActuallyManualCreation,
          hasProcessedBillData: !!currentProcessedBillData
        }, 'SplitDetailsScreen');
      }

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
            // Degen Split is disabled
            Alert.alert('Degen Split Disabled', 'Degen Split is currently disabled. Please use Fair Split instead.');
            return;
          }
        } else {
          logger.error('Failed to update split', { error: updateResult.error }, 'SplitDetailsScreen');
          Alert.alert('Error', 'Failed to update split type');
        }
      } else {
        // Create new split
        if (__DEV__) {
          logger.debug('Creating new split', {
            splitIdToUse,
            hasCurrentSplitData: !!currentSplitData,
            hasSplitId: !!splitId,
            isActuallyNewBill,
            isActuallyManualCreation,
            hasProcessedBillData: !!currentProcessedBillData
          }, 'SplitDetailsScreen');
        }
        
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

        if (__DEV__) {
          logger.debug('New split data prepared', {
            title: newSplitData.title,
            totalAmount: newSplitData.totalAmount,
            currency: newSplitData.currency,
            splitType: newSplitData.splitType,
            participantsCount: newSplitData.participants.length
          }, 'SplitDetailsScreen');
        }

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
            // Degen Split is disabled
            Alert.alert('Degen Split Disabled', 'Degen Split is currently disabled. Please use Fair Split instead.');
            return;
          }
        } else {
          logger.error('Failed to create split', { error: createResult.error }, 'SplitDetailsScreen');
          Alert.alert('Error', 'Failed to create split');
        }
      }
    } catch (error) {
      logger.error('Error in handleContinue', error as Record<string, unknown>, 'SplitDetailsScreen');
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
      logger.error('Error generating shareable link', error as Record<string, unknown>, 'SplitDetailsScreen');
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
            {/*<TouchableOpacity style={styles.editButton} onPress={handleEditBill}>
              <Image
                source={require('../../../assets/edit-icon.png')}
                style={styles.editButtonIcon}
              />
            </TouchableOpacity>
            */}
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
                    return (
                      <Avatar
                        key={participant.userId || participant.id || index}
                        userId={participant.userId || participant.id}
                        userName={participant.name}
                        size={32}
                        avatarUrl={participant.avatar}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: colors.black,
                        }}
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
              <Avatar
                userId={participant.userId || participant.id}
                userName={participant.name}
                avatarUrl={participant.avatar}
                size={40}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.white10,
                }}
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

          {/* Degen Split Option - DISABLED (Visible but locked) */}
          <TouchableOpacity
            style={[
              styles.splitOption,
              styles.splitOptionDisabled,
              selectedSplitType === 'degen' && styles.splitOptionSelected
            ]}
            onPress={() => handleSplitTypeSelection('degen')}
            disabled={true}
            activeOpacity={1}
          >
            <Image
              source={require('../../../assets/degen-split-icon.png')}
              style={[styles.splitOptionIconImage, { opacity: 0.5 }]}
            />
            <Text style={[styles.splitOptionTitle, { opacity: 0.5 }]}>Degen Split</Text>
            <Text style={[styles.splitOptionDescription, { opacity: 0.5 }]}>Winner takes all - high risk, high reward</Text>
            <View style={[styles.riskyModeLabel, { opacity: 0.5 }]}>
              <Text style={styles.riskyModeIcon}>🔥</Text>
              <Text style={styles.riskyModeText}>Risky</Text>
            </View>
            <View style={[styles.riskyModeLabel, { top: 'auto', bottom: 5, backgroundColor: colors.textSecondary }]}>
              <Text style={[styles.riskyModeText, { color: colors.white }]}>Coming Soon</Text>
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

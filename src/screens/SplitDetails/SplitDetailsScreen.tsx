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
import { generateBillId } from '../../utils/navigation/splitNavigationHelpers';
import { Container, Header, Button, LoadingScreen } from '../../components/shared';
import Modal from '../../components/shared/Modal';

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
  // ALSO: If we have a draft split (status: 'draft' and no splitType), treat it as resumable
  const isDraftSplit = splitData?.status === 'draft' && !splitData?.splitType;
  const isActuallyNewBill = isNewBill === true || (isNewBill === undefined && processedBillData && !splitId && !isDraftSplit);
  const isActuallyManualCreation = isManualCreation === true || (isManualCreation === undefined && processedBillData && !splitId && !isDraftSplit);
  
  // For draft splits, use the splitId to load the split
  const effectiveSplitId = (isActuallyNewBill || isActuallyManualCreation) ? undefined : splitId;
  
  // Track last logged effectiveSplitId to prevent excessive logging
  const lastLoggedSplitIdRef = useRef<string | undefined>(undefined);
  
  // Log effective splitId determination only when it changes (only in dev mode)
  useEffect(() => {
    if (__DEV__ && lastLoggedSplitIdRef.current !== effectiveSplitId) {
      lastLoggedSplitIdRef.current = effectiveSplitId;
      // Only log when splitId actually changes, not on every render
    }
  }, [effectiveSplitId]);

  // Utility function to format wallet address
  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) {return address;}
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const { state } = useApp();
  const { currentUser } = state;

  // State to track if we've initialized with new bill data
  const [hasInitializedWithNewBillData, setHasInitializedWithNewBillData] = useState(false);
  
  // CRITICAL: Store new bill data in ref (for immediate access) and state (for re-renders)
  // Use ref to track immediately (before state updates) to prevent race conditions
  const preservedNewBillDataRef = useRef<{
    processedBillData?: ProcessedBillData;
    billData?: any;
    isManualCreation?: boolean;
  } | null>(null);
  
  const [preservedNewBillData, setPreservedNewBillData] = useState<{
    processedBillData?: ProcessedBillData;
    billData?: any;
    isManualCreation?: boolean;
  } | null>(null);

  // CRITICAL: Block route param updates that would override new bill data
  // This prevents old split data from overriding new bill creation
  // This MUST run early to prevent other effects from using wrong data
  useEffect(() => {
    // Store new bill data when we first initialize
    if ((isActuallyNewBill || isActuallyManualCreation) && processedBillData && !preservedNewBillDataRef.current) {
      const newPreservedData = {
        processedBillData,
        billData,
        isManualCreation: isActuallyManualCreation,
      };
      preservedNewBillDataRef.current = newPreservedData;
      setPreservedNewBillData(newPreservedData);
      setHasInitializedWithNewBillData(true);
      if (__DEV__) {
        logger.debug('Preserved new bill data', {
          title: processedBillData.title,
          totalAmount: processedBillData.totalAmount
        }, 'SplitDetailsScreen');
      }
    }
    
    // If we've initialized with new bill data, block any navigation that tries to load old split data
    const hasPreservedData = preservedNewBillDataRef.current || preservedNewBillData;
    if (hasInitializedWithNewBillData || hasPreservedData) {
      // Check if route params changed to include old split data (without new bill flags)
      const hasOldSplitData = splitId && splitData && !isNewBill && !isManualCreation && !processedBillData;
      
      if (hasOldSplitData) {
        if (__DEV__) {
          logger.warn('BLOCKING route param update with old split data', {
            splitId,
            splitDataTitle: splitData?.title,
            hasProcessedBillData: !!processedBillData,
            hasPreservedData: !!hasPreservedData,
            hasInitializedWithNewBillData,
            preservedTitle: preservedNewBillDataRef.current?.processedBillData?.title
          }, 'SplitDetailsScreen');
        }
        
        // Reset route params to preserve new bill data IMMEDIATELY
        // Use navigation.setParams to override with new bill params
        const dataToRestore = preservedNewBillDataRef.current || preservedNewBillData || { processedBillData, billData, isManualCreation: isActuallyManualCreation };
        if (dataToRestore.processedBillData || dataToRestore.billData) {
          navigation.setParams({
            splitId: undefined,
            splitData: undefined,
            isNewBill: true,
            isManualCreation: dataToRestore.isManualCreation !== undefined ? dataToRestore.isManualCreation : true,
            processedBillData: dataToRestore.processedBillData,
            billData: dataToRestore.billData,
          });
          
          if (__DEV__) {
            logger.debug('Route params restored with new bill data', {
              title: dataToRestore.processedBillData?.title || dataToRestore.billData?.title
            }, 'SplitDetailsScreen');
          }
        }
        return;
      }
    }
  }, [splitId, splitData, isNewBill, isManualCreation, processedBillData, billData, hasInitializedWithNewBillData, preservedNewBillData, isActuallyNewBill, isActuallyManualCreation, navigation]);

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
      if (isNewBill === undefined && isManualCreation === undefined && splitId) {
        logger.warn('CRITICAL - isNewBill and isManualCreation are undefined but have splitId', {
          routeParams: route?.params,
          isNewBill,
          isManualCreation,
          splitId,
          hasInitializedWithNewBillData
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
      }
    }
  }, [splitId, effectiveSplitId, isNewBill, isManualCreation, processedBillData, billData, splitData, routeCurrentSplitData, isEditing, imageUri, hasInitializedWithNewBillData, navigation]);

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
        isActuallyManualCreation,
        hasProcessedBillData: !!processedBillData
      }, 'SplitDetailsScreen');
    }
    
    // CRITICAL: For new bills, ALWAYS return null - never use existing split data
    // This prevents showing old split data when creating a new split
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (__DEV__) {
        logger.debug('New bill - not initializing with existing split data', {
          isActuallyNewBill,
          isActuallyManualCreation,
          hasProcessedBillData: !!processedBillData
        }, 'SplitDetailsScreen');
      }
      return null;
    }
    
    // Only use existing split data if this is NOT a new bill
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
        // Flag will be set by the blocking useEffect above
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
        subtotal: splitData.subtotal ?? splitData.totalAmount * 0.9, // Use actual or estimate
        tax: splitData.tax ?? splitData.totalAmount * 0.1, // Use actual or estimate
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
  
  // CRITICAL: Update currentProcessedBillData when preserved data is restored
  useEffect(() => {
    if (preservedNewBillData?.processedBillData && !currentProcessedBillData && (isActuallyNewBill || isActuallyManualCreation)) {
      setCurrentProcessedBillData(preservedNewBillData.processedBillData);
    }
  }, [preservedNewBillData, currentProcessedBillData, isActuallyNewBill, isActuallyManualCreation]);

  // CRITICAL: Create draft split immediately when new bill data is received
  // This ensures the split appears in SplitsListScreen before user selects a type
  const hasCreatedDraftSplitRef = useRef(false);
  useEffect(() => {
    // Only create draft split for new bills (not existing splits)
    if (!isActuallyNewBill && !isActuallyManualCreation) {
      return;
    }

    // Only create if we have processed bill data and haven't created a draft split yet
    if (!currentProcessedBillData || hasCreatedDraftSplitRef.current || createdSplitId) {
      return;
    }

    // Only create if we have a current user
    if (!currentUser) {
      return;
    }

    // Create draft split immediately
    const createDraftSplit = async () => {
      try {
        hasCreatedDraftSplitRef.current = true;

        if (__DEV__) {
          logger.debug('Creating draft split for new bill', {
            title: currentProcessedBillData.title,
            totalAmount: currentProcessedBillData.totalAmount,
            isActuallyNewBill,
            isActuallyManualCreation
          }, 'SplitDetailsScreen');
        }

        // Ensure creator is included in participants
        const allParticipants = [...(currentProcessedBillData.participants || [])];
        const creatorExists = allParticipants.some(p => {
          const pId = 'userId' in p ? p.userId : p.id;
          return pId === currentUser.id.toString();
        });

        if (!creatorExists) {
          allParticipants.push({
            id: currentUser.id.toString(),
            name: currentUser.name,
            walletAddress: currentUser.wallet_address || '',
            amountOwed: 0,
            status: 'accepted' as const,
            items: []
          });
        }

        const draftSplitData = {
          billId: currentProcessedBillData.id,
          title: currentProcessedBillData.title || billName || 'Untitled Split',
          description: `Split for ${currentProcessedBillData.title || billName || 'Untitled Split'}`,
          totalAmount: currentProcessedBillData.totalAmount || parseFloat(totalAmount) || 0,
          currency: currentProcessedBillData.currency || 'USDC',
          // CRITICAL: No splitType - this is a draft split
          splitType: undefined,
          status: 'draft' as const, // Draft status until user selects type
          creatorId: currentUser.id.toString(),
          creatorName: currentUser.name || 'Unknown',
          participants: allParticipants.map((p: any) => ({
            userId: 'userId' in p ? p.userId : p.id,
            name: p.name,
            email: '',
            walletAddress: p.walletAddress || p.wallet_address || '',
            amountOwed: p.amountOwed || 0,
            amountPaid: 0,
            status: p.id === currentUser.id.toString() ? 'accepted' as const : (p.status || 'pending' as const),
            avatar: p.id === currentUser.id.toString() ? currentUser.avatar : p.avatar,
          })),
          items: (currentProcessedBillData.items || []).map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            category: item.category || 'Other',
            participants: item.participants || [],
          })),
          merchant: {
            name: currentProcessedBillData.merchant || 'Unknown Merchant',
            address: currentProcessedBillData.location || '',
            phone: currentProcessedBillData.merchantPhone || '',
          },
          date: currentProcessedBillData.date || new Date().toISOString(),
          // OCR-extracted data
          subtotal: currentProcessedBillData.subtotal,
          tax: currentProcessedBillData.tax,
          receiptNumber: currentProcessedBillData.receiptNumber,
        };

        const createResult = await SplitStorageService.createSplit(draftSplitData);

        if (createResult.success && createResult.split) {
          setCreatedSplitId(createResult.split.id);
          setCurrentSplitData(createResult.split);

          if (__DEV__) {
            logger.info('Draft split created successfully', {
              splitId: createResult.split.id,
              title: createResult.split.title,
              status: createResult.split.status,
              hasSplitType: !!createResult.split.splitType
            }, 'SplitDetailsScreen');
          }
        } else {
          logger.error('Failed to create draft split', { error: createResult.error }, 'SplitDetailsScreen');
          hasCreatedDraftSplitRef.current = false; // Allow retry
        }
      } catch (error) {
        logger.error('Error creating draft split', error as Record<string, unknown>, 'SplitDetailsScreen');
        hasCreatedDraftSplitRef.current = false; // Allow retry
      }
    };

    createDraftSplit();
  }, [currentProcessedBillData, isActuallyNewBill, isActuallyManualCreation, currentUser, billName, totalAmount, createdSplitId]);
  
  const [isInvitingUsers, setIsInvitingUsers] = useState(false);
  const [createdSplitId, setCreatedSplitId] = useState<string | null>(null);
  const [isJoiningSplit, setIsJoiningSplit] = useState(false);
  const [hasJustJoinedSplit, setHasJustJoinedSplit] = useState(false);
  const [usdcEquivalent, setUsdcEquivalent] = useState<number | null>(null);

  // Real-time update states
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<string | null>(null);
  const realtimeCleanupRef = useRef<(() => void) | null>(null);
  const lastEffectiveSplitIdRef = useRef<string | undefined>(undefined); // Track last effectiveSplitId to prevent wrong updates
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  // useEffect hooks for data loading and initialization
  useEffect(() => {
    // Handle notification navigation
    if (isFromNotification && effectiveSplitId) {
      handleJoinSplitFromNotification();
    }
  }, [isFromNotification, effectiveSplitId]);

  // Track last loaded splitId to prevent infinite loops
  const lastLoadedSplitIdRef = useRef<string | undefined>(undefined);
  const loadSplitDataRef = useRef(loadSplitData);
  
  // Update ref when loadSplitData changes
  useEffect(() => {
    loadSplitDataRef.current = loadSplitData;
  }, [loadSplitData]);

  // Track if we've handled contacts selection reload
  const hasHandledContactsReloadRef = useRef(false);
  
  // Consolidated effect to handle split data loading - prevents duplicate calls
  // Only loads when effectiveSplitId changes or when returning from Contacts screen
  useEffect(() => {
    // Load split data if we have an effective splitId (only for existing splits)
    if (effectiveSplitId) {
      // Only load if this is a different splitId than last time
      if (lastLoadedSplitIdRef.current !== effectiveSplitId) {
        lastLoadedSplitIdRef.current = effectiveSplitId;
        hasHandledContactsReloadRef.current = false; // Reset contacts reload flag when splitId changes
        loadSplitDataRef.current();
      }
    }
    
    // Handle returning from Contacts screen - reload split data if we have effectiveSplitId and selectedContacts
    if (effectiveSplitId && route?.params?.selectedContacts && !hasHandledContactsReloadRef.current) {
      hasHandledContactsReloadRef.current = true;
      loadSplitDataRef.current();
    }
  }, [effectiveSplitId, isActuallyNewBill, isActuallyManualCreation, route?.params?.selectedContacts]);

  // Update state when currentSplitData is loaded
  // CRITICAL: Don't update state for new bills - only for existing splits
  useEffect(() => {
    // Only update if this is NOT a new bill
    if (currentSplitData && !isActuallyNewBill && !isActuallyManualCreation) {
      setBillName(currentSplitData.title);
      setTotalAmount(currentSplitData.totalAmount.toString());
      setSelectedSplitType(currentSplitData.splitType || null);

      // No longer managing separate invited users state - all participants are shown in the main list
    }
  }, [currentSplitData, isActuallyNewBill, isActuallyManualCreation]);

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
    const handleSelectedContacts = async () => {
      if (!route?.params?.selectedContacts || !Array.isArray(route.params.selectedContacts) || route.params.selectedContacts.length === 0) {
        return;
      }

      if (!currentUser) {
        logger.warn('Cannot process selected contacts: missing current user', null, 'SplitDetailsScreen');
        return;
      }

      const splitIdToUse = createdSplitId || currentSplitData?.id || splitId || effectiveSplitId;
      if (!splitIdToUse) {
        logger.warn('Cannot process selected contacts: missing split ID', null, 'SplitDetailsScreen');
        return;
      }

      setIsInvitingUsers(true);
      try {
        const { SplitParticipantInvitationService } = await import('../../services/splits/SplitParticipantInvitationService');
        
        // Filter out existing participants
        const newContacts = SplitParticipantInvitationService.filterExistingParticipants(
          route.params.selectedContacts,
          participants
        );

        if (newContacts.length === 0) {
          Alert.alert('Info', 'All selected contacts are already participants in this split.');
          navigation.setParams({ selectedContacts: undefined });
          setIsInvitingUsers(false);
          return;
        }

        const result = await SplitParticipantInvitationService.inviteParticipants({
          splitId: splitIdToUse,
          inviterId: currentUser.id.toString(),
          inviterName: currentUser.name || 'User',
          contacts: newContacts,
          billName: billName,
          totalAmount: parseFloat(totalAmount) || 0,
          existingParticipants: participants,
          splitWalletId: currentSplitData?.walletId,
        });

        if (result.success) {
          // Reload split data to show the newly added participants
          if (effectiveSplitId) {
            await loadSplitData();
          } else {
            // For new bills, just reload from the database
            if (splitIdToUse) {
              const reloadResult = await SplitStorageService.getSplit(splitIdToUse);
              if (reloadResult.success && reloadResult.split) {
                setCurrentSplitData(reloadResult.split);
              }
            }
          }

          Alert.alert(
            'Success',
            result.message || `Successfully invited ${result.invitedCount} participant(s) to the split.`
          );
        } else {
          Alert.alert('Error', result.error || 'Failed to invite participants');
        }
      } catch (error) {
        logger.error('Error processing selected contacts', error as Record<string, unknown>, 'SplitDetailsScreen');
        Alert.alert('Error', 'Failed to invite participants. Please try again.');
      } finally {
        setIsInvitingUsers(false);
      // Clear the selected contacts from route params to avoid re-processing
      navigation.setParams({ selectedContacts: undefined });
    }
    };

    handleSelectedContacts();
  }, [route?.params?.selectedContacts, currentUser, participants, billName, totalAmount, effectiveSplitId, createdSplitId, currentSplitData, splitId, navigation]);

  useEffect(() => {
    // Check if split is already active/locked and redirect accordingly
    // CRITICAL: Don't redirect for new bills - only for existing splits
    const checkSplitStateAndRedirect = async () => {
      // Don't check redirect for new bills
      if (isActuallyNewBill || isActuallyManualCreation) {
        return;
      }
      
      if (!currentSplitData || !currentSplitData.splitType) {return;}

      // Only redirect if the split is already active/locked and we're not from a notification
      const splitStatus = currentSplitData.status;
      const shouldRedirectFair = currentSplitData.splitType === 'fair' && (splitStatus === 'active' || splitStatus === 'locked');
      const degenStatuses = ['pending', 'active', 'locked', 'spinning', 'spinning_completed', 'completed'];
      const shouldRedirectDegen = currentSplitData.splitType === 'degen' && degenStatuses.includes(splitStatus as string);

      if (shouldRedirectFair || shouldRedirectDegen) {
        // Split is already active in a downstream flow, redirect accordingly
        setTimeout(() => {
          if (shouldRedirectFair) {
            navigation.navigate('FairSplit', {
              splitData: currentSplitData,
              billData,
              processedBillData: currentProcessedBillData,
              splitWallet,
              isFromNotification,
              notificationId
            });
          } else if (shouldRedirectDegen) {
            navigation.navigate('DegenLock', {
              splitData: currentSplitData,
              billData,
              processedBillData: currentProcessedBillData,
              splitWallet,
              participants: currentSplitData.participants,
              totalAmount: currentSplitData.totalAmount || parseFloat(totalAmount),
              isFromNotification,
              notificationId
            });
          }
        }, 100);
      }
    };

    checkSplitStateAndRedirect();
  }, [currentSplitData, navigation, billData, currentProcessedBillData, splitWallet, isFromNotification, notificationId, isActuallyNewBill, isActuallyManualCreation, totalAmount]);

  // Track if loadSplitData is currently running to prevent duplicate calls
  const isLoadingSplitDataRef = useRef(false);
  
  // Async function implementations - wrapped in useCallback to prevent recreation
  const loadSplitData = useCallback(async () => {
    // CRITICAL: Never load split data for new bills
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (__DEV__) {
        logger.debug('loadSplitData blocked for new bill', {
          isActuallyNewBill,
          isActuallyManualCreation,
          effectiveSplitId
        }, 'SplitDetailsScreen');
      }
      return;
    }
    
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
      
      // Reduced logging - only log in dev mode
      if (__DEV__) {
        logger.debug('Loading split data for details screen', { splitId: effectiveSplitId }, 'SplitDetailsScreen');
      }
      
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

        // OPTIMIZED: Only fetch user data for participants missing wallet addresses or avatars
        // This prevents excessive refreshes and API calls
        const updatedParticipants = await Promise.all(
          splitData.participants.map(async (participant: any) => {
            // Skip fetching if participant already has wallet address and avatar
            const hasWalletAddress = participant.walletAddress || participant.wallet_address;
            const hasAvatar = participant.avatar;
            
            // For creator, use currentUser's wallet address if available (no fetch needed)
            if (participant.userId === splitData.creatorId && currentUser?.id?.toString() === splitData.creatorId) {
              return {
                ...participant,
                walletAddress: participant.walletAddress || participant.wallet_address || currentUser.wallet_address || '',
                avatar: participant.avatar || currentUser.avatar || ''
              };
            }
            
            // Only fetch if missing wallet address or avatar
            if (!hasWalletAddress || !hasAvatar) {
            try {
              const { firebaseDataService } = await import('../../services/data');
              const latestUserData = await firebaseDataService.user.getCurrentUser(participant.userId);

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
            }
            
            // Return participant as-is if they already have wallet address and avatar
            return participant;
          })
        );

        // Update split data with refreshed participant information
        const updatedSplitData = {
          ...splitData,
          participants: updatedParticipants
        };

        setCurrentSplitData(updatedSplitData);

        // Reduced logging - only log in dev mode
        if (__DEV__) {
          logger.debug('Loaded split data', {
            splitId: splitData.id,
            title: splitData.title,
            participantsCount: updatedParticipants.length
          }, 'SplitDetailsScreen');
        }

        // No longer managing separate invited users state - all participants are shown in the main list
      }
    } catch (error) {
      logger.error('Error loading split data', error as Record<string, unknown>, 'SplitDetailsScreen');
    } finally {
      isLoadingSplitDataRef.current = false;
    }
  }, [effectiveSplitId, isActuallyNewBill, isActuallyManualCreation, currentUser]);

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
              splitId: effectiveSplitId,
              participantsCount: participants.length
            }, 'SplitDetailsScreen');

            // CRITICAL: Ensure creator's wallet address is preserved in real-time updates
            const updatedParticipants = participants.map((p: any) => {
              const creatorId = currentSplitData?.creatorId || splitData?.creatorId;
              // If this is the creator and they don't have a wallet address, use currentUser's wallet address
              if (p.userId === creatorId && currentUser?.id?.toString() === creatorId && (!p.walletAddress && !p.wallet_address)) {
                return {
                  ...p,
                  walletAddress: currentUser.wallet_address || '',
                  wallet_address: currentUser.wallet_address || ''
                };
              }
              return p;
            });

            // Update current split data with new participants
            setCurrentSplitData(prev => prev ? { ...prev, participants: updatedParticipants } : null);
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

      // Use effectiveSplitId instead of splitId to prevent stopping wrong listener
      if (effectiveSplitId) {
        splitRealtimeService.stopListening(effectiveSplitId);
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
  
  // CRITICAL: Update ref when effectiveSplitId changes
  useEffect(() => {
    lastEffectiveSplitIdRef.current = effectiveSplitId;
  }, [effectiveSplitId]);
  
  useEffect(() => {
    // CRITICAL: Check if we have preserved new bill data (even if route params changed)
    const hasPreservedData = preservedNewBillDataRef.current !== null;
    const isNewBillWithPreservedData = hasPreservedData && (isActuallyNewBill || isActuallyManualCreation);
    
    // CRITICAL: Don't start real-time updates for new bills
    if (isNewBillWithPreservedData || isActuallyNewBill || isActuallyManualCreation) {
      // Stop any existing real-time updates if we're on a new bill
      if (isRealtimeActive) {
        if (__DEV__) {
          logger.debug('Stopping real-time updates for new bill', {
            isActuallyNewBill,
            isActuallyManualCreation,
            hasPreservedData,
            currentEffectiveSplitId: effectiveSplitId
          }, 'SplitDetailsScreen');
        }
        stopRealtimeUpdates();
      }
      return;
    }
    
    // CRITICAL: Stop any existing real-time updates if effectiveSplitId changed
    // This prevents listening to the wrong split when route params change
    if (isRealtimeActive && lastEffectiveSplitIdRef.current !== effectiveSplitId) {
      if (__DEV__) {
        logger.debug('Stopping real-time updates - effectiveSplitId changed', {
          oldEffectiveSplitId: lastEffectiveSplitIdRef.current,
          newEffectiveSplitId: effectiveSplitId
        }, 'SplitDetailsScreen');
      }
      stopRealtimeUpdates();
    }
    
    // Only start real-time updates if we have a valid split ID and we're not already active
    // Also check that we don't have preserved new bill data
    if (effectiveSplitId && !isRealtimeActive && !hasPreservedData && lastEffectiveSplitIdRef.current === effectiveSplitId) {
      // Small delay to ensure route params are stable and blocking logic has run
      const timeoutId = setTimeout(() => {
        // Triple-check: still on the same split, not a new bill, not already active, and no preserved data
        if (
          !isActuallyNewBill && 
          !isActuallyManualCreation && 
          !preservedNewBillDataRef.current &&
          effectiveSplitId && 
          !isRealtimeActive &&
          lastEffectiveSplitIdRef.current === effectiveSplitId
        ) {
      startRealtimeUpdatesRef.current().catch((error: unknown) => {
        logger.error('Failed to start real-time updates', error as Record<string, unknown>, 'SplitDetailsScreen');
      });
    }
      }, 300); // Increased delay to ensure blocking logic runs first
      
      return () => clearTimeout(timeoutId);
    }
  }, [effectiveSplitId, isRealtimeActive, isActuallyNewBill, isActuallyManualCreation]);

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
    // CRITICAL: Use effectiveSplitId or createdSplitId for draft splits
    const splitIdToUse = createdSplitId || currentSplitData?.id || splitId || effectiveSplitId;
    if (!contact || !currentUser || !splitIdToUse) {
      if (__DEV__) {
        logger.warn('Cannot invite contact - missing data', {
          hasContact: !!contact,
          hasCurrentUser: !!currentUser,
          splitIdToUse,
          createdSplitId,
          currentSplitDataId: currentSplitData?.id,
          splitId,
          effectiveSplitId
        }, 'SplitDetailsScreen');
      }
      return;
    }

    try {
      setIsInvitingUsers(true);

      // Check if contact is already a participant
      const isAlreadyParticipant = participants.some((p: any) => (p.userId || p.id) === (contact.id || contact.userId));
      if (isAlreadyParticipant) {
        Alert.alert('Already Added', `${contact.name} is already in this split.`);
        return;
      }

      // Use the reusable service for consistency
      const { SplitParticipantInvitationService } = await import('../../services/splits/SplitParticipantInvitationService');
      
      const result = await SplitParticipantInvitationService.inviteParticipants({
        splitId: splitIdToUse,
        inviterId: currentUser.id.toString(),
        inviterName: currentUser.name || 'User',
        contacts: [contact],
        billName: billName,
        totalAmount: parseFloat(totalAmount) || 0,
        existingParticipants: participants,
        splitWalletId: currentSplitData?.walletId,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to invite contact. Please try again.');
        return;
      }

      // Reload split data to show the newly added participant
      // Only reload if we have an effectiveSplitId (not for new bills)
      if (effectiveSplitId) {
      await loadSplitData();
      } else {
        // For new bills, just reload from the database using splitIdToUse
        if (splitIdToUse) {
          const reloadResult = await SplitStorageService.getSplit(splitIdToUse);
          if (reloadResult.success && reloadResult.split) {
            setCurrentSplitData(reloadResult.split);
          }
        }
      }

      // Show success message
        Alert.alert(
          'Invitation Sent!',
          `${contact.name} has been invited to the split and will receive a notification.`
        );

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

    // CRITICAL: For new bills, current user is always the creator
    if (isActuallyNewBill || isActuallyManualCreation) {
      return true;
    }

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

    // Default: assume creator for safety
    return true;
  };

  // Get participants from current split data
  // CRITICAL: For new bills, prioritize processedBillData participants
  // CRITICAL: Ensure creator always has wallet address from currentUser
  const participants = (() => {
    let participantsList: any[] = [];
    
    // For new bills, use processedBillData participants
    if (isActuallyNewBill || isActuallyManualCreation) {
      if (currentProcessedBillData?.participants) {
        participantsList = currentProcessedBillData.participants;
      } else if (billData?.participants) {
        participantsList = billData.participants;
      }
    } else {
      // For existing splits, use currentSplitData or splitData
    if (currentSplitData?.participants) {
        participantsList = currentSplitData.participants;
      } else if (splitData?.participants) {
        participantsList = splitData.participants;
      } else if (currentProcessedBillData?.participants) {
        participantsList = currentProcessedBillData.participants;
    }
    }
    
    // CRITICAL: Ensure creator's wallet address is always set from currentUser
    if (currentUser && participantsList.length > 0) {
      const creatorId = currentSplitData?.creatorId || splitData?.creatorId || currentUser.id.toString();
      return participantsList.map((p: any) => {
        const pId = 'userId' in p ? p.userId : p.id;
        // If this is the creator and they don't have a wallet address, use currentUser's wallet address
        if (pId === creatorId && currentUser.id.toString() === creatorId) {
          return {
            ...p,
            walletAddress: p.walletAddress || p.wallet_address || currentUser.wallet_address || '',
            wallet_address: p.wallet_address || p.walletAddress || currentUser.wallet_address || ''
          };
        }
        return p;
      });
    }
    
    return participantsList;
  })();

  // Helper function to check if all participants have accepted
  const areAllParticipantsAccepted = () => {
    // For new bills, there are no participants to accept yet, so return true
    if (isActuallyNewBill || isActuallyManualCreation) {
      return true;
    }
    
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
    setSelectedSplitType(type);
  };

  const handleContinue = async () => {
    if (!selectedSplitType) {return;}

    try {
      // Continue with selected split type
      hideSplitModal();

      // Create or update the split with the selected type
      // CRITICAL: For draft splits, prioritize splitId from route params and effectiveSplitId
      // This ensures we update existing drafts instead of creating duplicates
      const splitIdToUse = createdSplitId || currentSplitData?.id || splitId || effectiveSplitId;
      
      // CRITICAL: Check if this is a draft split that should be updated
      const isDraftToUpdate = (currentSplitData?.status === 'draft' || splitData?.status === 'draft') && 
                               splitIdToUse && 
                               !isActuallyNewBill && 
                               !isActuallyManualCreation;
      
      if (__DEV__) {
        logger.debug('handleContinue called', {
          selectedSplitType,
          splitIdToUse,
          createdSplitId,
          currentSplitDataId: currentSplitData?.id,
          splitId,
          effectiveSplitId,
          isActuallyNewBill,
          isActuallyManualCreation,
          isDraftSplit,
          isDraftToUpdate,
          currentSplitDataStatus: currentSplitData?.status,
          splitDataStatus: splitData?.status,
          hasProcessedBillData: !!currentProcessedBillData
        }, 'SplitDetailsScreen');
      }

      // CRITICAL: Always update if we have a splitIdToUse and it's not a new bill
      // This prevents creating duplicates for draft splits
      // If we have splitIdToUse and it's not a new bill, we should update, not create
      const shouldUpdateExisting = splitIdToUse && !isActuallyNewBill && !isActuallyManualCreation;
      
      if (shouldUpdateExisting) {
        // Update existing draft split with split type
        // Get the latest split data (might be the draft we just created or loaded)
        let splitToUpdate = currentSplitData || splitData;
        
        // If we don't have split data but have splitId, load it
        if (!splitToUpdate && splitIdToUse) {
          if (__DEV__) {
            logger.debug('Loading split data for update', { splitIdToUse }, 'SplitDetailsScreen');
          }
          const loadResult = await SplitStorageService.getSplit(splitIdToUse);
          if (loadResult.success && loadResult.split) {
            splitToUpdate = loadResult.split;
            setCurrentSplitData(splitToUpdate);
          } else {
            logger.error('Failed to load split for update', { 
              splitIdToUse, 
              error: loadResult.error 
            }, 'SplitDetailsScreen');
            Alert.alert('Error', 'Failed to load split. Please try again.');
            return;
          }
        }
        
        if (!splitToUpdate) {
          logger.error('Split not found for update', { splitIdToUse }, 'SplitDetailsScreen');
          Alert.alert('Error', 'Split not found. Please try again.');
          return;
        }

        // CRITICAL: Only update splitType and status, preserve all other data
        const updatedSplitData = {
          ...splitToUpdate,
          splitType: selectedSplitType,
          status: 'pending' as const // Change from 'draft' to 'pending' when type is selected
        };

        if (__DEV__) {
          logger.debug('Updating existing split with split type', {
            splitId: splitIdToUse,
            originalStatus: splitToUpdate.status,
            newStatus: updatedSplitData.status,
            splitType: selectedSplitType,
            title: splitToUpdate.title
          }, 'SplitDetailsScreen');
        }

        const updateResult = await SplitStorageService.updateSplit(splitIdToUse, updatedSplitData);

        if (updateResult.success) {
          // Update local state
          setCurrentSplitData(updateResult.split);

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
              billData,
              processedBillData: currentProcessedBillData,
              participants: updateResult.split?.participants,
              totalAmount: updateResult.split?.totalAmount || parseFloat(totalAmount),
              splitWallet,
            });
          }
        } else {
          logger.error('Failed to update split', { error: updateResult.error }, 'SplitDetailsScreen');
          Alert.alert('Error', 'Failed to update split type');
        }
      } else {
        // Create new split
        // CRITICAL: Double-check we're not accidentally creating a duplicate
        // If we have any splitId, we should have updated instead
        if (splitIdToUse && !isActuallyNewBill && !isActuallyManualCreation) {
          logger.error('CRITICAL: Attempted to create new split when splitId exists', {
            splitIdToUse,
            splitId,
            effectiveSplitId,
            currentSplitDataId: currentSplitData?.id,
            createdSplitId,
            isActuallyNewBill,
            isActuallyManualCreation
          }, 'SplitDetailsScreen');
          Alert.alert('Error', 'Cannot create new split. Please try again or contact support.');
          return;
        }
        
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
        
        // Ensure creator is included in participants if not already present
        const allParticipants = [...participants];
        const creatorExists = allParticipants.some(p => {
          const pId = 'userId' in p ? p.userId : p.id;
          return pId === currentUser?.id?.toString();
        });
        
        if (!creatorExists && currentUser) {
          allParticipants.push({
            id: currentUser.id.toString(),
            name: currentUser.name,
            walletAddress: currentUser.wallet_address || '',
            amountOwed: 0, // Will be calculated
            status: 'accepted' as const,
            items: []
          });
        }
        
        const newSplitData = {
          billId: currentProcessedBillData?.id || generateBillId(),
          title: billName,
          description: `Split for ${billName}`,
          totalAmount: parseFloat(totalAmount),
          currency: currentProcessedBillData?.currency || 'USDC',
          splitType: selectedSplitType,
          status: 'pending' as const, // Keep as pending until wallet is created
          creatorId: currentUser?.id?.toString() || '',
          creatorName: currentUser?.name || 'Unknown',
          participants: allParticipants.map((p: any) => ({
            userId: 'userId' in p ? p.userId : p.id,
            name: p.name,
            email: '',
            walletAddress: p.walletAddress || p.wallet_address || '',
            amountOwed: p.amountOwed || 0,
            amountPaid: 0,
            status: p.id === currentUser?.id?.toString() ? 'accepted' as const : (p.status || 'pending' as const),
            avatar: p.id === currentUser?.id?.toString() ? currentUser?.avatar : p.avatar,
          })),
          items: (currentProcessedBillData?.items || []).map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            category: item.category || 'Other',
            participants: item.participants || [],
          })),
          merchant: {
            name: currentProcessedBillData?.merchant || 'Unknown Merchant',
            address: currentProcessedBillData?.location || '',
            phone: currentProcessedBillData?.merchantPhone || '',
          },
          date: currentProcessedBillData?.date || new Date().toISOString(),
          // OCR-extracted data
          subtotal: currentProcessedBillData?.subtotal,
          tax: currentProcessedBillData?.tax,
          receiptNumber: currentProcessedBillData?.receiptNumber,
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
            navigation.navigate('DegenLock', {
              splitData: createResult.split,
              billData,
              processedBillData: currentProcessedBillData,
              participants: createResult.split?.participants,
              totalAmount: createResult.split?.totalAmount || parseFloat(totalAmount),
            });
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
      <LoadingScreen
        message="Processing your bill..."
        showSpinner={true}
      />
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
      {/* CRITICAL: For new bills and draft splits, always show "Split" button to select split type */}
      {/* For existing splits, show button only if all participants accepted */}
      {isCurrentUserCreator() && (
        <View style={styles.bottomContainer}>
          <Button
            title={(() => {
              // For new bills or draft splits, always show "Split" button
              if (isActuallyNewBill || isActuallyManualCreation || isDraftSplit) {
                return 'Split';
              }
              
              // For existing splits, check participant acceptance
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
            disabled={(() => {
              // For new bills or draft splits, button is always enabled
              if (isActuallyNewBill || isActuallyManualCreation || isDraftSplit) {
                return false;
              }
              // For existing splits, disable if not all accepted
              return !areAllParticipantsAccepted();
            })()}
            fullWidth={true}
          />
        </View>
      )}

      {/* Split Type Selection Modal */}
      <Modal
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
            <Text style={styles.splitOptionDescription}>Winner takes all – high risk, high reward. Shared private key for every participant.</Text>
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
      </Modal>

      {/* Add Friends Modal */}
      <Modal
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
      </Modal>

      {/* Private Key Modal - MOVED TO FAIR/DEGEN SCREENS */}

    </Container>
  );
};

// Styles are imported from ./styles.ts

export default SplitDetailsScreen;

/**
 * Split Details Screen
 * Screen for editing bill split details, managing participants, and configuring split methods
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './styles';
import { ProcessedBillData, BillAnalysisResult } from '../../types/billAnalysis';
import { BillAnalysisService } from '../../services/billAnalysisService';
import { AIBillAnalysisService } from '../../services/aiBillAnalysisService';
import { SplitInvitationService } from '../../services/splitInvitationService';
import { convertFiatToUSDC, formatCurrencyAmount } from '../../services/fiatCurrencyService';
import { NFCSplitService } from '../../services/nfcService';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { SplitStorageService, Split } from '../../services/splitStorageService';
import { SplitWalletService } from '../../services/splitWalletService';
import { FallbackDataService } from '../../utils/fallbackDataService';
import { MockupDataService } from '../../data/mockupData';
import { QRCodeService } from '../../services/qrCodeService';
import { sendNotification } from '../../services/firebaseNotificationService';
import UserAvatar from '../../components/UserAvatar';
import QRCode from 'react-native-qrcode-svg';
import {
  SplitDetailsNavigationParams,
  SplitDataConverter,
  UnifiedBillData,
  UnifiedParticipant
} from '../../types/splitNavigation';

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
    splitInvitationData
  } = route?.params || {};

  // Utility function to format wallet address
  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const { state } = useApp();
  const { currentUser } = state;

  // Debug: Log the current user data and route params
  if (__DEV__) {
    console.log('🔍 SplitDetailsScreen: Current user from context:', {
      currentUser: currentUser ? {
        id: currentUser.id,
        name: currentUser.name
      } : null,
      isAuthenticated: state.isAuthenticated
    });

    console.log('🔍 SplitDetailsScreen: Route params received:', {
      hasSplitData: !!splitData,
      splitDataId: splitData?.id,
      hasSplitId: !!splitId,
      hasProcessedBillData: !!processedBillData,
      hasBillData: !!billData,
      isNewBill: isNewBill,
      isManualCreation: isManualCreation,
      isFromNotification: isFromNotification,
      routeParams: route?.params,
      fullRoute: route
    });

    // Additional logging for notification navigation
    if (isFromNotification) {
      console.log('🔍 SplitDetailsScreen: Navigation from notification detected:', {
        splitId: splitId,
        isFromNotification: isFromNotification,
        notificationId: route?.params?.notificationId
      });
    }
  }

  const [billName, setBillName] = useState(() => {
    // Use data from existing split if available, otherwise use mockup data for new splits
    if (splitData?.title) {
      console.log('🔍 SplitDetailsScreen: Using bill name from splitData:', splitData.title);
      return splitData.title;
    }
    if (processedBillData?.title) {
      console.log('🔍 SplitDetailsScreen: Using bill name from processedBillData:', processedBillData.title);
      return processedBillData.title;
    }
    if (billData?.title) {
      console.log('🔍 SplitDetailsScreen: Using bill name from billData:', billData.title);
      return billData.title;
    }
    console.log('🔍 SplitDetailsScreen: Using mockup bill name for new split');
    return MockupDataService.getBillName();
  });

  const [totalAmount, setTotalAmount] = useState(() => {
    // Use data from existing split if available, otherwise use mockup data for new splits
    if (splitData?.totalAmount) {
      console.log('🔍 SplitDetailsScreen: Using total amount from splitData:', splitData.totalAmount);
      return splitData.totalAmount.toString();
    }
    if (processedBillData?.totalAmount) {
      console.log('🔍 SplitDetailsScreen: Using total amount from processedBillData:', processedBillData.totalAmount);
      return processedBillData.totalAmount.toString();
    }
    if (billData?.totalAmount) {
      console.log('🔍 SplitDetailsScreen: Using total amount from billData:', billData.totalAmount);
      return billData.totalAmount.toString();
    }
    console.log('🔍 SplitDetailsScreen: Using mockup total amount for new split');
    return MockupDataService.getBillAmount().toString();
  });
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedSplitType, setSelectedSplitType] = useState<'fair' | 'degen' | null>(() => {
    // Initialize with existing split type if available
    if (splitData?.splitType) {
      console.log('🔍 SplitDetailsScreen: Using split type from splitData:', splitData.splitType);
      return splitData.splitType;
    }
    return null;
  });
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [splitWalletPrivateKey, setSplitWalletPrivateKey] = useState<string | null>(null);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);

  // Animation refs for modals
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const splitModalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const splitModalOpacity = useRef(new Animated.Value(0)).current;
  const addFriendsModalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const addFriendsModalOpacity = useRef(new Animated.Value(0)).current;
  const privateKeyModalTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const privateKeyModalOpacity = useRef(new Animated.Value(0)).current;
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [currentSplitData, setCurrentSplitData] = useState<Split | null>(splitData || null);
  const [splitWallet, setSplitWallet] = useState<any>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isProcessingNewBill, setIsProcessingNewBill] = useState(false);
  const [newBillProcessingResult, setNewBillProcessingResult] = useState<BillAnalysisResult | null>(null);
  const [hasAttemptedProcessing, setHasAttemptedProcessing] = useState(false); // Prevent infinite retry loops
  const [currentProcessedBillData, setCurrentProcessedBillData] = useState<ProcessedBillData | null>(() => {
    // Use processedBillData if available, otherwise create from splitData
    if (processedBillData) {
      return processedBillData;
    }
    if (splitData) {
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
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [isInvitingUsers, setIsInvitingUsers] = useState(false);
  const [createdSplitId, setCreatedSplitId] = useState<string | null>(null);
  const [isJoiningSplit, setIsJoiningSplit] = useState(false);
  const [hasJustJoinedSplit, setHasJustJoinedSplit] = useState(false);
  const [usdcEquivalent, setUsdcEquivalent] = useState<number | null>(null);
  const [isConvertingCurrency, setIsConvertingCurrency] = useState(false);

  // Helper function to check if current user is the creator
  const isCurrentUserCreator = () => {
    if (!currentUser) return false;

    // Check currentSplitData first (for joined splits)
    if (currentSplitData?.creatorId) {
      const isCreator = currentSplitData.creatorId === currentUser.id.toString();
      console.log('🔍 SplitDetailsScreen: isCurrentUserCreator check (currentSplitData):', {
        currentUserId: currentUser.id.toString(),
        creatorId: currentSplitData.creatorId,
        isCreator
      });
      return isCreator;
    }

    // Check splitData (for existing splits)
    if (splitData?.creatorId) {
      const isCreator = splitData.creatorId === currentUser.id.toString();
      console.log('🔍 SplitDetailsScreen: isCurrentUserCreator check (splitData):', {
        currentUserId: currentUser.id.toString(),
        creatorId: splitData.creatorId,
        isCreator,
        splitDataParticipants: splitData.participants?.map(p => ({
          userId: p.userId,
          name: p.name,
          status: p.status
        }))
      });
      return isCreator;
    }

    // For new splits, the current user is always the creator
    console.log('🔍 SplitDetailsScreen: isCurrentUserCreator check (new split):', {
      currentUserId: currentUser.id.toString(),
      isCreator: true
    });
    return true;
  };

  // Helper function to check if all invited users have accepted
  const areAllInvitedUsersAccepted = () => {
    console.log('🔍 SplitDetailsScreen: Checking if all invited users accepted:', {
      participantsLength: participants.length,
      invitedUsersLength: invitedUsers.length,
      currentUserId: currentUser?.id.toString()
    });

    // If there are no participants and no invited users, only creator can proceed
    if (participants.length === 0 && invitedUsers.length === 0) {
      console.log('🔍 SplitDetailsScreen: No participants or invited users, allowing proceed');
      return true;
    }

    // FIRST: Check if there are any pending invited users - if yes, split button should be disabled
    const pendingInvitedUsers = invitedUsers.filter((user: any) => user.status === 'pending');
    if (pendingInvitedUsers.length > 0) {
      console.log('🔍 SplitDetailsScreen: There are pending invited users:', pendingInvitedUsers.length);
      return false; // Disable split button until all invited users accept
    }

    // SECOND: Check if there are any invited users with other statuses (declined, etc.)
    const nonPendingInvitedUsers = invitedUsers.filter((user: any) => user.status !== 'pending');
    if (nonPendingInvitedUsers.length > 0) {
      console.log('🔍 SplitDetailsScreen: There are non-pending invited users:', nonPendingInvitedUsers.length);
      // If there are invited users who haven't accepted yet, disable split button
      const acceptedInvitedUsers = nonPendingInvitedUsers.filter((user: any) => user.status === 'accepted');
      if (acceptedInvitedUsers.length !== nonPendingInvitedUsers.length) {
        console.log('🔍 SplitDetailsScreen: Not all invited users have accepted, disabling split button');
        return false;
      }
    }

    // THIRD: Check if all participants (excluding creator) have accepted
    const nonCreatorParticipants = participants.filter((p: any) => p.id !== currentUser?.id.toString());
    console.log('🔍 SplitDetailsScreen: Non-creator participants:', nonCreatorParticipants.length);

    if (nonCreatorParticipants.length === 0) {
      // If there are no other participants, check if there are any invited users
      if (invitedUsers.length > 0) {
        console.log('🔍 SplitDetailsScreen: No participants but there are invited users, disabling split button');
        return false;
      }
      console.log('🔍 SplitDetailsScreen: Only creator participants, allowing proceed');
      return true; // Only creator, can proceed
    }

    const allParticipantsAccepted = nonCreatorParticipants.every((p: any) => p.status === 'accepted');
    console.log('🔍 SplitDetailsScreen: All participants accepted:', allParticipantsAccepted);
    return allParticipantsAccepted;
  };
  const [participants, setParticipants] = useState<any[]>(() => {
    console.log('🔍 SplitDetailsScreen: Initializing participants with:', {
      splitDataParticipants: splitData?.participants,
      processedBillDataParticipants: processedBillData?.participants,
      billDataParticipants: billData?.participants,
      currentUser: currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        wallet_address: currentUser.wallet_address
      } : null
    });

    // Use participants from existing split data if available
    if (splitData?.participants && splitData.participants.length > 0) {
      console.log('🔍 SplitDetailsScreen: Using participants from splitData:', splitData.participants);
      // Transform SplitParticipant to UnifiedParticipant format, but exclude only invited users
      // Include pending users (they might be the creator)
      return splitData.participants
        .filter((participant: any) =>
          participant.status !== 'invited'
        )
        .map((participant: any) => ({
          id: participant.userId, // Map userId to id for compatibility
          name: participant.name,
          walletAddress: participant.walletAddress,
          status: participant.status,
          amountOwed: participant.amountOwed,
          amountPaid: participant.amountPaid,
          userId: participant.userId, // Keep original userId for compatibility
          email: participant.email || '',
          items: [],
        }));
    }

    // Use participants from processed bill data or bill data if available
    if (processedBillData?.participants && processedBillData.participants.length > 0) {
      console.log('🔍 SplitDetailsScreen: Using participants from processedBillData');
      // Transform BillParticipant to UnifiedParticipant format
      return processedBillData.participants.map((participant: any) => ({
        id: participant.id,
        name: participant.name,
        walletAddress: participant.walletAddress,
        status: participant.status,
        amountOwed: participant.amountOwed,
        amountPaid: participant.amountPaid || 0,
        userId: participant.id, // Map id to userId for compatibility
        email: '',
        items: participant.items || [],
      }));
    }

    if (billData?.participants && billData.participants.length > 0) {
      console.log('🔍 SplitDetailsScreen: Using participants from billData');
      // Transform BillParticipant to UnifiedParticipant format
      return billData.participants.map((participant: any) => ({
        id: participant.id,
        name: participant.name,
        walletAddress: participant.walletAddress,
        status: participant.status,
        amountOwed: participant.amountOwed,
        amountPaid: participant.amountPaid || 0,
        userId: participant.id, // Map id to userId for compatibility
        email: '',
        items: participant.items || [],
      }));
    }

    // If no participants provided, start with just the current user as creator
    if (currentUser) {
      const currentUserParticipant = {
        id: currentUser.id.toString(),
        name: currentUser.name,
        walletAddress: currentUser.wallet_address || 'No wallet address',
        status: 'accepted' as 'pending' | 'accepted' | 'declined',
        amountOwed: 0,
        amountPaid: 0,
        userId: currentUser.id.toString(), // Add userId for compatibility
        email: currentUser.email || '',
        items: [],
      };
      console.log('🔍 SplitDetailsScreen: Created current user participant:', currentUserParticipant);
      return [currentUserParticipant];
    }

    // Fallback if no current user
    console.log('🔍 SplitDetailsScreen: No current user, returning empty participants');
    return [];
  });

  // Helper function to create split with wallet
  const createSplitWithWallet = async (billInfo: any, participants: any[] = [], forceCreate: boolean = false) => {
    if (!currentUser || !billInfo) {
      throw new Error('Missing required data for split creation');
    }

    // Prevent duplicate creation unless forced (for manual creation)
    if (createdSplitId && !forceCreate) {
      console.log('🔍 SplitDetailsScreen: Split already exists, skipping creation:', createdSplitId);
      return currentSplitData;
    }

    console.log('🔍 SplitDetailsScreen: Creating split with wallet...', {
      billInfo,
      participants: participants.map((p: any) => ({
        userId: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        amountOwed: p.amountOwed,
      }))
    });

    // Create wallet first
    const walletResult = await SplitWalletService.createSplitWallet(
      billInfo.id,
      currentUser.id.toString(),
      billInfo.totalAmount,
      billInfo.currency || 'USDC',
      participants.map((p: any) => ({
        userId: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        amountOwed: p.amountOwed,
      }))
    );

    if (!walletResult.success || !walletResult.wallet) {
      throw new Error(walletResult.error || 'Failed to create split wallet');
    }

    setSplitWallet(walletResult.wallet);

    // Create split in database
    const splitData = {
      billId: billInfo.id,
      title: billInfo.title,
      description: `Split for ${billInfo.title}`,
      totalAmount: billInfo.totalAmount,
      currency: billInfo.currency || 'USDC',
      category: billInfo.category || 'Other', // Include category from bill info
      splitType: billInfo.splitType || selectedSplitType || 'fair',
      status: 'pending' as const, // Split starts as pending until user confirms repartition
      creatorId: currentUser.id.toString(),
      creatorName: currentUser.name,
      participants: participants.map((p: any) => ({
        userId: p.id,
        name: p.name,
        email: p.email || '',
        walletAddress: p.walletAddress,
        amountOwed: p.amountOwed || 0,
        amountPaid: p.amountPaid || 0,
        status: p.status || 'accepted',
      })),
      merchant: {
        name: billInfo.merchant,
        address: billInfo.location,
      },
      date: billInfo.date,
      walletId: walletResult.wallet.id,
      walletAddress: walletResult.wallet.walletAddress,
    };

    const createResult = await SplitStorageService.createSplit(splitData);
    if (!createResult.success || !createResult.split) {
      throw new Error(createResult.error || 'Failed to create split in database');
    }

    setCurrentSplitData(createResult.split);
    setCreatedSplitId(createResult.split.id);

    console.log('🔍 SplitDetailsScreen: Split created successfully:', {
      splitId: createResult.split.id,
      walletId: walletResult.wallet.id,
      walletAddress: walletResult.wallet.walletAddress
    });

    return createResult.split;
  };

  // Note: OCR AI processing is now handled in BillProcessingScreen
  // This screen only handles existing splits or manual creation

  // Handle joining a split when opened from a notification
  useEffect(() => {
    console.log('🔍 SplitDetailsScreen: useEffect for notification handling:', {
      isFromNotification,
      splitId,
      hasCurrentUser: !!currentUser,
      hasSplitData: !!splitData,
      shouldHandleNotification: isFromNotification && splitId && currentUser && !splitData
    });

    if (isFromNotification && splitId && currentUser && !splitData) {
      console.log('🔍 SplitDetailsScreen: Calling handleJoinSplitFromNotification');
      handleJoinSplitFromNotification();
    }
  }, [isFromNotification, splitId, currentUser, splitData]);

  const handleJoinSplitFromNotification = async () => {
    if (!splitId || !currentUser) {
      console.log('🔍 SplitDetailsScreen: Cannot join split - missing splitId or currentUser:', { splitId, currentUser: !!currentUser });
      return;
    }

    if (isJoiningSplit) {
      console.log('🔍 SplitDetailsScreen: Already joining split, ignoring duplicate request');
      return;
    }

    setIsJoiningSplit(true);
    try {
      console.log('🔍 SplitDetailsScreen: Loading split from notification:', splitId);

      // First, get the split data
      const splitResult = await SplitStorageService.getSplit(splitId);
      if (!splitResult.success || !splitResult.split) {
        Alert.alert('Error', 'Split not found or has been deleted');
        return;
      }

      const split = splitResult.split;

      // FIXED: Check if user is already a participant (they should be after acceptSplitInvitation)
      const existingParticipant = split.participants.find(p => p.userId === currentUser.id.toString());
      if (existingParticipant && existingParticipant.status === 'accepted') {
        console.log('🔍 SplitDetailsScreen: User is already accepted in this split, loading split data');
        // Load the split data and navigate to it
        setCurrentSplitData(split);
        setBillName(split.title);
        setTotalAmount(split.totalAmount.toString());
        setSelectedSplitType(split.splitType || null);

        // Transform participants to unified format
        const transformedParticipants = split.participants.map((p: any) => ({
          id: p.userId,
          name: p.name,
          walletAddress: p.walletAddress,
          status: p.status,
          amountOwed: p.amountOwed,
          amountPaid: p.amountPaid || 0,
          userId: p.userId,
          email: p.email || '',
          items: [],
        }));
        setParticipants(transformedParticipants);

        console.log('🔍 SplitDetailsScreen: Split data loaded successfully from notification');
        return;
      }

      // FIXED: If user is not a participant, this means acceptSplitInvitation failed
      // We should not try to add them again here, just show an error
      console.error('🔍 SplitDetailsScreen: User is not a participant in this split. acceptSplitInvitation may have failed.');
      Alert.alert(
        'Error',
        'You are not a participant in this split. The invitation may have expired or been revoked.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;

    } catch (error) {
      console.error('🔍 SplitDetailsScreen: Error joining split from notification:', error);
      Alert.alert('Error', 'Failed to join split. Please try again.');
    } finally {
      setIsJoiningSplit(false);
    }
  };

  // Handle selected contact from ContactsScreen
  useEffect(() => {
    if (selectedContact) {
      handleContactSelection(selectedContact);
    }
  }, [selectedContact]);

  // Ensure creator is always included as a participant
  useEffect(() => {
    if (currentUser && participants.length > 0) {
      const creatorExists = participants.some((p: any) => p.id === currentUser.id.toString());

      if (!creatorExists) {
        console.log('🔍 SplitDetailsScreen: Creator not found in participants, adding...');
        const currentUserParticipant = {
          id: currentUser.id.toString(),
          name: currentUser.name,
          walletAddress: currentUser.wallet_address || 'No wallet address',
          status: 'accepted' as 'pending' | 'accepted' | 'declined',
        };
        setParticipants((prev: any) => [currentUserParticipant, ...prev]);
      }
    }
  }, [currentUser, participants]);

  const handleAddParticipant = () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Generate QR code data when opening the modal
    const splitId = processedBillData?.id || billData?.id || `split_${Date.now()}`;
    const walletAddress = splitWallet?.walletAddress || 'wallet_address_placeholder';

    const qrData = QRCodeService.generateSplitInvitationQR(
      splitId,
      billName,
      parseFloat(totalAmount),
      processedBillData?.currency || 'USDC',
      currentUser.name || 'Unknown User',
      currentUser.id.toString(),
      participants.length,
      selectedSplitType || 'fair',
      walletAddress
    );
    setQrCodeData(qrData);
    setShowAddFriendsModal(true);
  };

  const handleCloseAddFriendsModal = () => {
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
      setShowAddFriendsModal(false);
      addFriendsModalTranslateY.setValue(SCREEN_HEIGHT);
      addFriendsModalOpacity.setValue(0);
    });
  };

  // Function to ensure split with wallet exists before allowing invitations
  const ensureSplitWithWalletExists = async () => {
    if (!currentUser || !billName || !totalAmount) {
      throw new Error('Missing required data for split creation');
    }

    // Create bill data object for the helper function
    const billInfo = {
      id: processedBillData?.id || billData?.id || `split_${Date.now()}`,
      title: billName,
      totalAmount: parseFloat(totalAmount),
      currency: processedBillData?.currency || billData?.currency || 'USDC',
      merchant: processedBillData?.merchant || billData?.merchant || 'Unknown',
      location: processedBillData?.location || billData?.location || '',
      date: processedBillData?.date || billData?.date || new Date().toISOString(),
      category: processedBillData?.originalAnalysis?.category || 'Other', // Extract category from original analysis
    };

    return await createSplitWithWallet(billInfo, participants);
  };

  const handleAddContacts = async () => {
    // FIXED: For new bills, ensure split with wallet is created before allowing invitations
    if (isNewBill && (!splitWallet || !createdSplitId)) {
      console.log('🔍 SplitDetailsScreen: Creating split with wallet before allowing invitations...');

      try {
        // Create the split with wallet synchronously
        await ensureSplitWithWalletExists();
      } catch (error) {
        console.error('🔍 SplitDetailsScreen: Failed to create split with wallet:', error);
        Alert.alert(
          'Error',
          'Failed to create split. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Generate a consistent splitId for new bills
    const currentSplitId = splitId || processedBillData?.id || billData?.id || createdSplitId || `split_${Date.now()}`;

    // Navigate to the existing ContactsScreen with split selection action
    // Store the callback in a ref or use a different approach to avoid serialization warning
    navigation.navigate('Contacts', {
      action: 'split',
      splitId: currentSplitId,
      splitName: billName,
      returnRoute: 'SplitDetails', // Add return route info
    });

    // Close the modal
    setShowAddFriendsModal(false);
  };

  // Handle contact selection from ContactsScreen
  // FIXED: This function now properly detects existing splits with wallets to prevent duplicate creation
  const handleContactSelection = async (contact: any) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Check if contact is already a participant
    const isAlreadyParticipant = participants.some((p: any) =>
      p.id === contact.id || p.email === contact.email || p.walletAddress === contact.wallet_address
    );

    if (isAlreadyParticipant) {
      Alert.alert('Already Added', `${contact.name} is already a participant in this split.`);
      return;
    }

    // Check if contact is already invited
    const isAlreadyInvited = invitedUsers.some((user: any) =>
      user.id === contact.id || user.email === contact.email
    );

    if (isAlreadyInvited) {
      Alert.alert('Already Invited', `${contact.name} has already been invited to this split.`);
      return;
    }

    setIsInvitingUsers(true);

    try {
      // Generate a consistent splitId for new bills
      const currentSplitId = splitId || processedBillData?.id || billData?.id || `split_${Date.now()}`;

      // Variable to store the created split result
      let createResult: any = null;

      // Check current state for split creation
      console.log('🔍 SplitDetailsScreen: handleContactSelection - Current state:', {
        hasSplitData: !!splitData,
        hasCreatedSplitId: !!createdSplitId,
        hasCurrentUser: !!currentUser
      });

      // Check if we have an existing split
      const hasExistingSplit = splitData || currentSplitData || createdSplitId || route?.params?.splitData;
      const hasSplitWithWallet = !!splitWallet;

      // If we have a splitId but no splitData, check if it exists in the database
      let splitExistsInDatabase = false;
      if ((splitId || route?.params?.splitId) && !hasExistingSplit) {
        try {
          const splitIdToCheck = splitId || route?.params?.splitId;
          if (splitIdToCheck) {
            console.log('🔍 SplitDetailsScreen: Checking if split exists in database:', splitIdToCheck);
            const splitResult = await SplitStorageService.getSplit(splitIdToCheck);
            splitExistsInDatabase = splitResult.success && !!splitResult.split;
            if (splitExistsInDatabase && splitResult.split) {
              console.log('🔍 SplitDetailsScreen: Split exists in database, using existing split');
              setCurrentSplitData(splitResult.split);
            } else {
              console.log('🔍 SplitDetailsScreen: Split does not exist in database, will create new split');
            }
          }
        } catch (error) {
          console.log('🔍 SplitDetailsScreen: Error checking split existence:', error);
          splitExistsInDatabase = false;
        }
      }

      // Simplified logic: If we have ANY indication of an existing split, don't create a new one
      const finalHasExistingSplit = hasExistingSplit || splitExistsInDatabase || hasSplitWithWallet;

      console.log('🔍 SplitDetailsScreen: Split existence check:', {
        hasSplitData: !!splitData,
        hasSplitId: !!splitId,
        hasCreatedSplitId: !!createdSplitId,
        hasRouteSplitData: !!route?.params?.splitData,
        hasRouteSplitId: !!route?.params?.splitId,
        hasSplitWithWallet: hasSplitWithWallet,
        hasExistingSplit: hasExistingSplit,
        splitExistsInDatabase: splitExistsInDatabase,
        finalHasExistingSplit: finalHasExistingSplit,
        shouldCreateNewSplit: !finalHasExistingSplit && currentUser,
        // Detailed breakdown
        splitDataCheck: !!splitData,
        splitIdCheck: !!splitId,
        createdSplitIdCheck: !!createdSplitId,
        routeSplitDataCheck: !!route?.params?.splitData,
        routeSplitIdCheck: !!route?.params?.splitId,
        splitWalletCheck: hasSplitWithWallet
      });

      if (!finalHasExistingSplit && currentUser && !createdSplitId) {
        console.log('🔍 SplitDetailsScreen: Creating split in database before inviting users...');

        // Warning: If we have a splitWallet but are creating a new split, this might be a bug
        if (splitWallet) {
          console.warn('🔍 SplitDetailsScreen: WARNING - Creating new split but splitWallet exists!');
        }

        // Validate required fields before creating split
        if (!billName || !totalAmount || isNaN(parseFloat(totalAmount))) {
          Alert.alert('Error', 'Please ensure the bill name and total amount are valid before inviting users.');
          return;
        }

        const parsedAmount = parseFloat(totalAmount);
        if (parsedAmount <= 0) {
          Alert.alert('Error', 'The total amount must be greater than 0.');
          return;
        }

        // Allow splits with any number of participants (including just the creator)
        console.log('🔍 SplitDetailsScreen: Participants count:', participants.length);

        // Validate currency
        const currency = processedBillData?.currency || billData?.currency || 'USDC';
        const validCurrencies = ['USDC', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
        if (!validCurrencies.includes(currency)) {
          Alert.alert('Error', `Invalid currency: ${currency}. Please use a supported currency.`);
          return;
        }

        // Validate split type
        const splitType = selectedSplitType || 'fair';
        const validSplitTypes = ['fair', 'degen'];
        if (!validSplitTypes.includes(splitType)) {
          Alert.alert('Error', `Invalid split type: ${splitType}. Please use a supported split type.`);
          return;
        }

        // Validate participants
        for (const participant of participants) {
          if (!participant.name || participant.name.trim() === '') {
            Alert.alert('Error', 'All participants must have a valid name.');
            return;
          }
          // Only require wallet address for participants with 'accepted' status
          // Invited participants can be added without wallet addresses initially
          if (participant.status === 'accepted' && (!participant.walletAddress || participant.walletAddress.trim() === '')) {
            Alert.alert('Error', `Participant ${participant.name} must have a valid wallet address.`);
            return;
          }
        }

        // Validate merchant data
        const merchantName = processedBillData?.merchant || billData?.merchant || 'Unknown';
        const merchantAddress = processedBillData?.location || billData?.location || '';
        if (!merchantName || merchantName.trim() === '') {
          Alert.alert('Error', 'Merchant name is required.');
          return;
        }

        // Validate date data
        const date = processedBillData?.date || billData?.date || new Date().toISOString();
        if (!date || isNaN(new Date(date).getTime())) {
          Alert.alert('Error', 'Invalid date provided.');
          return;
        }

        // Validate bill ID
        const billId = processedBillData?.id || billData?.id || currentSplitId;
        if (!billId || billId.trim() === '') {
          Alert.alert('Error', 'Bill ID is required.');
          return;
        }

        // Validate creator data
        if (!currentUser.id || !currentUser.name) {
          Alert.alert('Error', 'Creator information is incomplete. Please ensure you are properly logged in.');
          return;
        }

        // Validate description data
        const description = `Split for ${billName}`;
        if (!description || description.trim() === '') {
          Alert.alert('Error', 'Description is required.');
          return;
        }

        // Create bill data object for the helper function
        const billInfo = {
          id: processedBillData?.id || billData?.id || currentSplitId,
          title: billName,
          totalAmount: parseFloat(totalAmount),
          currency: processedBillData?.currency || billData?.currency || 'USDC',
          merchant: processedBillData?.merchant || billData?.merchant || 'Unknown',
          location: processedBillData?.location || billData?.location || '',
          date: processedBillData?.date || billData?.date || new Date().toISOString(),
          category: processedBillData?.originalAnalysis?.category || 'Other', // Extract category from original analysis
        };

        try {
          createResult = await createSplitWithWallet(billInfo, participants);
          console.log('🔍 SplitDetailsScreen: Split created successfully for invitations');
        } catch (error) {
          console.error('🔍 SplitDetailsScreen: Failed to create split:', error);
          Alert.alert('Error', 'Failed to create split. Please try again.');
          return;
        }
      } else {
        // We have existing split data, use the existing split
        console.log('🔍 SplitDetailsScreen: Using existing split for invitation');

        // If we have splitData but no createdSplitId, set it to prevent creating new splits
        const existingSplitId = splitData?.id || currentSplitData?.id || splitId || route?.params?.splitData?.id || route?.params?.splitId;
        if (existingSplitId && !createdSplitId) {
          console.log('🔍 SplitDetailsScreen: Setting createdSplitId to existing split ID:', existingSplitId);
          setCreatedSplitId(existingSplitId);
        }

        // If we have a splitWallet but no createdSplitId, try to get the split ID from the wallet
        if (splitWallet && !createdSplitId && !existingSplitId) {
          console.log('🔍 SplitDetailsScreen: Split has wallet but no ID, trying to find split by wallet ID');
          try {
            // Try to find the split by wallet ID
            const splitsResult = await SplitStorageService.getUserSplits(currentUser.id.toString());
            if (splitsResult.success && splitsResult.splits) {
              const splitWithWallet = splitsResult.splits.find(s => s.walletId === splitWallet.id);
              if (splitWithWallet) {
                console.log('🔍 SplitDetailsScreen: Found split with wallet, setting createdSplitId:', splitWithWallet.id);
                setCreatedSplitId(splitWithWallet.id);
                setCurrentSplitData(splitWithWallet);
              }
            }
          } catch (error) {
            console.log('🔍 SplitDetailsScreen: Error finding split by wallet ID:', error);
          }
        }
      }

      // Find the correct user ID and get their actual wallet address
      let recipientUserId = contact.id;
      let recipientWalletAddress = contact.wallet_address || '';
      let recipientUserData = null;

      // If the contact has an email, try to find the actual user by email
      if (contact.email) {
        try {
          console.log('🔍 SplitDetailsScreen: Looking up user by email:', contact.email);
          const { firebaseDataService } = await import('../../services/firebaseDataService');
          const userByEmail = await firebaseDataService.user.getUserByEmail(contact.email);
          if (userByEmail) {
            recipientUserId = userByEmail.id;
            recipientUserData = userByEmail;
            console.log('🔍 Found user by email:', {
              email: contact.email,
              userId: recipientUserId,
              walletAddress: userByEmail.wallet_address,
              userData: userByEmail
            });
          } else {
            console.log('🔍 No user found by email:', contact.email);
          }
        } catch (error) {
          console.log('🔍 Could not find user by email, using contact ID:', contact.id, error);
        }
      }

      // If the contact has a wallet address, try to find the actual user by wallet
      if (contact.wallet_address && recipientUserId === contact.id) {
        try {
          console.log('🔍 SplitDetailsScreen: Looking up user by wallet address:', contact.wallet_address);
          const userByWallet = await firebaseDataService.user.getUserByWalletAddress(contact.wallet_address);
          if (userByWallet) {
            recipientUserId = userByWallet.id;
            recipientUserData = userByWallet;
            console.log('🔍 Found user by wallet:', {
              wallet: contact.wallet_address,
              userId: recipientUserId,
              userData: userByWallet
            });
          } else {
            console.log('🔍 No user found by wallet address:', contact.wallet_address);
          }
        } catch (error) {
          console.log('🔍 Could not find user by wallet, using contact ID:', contact.id, error);
        }
      }

      // If we found the user data, use their actual wallet address
      if (recipientUserData && recipientUserData.wallet_address) {
        recipientWalletAddress = recipientUserData.wallet_address;
        console.log('🔍 Using actual wallet address from user profile:', recipientWalletAddress);
      } else if (contact.wallet_address) {
        recipientWalletAddress = contact.wallet_address;
        console.log('🔍 Using wallet address from contact:', recipientWalletAddress);
      } else {
        console.log('🔍 No wallet address found for user:', recipientUserId);
      }

      // Create invited user object
      const invitedUser = {
        id: recipientUserId, // Use the found user ID
        name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        walletAddress: recipientWalletAddress, // Use the actual wallet address from user profile
        status: 'pending',
        invitedAt: new Date().toISOString(),
        splitId: createResult?.split?.id || createdSplitId || splitData?.id || currentSplitData?.id || splitId || route?.params?.splitId || currentSplitId, // Use actual split ID from database
      };

      // Debug: Log the invited user object to verify wallet address
      console.log('🔍 SplitDetailsScreen: Created invited user object:', {
        id: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email,
        walletAddress: invitedUser.walletAddress,
        recipientWalletAddress: recipientWalletAddress,
        contactWalletAddress: contact.wallet_address,
        recipientUserData: recipientUserData
      });

      // Add to invited users
      setInvitedUsers(prev => [...prev, invitedUser]);

      // Add the invited user to the split in the database
      const splitIdToUpdate = createResult?.split?.id || createdSplitId || splitData?.id || currentSplitData?.id || splitId || route?.params?.splitId || currentSplitId;
      if (splitIdToUpdate) {
        try {
          const addParticipantResult = await SplitStorageService.addParticipant(splitIdToUpdate, {
            userId: recipientUserId,
            name: contact.name,
            email: contact.email || '',
            walletAddress: recipientWalletAddress, // Use the actual wallet address from user profile
            amountOwed: 0, // Will be set when split is confirmed
            amountPaid: 0,
            status: 'invited', // Mark as invited in database
          });

          if (addParticipantResult.success) {
            console.log('🔍 SplitDetailsScreen: Successfully added invited user to database:', {
              splitId: splitIdToUpdate,
              userId: recipientUserId,
              name: contact.name
            });
          } else {
            console.error('🔍 SplitDetailsScreen: Failed to add invited user to database:', addParticipantResult.error);
          }
        } catch (dbError) {
          console.error('🔍 SplitDetailsScreen: Error adding invited user to database:', dbError);
        }
      }

      // Send notification to the contact
      try {
        // Use the actual split ID from database if we just created it or have a created split ID
        const notificationSplitId = createResult?.split?.id || createdSplitId || splitData?.id || currentSplitData?.id || splitId || route?.params?.splitId || currentSplitId;

        // Validate required data before sending notification
        if (!recipientUserId) {
          throw new Error('Recipient user ID is required');
        }

        if (!notificationSplitId) {
          throw new Error('Split ID is required for notification');
        }

        if (!billName || !totalAmount) {
          throw new Error('Bill name and total amount are required for notification');
        }

        if (!currentUser?.name || !currentUser?.id) {
          throw new Error('Current user information is incomplete');
        }

        console.log('🔍 SplitDetailsScreen: Sending notification with validated data:', {
          recipientUserId,
          notificationSplitId,
          billName,
          totalAmount,
          inviterName: currentUser.name,
          inviterId: currentUser.id.toString()
        });

        await sendNotification(
          recipientUserId, // Use the found user ID
          `You're invited to split "${billName}"`,
          `${currentUser.name} invited you to split a bill for ${formatCurrencyAmount(parseFloat(totalAmount), processedBillData?.currency || billData?.currency || 'USD')}. Tap to join!`,
          'split_invite',
          {
            splitId: notificationSplitId,
            billName: billName,
            totalAmount: parseFloat(totalAmount),
            currency: 'USDC',
            inviterName: currentUser.name,
            inviterId: currentUser.id.toString(),
          }
        );

        Alert.alert(
          'Invitation Sent!',
          `Invitation sent to ${contact.name}. They will be notified and can accept or decline.`,
          [{ text: 'OK' }]
        );
      } catch (notificationError) {
        console.error(`Failed to send notification to ${contact.name}:`, notificationError);
        const errorMessage = notificationError instanceof Error ? notificationError.message : 'Unknown error occurred';
        Alert.alert('Error', `Failed to send notification to ${contact.name}: ${errorMessage}`);
      }

    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setIsInvitingUsers(false);
    }
  };

  // Handle notification responses (when users accept/decline invitations)
  const handleNotificationResponse = async (userId: string, response: 'accepted' | 'declined') => {
    try {
      // Update the invited user's status
      setInvitedUsers(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, status: response, respondedAt: new Date().toISOString() }
            : user
        )
      );

      // If accepted, add to participants and remove from invited users
      if (response === 'accepted') {
        console.log('🔍 SplitDetailsScreen: User accepted invitation:', {
          userId: userId,
          invitedUsersCount: invitedUsers.length,
          invitedUserIds: invitedUsers.map(u => u.id)
        });

        const invitedUser = invitedUsers.find(user => user.id === userId);
        if (invitedUser) {
          console.log('🔍 SplitDetailsScreen: Found invited user to accept:', {
            userId: invitedUser.id,
            name: invitedUser.name,
            walletAddress: invitedUser.walletAddress,
            email: invitedUser.email
          });
          const newParticipant = {
            id: invitedUser.id,
            name: invitedUser.name,
            walletAddress: invitedUser.walletAddress || invitedUser.email || 'No wallet address', // Use actual wallet address if available
            status: 'accepted' as const,
            amountOwed: parseFloat(totalAmount) / (participants.length + 1), // Equal split
            amountPaid: 0,
            userId: invitedUser.id,
            email: invitedUser.email || '',
            items: [],
          };

          setParticipants(prev => [...prev, newParticipant]);

          // Remove the user from invited users since they're now a participant
          setInvitedUsers(prev => {
            const filtered = prev.filter(user => user.id !== userId);
            console.log('🔍 SplitDetailsScreen: Removing invited user:', {
              userId: userId,
              beforeCount: prev.length,
              afterCount: filtered.length,
              removedUser: prev.find(u => u.id === userId)?.name
            });
            return filtered;
          });

          // Update the split in the database if it exists
          const splitIdToUpdate = createdSplitId || splitData?.id;
          if (splitIdToUpdate && currentUser) {
            console.log('🔍 SplitDetailsScreen: Adding participant to split in database:', splitIdToUpdate);

            // Update the existing participant's status in the database instead of adding a new one
            const updateResult = await SplitStorageService.updateParticipantStatus(splitIdToUpdate, newParticipant.id, 'accepted');
            if (updateResult.success) {
              console.log('🔍 SplitDetailsScreen: Participant status updated to accepted successfully');
            } else {
              console.error('🔍 SplitDetailsScreen: Failed to update participant status:', updateResult.error);
              // Fallback: try to add participant if update fails (in case they weren't in the database yet)
              console.log('🔍 SplitDetailsScreen: Fallback - adding participant to database');
              const participantToAdd = {
                userId: newParticipant.id,
                name: newParticipant.name,
                email: invitedUser.email || '',
                walletAddress: newParticipant.walletAddress,
                amountOwed: newParticipant.amountOwed,
                amountPaid: 0,
                status: 'accepted' as const,
              };

              const addResult = await SplitStorageService.addParticipant(splitIdToUpdate, participantToAdd);
              if (addResult.success) {
                console.log('🔍 SplitDetailsScreen: Participant added to split successfully as fallback');
              } else {
                console.error('🔍 SplitDetailsScreen: Failed to add participant to split:', addResult.error);
              }
            }

            // Also update the split wallet if it exists
            if (splitWallet?.id) {
              const updatedParticipants = [...participants, newParticipant].map((p: any) => ({
                userId: p.id,
                name: p.name,
                walletAddress: p.walletAddress,
                amountOwed: p.amountOwed || 0,
              }));

              await SplitWalletService.updateSplitWalletParticipants(
                splitWallet.id,
                updatedParticipants
              );
            }
          }

          // Send confirmation notification
          await sendNotification(
            userId,
            'Welcome to the split!',
            `You've successfully joined "${billName}". The split is ready to begin!`,
            'group_added',
            {
              splitId: splitId || processedBillData?.id || billData?.id || `split_${Date.now()}`,
              billName: billName,
              totalAmount: parseFloat(totalAmount),
            }
          );
        }
      } else {
        // Send decline notification to creator
        await sendNotification(
          currentUser?.id.toString() || '',
          'Invitation Declined',
          `${invitedUsers.find(u => u.id === userId)?.name} declined your invitation to split "${billName}".`,
          'general',
          {
            splitId: splitId || processedBillData?.id || billData?.id || `split_${Date.now()}`,
            declinedUserId: userId,
          }
        );
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  };

  const handleQRCodeShare = () => {
    // QR code is already displayed in the modal
    // This function can be used for additional QR code actions if needed
    console.log('QR Code displayed:', qrCodeData);
  };

  const handleNFCShare = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      // Generate invitation data using the service
      const invitationData = SplitInvitationService.generateInvitationData(
        processedBillData?.id || billData?.id || `split_${Date.now()}`,
        billName,
        parseFloat(totalAmount),
        processedBillData?.currency || 'USD',
        currentUser.id.toString()
      );

      // Generate NFC payload
      const nfcPayload = SplitInvitationService.generateNFCPayload(invitationData);

      // Use NFC service to write the payload
      const result = await NFCSplitService.writeSplitInvitation(nfcPayload);

      if (result.success) {
        Alert.alert('NFC Share', 'Split invitation has been written to the NFC tag successfully!');
      } else {
        Alert.alert('NFC Error', result.error || 'Failed to share via NFC. Please try again.');
      }

    } catch (error) {
      console.error('NFC sharing error:', error);
      Alert.alert('NFC Error', 'Failed to share via NFC. Please try again.');
    }
  };

  const handleLinkShare = async () => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      // Generate invitation data using the service
      const invitationData = SplitInvitationService.generateInvitationData(
        processedBillData?.id || billData?.id || `split_${Date.now()}`,
        billName,
        parseFloat(totalAmount),
        processedBillData?.currency || 'USD',
        currentUser.id.toString()
      );

      // Generate shareable link
      const shareableLink = SplitInvitationService.generateShareableLink(invitationData);

      // Use React Native's Share API
      const { Share } = require('react-native');
      await Share.share({
        message: `Join my bill split "${billName}" for ${formatCurrencyAmount(parseFloat(totalAmount), processedBillData?.currency || 'USD')}. Click to join: ${shareableLink}`,
        url: shareableLink,
        title: `Join ${billName} Split`,
      });
    } catch (error) {
      console.error('Error sharing link:', error);
      Alert.alert('Error', 'Failed to share link');
    }
  };

  const handleContactSelect = async (contact: any) => {
    try {
      // Check if contact is already a participant
      const isAlreadyParticipant = participants.some((p: any) =>
        p.walletAddress === contact.wallet_address || p.id === contact.id
      );

      if (isAlreadyParticipant) {
        Alert.alert('Already Added', `${contact.name} is already a participant in this split.`);
        return;
      }

      // Add the contact as a participant
      const newParticipant = {
        id: contact.id || `participant_${Date.now()}`,
        name: contact.name,
        walletAddress: contact.wallet_address,
        status: 'pending' as const,
      };

      setParticipants((prev: any) => [...prev, newParticipant]);

      // If we have processed bill data, update it
      if (processedBillData) {
        const updatedData = BillAnalysisService.addParticipant(processedBillData, {
          name: contact.name,
          walletAddress: contact.wallet_address,
          status: 'pending',
        });
        // Note: In a real implementation, you'd want to update the state with the new processed data
      }

      // Update the split wallet with the new participant (if wallet exists)
      if (splitWallet && currentUser) {
        try {
          console.log('🔍 SplitDetailsScreen: Updating split wallet with new participant...');

          // Update the wallet participants without recreating the wallet
          const updatedParticipants = [...participants, newParticipant].map((p: any) => ({
            userId: p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: p.amountOwed || 0,
          }));

          const updateResult = await SplitWalletService.updateSplitWalletParticipants(
            splitWallet.id,
            updatedParticipants
          );

          if (updateResult.success) {
            console.log('🔍 SplitDetailsScreen: Split wallet participants updated successfully');
            // Update local wallet state with new participants
            setSplitWallet(updateResult.wallet);
          } else {
            console.log('🔍 SplitDetailsScreen: Failed to update split wallet participants:', updateResult.error);
          }
        } catch (error) {
          console.error('Error updating split wallet with new participant:', error);
          // Don't show error to user as this is a background operation
        }
      }

      Alert.alert('Success', `${contact.name} has been added to the split.`);
    } catch (error) {
      console.error('Error adding participant:', error);
      Alert.alert('Error', 'Failed to add participant. Please try again.');
    }
  };

  const handleSplitBill = () => {
    console.log('Opening split modal...');
    setShowSplitModal(true);
  };

  const handleSplitTypeSelection = async (type: 'fair' | 'degen') => {
    console.log('Split type selected:', type);
    setSelectedSplitType(type);
    console.log('Current selectedSplitType state:', type);

    // Save or update the split in the database
    if (currentUser && processedBillData) {
      try {
        console.log('🔍 SplitDetailsScreen: Saving/updating split in database...');

        // Update the existing split with the selected split type
        if (currentSplitData) {
          console.log('🔍 SplitDetailsScreen: Updating existing split with split type:', type);

          const updateResult = await SplitStorageService.updateSplit(currentSplitData.id, {
            splitType: type,
            status: 'active' as const, // Set status to active when split type is confirmed
          });

          if (updateResult.success && updateResult.split) {
            console.log('🔍 SplitDetailsScreen: Split updated successfully with split type');
            setCurrentSplitData(updateResult.split);

            // Convert data to unified format
            const unifiedBillData = processedBillData ?
              SplitDataConverter.processBillDataToUnified(processedBillData) :
              undefined;
            const unifiedParticipants = SplitDataConverter.participantsToUnified(participants);

            // Navigate to the appropriate split screen with the unified data
            if (type === 'fair') {
              navigation.navigate('FairSplit', {
                billData: unifiedBillData,
                processedBillData: processedBillData,
                splitData: updateResult.split,
                splitWallet: splitWallet,
              });
            } else {
              navigation.navigate('DegenLock', {
                billData: unifiedBillData,
                processedBillData: processedBillData,
                splitData: updateResult.split,
                splitWallet: splitWallet,
                participants: unifiedParticipants,
                totalAmount: processedBillData.totalAmount,
              });
            }
          } else {
            console.log('🔍 SplitDetailsScreen: Failed to update split:', updateResult.error);
            Alert.alert('Error', updateResult.error || 'Failed to update split');
          }
        } else {
          console.error('🔍 SplitDetailsScreen: No existing split data found');
          Alert.alert('Error', 'No split data found. Please try again.');
        }
      } catch (error) {
        console.error('🔍 SplitDetailsScreen: Error saving split:', error);
        Alert.alert('Error', 'Failed to save split');
      }
    }
  };

  const handleContinue = () => {
    console.log('Continue button pressed, selectedSplitType:', selectedSplitType);
    console.log('Modal should close and navigate to FairSplit');
    console.log('🔍 SplitDetailsScreen: Current splitWallet state:', splitWallet ? {
      id: splitWallet.id,
      walletAddress: splitWallet.walletAddress,
      participants: splitWallet.participants?.length || 0
    } : 'No wallet');

    if (!selectedSplitType) {
      Alert.alert('Please select a split type', 'Choose either Fair Split or Degen Split to continue');
      return;
    }

    setShowSplitModal(false);

    // Convert data to unified format
    const unifiedBillData: UnifiedBillData = {
      id: processedBillData?.id || billData?.id || `split_${Date.now()}`,
      title: billName,
      totalAmount: parseFloat(totalAmount),
      currency: processedBillData?.currency || billData?.currency || 'USD',
      date: currentSplitData?.date || processedBillData?.date || billData?.date || new Date().toISOString().split('T')[0],
      merchant: currentSplitData?.merchant?.name || processedBillData?.merchant || billData?.merchant || 'Unknown Merchant',
      location: currentSplitData?.merchant?.address || processedBillData?.location || billData?.location || 'Unknown Location',
      participants: participants,
    };

    const unifiedParticipants = SplitDataConverter.participantsToUnified(participants);

    if (selectedSplitType === 'fair') {
      console.log('🔍 SplitDetailsScreen: Navigating to FairSplit with wallet:', splitWallet ? {
        id: splitWallet.id,
        walletAddress: splitWallet.walletAddress,
        participants: splitWallet.participants?.length || 0
      } : 'No wallet');

      navigation.navigate('FairSplit', {
        billData: unifiedBillData,
        processedBillData,
        analysisResult,
        splitWallet: splitWallet, // Pass the existing wallet
        splitData: currentSplitData, // Pass the split data
      });
    } else {
      // Check if degen split has already been completed or spinning completed
      // If so, redirect to result screen based on user's win/loss state
      console.log('🔍 SplitDetailsScreen: Checking degen split completion status:', {
        hasSplitWallet: !!splitWallet,
        walletStatus: splitWallet?.status,
        hasDegenWinner: !!splitWallet?.degenWinner,
        degenWinner: splitWallet?.degenWinner,
        currentUserId: currentUser?.id?.toString()
      });

      if (splitWallet && (splitWallet.status === 'completed' || splitWallet.status === 'spinning_completed')) {
        // Check if this is a degen split and if the user is winner or loser
        const currentUserId = currentUser?.id?.toString();
        if (currentUserId && splitWallet.degenWinner) {
          // Find the winner participant from the participants list
          const winnerParticipant = unifiedParticipants.find(p =>
            (p.userId || p.id) === splitWallet.degenWinner?.userId
          );

          console.log('🔍 SplitDetailsScreen: Found winner participant:', {
            winnerParticipant,
            degenWinnerUserId: splitWallet.degenWinner?.userId,
            currentUserId,
            isCurrentUserWinner: (winnerParticipant?.userId || winnerParticipant?.id) === currentUserId
          });

          if (winnerParticipant) {
            console.log('🔍 SplitDetailsScreen: Navigating to DegenResult for completed split');
            navigation.navigate('DegenResult', {
              billData: unifiedBillData,
              participants: unifiedParticipants,
              totalAmount: parseFloat(totalAmount),
              selectedParticipant: winnerParticipant, // This will determine if user is winner or loser
              splitWallet: splitWallet,
              processedBillData,
              splitData: currentSplitData,
            });
            return;
          }
        }
      }

      console.log('🔍 SplitDetailsScreen: Navigating to DegenLock with wallet:', splitWallet ? {
        id: splitWallet.id,
        walletAddress: splitWallet.walletAddress,
        participants: splitWallet.participants?.length || 0
      } : 'No wallet');

      navigation.navigate('DegenLock', {
        billData: unifiedBillData,
        participants: unifiedParticipants,
        totalAmount: parseFloat(totalAmount),
        processedBillData,
        analysisResult,
        splitWallet: splitWallet, // Pass the existing wallet
        splitData: currentSplitData, // Pass the split data
      });
    }
  };

  const handleCloseModal = () => {
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
      setShowSplitModal(false);
      setSelectedSplitType(null);
      splitModalTranslateY.setValue(SCREEN_HEIGHT);
      splitModalOpacity.setValue(0);
    });
  };

  const handleShowPrivateKey = async () => {
    if (!currentUser || !splitWallet) {
      Alert.alert('Error', 'Unable to access split wallet information');
      return;
    }

    try {
      console.log('🔍 SplitDetailsScreen: Requesting private key for wallet:', splitWallet.id);

      const result = await SplitWalletService.getSplitWalletPrivateKey(
        splitWallet.id,
        currentUser.id.toString()
      );

      if (result.success && result.privateKey) {
        setSplitWalletPrivateKey(result.privateKey);
        setShowPrivateKeyModal(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to retrieve private key');
      }
    } catch (error) {
      console.error('🔍 SplitDetailsScreen: Error getting private key:', error);
      Alert.alert('Error', 'Failed to retrieve private key');
    }
  };

  const handleClosePrivateKeyModal = () => {
    Animated.parallel([
      Animated.timing(privateKeyModalTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(privateKeyModalOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowPrivateKeyModal(false);
      setSplitWalletPrivateKey(null);
      privateKeyModalTranslateY.setValue(SCREEN_HEIGHT);
      privateKeyModalOpacity.setValue(0);
    });
  };

  // Animation handlers for Split Modal
  const handleSplitModalGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: splitModalTranslateY } }],
    { useNativeDriver: true }
  );

  const handleSplitModalStateChange = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    if (state === 2) {
      splitModalOpacity.setValue(1);
    } else if (state === 4 || state === 5) {
      if (translationY > 100) {
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
          setShowSplitModal(false);
          setSelectedSplitType(null);
          splitModalTranslateY.setValue(SCREEN_HEIGHT);
          splitModalOpacity.setValue(0);
        });
      } else {
        Animated.parallel([
          Animated.spring(splitModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(splitModalOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animation handlers for Add Friends Modal
  const handleAddFriendsModalGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: addFriendsModalTranslateY } }],
    { useNativeDriver: true }
  );

  const handleAddFriendsModalStateChange = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    if (state === 2) {
      addFriendsModalOpacity.setValue(1);
    } else if (state === 4 || state === 5) {
      if (translationY > 100) {
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
          setShowAddFriendsModal(false);
          addFriendsModalTranslateY.setValue(SCREEN_HEIGHT);
          addFriendsModalOpacity.setValue(0);
        });
      } else {
        Animated.parallel([
          Animated.spring(addFriendsModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(addFriendsModalOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animation handlers for Private Key Modal
  const handlePrivateKeyModalGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: privateKeyModalTranslateY } }],
    { useNativeDriver: true }
  );

  const handlePrivateKeyModalStateChange = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    if (state === 2) {
      privateKeyModalOpacity.setValue(1);
    } else if (state === 4 || state === 5) {
      if (translationY > 100) {
        Animated.parallel([
          Animated.timing(privateKeyModalTranslateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(privateKeyModalOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowPrivateKeyModal(false);
          setSplitWalletPrivateKey(null);
          privateKeyModalTranslateY.setValue(SCREEN_HEIGHT);
          privateKeyModalOpacity.setValue(0);
        });
      } else {
        Animated.parallel([
          Animated.spring(privateKeyModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(privateKeyModalOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animate in when modals become visible
  useEffect(() => {
    if (showSplitModal) {
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
    }
  }, [showSplitModal]);

  useEffect(() => {
    if (showAddFriendsModal) {
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
    }
  }, [showAddFriendsModal]);

  useEffect(() => {
    if (showPrivateKeyModal) {
      Animated.parallel([
        Animated.timing(privateKeyModalTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(privateKeyModalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showPrivateKeyModal]);

  // Handle multiple contacts selection from ContactsScreen
  useEffect(() => {
    const selectedContacts = route?.params?.selectedContacts;
    if (selectedContacts && Array.isArray(selectedContacts) && selectedContacts.length > 0) {
      // Process all selected contacts
      const inviteMultipleContacts = async () => {
        console.log('🔍 SplitDetailsScreen: Processing multiple contacts:', selectedContacts.length);
        
        for (const contact of selectedContacts) {
          try {
            await handleContactSelection(contact);
          } catch (error) {
            console.error('🔍 SplitDetailsScreen: Error inviting contact:', contact.name, error);
          }
        }
        
        // Clear the selectedContacts from navigation params after processing
        navigation.setParams({ selectedContacts: undefined });
        
        Alert.alert('Success', `${selectedContacts.length} ${selectedContacts.length === 1 ? 'contact has' : 'contacts have'} been invited to the split!`);
      };
      
      inviteMultipleContacts();
    }
  }, [route?.params?.selectedContacts]);

  const handleEditBill = () => {
    // Navigate to ManualBillCreationScreen with current data for editing
    navigation.navigate('ManualBillCreation', {
      isEditing: true,
      existingBillData: {
        title: billName,
        totalAmount: parseFloat(totalAmount),
        currency: splitData?.currency || processedBillData?.currency || billData?.currency || 'USD',
        date: splitData?.date || processedBillData?.date || billData?.date || new Date().toISOString().split('T')[0],
        merchant: splitData?.merchant?.name || processedBillData?.merchant || billData?.merchant || 'Unknown Merchant',
        category: 'trip', // Default category - could be enhanced to detect from data
      },
      existingSplitId: splitData?.firebaseDocId || splitData?.id,
      onBillUpdated: (updatedData: any) => {
        // Handle the updated bill data
        console.log('✅ Bill updated from ManualBillCreation:', updatedData);
        
        // Update local state with the new data
        if (updatedData.title) {
          setBillName(updatedData.title);
        }
        if (updatedData.totalAmount) {
          setTotalAmount(updatedData.totalAmount.toString());
        }
        if (updatedData.currency) {
          // Update currency if needed
        }
        if (updatedData.date) {
          // Update date if needed
        }
        
        // You could also trigger a refresh of the split data here
        // or update the split in the database
      }
    });
  };


  // Check for existing split and load wallet if it exists
  useEffect(() => {
    const checkExistingSplit = async () => {
      // Debug: Log all the conditions for split checking
      console.log('🔍 SplitDetailsScreen: checkExistingSplit conditions:', {
        hasCurrentUser: !!currentUser,
        hasSplitWallet: !!splitWallet,
        isCreatingWallet,
        isProcessingNewBill,
        hasJustJoinedSplit,
        hasCreatedSplitId: !!createdSplitId,
        isEditing,
        isNewBill,
        hasProcessedBillData: !!processedBillData,
        processedBillDataId: (processedBillData as any)?.id,
        processedBillDataTitle: (processedBillData as any)?.title,
        shouldCheckForSplit: currentUser && !splitWallet && !isCreatingWallet && !hasJustJoinedSplit && !createdSplitId && !isEditing
      });

      // Check if we need to create a split for new bills (OCR processing)
      const shouldCheckForSplit = currentUser && !splitWallet && !isCreatingWallet && !hasJustJoinedSplit && !createdSplitId && !isEditing;
      
      if (shouldCheckForSplit) {
        setIsCreatingWallet(true);
        console.log('🔍 SplitDetailsScreen: Checking for existing split...', {
          shouldCheckForSplit,
          currentUser: !!currentUser,
          splitWallet: !!splitWallet,
          isCreatingWallet,
          hasJustJoinedSplit,
          createdSplitId,
          isEditing
        });

        try {
          let existingSplit = null;

          // If we have splitData from navigation, use it
          if (splitData && splitData.walletId) {
            console.log('🔍 SplitDetailsScreen: Using splitData from navigation:', splitData.walletId);
            existingSplit = splitData;
          } else if (splitData && !splitData.walletId) {
            // If we have splitData but no walletId, this might be a split that needs a wallet
            console.log('🔍 SplitDetailsScreen: SplitData exists but no walletId, will create wallet when needed');
            existingSplit = splitData;
          } else if (splitId && !splitData) {
            // If we have splitId but no splitData (e.g., from notification), load the split
            console.log('🔍 SplitDetailsScreen: Loading split by ID from notification:', splitId);
            const splitResult = await SplitStorageService.getSplit(splitId);
            if (splitResult.success && splitResult.split) {
              existingSplit = splitResult.split;
              // Set the current split data so invitation logic knows we have an existing split
              setCurrentSplitData(existingSplit);
              // Update the state with the loaded split data
              setBillName(existingSplit.title);
              setTotalAmount(existingSplit.totalAmount.toString());
              setSelectedSplitType(existingSplit.splitType || null);
              // Transform participants to unified format, including all participants (not filtering out invited/pending)
              const transformedParticipants = existingSplit.participants.map((participant: any) => ({
                id: participant.userId,
                name: participant.name,
                walletAddress: participant.walletAddress,
                status: participant.status,
                amountOwed: participant.amountOwed,
                amountPaid: participant.amountPaid || 0,
                userId: participant.userId,
                email: participant.email || '',
                items: [],
              }));
              setParticipants(transformedParticipants);
            }
          } else if (processedBillData) {
            // Check if a split already exists for this bill
            const existingSplits = await SplitStorageService.getUserSplits(currentUser?.id.toString() || '');
            existingSplit = existingSplits.splits?.find(split =>
              split.billId === processedBillData.id ||
              split.title === processedBillData.title
            );
          } else if (splitId && splitData) {
            // We have both splitId and splitData (normal case when navigating from splits list or after edit)
            console.log('🔍 SplitDetailsScreen: Using splitData from navigation (both splitId and splitData present):', {
              splitId: splitId,
              splitDataId: splitData.id,
              splitDataTitle: splitData.title
            });
            existingSplit = splitData;
            // FIXED: Set createdSplitId to prevent duplicate creation after edit
            if (!createdSplitId) {
              setCreatedSplitId(splitData.id);
            }
          } else {
            console.log('🔍 SplitDetailsScreen: No existing split conditions met, will create new split when needed');
          }

          if (existingSplit && existingSplit.walletId) {
            console.log('🔍 SplitDetailsScreen: Found existing split with wallet:', existingSplit.walletId);

            // Get the existing wallet
            const walletResult = await SplitWalletService.getSplitWallet(existingSplit.walletId);
            if (walletResult.success && walletResult.wallet) {
              console.log('🔍 SplitDetailsScreen: Using existing wallet:', {
                walletId: walletResult.wallet.id,
                walletStatus: walletResult.wallet.status,
                hasDegenWinner: !!walletResult.wallet.degenWinner,
                degenWinner: walletResult.wallet.degenWinner
              });
              
              // Check if the wallet has been burned (completed and cleaned up)
              // Only block access if the wallet status is completed AND it's been cleaned up
              if (walletResult.wallet.status === 'completed') {
                // Check if the wallet still exists in Firebase (not burned yet)
                // If it exists, it's just completed but not burned, so allow access
                if (__DEV__) {
                  console.log('🔍 SplitDetailsScreen: Split wallet is completed but not yet burned, allowing access');
                }
              }
              
              setSplitWallet(walletResult.wallet);
            } else {
              console.log('🔍 SplitDetailsScreen: Failed to load wallet:', walletResult.error);
              
              // Check if the wallet was burned (not found in Firebase)
              if (walletResult.error?.includes('not found') || walletResult.error?.includes('Split wallet not found')) {
                console.log('🔥 SplitDetailsScreen: Split wallet appears to have been burned');
                Alert.alert(
                  'Split Completed',
                  'This split has been completed and the wallet has been burned for security. The split data has been cleaned up.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate back to splits list
                        navigation.navigate('SplitsList');
                      }
                    }
                  ]
                );
                return;
              }
            }
          } else {
            console.log('🔍 SplitDetailsScreen: No existing split found, wallet will be created when split type is selected');
          }
        } catch (error) {
          console.error('🔍 SplitDetailsScreen: Error checking existing split:', error);
        } finally {
          setIsCreatingWallet(false);
        }
      }
    };

    checkExistingSplit();
  }, [currentUser?.id, splitData?.id, processedBillData?.id, splitId, isProcessingNewBill, hasJustJoinedSplit, createdSplitId, isEditing, isNewBill, processedBillData]); // Dependencies for split checking

  // Manual creation is now handled in ManualBillCreationScreen.tsx
  // This useEffect is no longer needed

  // Debug: Monitor splitWallet state changes
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 SplitDetailsScreen: splitWallet state changed:', {
        hasWallet: !!splitWallet,
        walletId: splitWallet?.id,
        walletStatus: splitWallet?.status,
        hasDegenWinner: !!splitWallet?.degenWinner,
        degenWinner: splitWallet?.degenWinner,
        isCreator: isCurrentUserCreator()
      });
    }
  }, [splitWallet]);

  // Check for degen split completion when wallet is loaded
  useEffect(() => {
    console.log('🔍 SplitDetailsScreen: Navigation check useEffect triggered:', {
      hasSplitWallet: !!splitWallet,
      hasCurrentUser: !!currentUser,
      selectedSplitType,
      walletStatus: splitWallet?.status,
      hasDegenWinner: !!splitWallet?.degenWinner,
      degenWinner: splitWallet?.degenWinner,
      currentUserId: currentUser?.id?.toString(),
      isCompleted: splitWallet?.status === 'completed' || splitWallet?.status === 'spinning_completed'
    });

    if (splitWallet && currentUser && selectedSplitType === 'degen') {
      console.log('🔍 SplitDetailsScreen: Checking degen split completion on wallet load:', {
        walletStatus: splitWallet.status,
        hasDegenWinner: !!splitWallet.degenWinner,
        degenWinner: splitWallet.degenWinner,
        currentUserId: currentUser.id?.toString(),
        isCompleted: splitWallet.status === 'completed' || splitWallet.status === 'spinning_completed'
      });

      if (splitWallet.status === 'completed' || splitWallet.status === 'spinning_completed') {
        if (splitWallet.degenWinner) {
          const currentUserId = currentUser.id?.toString();
          const winnerParticipant = participants.find((p: any) =>
            (p.userId || p.id) === splitWallet.degenWinner?.userId
          );

          console.log('🔍 SplitDetailsScreen: Auto-navigating to DegenResult:', {
            currentUserId,
            winnerUserId: splitWallet.degenWinner?.userId,
            isCurrentUserWinner: (winnerParticipant?.userId || winnerParticipant?.id) === currentUserId,
            winnerParticipant
          });

          if (winnerParticipant) {
            navigation.navigate('DegenResult', {
              billData: billData,
              participants: participants,
              totalAmount: parseFloat(totalAmount),
              selectedParticipant: winnerParticipant,
              splitWallet: splitWallet,
              processedBillData,
              splitData: currentSplitData,
            });
          }
        }
      }
    } else if (splitWallet && currentUser && splitWallet.status === 'spinning_completed' && splitWallet.degenWinner) {
      // Fallback: Check for completed degen split even if selectedSplitType is not set
      console.log('🔍 SplitDetailsScreen: Fallback navigation check for completed degen split:', {
        walletStatus: splitWallet.status,
        hasDegenWinner: !!splitWallet.degenWinner,
        degenWinner: splitWallet.degenWinner,
        currentUserId: currentUser.id?.toString()
      });

      const currentUserId = currentUser.id?.toString();
      const winnerParticipant = participants.find((p: any) =>
        (p.userId || p.id) === splitWallet.degenWinner?.userId
      );

      console.log('🔍 SplitDetailsScreen: Fallback auto-navigating to DegenResult:', {
        currentUserId,
        winnerUserId: splitWallet.degenWinner?.userId,
        isCurrentUserWinner: (winnerParticipant?.userId || winnerParticipant?.id) === currentUserId,
        winnerParticipant
      });

      if (winnerParticipant) {
        navigation.navigate('DegenResult', {
          billData: billData,
          participants: participants,
          totalAmount: parseFloat(totalAmount),
          selectedParticipant: winnerParticipant,
          splitWallet: splitWallet,
          processedBillData,
          splitData: currentSplitData,
        });
      }
    }
  }, [splitWallet, currentUser, selectedSplitType, participants, billData, totalAmount, currentSplitData]);

  // Handle split invitation from deep links (QR code, NFC, shareable links)
  useEffect(() => {
    const handleSplitInvitation = async () => {
      if (!splitInvitationData || !currentUser?.id) {
        return;
      }

      console.log('🔍 SplitDetailsScreen: Handling split invitation from deep link:', {
        hasSplitInvitationData: !!splitInvitationData,
        hasCurrentUser: !!currentUser?.id,
        shareableLink: shareableLink
      });

      try {
        // Parse the invitation data
        const invitationData = SplitInvitationService.parseInvitationData(splitInvitationData);
        if (!invitationData) {
          console.error('🔍 SplitDetailsScreen: Failed to parse split invitation data');
          Alert.alert('Invalid Invitation', 'This split invitation is not valid.');
          return;
        }

        console.log('🔍 SplitDetailsScreen: Parsed invitation data:', {
          splitId: invitationData.splitId,
          billName: invitationData.billName,
          totalAmount: invitationData.totalAmount,
          creatorId: invitationData.creatorId
        });

        // Check if user can join this split
        const canJoinResult = await SplitInvitationService.canUserJoinSplit(invitationData.splitId, currentUser.id);
        if (!canJoinResult.canJoin) {
          console.error('🔍 SplitDetailsScreen: User cannot join split:', canJoinResult.reason);
          Alert.alert('Cannot Join Split', canJoinResult.reason || 'You cannot join this split.');
          return;
        }

        // Join the split using the invitation service
        const joinResult = await SplitInvitationService.joinSplit(invitationData, currentUser.id);
        if (joinResult.success) {
          console.log('🔍 SplitDetailsScreen: Successfully joined split via deep link:', joinResult.splitId);

          // Load the split data to display it
          const splitResult = await SplitStorageService.getSplit(invitationData.splitId);
          if (splitResult.success && splitResult.split) {
            setCurrentSplitData(splitResult.split);
            setBillName(splitResult.split.title);
            setTotalAmount(splitResult.split.totalAmount.toString());
            setSelectedSplitType(splitResult.split.splitType || null);

            // Transform participants to unified format
            const transformedParticipants = splitResult.split.participants.map((p: any) => ({
              id: p.userId,
              name: p.name,
              walletAddress: p.walletAddress,
              status: p.status,
              amountOwed: p.amountOwed,
              amountPaid: p.amountPaid || 0,
              userId: p.userId,
              email: p.email || '',
              items: [],
            }));
            setParticipants(transformedParticipants);

            Alert.alert('Success!', `You have successfully joined "${splitResult.split.title}" split!`);
          }
        } else {
          console.error('🔍 SplitDetailsScreen: Failed to join split via deep link:', joinResult.error);
          Alert.alert('Error', joinResult.error || 'Failed to join split. Please try again.');
        }
      } catch (error) {
        console.error('🔍 SplitDetailsScreen: Error handling split invitation:', error);
        Alert.alert('Error', 'Failed to process split invitation. Please try again.');
      }
    };

    handleSplitInvitation();
  }, [splitInvitationData, currentUser?.id, shareableLink]);

  // Set authoritative price in price management service when component loads
  useEffect(() => {
    const setAuthoritativePrice = async () => {
      if (processedBillData?.id) {
        const { priceManagementService } = await import('../../services/priceManagementService');
        const { PriceDebugger } = await import('../../utils/priceDebugger');

        // Use actual amount from state for consistency
        const actualAmount = parseFloat(totalAmount);

        // Debug current state
        PriceDebugger.debugBillAmounts(processedBillData.id, {
          processedBillData,
          billData,
          routeParams: { totalAmount: actualAmount }
        });

        const existingPrice = priceManagementService.getBillPrice(processedBillData.id);

        if (!existingPrice) {
          priceManagementService.setBillPrice(
            processedBillData.id,
            actualAmount, // Use actual amount from state
            processedBillData.currency || 'USD'
          );

          if (__DEV__) {
            console.log('💰 SplitDetailsScreen: Set authoritative price:', {
              billId: processedBillData.id,
              totalAmount: actualAmount
            });
          }
        }
      }
    };

    setAuthoritativePrice();
  }, [processedBillData?.id]);

  // Debug effect to track selectedSplitType changes
  useEffect(() => {
    if (__DEV__) {
      console.log('selectedSplitType state changed to:', selectedSplitType);
    }
  }, [selectedSplitType]);

  // Debug effect to track modal visibility
  useEffect(() => {
    if (__DEV__) {
      console.log('Modal visibility changed to:', showSplitModal);
    }
  }, [showSplitModal]);

  // Restore invited users from split data when component loads
  useEffect(() => {
    if (splitData?.participants && !hasJustJoinedSplit) {
      console.log('🔍 SplitDetailsScreen: Restoring invited users from split data:', {
        splitId: splitData.id,
        participantsCount: splitData.participants.length,
        participants: splitData.participants
      });

      // Find participants with 'invited' or 'pending' status and restore them to invitedUsers
      const invitedParticipants = splitData.participants.filter((participant: any) =>
        participant.status === 'invited' || participant.status === 'pending'
      );

      if (invitedParticipants.length > 0) {
        console.log('🔍 SplitDetailsScreen: Found invited participants to restore:', invitedParticipants.length);
        const restoredInvitedUsers = invitedParticipants.map((participant: any) => ({
          id: participant.userId,
          name: participant.name,
          email: participant.email || '',
          walletAddress: participant.walletAddress,
          status: participant.status,
          invitedAt: participant.joinedAt || new Date().toISOString(),
        }));

        setInvitedUsers(restoredInvitedUsers);
        console.log('🔍 SplitDetailsScreen: Restored invited users:', restoredInvitedUsers);
      }
    }
  }, [splitData, hasJustJoinedSplit]);

  // Initialize createdSplitId when component loads with existing split data
  useEffect(() => {
    if (splitData?.id && !createdSplitId) {
      console.log('🔍 SplitDetailsScreen: Initializing createdSplitId with existing split:', splitData.id);
      setCreatedSplitId(splitData.id);
    }
  }, [splitData?.id, createdSplitId]);

  // Monitor splitData changes throughout component lifecycle
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 SplitDetailsScreen: splitData changed:', {
        hasSplitData: !!splitData,
        splitDataId: splitData?.id,
        splitDataTitle: splitData?.title,
        splitDataObject: splitData,
        splitDataType: typeof splitData,
        splitDataKeys: splitData ? Object.keys(splitData) : 'null',
        timestamp: new Date().toISOString()
      });
    }

    // Check if split is active/locked and redirect participants to FairSplitScreen
    if (splitData && currentUser && splitData.status === 'active' && splitData.splitType === 'fair') {
      if (__DEV__) {
        console.log('🔍 SplitDetailsScreen: Split is active and locked, checking if user should be redirected to FairSplitScreen:', {
          splitId: splitData.id,
          splitStatus: splitData.status,
          splitType: splitData.splitType,
          currentUserId: currentUser.id.toString(),
          isCreator: splitData.creatorId === currentUser.id.toString()
        });
      }

      // Check if current user is a participant in this split
      const isParticipant = splitData.participants.some(p => p.userId === currentUser.id.toString());
      
      if (isParticipant) {
        if (__DEV__) {
          console.log('🔍 SplitDetailsScreen: User is a participant in locked split, redirecting to FairSplitScreen');
        }
        
        // Convert data to unified format for FairSplitScreen
        const unifiedBillData = processedBillData ?
          SplitDataConverter.processBillDataToUnified(processedBillData) :
          undefined;

        // Redirect to FairSplitScreen with all necessary data
        navigation.navigate('FairSplit', {
          billData: unifiedBillData,
          processedBillData: processedBillData,
          analysisResult: analysisResult,
          splitWallet: splitWallet,
          splitData: splitData,
        });
      }
    }

    // Check if split is active/locked and redirect participants to DegenLockScreen
    if (splitData && currentUser && splitData.status === 'active' && splitData.splitType === 'degen') {
      if (__DEV__) {
        console.log('🔍 SplitDetailsScreen: Split is active and locked, checking if user should be redirected to DegenLockScreen:', {
          splitId: splitData.id,
          splitStatus: splitData.status,
          splitType: splitData.splitType,
          currentUserId: currentUser.id.toString(),
          isCreator: splitData.creatorId === currentUser.id.toString()
        });
      }

      // Check if current user is a participant in this split
      const isParticipant = splitData.participants.some(p => p.userId === currentUser.id.toString());
      
      if (isParticipant) {
        if (__DEV__) {
          console.log('🔍 SplitDetailsScreen: User is a participant in locked degen split, redirecting to DegenLockScreen');
        }
        
        // Convert data to unified format for DegenLockScreen
        const unifiedBillData = processedBillData ?
          SplitDataConverter.processBillDataToUnified(processedBillData) :
          undefined;

        // Redirect to DegenLockScreen with all necessary data
        navigation.navigate('DegenLock', {
          billData: unifiedBillData,
          processedBillData: processedBillData,
          analysisResult: analysisResult,
          splitWallet: splitWallet,
          splitData: splitData,
        });
      }
    }
  }, [splitData, currentUser, navigation, processedBillData, analysisResult, splitWallet]);

  // Monitor participants state changes
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 SplitDetailsScreen: participants state changed:', {
        participantsCount: participants.length,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          userId: p.userId
        })),
        hasJustJoinedSplit,
        timestamp: new Date().toISOString()
      });
    }
  }, [participants, hasJustJoinedSplit]);

  // Monitor route parameters changes
  useEffect(() => {
    console.log('🔍 SplitDetailsScreen: Route parameters changed:', {
      routeParams: route?.params,
      routeParamsKeys: route?.params ? Object.keys(route.params) : 'no route params',
      splitDataFromRoute: route?.params?.splitData,
      splitIdFromRoute: route?.params?.splitId,
      timestamp: new Date().toISOString()
    });
  }, [route?.params]);

  // Convert currency to USDC when amount or currency changes
  useEffect(() => {
    const convertCurrency = async () => {
      const currency = splitData?.currency || processedBillData?.currency || billData?.currency || 'USD';
      const amount = parseFloat(totalAmount);
      
      if (!amount || isNaN(amount)) return;
      
      // Skip conversion for USD/USDC
      if (currency === 'USD' || currency === 'USDC') {
        setUsdcEquivalent(amount);
        return;
      }
      
      setIsConvertingCurrency(true);
      try {
        const convertedAmount = await convertFiatToUSDC(amount, currency);
        setUsdcEquivalent(convertedAmount);
      } catch (error) {
        console.error('Error converting currency:', error);
        // Fallback to original amount
        setUsdcEquivalent(amount);
      } finally {
        setIsConvertingCurrency(false);
      }
    };

    convertCurrency();
  }, [totalAmount, splitData?.currency, processedBillData?.currency, billData?.currency]);

  // Show loading state when processing new bill
  if (isProcessingNewBill) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.black} />

        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={styles.processingSubtitle}>
            Analyzing your bill image...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('SplitsList')}
        >
          <Image
            source={require('../../../assets/chevron-left.png')}
            style={styles.backButtonIcon}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Split the Bill</Text>

        <TouchableOpacity style={styles.editButton} onPress={handleEditBill}>
          <Image
            source={require('../../../assets/edit-icon.png')}
            style={styles.editButtonIcon}
          />
        </TouchableOpacity>
      </View>

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
                      const { MockupDataService } = require('../../data/mockupData');
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
                  const currency = splitData?.currency || processedBillData?.currency || billData?.currency || 'USD';
                  const amount = parseFloat(totalAmount);
                  
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
              {/*{(splitData?.merchant?.address || processedBillData?.location || billData?.location) && (
                <Text style={[styles.billAmountEUR, { marginTop: spacing.xs }]}>
                  {splitData?.merchant?.address || processedBillData?.location || billData?.location}
                </Text>
              )}*/}
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
                        key={participant.id}
                        userId={participant.id}
                        displayName={participant.name}
                        size={32}
                        style={avatarStyle}
                      />
                    );
                  })}
                  {participants.length > 4 && (
                    <View style={[styles.avatar, styles.avatarOverlay]}>
                      <Text style={styles.avatarOverlayText}>+{participants.length - 4}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={handleAddParticipant}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.splitCardDotLeft}/>
            <View style={styles.splitCardDotRight}/>


        </LinearGradient>


        {/* Split Wallet Info Section - Only visible to creators */}
        {(() => {
          const shouldShowWallet = (splitWallet || currentSplitData?.walletAddress) && isCurrentUserCreator();
          console.log('🔍 SplitDetailsScreen: Wallet display check:', {
            hasSplitWallet: !!splitWallet,
            hasCurrentSplitDataWallet: !!currentSplitData?.walletAddress,
            isCreator: isCurrentUserCreator(),
            shouldShowWallet,
            walletAddress: splitWallet?.walletAddress || currentSplitData?.walletAddress,
            splitWalletObject: splitWallet,
            currentSplitDataObject: currentSplitData,
            currentUser: currentUser?.id
          });
          return shouldShowWallet;
        })() && (
            <View style={styles.splitWalletSection}>
              <Text style={styles.splitWalletTitle}>Split Wallet</Text>
              <View style={styles.splitWalletCard}>
                <TouchableOpacity 
                  style={styles.splitWalletInfo}
                  onPress={() => {
                    const address = splitWallet?.walletAddress || currentSplitData?.walletAddress;
                    if (address) {
                      Clipboard.setStringAsync(address);
                      Alert.alert('Copied!', 'Wallet address copied to clipboard');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.splitWalletLabel}>Wallet Address:</Text>
                  <View style={styles.walletAddressContainer}>
                    <Text style={styles.splitWalletAddress}>
                      {formatWalletAddress(splitWallet?.walletAddress || currentSplitData?.walletAddress || '')}
                    </Text>
                    <Image
                      source={require('../../../assets/copy-icon.png')}
                      style={styles.copyIcon}
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.privateKeyButton}
                  onPress={handleShowPrivateKey}
                >
                  <Image
                    source={require('../../../assets/eye-icon.png')}
                    style={styles.privateKeyButtonIcon}
                  />
                  <Text style={styles.privateKeyButtonText}>View Private Key</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <Text style={styles.participantsTitle}>In the pool:</Text>

          {participants.map((participant: any) => (
            <View key={participant.id} style={styles.participantCard}>
              <UserAvatar
                userId={participant.id}
                displayName={participant.name}
                size={40}
                style={styles.participantAvatar}
              />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantWallet}>{formatWalletAddress(participant.walletAddress)}</Text>
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
                {/*{__DEV__ && (
                  <Text style={{ fontSize: 10, color: '#666' }}>
                    {participant.status}
                  </Text>
                )}*/}
              </View>
            </View>
          ))}

          {/* Invited Users Section */}
          {invitedUsers.length > 0 && (
            <>
              <Text style={styles.participantsTitle}>Invited:</Text>
              {invitedUsers.map((invitedUser: any) => {
                // Debug: Log what's being displayed for each invited user
                console.log('🔍 SplitDetailsScreen: Rendering invited user:', {
                  id: invitedUser.id,
                  name: invitedUser.name,
                  email: invitedUser.email,
                  walletAddress: invitedUser.walletAddress,
                  displayText: invitedUser.walletAddress || invitedUser.email || 'No wallet address'
                });

                return (
                  <View key={invitedUser.id} style={styles.participantCard}>
                    <UserAvatar
                      userId={invitedUser.id}
                      displayName={invitedUser.name}
                      size={40}
                      style={styles.participantAvatar}
                    />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{invitedUser.name}</Text>
                      <Text style={styles.participantWallet}>{invitedUser.walletAddress || invitedUser.email || 'No wallet address'}</Text>
                    </View>
                    <View style={styles.participantStatus}>
                      <Text style={styles.statusPending}>Invited</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>


        {/* Loading indicator when creating wallet */}
        {isCreatingWallet && (
          <View style={styles.splitWalletSection}>
            <Text style={styles.splitWalletTitle}>Creating Split Wallet...</Text>
            <View style={styles.splitWalletCard}>
              <Text style={styles.splitWalletLabel}>Please wait while we create your split wallet...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button - Only visible to creators */}
      {isCurrentUserCreator() && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.splitButton}
            onPress={handleSplitBill}
            disabled={!areAllInvitedUsersAccepted()}
          >
            <LinearGradient
              colors={areAllInvitedUsersAccepted() ? [colors.green, colors.greenLight] : [colors.surface, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.splitButtonGradient}
            >
              <Text style={[
                styles.splitButtonText,
                !areAllInvitedUsersAccepted() && styles.splitButtonTextDisabled
              ]}>
                {(() => {
                  const allAccepted = areAllInvitedUsersAccepted();
                  const pendingInvitedUsers = invitedUsers.filter((user: any) => user.status === 'pending');
                  const nonPendingInvitedUsers = invitedUsers.filter((user: any) => user.status !== 'pending');
                  const acceptedInvitedUsers = nonPendingInvitedUsers.filter((user: any) => user.status === 'accepted');
                  const declinedInvitedUsers = nonPendingInvitedUsers.filter((user: any) => user.status === 'declined');

                  // Count users who need to accept (pending + non-accepted non-pending)
                  const usersNeedingAcceptance = pendingInvitedUsers.length + (nonPendingInvitedUsers.length - acceptedInvitedUsers.length);

                  console.log('🔍 SplitDetailsScreen: Split button state:', {
                    allAccepted,
                    pendingInvitedUsers: pendingInvitedUsers.length,
                    nonPendingInvitedUsers: nonPendingInvitedUsers.length,
                    acceptedInvitedUsers: acceptedInvitedUsers.length,
                    declinedInvitedUsers: declinedInvitedUsers.length,
                    usersNeedingAcceptance,
                    invitedUsersCount: invitedUsers.length,
                    participantsCount: participants.length
                  });

                  if (allAccepted) {
                    return 'Split';
                  } else if (usersNeedingAcceptance > 0) {
                    return `Waiting for ${usersNeedingAcceptance} user${usersNeedingAcceptance !== 1 ? 's' : ''} to accept`;
                  } else {
                    return 'Split';
                  }
                })()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Split Type Selection Modal */}
      <Modal
        visible={showSplitModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseModal}
        statusBarTranslucent={true}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: splitModalOpacity }]}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={handleCloseModal}
            />
            
            <PanGestureHandler
              onGestureEvent={handleSplitModalGestureEvent}
              onHandlerStateChange={handleSplitModalStateChange}
            >
              <Animated.View
                style={[
                  styles.modalContainer,
                  {
                    transform: [{ translateY: splitModalTranslateY }],
                  },
                ]}
              >
                {/* Modal Handle */}
                <View style={styles.modalHandle} />

            {/* Modal Content */}
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose your splitting style</Text>
              <Text style={styles.modalSubtitle}>
                Pick how you want to settle the bill with friends.
              </Text>

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
                  <Text style={styles.splitOptionDescription}>
                    Everyone pays their fair share
                  </Text>
                </TouchableOpacity>

                {/* Degen Split Option */}
                <TouchableOpacity
                  style={[
                    styles.splitOption,
                    selectedSplitType === 'degen' && styles.splitOptionSelected
                  ]}
                  onPress={() => handleSplitTypeSelection('degen')}
                >
                  <LinearGradient
                    colors={[colors.green, colors.greenLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.riskyModeLabel}
                  >
                    <Text style={styles.riskyModeIcon}>🔥</Text>
                    <Text style={styles.riskyModeText}>Risky mode</Text>
                  </LinearGradient>
                  
                    <Image
                      source={require('../../../assets/degen-split-icon.png')}
                      style={styles.splitOptionIconImage}
                    />
              
                  <Text style={styles.splitOptionTitle}>Degen Split</Text>
                  <Text style={styles.splitOptionDescription}>
                    One pays it all, luck decides who
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !selectedSplitType && styles.continueButtonDisabled
                ]}
                onPress={() => {
                  console.log('Continue button touched!');
                  handleContinue();
                }}
                disabled={!selectedSplitType}
              >
                <LinearGradient
                  colors={selectedSplitType ? [colors.green, colors.greenLight] : [colors.surface, colors.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueButtonGradient}
                >
                  <Text style={[
                    styles.continueButtonText,
                    !selectedSplitType && styles.continueButtonTextDisabled
                  ]}>
                    Continue
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </Animated.View>
      </Modal>

      {/* Add Friends Modal */}
      <Modal
        visible={showAddFriendsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseAddFriendsModal}
        statusBarTranslucent={true}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: addFriendsModalOpacity }]}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={handleCloseAddFriendsModal}
            />
            
            <PanGestureHandler
              onGestureEvent={handleAddFriendsModalGestureEvent}
              onHandlerStateChange={handleAddFriendsModalStateChange}
            >
              <Animated.View
                style={[
                  styles.addFriendsModalContainer,
                  {
                    transform: [{ translateY: addFriendsModalTranslateY }],
                  },
                ]}
              >
                {/* Drag Handle */}
                <View style={styles.dragHandle} />

            {/* Title */}
            <Text style={styles.addFriendsModalTitle}>Show QR Code</Text>

            {/* QR Code Section */}
            <View style={styles.qrCodeSection}>
              <View style={styles.qrCodeContainer}>
                {qrCodeData ? (
                  <QRCode
                    value={qrCodeData}
                    size={300}
                    color={colors.black}
                    backgroundColor={colors.white}
                    logoSize={30}
                    logoMargin={2}
                    logoBorderRadius={15}
                    quietZone={10}
                  />
                ) : (
                  <View style={styles.qrCodePlaceholder}>
                    <Text style={styles.qrCodeText}>QR</Text>
                    <Text style={styles.qrCodeSubtext}>Code</Text>
                  </View>
                )}
              </View>

              {/* Split Context */}
              <View style={styles.splitContext}>
                <Image 
                  source={CATEGORY_IMAGES_LOCAL[splitData?.category || currentSplitData?.category || 'food']}
                  style={styles.splitContextIconImage}
                  tintColor={colors.white}
                />
                <Text style={styles.splitContextText}>{billName}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.addFriendsModalButtons}>
              <TouchableOpacity
                style={styles.shareLinkButton}
                onPress={handleLinkShare}
              >
                <Text style={styles.shareLinkButtonText}>Share link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addContactsButton}
                onPress={handleAddContacts}
                disabled={isInvitingUsers}
              >
                <LinearGradient
                  colors={[colors.green, colors.greenLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addContactsButtonGradient}
                >
                  {isInvitingUsers ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.addContactsButtonText}>Add Contacts</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </Animated.View>
      </Modal>

      {/* Private Key Modal */}
      <Modal
        visible={showPrivateKeyModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClosePrivateKeyModal}
        statusBarTranslucent={true}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: privateKeyModalOpacity }]}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              activeOpacity={1}
              onPress={handleClosePrivateKeyModal}
            />
            
            <PanGestureHandler
              onGestureEvent={handlePrivateKeyModalGestureEvent}
              onHandlerStateChange={handlePrivateKeyModalStateChange}
            >
              <Animated.View
                style={[
                  styles.privateKeyModalContainer,
                  {
                    transform: [{ translateY: privateKeyModalTranslateY }],
                  },
                ]}
              >
                {/* Modal Handle */}
                <View style={styles.modalHandle} />

            {/* Modal Content */}
            <View style={styles.privateKeyModalContent}>
              {/* Main Content */}
              <View style={styles.privateKeyMainContent}>
                <Text style={styles.privateKeyModalTitle}>Split Wallet Private Key</Text>
                <Text style={styles.privateKeyModalSubtitle}>
                  Keep this secure. Only you can access your split wallet with this key.
                </Text>

                {/* Private Key Display */}
                <View style={styles.privateKeyDisplayContainer}>
                  <Text style={styles.privateKeyLabel}>Private Key:</Text>
                  <View style={styles.privateKeyTextContainer}>
                    <Text style={styles.privateKeyText} selectable={true}>
                      {splitWalletPrivateKey}
                    </Text>
                  </View>
                </View>

                {/* Warning */}
                <View style={styles.privateKeyWarning}>
                  <Text style={styles.privateKeyWarningIcon}>⚠️</Text>
                  <Text style={styles.privateKeyWarningText}>
                    Never share this private key with anyone. It gives full access to your split wallet.
                  </Text>
                </View>
              </View>

              {/* Action Buttons - Fixed at bottom */}
              <View style={styles.privateKeyButtonContainer}>
                <TouchableOpacity
                  style={styles.closePrivateKeyButton}
                  onPress={handleClosePrivateKeyModal}
                >
                  <Text style={styles.closePrivateKeyButtonText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={async () => {
                    if (splitWalletPrivateKey) {
                      await Clipboard.setStringAsync(splitWalletPrivateKey);
                      Alert.alert('✅ Copied', 'Private key copied to clipboard');
                    }
                  }}
                >
                  <LinearGradient
                    colors={[colors.green, colors.greenLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.copyButtonGradient}
                  >
                    <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </Animated.View>
      </Modal>

    </SafeAreaView>
  );
};


export default SplitDetailsScreen;

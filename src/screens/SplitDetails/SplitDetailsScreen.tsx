/**
 * Split Details Screen
 * Screen for editing bill split details, managing participants, and configuring split methods
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './styles';
import { ProcessedBillData, BillAnalysisResult } from '../../types/billAnalysis';
import { BillAnalysisService } from '../../services/billAnalysisService';
import { MockBillAnalysisService } from '../../services/mockBillAnalysisService';
import { SplitInvitationService } from '../../services/splitInvitationService';
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

interface SplitDetailsScreenProps {
  navigation: any;
  route?: {
    params?: SplitDetailsNavigationParams & {
      imageUri?: string;
      isNewBill?: boolean;
      selectedContact?: any;
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
    selectedContact,
    isFromNotification,
    notificationId,
    shareableLink,
    splitInvitationData
  } = route?.params || {};
  
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
      isNewBill: isNewBill
    });
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
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [currentSplitData, setCurrentSplitData] = useState<Split | null>(splitData || null);
  const [splitWallet, setSplitWallet] = useState<any>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isProcessingNewBill, setIsProcessingNewBill] = useState(false);
  const [newBillProcessingResult, setNewBillProcessingResult] = useState<BillAnalysisResult | null>(null);
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
        isCreator
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
      console.log('🔍 SplitDetailsScreen: Using participants from splitData');
      // Transform SplitParticipant to UnifiedParticipant format, but exclude invited users
      return splitData.participants
        .filter((participant: any) => 
          participant.status !== 'invited' && participant.status !== 'pending'
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

  // Process new bill image if coming from camera
  const processNewBillImage = async () => {
    if (!imageUri || !isNewBill || !currentUser) return;
    
    setIsProcessingNewBill(true);
    
    try {
      console.log('🔍 SplitDetailsScreen: Processing new bill image...');
      
      // Use mock service to simulate your Python OCR service
      const analysisResult = await MockBillAnalysisService.analyzeBillImage(imageUri);
      setNewBillProcessingResult(analysisResult);
      
      if (analysisResult.success && analysisResult.data) {
        // Process the structured data with current user information
        const processedData = BillAnalysisService.processBillData(analysisResult.data, currentUser);
        
        // Set the authoritative price in the price management service immediately
        const { priceManagementService } = await import('../../services/priceManagementService');
        priceManagementService.setBillPrice(
          processedData.id,
          processedData.totalAmount,
          processedData.currency || 'USDC'
        );
        
        console.log('💰 SplitDetailsScreen: Set authoritative price for new bill:', {
          billId: processedData.id,
          totalAmount: processedData.totalAmount,
          currency: processedData.currency || 'USDC'
        });
        
        // Update the bill name and total amount with processed data
        console.log('🔍 SplitDetailsScreen: Updating state with processed data:', {
          title: processedData.title,
          totalAmount: processedData.totalAmount,
          currency: processedData.currency
        });
        setBillName(processedData.title);
        setTotalAmount(processedData.totalAmount.toString());
        
        // Update participants with processed data (transform to unified format)
        const transformedParticipants = processedData.participants.map((participant: any) => ({
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
        setParticipants(transformedParticipants);
        
        // Store the processed data for later use
        setCurrentProcessedBillData(processedData);
        
        // Create a wallet immediately for new bills so user can see wallet address
        console.log('🔍 SplitDetailsScreen: Creating wallet for new bill...');
        try {
          const walletResult = await SplitWalletService.createSplitWallet(
            processedData.id,
            currentUser.id.toString(),
            processedData.totalAmount,
            processedData.currency || 'USDC',
            transformedParticipants.map((p: any) => ({
              userId: p.id,
              name: p.name,
              walletAddress: p.walletAddress,
              amountOwed: p.amountOwed,
            }))
          );
          
          if (walletResult.success && walletResult.wallet) {
            setSplitWallet(walletResult.wallet);
            console.log('🔍 SplitDetailsScreen: Wallet created successfully for new bill:', {
              walletId: walletResult.wallet.id,
              walletAddress: walletResult.wallet.walletAddress,
              isCreator: isCurrentUserCreator(),
              walletObject: walletResult.wallet
            });
            
            // Create the split in the database immediately so it appears in the list
            console.log('🔍 SplitDetailsScreen: Creating split in database...');
            try {
              const splitData = {
                billId: processedData.id,
                title: processedData.title,
                description: `Split for ${processedData.title}`,
                totalAmount: processedData.totalAmount,
                currency: processedData.currency || 'USDC',
                splitType: 'fair' as const, // Default to fair, can be changed later
                status: 'draft' as const,
                creatorId: currentUser.id.toString(),
                creatorName: currentUser.name,
                participants: transformedParticipants.map((p: any) => ({
                  userId: p.id,
                  name: p.name,
                  email: p.email || '',
                  walletAddress: p.walletAddress,
                  amountOwed: p.amountOwed || 0,
                  amountPaid: p.amountPaid || 0,
                  status: p.status || 'accepted',
                })),
                merchant: {
                  name: processedData.merchant,
                  address: processedData.location,
                },
                date: processedData.date,
                walletId: walletResult.wallet.id,
                walletAddress: walletResult.wallet.walletAddress,
              };
              
              const createResult = await SplitStorageService.createSplit(splitData);
              if (createResult.success && createResult.split) {
                setCurrentSplitData(createResult.split);
                console.log('🔍 SplitDetailsScreen: Split created successfully in database:', {
                  splitId: createResult.split.id,
                  walletAddress: createResult.split.walletAddress,
                  walletId: createResult.split.walletId,
                  splitObject: createResult.split
                });
              } else {
                console.error('🔍 SplitDetailsScreen: Failed to create split in database:', createResult.error);
              }
            } catch (error) {
              console.error('🔍 SplitDetailsScreen: Error creating split in database:', error);
            }
          } else {
            console.log('🔍 SplitDetailsScreen: Failed to create wallet for new bill:', walletResult.error);
          }
        } catch (error) {
          console.error('🔍 SplitDetailsScreen: Error creating wallet for new bill:', error);
        }
      } else {
        Alert.alert('Processing Failed', analysisResult.error || 'Failed to process bill image');
      }
      
    } catch (error) {
      console.error('Error processing new bill:', error);
      Alert.alert('Error', 'Failed to process bill image. Please try again.');
    } finally {
      setIsProcessingNewBill(false);
    }
  };

  // Process new bill on component mount if needed
  useEffect(() => {
    if (isNewBill && imageUri && currentUser) {
      processNewBillImage();
    }
  }, [isNewBill, imageUri, currentUser]);

  // Handle joining a split when opened from a notification
  useEffect(() => {
    if (isFromNotification && splitId && currentUser && !splitData) {
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
      console.log('🔍 SplitDetailsScreen: Joining split from notification:', splitId);
      
      // First, get the split data
      const splitResult = await SplitStorageService.getSplit(splitId);
      if (!splitResult.success || !splitResult.split) {
        Alert.alert('Error', 'Split not found or has been deleted');
        return;
      }

      const split = splitResult.split;

      // Check if user is already a participant
      const existingParticipant = split.participants.find(p => p.userId === currentUser.id.toString());
      if (existingParticipant) {
        if (existingParticipant.status === 'accepted') {
          console.log('🔍 SplitDetailsScreen: User is already accepted in this split, loading split data');
          // Load the split data and navigate to it
          setCurrentSplitData(split);
          setBillName(split.title);
          setTotalAmount(split.totalAmount.toString());
          setSelectedSplitType(split.splitType);
          
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
          return;
        } else {
          console.log('🔍 SplitDetailsScreen: User is invited but not accepted, will update status to accepted');
          // User is invited but not accepted, we'll update their status below
        }
      }

      // User is not a participant, so we need to join the split
      const userData = await firebaseDataService.user.getCurrentUser(currentUser.id.toString());
      if (!userData) {
        Alert.alert('Error', 'User data not found');
        return;
      }

      // Add the user as a participant
      const newParticipant = {
        userId: currentUser.id.toString(),
        name: userData.name || 'Unknown User',
        email: userData.email || '',
        walletAddress: userData.wallet_address || userData.wallet_public_key || '',
        amountOwed: split.totalAmount / (split.participants.length + 1), // Equal split
        amountPaid: 0,
        status: 'accepted' as const,
      };

      console.log('🔍 SplitDetailsScreen: Adding participant to split:', newParticipant);
      const addResult = await SplitStorageService.addParticipant(splitId, newParticipant);
      console.log('🔍 SplitDetailsScreen: Add participant result:', addResult);
      
      if (!addResult.success) {
        console.error('🔍 SplitDetailsScreen: Failed to add participant:', addResult.error);
        Alert.alert('Error', addResult.error || 'Failed to join split');
        return;
      }
      
      console.log('🔍 SplitDetailsScreen: Successfully added participant to split');

      // Send confirmation notification to the creator
      await sendNotification(
        split.creatorId,
        'User Joined Your Split',
        `${userData.name} has joined your split "${split.title}". The split is ready to begin!`,
        'group_added',
        {
          splitId: splitId,
          billName: split.title,
          totalAmount: split.totalAmount,
          currency: split.currency,
          inviterName: split.creatorName,
          inviterId: split.creatorId,
          joinedUserId: currentUser.id.toString(),
          joinedUserName: userData.name,
        }
      );

        // Load the updated split data
        const updatedSplitResult = await SplitStorageService.getSplit(splitId);
        if (updatedSplitResult.success && updatedSplitResult.split) {
          const updatedSplit = updatedSplitResult.split;
          setCurrentSplitData(updatedSplit);
        setBillName(updatedSplit.title);
        setTotalAmount(updatedSplit.totalAmount.toString());
        setSelectedSplitType(updatedSplit.splitType);
        
        // Transform participants to unified format
        const transformedParticipants = updatedSplit.participants.map((p: any) => ({
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
        
        console.log('🔍 SplitDetailsScreen: Setting participants after join:', {
          participantsCount: transformedParticipants.length,
          participants: transformedParticipants,
          currentUserId: currentUser.id.toString(),
          currentUserParticipant: transformedParticipants.find(p => p.userId === currentUser.id.toString()),
          hasJustJoinedSplit: true
        });
        
        setParticipants(transformedParticipants);

        Alert.alert('Success!', `You have successfully joined "${updatedSplit.title}" split!`);
        
        // Set flag to prevent checkExistingSplit from overwriting participant data
        setHasJustJoinedSplit(true);
        
        // Reset the flag after 5 seconds to allow normal operation
        setTimeout(() => {
          setHasJustJoinedSplit(false);
        }, 5000);
        
        // Stay on the split details screen - don't navigate away
        
        // Delete the notification after successful join
        if (notificationId) {
          try {
            const { NotificationCompletionService } = await import('../../services/notificationCompletionService');
            await NotificationCompletionService.completeSplitInvitationNotification(
              notificationId,
              currentUser.id.toString(),
              { splitId: splitId, splitTitle: updatedSplit.title }
            );
            console.log('🔍 SplitDetailsScreen: Notification deleted after successful join:', notificationId);
          } catch (notificationError) {
            console.error('🔍 SplitDetailsScreen: Error deleting notification:', notificationError);
            // Don't show error to user as this is not critical
          }
        }
      }

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
    setShowAddFriendsModal(false);
  };

  const handleAddContacts = () => {
    // Generate a consistent splitId for new bills
    const currentSplitId = splitId || processedBillData?.id || billData?.id || `split_${Date.now()}`;
    
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
      
      // Debug: Log the current state to understand why a new split might be created
      console.log('🔍 SplitDetailsScreen: handleContactSelection - Current state:', {
        hasSplitData: !!splitData,
        splitDataId: splitData?.id,
        splitDataObject: splitData,
        splitDataType: typeof splitData,
        splitDataKeys: splitData ? Object.keys(splitData) : 'null',
        hasCreatedSplitId: !!createdSplitId,
        createdSplitId: createdSplitId,
        hasCurrentUser: !!currentUser,
        currentUserId: currentUser?.id,
        condition1: !splitData,
        condition2: !createdSplitId,
        condition3: !!currentUser,
        willCreateNewSplit: !splitData && !createdSplitId && currentUser,
        timestamp: new Date().toISOString(),
        // Additional debugging for route params
        routeParams: route?.params,
        routeParamsKeys: route?.params ? Object.keys(route.params) : 'no route params',
        // Check if splitData is being passed correctly
        splitDataFromRoute: route?.params?.splitData,
        splitIdFromRoute: route?.params?.splitId
      });

      // If this is a new split (not from existing splitData) and we haven't created one yet, create it in the database first
      // Only create a new split if we don't have existing splitData AND we haven't already created one
      // Also check if we have a splitId from navigation (which indicates an existing split)
      // Check both the destructured variables AND the route params directly
      // Check if we have an existing split (either splitData, currentSplitData, or createdSplitId)
      // Note: splitId from route params doesn't guarantee the split exists in database
      const hasExistingSplit = splitData || currentSplitData || createdSplitId || route?.params?.splitData;
      
      // Also check if we have a splitWallet (indicates a split was created with wallet)
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
      
      if (!finalHasExistingSplit && currentUser) {
        console.log('🔍 SplitDetailsScreen: Creating split in database before inviting users...');
        
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
        
        const splitDataToCreate = {
          billId: processedBillData?.id || billData?.id || currentSplitId,
          title: billName,
          description: `Split for ${billName}`,
          totalAmount: parseFloat(totalAmount),
          currency: processedBillData?.currency || billData?.currency || 'USDC',
          splitType: selectedSplitType || 'fair',
          status: 'draft' as const,
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
            name: processedBillData?.merchant || billData?.merchant || 'Unknown',
            address: processedBillData?.location || billData?.location || '',
          },
          date: processedBillData?.date || billData?.date || new Date().toISOString(),
        };

        createResult = await SplitStorageService.createSplit(splitDataToCreate);
        if (createResult.success && createResult.split) {
          console.log('🔍 SplitDetailsScreen: Split created successfully in database:', createResult.split.id);
          console.log('🔍 SplitDetailsScreen: Split is now available for invitations');
          setCreatedSplitId(createResult.split.id);
        } else {
          console.error('🔍 SplitDetailsScreen: Failed to create split in database:', createResult.error);
          Alert.alert('Error', 'Failed to create split. Please try again.');
          return;
        }
      } else {
        // We have existing split data, use the existing split
        console.log('🔍 SplitDetailsScreen: Using existing split for invitation:', {
          splitId: splitData?.id || currentSplitData?.id || splitId || route?.params?.splitData?.id || route?.params?.splitId,
          hasCreatedSplitId: !!createdSplitId,
          createdSplitId: createdSplitId,
          hasSplitData: !!splitData,
          hasCurrentSplitData: !!currentSplitData,
          hasSplitId: !!splitId,
          hasRouteSplitData: !!route?.params?.splitData,
          hasRouteSplitId: !!route?.params?.splitId,
          splitExistsInDatabase: splitExistsInDatabase
        });
        
        // If we have splitData but no createdSplitId, set it to prevent creating new splits
        const existingSplitId = splitData?.id || currentSplitData?.id || splitId || route?.params?.splitData?.id || route?.params?.splitId;
        if (existingSplitId && !createdSplitId) {
          console.log('🔍 SplitDetailsScreen: Setting createdSplitId to existing split ID:', existingSplitId);
          setCreatedSplitId(existingSplitId);
        }
        
        // If we have a splitWallet but no createdSplitId, try to get the split ID from the wallet
        if (splitWallet && !createdSplitId && !existingSplitId) {
          console.log('🔍 SplitDetailsScreen: Split has wallet but no ID, trying to find split by wallet ID:', splitWallet.id);
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
          const { unifiedUserService } = await import('../../services/unifiedUserService');
          const userByEmail = await unifiedUserService.getUserByEmail(contact.email);
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
          `${currentUser.name} invited you to split a bill for ${totalAmount} USDC. Tap to join!`,
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
        message: `Join my bill split "${billName}" for ${totalAmount} ${processedBillData?.currency || 'USD'}. Click to join: ${shareableLink}`,
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
            status: 'active' as const, // Change status to active when split type is selected
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
    setShowSplitModal(false);
    setSelectedSplitType(null);
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
    setShowPrivateKeyModal(false);
    setSplitWalletPrivateKey(null);
  };

  const handleEditBill = () => {
    // Navigate back to BillProcessingScreen with current data for editing
    navigation.navigate('BillProcessing', {
      imageUri: billData?.billImageUrl || 'existing_bill', // Use existing image or placeholder
      billData: {
        title: billName,
        totalAmount: parseFloat(totalAmount),
        currency: splitData?.currency || processedBillData?.currency || billData?.currency || 'USD',
        date: splitData?.date || processedBillData?.date || billData?.date || new Date().toISOString().split('T')[0],
        merchant: splitData?.merchant?.name || processedBillData?.merchant || billData?.merchant || 'Unknown Merchant',
        billImageUrl: (billData as any)?.billImageUrl,
        items: processedBillData?.items || billData?.items || [],
        participants: participants,
        settings: processedBillData?.settings || (billData as any)?.settings || {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal',
        },
      },
      processedBillData,
      analysisResult,
      isEditing: true, // Flag to indicate this is an edit operation
      existingSplitId: splitData?.firebaseDocId || splitData?.id, // Pass existing split ID
      existingSplitData: splitData, // Pass existing split data for updating
    });
  };


  // Check for existing split and load wallet if it exists
  useEffect(() => {
    const checkExistingSplit = async () => {
      if (currentUser && !splitWallet && !isCreatingWallet && !isProcessingNewBill && !hasJustJoinedSplit) {
        setIsCreatingWallet(true);
        console.log('🔍 SplitDetailsScreen: Checking for existing split...');
        
        try {
          let existingSplit = null;
          
          // Debug: Log the condition evaluation
          console.log('🔍 SplitDetailsScreen: checkExistingSplit - Evaluating conditions:', {
            hasSplitData: !!splitData,
            splitDataObject: splitData,
            splitDataId: splitData?.id,
            splitDataWalletId: splitData?.walletId,
            hasSplitId: !!splitId,
            splitId: splitId,
            condition1: splitData && splitData.walletId,
            condition2: splitData && !splitData.walletId,
            condition3: splitId && !splitData
          });
          
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
              setSelectedSplitType(existingSplit.splitType);
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
            const existingSplits = await SplitStorageService.getUserSplits(currentUser.id.toString());
            existingSplit = existingSplits.splits?.find(split => 
              split.billId === processedBillData.id || 
              split.title === processedBillData.title
            );
          } else if (splitId && splitData) {
            // We have both splitId and splitData (normal case when navigating from splits list)
            console.log('🔍 SplitDetailsScreen: Using splitData from navigation (both splitId and splitData present):', {
              splitId: splitId,
              splitDataId: splitData.id,
              splitDataTitle: splitData.title
            });
            existingSplit = splitData;
          } else {
            console.log('🔍 SplitDetailsScreen: No existing split conditions met, will create new split when needed');
          }
          
          if (existingSplit && existingSplit.walletId) {
            console.log('🔍 SplitDetailsScreen: Found existing split with wallet:', existingSplit.walletId);
            
            // Get the existing wallet
            const walletResult = await SplitWalletService.getSplitWallet(existingSplit.walletId);
            if (walletResult.success && walletResult.wallet) {
              console.log('🔍 SplitDetailsScreen: Using existing wallet:', walletResult.wallet.id);
              setSplitWallet(walletResult.wallet);
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
  }, [currentUser?.id, splitData?.walletId, processedBillData?.id, splitId, isProcessingNewBill, hasJustJoinedSplit]); // Added splitId, isProcessingNewBill, and hasJustJoinedSplit to dependencies

  // Debug: Monitor splitWallet state changes
  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 SplitDetailsScreen: splitWallet state changed:', {
        hasWallet: !!splitWallet,
        walletId: splitWallet?.id,
        isCreator: isCurrentUserCreator()
      });
    }
  }, [splitWallet]);

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
            setSelectedSplitType(splitResult.split.splitType);
            
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
            'USDC'
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
    console.log('🔍 SplitDetailsScreen: splitData changed:', {
      hasSplitData: !!splitData,
      splitDataId: splitData?.id,
      splitDataTitle: splitData?.title,
      splitDataObject: splitData,
      splitDataType: typeof splitData,
      splitDataKeys: splitData ? Object.keys(splitData) : 'null',
      timestamp: new Date().toISOString()
    });
  }, [splitData]);

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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Split the Bill</Text>
        
        <TouchableOpacity style={styles.editButton} onPress={handleEditBill}>
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Details Card */}
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billIcon}>🍽️</Text>
              <Text style={styles.billTitle}>{billName}</Text>
            </View>
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
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <View style={styles.billAmountRow}>
              <Text style={styles.billAmountUSDC}>{totalAmount} USDC</Text>
              <Text style={styles.billAmountEUR}>
                {(() => {
                  const currency = splitData?.currency || processedBillData?.currency || billData?.currency || 'USD';
                  if (currency === 'USD') {
                    return `$${parseFloat(totalAmount).toFixed(2)}`;
                  } else {
                    return `${(parseFloat(totalAmount) * 0.95).toFixed(2)}€`;
                  }
                })()}
              </Text>
            </View>
            {(splitData?.merchant?.address || processedBillData?.location || billData?.location) && (
              <Text style={[styles.billAmountEUR, { marginTop: spacing.xs }]}>
                {splitData?.merchant?.address || processedBillData?.location || billData?.location}
              </Text>
            )}
          </View>
          
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
                      userName={participant.name}
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

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <Text style={styles.participantsTitle}>In the pool:</Text>
          
          {participants.map((participant: any) => (
            <View key={participant.id} style={styles.participantCard}>
              <UserAvatar
                userId={participant.id}
                userName={participant.name}
                size={40}
                style={styles.participantAvatar}
              />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantWallet}>{participant.walletAddress}</Text>
              </View>
              <View style={styles.participantStatus}>
                {participant.status === 'accepted' ? (
                  <Text style={styles.statusAccepted}>✓</Text>
                ) : (
                  <Text style={styles.statusPending}>Pending</Text>
                )}
                {__DEV__ && (
                  <Text style={{ fontSize: 10, color: '#666' }}>
                    {participant.status}
                  </Text>
                )}
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
                      userName={invitedUser.name}
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
              <View style={styles.splitWalletInfo}>
                <Text style={styles.splitWalletLabel}>Wallet Address:</Text>
                <Text style={styles.splitWalletAddress} numberOfLines={1} ellipsizeMode="middle">
                  {splitWallet?.walletAddress || currentSplitData?.walletAddress}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.privateKeyButton} 
                onPress={handleShowPrivateKey}
              >
                <Text style={styles.privateKeyButtonText}>🔑 View Private Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            style={[
              styles.splitButton,
              !areAllInvitedUsersAccepted() && styles.splitButtonDisabled
            ]} 
            onPress={handleSplitBill}
            disabled={!areAllInvitedUsersAccepted()}
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
        </TouchableOpacity>
      </View>
      )}

      {/* Split Type Selection Modal */}
      <Modal
        visible={showSplitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
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
                  <View style={styles.splitOptionIcon}>
                    <Text style={styles.splitOptionIconText}>⚖️</Text>
                  </View>
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
                  <View style={styles.riskyModeLabel}>
                    <Text style={styles.riskyModeIcon}>🔥</Text>
                    <Text style={styles.riskyModeText}>Risky mode</Text>
                  </View>
                  <View style={styles.splitOptionIcon}>
                    <Text style={styles.splitOptionIconText}>🎲</Text>
                  </View>
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Friends Modal */}
      <Modal
        visible={showAddFriendsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseAddFriendsModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseAddFriendsModal}
        >
          <TouchableOpacity 
            style={styles.addFriendsModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
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
                    size={220}
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
                <Text style={styles.splitContextIcon}>🍴</Text>
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
                {isInvitingUsers ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.addContactsButtonText}>Add Contacts</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Private Key Modal */}
      <Modal
        visible={showPrivateKeyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClosePrivateKeyModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClosePrivateKeyModal}
        >
          <TouchableOpacity 
            style={styles.privateKeyModalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandle} />
            
            {/* Modal Content */}
            <View style={styles.privateKeyModalContent}>
              <Text style={styles.privateKeyModalTitle}>🔑 Split Wallet Private Key</Text>
              <Text style={styles.privateKeyModalSubtitle}>
                Keep this private key secure. Only you can access it.
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
              
              {/* Action Buttons */}
              <View style={styles.privateKeyButtonContainer}>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={async () => {
                    if (splitWalletPrivateKey) {
                      await Clipboard.setStringAsync(splitWalletPrivateKey);
                      Alert.alert('Copied', 'Private key copied to clipboard');
                    }
                  }}
                >
                  <Text style={styles.copyButtonText}>📋 Copy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.closePrivateKeyButton}
                  onPress={handleClosePrivateKeyModal}
                >
                  <Text style={styles.closePrivateKeyButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};


export default SplitDetailsScreen;

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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { styles } from './styles';
import { ProcessedBillData, BillAnalysisResult } from '../../types/billAnalysis';
import { BillAnalysisService } from '../../services/billAnalysisService';
import { SplitInvitationService } from '../../services/splitInvitationService';
import { NFCSplitService } from '../../services/nfcService';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import { SplitStorageService, Split } from '../../services/splitStorageService';
import { SplitWalletService } from '../../services/splitWalletService';
import UserAvatar from '../../components/UserAvatar';
import QRCode from 'react-native-qrcode-svg';

interface SplitDetailsScreenProps {
  navigation: any;
  route?: any;
}

const SplitDetailsScreen: React.FC<SplitDetailsScreenProps> = ({ navigation, route }) => {
  // Get data from route params - support both new splits and existing splits
  const { 
    billData, 
    processedBillData, 
    analysisResult, 
    splitId, 
    splitData, 
    isEditing 
  } = route?.params || {};
  
  const { state } = useApp();
  const { currentUser } = state;
  
  // Debug: Log the current user data
  console.log('🔍 SplitDetailsScreen: Current user from context:', {
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
  
  const [billName, setBillName] = useState(processedBillData?.title || billData?.title || 'Restaurant Night');
  const [totalAmount, setTotalAmount] = useState(
    processedBillData?.totalAmount?.toString() || billData?.totalAmount?.toString() || '65.6'
  );
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedSplitType, setSelectedSplitType] = useState<'fair' | 'degen' | null>(null);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [splitWalletPrivateKey, setSplitWalletPrivateKey] = useState<string | null>(null);
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [splitWallet, setSplitWallet] = useState<any>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [participants, setParticipants] = useState(() => {
    console.log('🔍 SplitDetailsScreen: Initializing participants with:', {
      processedBillDataParticipants: processedBillData?.participants,
      billDataParticipants: billData?.participants,
      currentUser: currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        wallet_address: currentUser.wallet_address
      } : null
    });
    
    // Use participants from processed bill data or bill data if available
    if (processedBillData?.participants && processedBillData.participants.length > 0) {
      console.log('🔍 SplitDetailsScreen: Using participants from processedBillData');
      return processedBillData.participants;
    }
    
    if (billData?.participants && billData.participants.length > 0) {
      console.log('🔍 SplitDetailsScreen: Using participants from billData');
      return billData.participants;
    }
    
    // If no participants provided, start with just the current user as creator
    if (currentUser) {
      const currentUserParticipant = {
        id: currentUser.id.toString(),
        name: currentUser.name,
        walletAddress: currentUser.wallet_address || 'No wallet address',
        status: 'accepted' as 'pending' | 'accepted' | 'declined',
      };
      console.log('🔍 SplitDetailsScreen: Created current user participant:', currentUserParticipant);
      return [currentUserParticipant];
    }
    
    // Fallback if no current user
    console.log('🔍 SplitDetailsScreen: No current user, returning empty participants');
    return [];
  });

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
    const invitationData = SplitInvitationService.generateInvitationData(
      processedBillData?.id || billData?.id || `split_${Date.now()}`,
      billName,
      parseFloat(totalAmount),
      processedBillData?.currency || 'USD',
      currentUser.id.toString()
    );

    const qrData = SplitInvitationService.generateQRCodeData(invitationData);
    setQrCodeData(qrData);
    setShowAddFriendsModal(true);
  };

  const handleCloseAddFriendsModal = () => {
    setShowAddFriendsModal(false);
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
        
        // Check if split already exists
        const existingSplits = await SplitStorageService.getUserSplits(currentUser.id.toString());
        const existingSplit = existingSplits.splits?.find(split => 
          split.billId === processedBillData.id || 
          split.title === processedBillData.title
        );
        
        let walletToUse = splitWallet;
        
        // If no existing wallet, create one now
        if (!walletToUse) {
          console.log('🔍 SplitDetailsScreen: Creating wallet for new split...');
          const walletResult = await SplitWalletService.createSplitWallet(
            processedBillData.id,
            currentUser.id.toString(),
            processedBillData.totalAmount,
            processedBillData.currency || 'USDC',
            participants.map((p: any) => ({
              userId: p.id,
              name: p.name,
              walletAddress: p.walletAddress,
              amountOwed: p.amountOwed,
            }))
          );
          
          if (walletResult.success && walletResult.wallet) {
            walletToUse = walletResult.wallet;
            setSplitWallet(walletResult.wallet);
            console.log('🔍 SplitDetailsScreen: Wallet created successfully:', walletResult.wallet.id);
          } else {
            console.log('🔍 SplitDetailsScreen: Failed to create wallet:', walletResult.error);
            Alert.alert('Error', walletResult.error || 'Failed to create split wallet');
            return;
          }
        }
        
        const splitData = {
          billId: processedBillData.id,
          title: processedBillData.title,
          description: `Split for ${processedBillData.title}`,
          totalAmount: processedBillData.totalAmount,
          currency: processedBillData.currency,
          splitType: type,
          status: 'draft' as const,
          creatorId: currentUser.id.toString(),
          creatorName: currentUser.name,
          participants: participants.map((p: any) => ({
            userId: p.id,
            name: p.name,
            walletAddress: p.walletAddress,
            amountOwed: p.amountOwed,
            amountPaid: 0,
            status: 'pending' as const,
          })),
          items: processedBillData.items,
          merchant: processedBillData.merchant,
          date: processedBillData.date,
          // Include wallet information in split data
          walletId: walletToUse.id,
          walletAddress: walletToUse.walletAddress,
        };

        let result;
        if (existingSplit) {
          // Update existing split
          console.log('🔍 SplitDetailsScreen: Updating existing split:', existingSplit.id);
          result = await SplitStorageService.updateSplit(existingSplit.firebaseDocId || existingSplit.id, {
            ...splitData,
            splitType: type,
            participants: splitData.participants,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Create new split
          console.log('🔍 SplitDetailsScreen: Creating new split...');
          result = await SplitStorageService.createSplit(splitData);
        }
        
        if (result.success && result.split) {
          console.log('🔍 SplitDetailsScreen: Split saved/updated successfully:', result.split.id);
          
          // Navigate to the appropriate split screen with the split data and wallet
          if (type === 'fair') {
            navigation.navigate('FairSplit', {
              billData: processedBillData,
              splitData: result.split,
              splitWallet: walletToUse,
            });
          } else {
            navigation.navigate('DegenLock', {
              billData: processedBillData,
              splitData: result.split,
              splitWallet: walletToUse,
              participants: participants,
              totalAmount: processedBillData.totalAmount,
              processedBillData: processedBillData,
            });
          }
        } else {
          console.log('🔍 SplitDetailsScreen: Failed to save/update split:', result.error);
          Alert.alert('Error', result.error || 'Failed to save split');
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
    
    if (!selectedSplitType) {
      Alert.alert('Please select a split type', 'Choose either Fair Split or Degen Split to continue');
      return;
    }

    setShowSplitModal(false);
    
    if (selectedSplitType === 'fair') {
      // Navigate to Fair Split screen
      const fairSplitData = {
        title: billName,
        totalAmount: parseFloat(totalAmount),
        date: processedBillData?.date || billData?.date || '10 Mar. 2025',
        participants: participants.map((p: any) => ({
          id: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          status: p.status,
        })),
      };
      
      console.log('Navigating to FairSplit with data:', fairSplitData);
      navigation.navigate('FairSplit', { 
        billData: fairSplitData,
        processedBillData,
        analysisResult,
      });
    } else {
      // Navigate to Degen Lock screen
      const degenSplitData = {
        name: billName,
        totalAmount: parseFloat(totalAmount),
        date: processedBillData?.date || billData?.date || '10 Mar. 2025',
        participants: participants.map((p: any) => ({
          id: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          status: p.status,
        })),
      };
      
      // Convert participants to the format expected by DegenLock
      const degenParticipants = participants.map((p: any) => ({
        id: p.id,
        name: p.name,
        userId: p.walletAddress, // Use wallet address as userId
        avatar: '👤',
      }));
      
      console.log('Navigating to DegenLock with data:', degenSplitData);
      navigation.navigate('DegenLock', {
        billData: degenSplitData,
        participants: degenParticipants,
        totalAmount: parseFloat(totalAmount),
        processedBillData,
        analysisResult,
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
        currency: processedBillData?.currency || billData?.currency || 'USD',
        date: processedBillData?.date || billData?.date || new Date().toISOString().split('T')[0],
        merchant: processedBillData?.merchant || billData?.merchant || 'Unknown Merchant',
        billImageUrl: billData?.billImageUrl,
        items: processedBillData?.items || billData?.items || [],
        participants: participants,
        settings: processedBillData?.settings || billData?.settings || {
          allowPartialPayments: true,
          requireAllAccept: false,
          autoCalculate: true,
          splitMethod: 'equal',
        },
      },
      processedBillData,
      analysisResult,
      isEditing: true, // Flag to indicate this is an edit operation
    });
  };


  // Check for existing split and load wallet if it exists
  useEffect(() => {
    const checkExistingSplit = async () => {
      if (currentUser && !splitWallet && !isCreatingWallet) {
        setIsCreatingWallet(true);
        console.log('🔍 SplitDetailsScreen: Checking for existing split...');
        
        try {
          let existingSplit = null;
          
          // If we have splitData from navigation, use it
          if (splitData && splitData.walletId) {
            console.log('🔍 SplitDetailsScreen: Using splitData from navigation:', splitData.walletId);
            existingSplit = splitData;
          } else if (processedBillData) {
            // Check if a split already exists for this bill
            const existingSplits = await SplitStorageService.getUserSplits(currentUser.id.toString());
            existingSplit = existingSplits.splits?.find(split => 
              split.billId === processedBillData.id || 
              split.title === processedBillData.title
            );
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
  }, [currentUser, processedBillData, splitData, splitWallet, isCreatingWallet]);

  // Debug effect to track selectedSplitType changes
  useEffect(() => {
    console.log('selectedSplitType state changed to:', selectedSplitType);
  }, [selectedSplitType]);

  // Debug effect to track modal visibility
  useEffect(() => {
    console.log('Modal visibility changed to:', showSplitModal);
  }, [showSplitModal]);

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
            <Text style={styles.billDate}>10 Mar. 2025</Text>
          </View>
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <View style={styles.billAmountRow}>
              <Text style={styles.billAmountUSDC}>{totalAmount} USDC</Text>
              <Text style={styles.billAmountEUR}>
                {processedBillData?.currency === 'USD' ? 
                  `$${parseFloat(totalAmount).toFixed(2)}` : 
                  `${(parseFloat(totalAmount) * 0.95).toFixed(2)}€`
                }
              </Text>
            </View>
            {processedBillData?.location && (
              <Text style={[styles.billAmountEUR, { marginTop: spacing.xs }]}>{processedBillData.location}</Text>
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
              </View>
            </View>
          ))}
        </View>

        {/* Split Wallet Info Section - Show when wallet is created */}
        {splitWallet && currentUser && (
          <View style={styles.splitWalletSection}>
            <Text style={styles.splitWalletTitle}>Split Wallet</Text>
            <View style={styles.splitWalletCard}>
              <View style={styles.splitWalletInfo}>
                <Text style={styles.splitWalletLabel}>Wallet Address:</Text>
                <Text style={styles.splitWalletAddress} numberOfLines={1} ellipsizeMode="middle">
                  {splitWallet.walletAddress}
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

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.splitButton} onPress={handleSplitBill}>
          <Text style={styles.splitButtonText}>Split</Text>
        </TouchableOpacity>
      </View>

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
        <View style={styles.modalOverlay}>
          <View style={styles.addFriendsModalContainer}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />
            
            {/* Title */}
            <Text style={styles.addFriendsModalTitle}>Invite your friends</Text>
            
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
                style={styles.doneButton}
                onPress={handleCloseAddFriendsModal}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

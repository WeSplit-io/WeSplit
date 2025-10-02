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
import { useApp } from '../../context/AppContext';

interface Participant {
  id: string;
  name: string;
  walletAddress: string;
  amountOwed: number;
  amountLocked: number;
  status: 'pending' | 'locked' | 'confirmed';
}

interface FairSplitScreenProps {
  navigation: any;
  route: any;
}

const FairSplitScreen: React.FC<FairSplitScreenProps> = ({ navigation, route }) => {
  const { billData, processedBillData } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
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
  
  const [splitMethod, setSplitMethod] = useState<'equal' | 'manual'>('equal');
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [splitWallet, setSplitWallet] = useState<SplitWallet | null>(null);
  
  // Initialize participants from route params or use current user as creator
  const [participants, setParticipants] = useState<Participant[]>(() => {
    console.log('🔍 FairSplitScreen: Initializing participants with currentUser:', {
      currentUser: currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        wallet_address: currentUser.wallet_address,
        email: currentUser.email
      } : null,
      billDataParticipants: billData?.participants
    });

    if (billData?.participants && billData.participants.length > 0) {
      // Convert SplitDetailsScreen participants to FairSplitScreen format
      // But replace mock data with real user data when possible
      const mappedParticipants = billData.participants.map((p: any, index: number) => {
        // If this participant is the current user, use real data
        if (currentUser && p.name === 'You' && p.walletAddress === 'Your wallet address') {
          return {
            id: currentUser.id.toString(),
            name: currentUser.name,
            walletAddress: currentUser.wallet_address,
            amountOwed: 0, // Will be calculated based on split method
            amountLocked: 0, // Start with no locked amounts
            status: 'pending' as 'pending' | 'locked' | 'confirmed',
          };
        }
        
        // For other participants, use the provided data
        return {
          id: p.id || `participant_${index}`,
          name: p.name || `Participant ${index + 1}`,
          walletAddress: p.walletAddress || p.wallet_address || 'Unknown',
          amountOwed: 0, // Will be calculated based on split method
          amountLocked: 0, // Start with no locked amounts
          status: 'pending' as 'pending' | 'locked' | 'confirmed',
        };
      });
      
      console.log('🔍 FairSplitScreen: Mapped participants from billData:', mappedParticipants);
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
        status: 'pending' as 'pending' | 'locked' | 'confirmed',
      };
      
      console.log('🔍 FairSplitScreen: Created current user participant:', currentUserParticipant);
      return [currentUserParticipant];
    }
    
    // Fallback if no current user
    console.log('🔍 FairSplitScreen: No current user, returning empty participants');
    return [];
  });

  const totalAmount = billData?.totalAmount || 65.6;
  const totalLocked = participants.reduce((sum, p) => sum + p.amountLocked, 0);
  const progressPercentage = Math.round((totalLocked / totalAmount) * 100);

  useEffect(() => {
    if (splitMethod === 'equal') {
      const amountPerPerson = totalAmount / participants.length;
      setParticipants(prev => 
        prev.map(p => ({ ...p, amountOwed: amountPerPerson }))
      );
    }
  }, [splitMethod, totalAmount, participants.length]);

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

    console.log('🔍 FairSplitScreen: Creating split wallet with participants:', {
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        wallet_address: currentUser.wallet_address
      },
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
        walletAddress: p.walletAddress,
        amountOwed: p.amountOwed
      })),
      totalAmount
    });

    setIsCreatingWallet(true);

    try {
      const billId = processedBillData?.id || `bill_${Date.now()}`;
      const splitWalletResult = await SplitWalletService.createSplitWallet(
        billId,
        currentUser.id.toString(),
        totalAmount,
        'USDC',
        participants.map(p => ({
          userId: p.id,
          name: p.name,
          walletAddress: p.walletAddress,
          amountOwed: p.amountOwed,
        }))
      );

      if (!splitWalletResult.success) {
        Alert.alert('Error', splitWalletResult.error || 'Failed to create split wallet');
        setIsCreatingWallet(false);
        return;
      }

      setSplitWallet(splitWalletResult.wallet);
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
    const billName = billData?.title || 'Restaurant Night';

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

    const participant = splitWallet.participants.find(p => p.userId === currentUser.id.toString());
    if (!participant) {
      Alert.alert('Error', 'You are not a participant in this split');
      return;
    }

    // Navigate to payment screen
    navigation.navigate('SplitPayment', {
      splitWalletId: splitWallet.id,
      billName: billData?.title || 'Restaurant Night',
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
        return colors.green;
      case 'pending':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'locked':
        return 'Locked';
      case 'pending':
        return 'Pending';
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
        
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bill Summary Card */}
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <View style={styles.billTitleContainer}>
              <Text style={styles.billIcon}>🧾</Text>
              <Text style={styles.billTitle}>{billData?.title || 'Restaurant Night'}</Text>
            </View>
            <Text style={styles.billDate}>10 Mar. 2025</Text>
          </View>
          
          <View style={styles.billAmountContainer}>
            <Text style={styles.billAmountLabel}>Total Bill</Text>
            <Text style={styles.billAmountUSDC}>{totalAmount} USDC</Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <View style={[styles.progressFill, { 
              transform: [{ rotate: `${(progressPercentage / 100) * 360}deg` }] 
            }]} />
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
              <Text style={styles.progressAmount}>{totalLocked} USDC</Text>
              <Text style={styles.progressLabel}>Locked</Text>
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
            const shortWalletAddress = participant.walletAddress 
              ? `${participant.walletAddress.substring(0, 4)}...${participant.walletAddress.substring(participant.walletAddress.length - 4)}`
              : 'Unknown';
            
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
                      ${participant.amountOwed.toFixed(3)}
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
              style={[styles.createWalletButton, { backgroundColor: colors.secondary, marginTop: spacing.sm }]} 
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

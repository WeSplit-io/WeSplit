/**
 * Fair Split Screen - Refactored Version
 * Uses modular hooks for better maintainability and testability
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { styles } from './styles';
import { useApp } from '../../context/AppContext';
import { logger } from '../../services/analytics/loggingService';

// Import our custom hooks
import { useFairSplitState } from './hooks/useFairSplitState';
import { useFairSplitLogic } from './hooks/useFairSplitLogic';
import { useFairSplitInitialization } from './hooks/useFairSplitInitialization';

// Import existing components
import FairSplitHeader from './components/FairSplitHeader';
import FairSplitProgress from './components/FairSplitProgress';
import FairSplitParticipants from './components/FairSplitParticipants';

interface FairSplitScreenProps {
  navigation: any;
  route: any;
}

const FairSplitScreenRefactored: React.FC<FairSplitScreenProps> = ({ navigation, route }) => {
  const { billData, processedBillData, splitWallet: existingSplitWallet, splitData: initialSplitData } = route.params || {};
  const { state } = useApp();
  const { currentUser } = state;
  
  // Local state for data that doesn't need to be in the main state hook
  const [splitData, setSplitData] = useState(initialSplitData);
  const [participants, setParticipants] = useState<any[]>([]);
  
  // Use our custom hooks
  const fairSplitState = useFairSplitState(existingSplitWallet);
  const fairSplitLogic = useFairSplitLogic(fairSplitState, currentUser, splitData, participants, setParticipants);
  const fairSplitInitialization = useFairSplitInitialization(fairSplitState, splitData, setParticipants, setSplitData);

  // Handle split method change
  const handleSplitMethodChange = (method: 'equal' | 'manual') => {
    fairSplitLogic.handleSplitMethodChange(method);
    logger.info('Split method changed', { method });
  };

  // Handle participant edit
  const handleParticipantEdit = (participant: any) => {
    fairSplitLogic.handleParticipantEdit(participant);
  };

  // Handle payment start
  const handlePaymentStart = (amount: string) => {
    fairSplitLogic.handlePaymentStart(amount);
  };

  // Handle transfer method selection
  const handleTransferMethodSelect = (method: 'external-wallet' | 'in-app-wallet') => {
    fairSplitLogic.handleTransferMethodSelect(method);
  };

  // Handle wallet selection
  const handleWalletSelect = (wallet: {id: string, address: string, type: 'external' | 'in-app', name?: string}) => {
    fairSplitLogic.handleWalletSelect(wallet);
  };

  // Render loading state
  if (fairSplitState.isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading split data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <FairSplitHeader
            billData={billData}
            processedBillData={processedBillData}
            splitData={splitData}
            isCurrentUserCreator={fairSplitLogic.isCurrentUserCreator()}
          />

          {/* Progress */}
          <FairSplitProgress
            splitMethod={fairSplitState.splitMethod}
            onSplitMethodChange={handleSplitMethodChange}
            participants={participants}
            totalLocked={fairSplitLogic.calculateTotalLocked(participants)}
            totalAssigned={fairSplitLogic.calculateTotalAssigned(participants)}
            isSplitConfirmed={fairSplitState.isSplitConfirmed}
          />

          {/* Participants */}
          <FairSplitParticipants
            participants={participants}
            onParticipantEdit={handleParticipantEdit}
            onPaymentStart={handlePaymentStart}
            isCurrentUserCreator={fairSplitLogic.isCurrentUserCreator()}
            isSplitConfirmed={fairSplitState.isSplitConfirmed}
            hasInvalidAmounts={fairSplitLogic.hasInvalidAmounts(participants)}
            hasZeroAmounts={fairSplitLogic.hasZeroAmounts(participants)}
          />

          {/* Transfer Method Selection */}
          {fairSplitState.showPaymentModal && (
            <View style={styles.transferMethodContainer}>
              <Text style={styles.transferMethodTitle}>Select Transfer Method</Text>
              <TouchableOpacity
                style={styles.transferMethodButton}
                onPress={() => handleTransferMethodSelect('external-wallet')}
              >
                <Text style={styles.transferMethodButtonText}>External Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.transferMethodButton}
                onPress={() => handleTransferMethodSelect('in-app-wallet')}
              >
                <Text style={styles.transferMethodButtonText}>In-App Wallet</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Wallet Selection */}
          {fairSplitState.selectedTransferMethod && (
            <View style={styles.walletSelectionContainer}>
              <Text style={styles.walletSelectionTitle}>Select Wallet</Text>
              {fairSplitState.isLoadingWallets ? (
                <ActivityIndicator size="small" color={colors.primaryGreen} />
              ) : (
                <View style={styles.walletList}>
                  {fairSplitState.externalWallets.map((wallet) => (
                    <TouchableOpacity
                      key={wallet.id}
                      style={styles.walletItem}
                      onPress={() => handleWalletSelect({...wallet, type: 'external'})}
                    >
                      <Text style={styles.walletItemText}>{wallet.name || wallet.address}</Text>
                    </TouchableOpacity>
                  ))}
                  {fairSplitState.inAppWallet && (
                    <TouchableOpacity
                      style={styles.walletItem}
                      onPress={() => handleWalletSelect({...fairSplitState.inAppWallet!, type: 'in-app', id: 'in-app'})}
                    >
                      <Text style={styles.walletItemText}>In-App Wallet</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Edit Modal */}
          {fairSplitState.showEditModal && (
            <View style={styles.editModal}>
              <Text style={styles.editModalTitle}>Edit Amount</Text>
              <Text style={styles.editModalText}>
                Editing amount for {fairSplitState.editingParticipant?.name}
              </Text>
              <TouchableOpacity
                style={styles.editModalButton}
                onPress={fairSplitLogic.handleEditConfirm}
              >
                <Text style={styles.editModalButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editModalButton}
                onPress={fairSplitLogic.handleEditCancel}
              >
                <Text style={styles.editModalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default FairSplitScreenRefactored;

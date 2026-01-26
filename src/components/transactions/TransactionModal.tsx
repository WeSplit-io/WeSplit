import React, { useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import { logger } from '../../services/analytics/loggingService';
import { styles } from './TransactionModal.styles';
import type { Transaction as TransactionType } from '../../types';

interface TransactionModalProps {
  visible: boolean;
  transaction: TransactionType | null;
  onClose: () => void;
  navigation?: NavigationContainerRef<Record<string, object | undefined>> | { navigate: (route: string, params?: object) => void };
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  transaction,
  onClose,
  navigation,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      // Reset opacity animation
      opacity.setValue(1);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) { // Threshold to close modal
        // Close modal
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
          // Reset values
          translateY.setValue(0);
          opacity.setValue(0);
        });
      } else {
        // Reset to original position
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animate in when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // opacity and translateY are Animated.Value objects that shouldn't be in dependencies
  }, [visible]);

  if (!transaction) {return null;}

  const formatDate = (dateString: string) => {
    if (!dateString) {return 'N/A';}
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {return 'N/A';}
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatShortAddress = (address: string) => {
    if (!address) {return 'N/A';}
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  // Safety check to ensure transaction has required properties
  if (!transaction.type || transaction.amount === undefined || transaction.amount === null) {
    logger.warn('Transaction missing required properties', { transaction });
    return null;
  }

  // Create a clean, safe transaction object with all required properties
  const safeTransaction = {
    id: String(transaction.id || 'unknown'),
    type: String(transaction.type || 'send'),
    amount: Number(transaction.amount || 0),
    currency: String(transaction.currency || 'USDC'),
    from_user: String(transaction.from_user || 'Unknown'),
    to_user: String(transaction.to_user || 'Unknown'),
    from_wallet: String(transaction.from_wallet || ''),
    to_wallet: String(transaction.to_wallet || ''),
    tx_hash: String(transaction.tx_hash || ''),
    note: String(transaction.note || ''),
    status: String(transaction.status || 'completed'),
    created_at: String(transaction.created_at || new Date().toISOString()),
    updated_at: String(transaction.updated_at || new Date().toISOString()),
    group_id: transaction.group_id ? String(transaction.group_id) : null,
    company_fee: Number(transaction.company_fee || 0),
    net_amount: Number(transaction.net_amount || transaction.amount || 0),
    gas_fee: Number(transaction.gas_fee || 0),
    gas_fee_covered_by_company: Boolean(transaction.gas_fee_covered_by_company || false),
    recipient_name: String(transaction.recipient_name || transaction.to_user || 'Unknown'),
    sender_name: String(transaction.sender_name || transaction.from_user || 'Unknown'),
    transaction_method: String(transaction.transaction_method || 'app_wallet'),
    app_version: String(transaction.app_version || '1.0.0'),
    device_info: String(transaction.device_info || 'mobile')
  };

  const openSolscan = () => {
    if (safeTransaction.tx_hash) {
      const solscanUrl = `https://solscan.io/tx/${safeTransaction.tx_hash}`;
      Linking.openURL(solscanUrl);
    }
  };

  // Check if this is a group transaction
  const isGroupTransaction = safeTransaction.id && safeTransaction.id.startsWith('group_');
  const groupId = isGroupTransaction ? safeTransaction.id.replace('group_', '') : null;

  // Navigate to split details (groups are now handled as splits)
  const navigateToGroup = () => {
    if (navigation && groupId) {
      onClose(); // Close modal first
      navigation.navigate('SplitDetails', { splitId: groupId });
    }
  };

  // const { amount, color } = getTransactionAmount(transactionToUse); // Not currently used

  // Debug logs
  logger.debug('Transaction Modal Debug', {
    type: safeTransaction.type,
    amount: safeTransaction.amount,
    currency: safeTransaction.currency,
    from_wallet: safeTransaction.from_wallet,
    to_wallet: safeTransaction.to_wallet,
    tx_hash: safeTransaction.tx_hash,
    note: safeTransaction.note,
    isGroupTransaction,
    groupId,
    created_at: safeTransaction.created_at,
    from_user: safeTransaction.from_user,
    to_user: safeTransaction.to_user
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.transactionModalOverlay, { opacity }]}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={onClose}
          />
          
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <Animated.View
              style={[
                styles.transactionModalContent,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Handle bar for slide down */}
              <View style={styles.transactionHandle} />

              {/* Title */}
              <Text style={styles.transactionModalTitle}>Transaction Details</Text>

              <ScrollView 
                style={styles.transactionContent} 
                contentContainerStyle={styles.transactionContentContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
              >
                  {/* Transaction Details */}
                  <View style={styles.transactionDetailsContainer}>
                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Amount:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {safeTransaction.amount.toFixed(2)} {safeTransaction.currency}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Date:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {formatDate(safeTransaction.created_at)}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Type:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {safeTransaction.type.charAt(0).toUpperCase() + safeTransaction.type.slice(1)}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>From:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {safeTransaction.sender_name}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>To:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {safeTransaction.recipient_name}
                      </Text>
                    </View>

                    {safeTransaction.note.trim() && (
                      <View style={styles.transactionDetailRow}>
                        <Text style={styles.transactionDetailLabel}>Note:</Text>
                        <Text style={styles.transactionDetailValue}>
                          {safeTransaction.note}
                        </Text>
                      </View>
                    )}

                    {safeTransaction.group_id && (
                      <View style={styles.transactionDetailRow}>
                        <Text style={styles.transactionDetailLabel}>Group ID:</Text>
                        <Text style={styles.transactionDetailValue}>
                          {safeTransaction.group_id}
                        </Text>
                      </View>
                    )}

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Transaction ID:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {safeTransaction.id}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Status:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {safeTransaction.status.charAt(0).toUpperCase() + safeTransaction.status.slice(1)}
                      </Text>
                    </View>

                    {safeTransaction.tx_hash && (
                      <View style={styles.transactionDetailRow}>
                        <Text style={styles.transactionDetailLabel}>On-chain ID:</Text>
                        <TouchableOpacity onPress={openSolscan}>
                          <Text style={styles.transactionDetailValueLink}>
                            {formatShortAddress(safeTransaction.tx_hash)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Group Navigation Button - Only show for group transactions */}
                    {isGroupTransaction && navigation && (
                      <View style={styles.transactionDetailRow}>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity 
                          style={styles.groupNavigationButton}
                          onPress={navigateToGroup}
                        >
                          <Text style={styles.groupNavigationButtonText}>
                            View Group Details
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Fees Section - Show actual stored fee data */}
                    {safeTransaction.company_fee > 0 && (
                      <>
                        <View style={styles.transactionDetailRow}>
                          <Text style={styles.transactionDetailLabel}>Company Fee:</Text>
                          <Text style={styles.transactionDetailValue}>
                            {safeTransaction.company_fee.toFixed(2)} {safeTransaction.currency}
                          </Text>
                        </View>

                        {safeTransaction.net_amount !== safeTransaction.amount && (
                          <View style={styles.transactionDetailRow}>
                            <Text style={styles.transactionDetailLabel}>Net Amount:</Text>
                            <Text style={styles.transactionDetailValue}>
                              {safeTransaction.net_amount.toFixed(2)} {safeTransaction.currency}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {safeTransaction.gas_fee > 0 && (
                      <View style={styles.transactionDetailRow}>
                        <Text style={styles.transactionDetailLabel}>Gas Fee:</Text>
                        <Text style={styles.transactionDetailValue}>
                          {safeTransaction.gas_fee.toFixed(6)} SOL
                        </Text>
                      </View>
                    )}

                    {safeTransaction.transaction_method && (
                      <View style={styles.transactionDetailRow}>
                        <Text style={styles.transactionDetailLabel}>Method:</Text>
                        <Text style={styles.transactionDetailValue}>
                          {safeTransaction.transaction_method === 'app_wallet' ? 'In-App Wallet' : 'External Wallet'}
                        </Text>
                      </View>
                    )}

                    {/* Solscan Link - Show for all transactions for testing */}
                    <View style={styles.transactionDetailRow}>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={openSolscan}>
                        <Text style={styles.transactionDetailValueLink}>
                          View on Solscan
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                {/* Done Button */}
                <TouchableOpacity style={styles.transactionDoneButton} onPress={onClose}>
                  <Text style={styles.transactionDoneButtonText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </Animated.View>
    </Modal>
  );
};

export default TransactionModal; 
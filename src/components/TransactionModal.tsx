import React, { useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Animated } from 'react-native';
import { colors } from '../theme/colors';
import { Transaction } from '../types';
import { styles } from './TransactionModal.styles';

interface TransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  navigation?: any; // Add navigation prop
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
  }, [visible]);

  if (!transaction) return null;

  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return require('../../assets/icon-send.png');
      case 'receive':
        return require('../../assets/icon-receive.png');
      case 'deposit':
        return require('../../assets/icon-deposit.png');
      case 'withdraw':
        return require('../../assets/icon-withdraw.png');
      default:
        return require('../../assets/icon-send.png');
    }
  };

  const getTransactionTitle = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return `Send to ${transaction.to_user}`;
      case 'receive':
        return `Received from ${transaction.from_user}`;
      case 'deposit':
        return 'Top Up Wallet';
      case 'withdraw':
        return 'Withdraw';
      default:
        return 'Transaction';
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    const amount = transaction.amount;
    const isIncome = transaction.type === 'receive' || transaction.type === 'deposit';
    
    return {
      amount: amount.toFixed(2),
      color: isIncome ? colors.green : colors.white
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatShortAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  const openSolscan = () => {
    if (transaction.tx_hash) {
      const solscanUrl = `https://solscan.io/tx/${transaction.tx_hash}`;
      Linking.openURL(solscanUrl);
    }
  };

  // Check if this is a group transaction
  const isGroupTransaction = transaction.id.startsWith('group_');
  const groupId = isGroupTransaction ? transaction.id.replace('group_', '') : null;

  // Navigate to group details
  const navigateToGroup = () => {
    if (navigation && groupId) {
      onClose(); // Close modal first
      navigation.navigate('GroupDetails', { groupId });
    }
  };

  const { amount, color } = getTransactionAmount(transaction);

  // Debug logs
  console.log('🔍 Transaction Modal Debug:', {
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    from_wallet: transaction.from_wallet,
    to_wallet: transaction.to_wallet,
    tx_hash: transaction.tx_hash,
    note: transaction.note,
    isGroupTransaction,
    groupId
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
                {/* Transaction Icon Container */}
                <View style={styles.transactionIconContainer}>
                  <View style={styles.transactionIcon}>
                    <Image
                      source={getTransactionIcon(transaction)}
                      style={styles.transactionIconImage}
                    />
                  </View>
                </View>

                {/* Transaction Info */}
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {getTransactionTitle(transaction)}
                  </Text>
                  <Text style={[styles.transactionAmount, { color }]}>
                    {amount} {transaction.currency}
                  </Text>
                </View>

                  {/* Transaction Details */}
                  <View style={styles.transactionDetailsContainer}>
                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Amount:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {transaction.amount.toFixed(2)} {transaction.currency}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Date:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {formatDate(transaction.created_at)}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Type:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>From:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {transaction.from_user || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>To:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {transaction.to_user || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Transaction ID:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {transaction.id}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Status:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Text>
                    </View>

                    {transaction.tx_hash && (
                      <View style={styles.transactionDetailRow}>
                        <Text style={styles.transactionDetailLabel}>On-chain ID:</Text>
                        <TouchableOpacity onPress={openSolscan}>
                          <Text style={styles.transactionDetailValueLink}>
                            {formatShortAddress(transaction.tx_hash)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Group Navigation Button - Only show for group transactions */}
                    {isGroupTransaction && navigation && (
                      <View style={styles.transactionDetailRow}>
                        <Text style={styles.transactionDetailLabel}></Text>
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

                    {/* Fees Section - Show for all transactions for testing */}
                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Withdrawal fee (3%):</Text>
                      <Text style={styles.transactionDetailValue}>
                        {(transaction.amount * 0.03).toFixed(2)} {transaction.currency}
                      </Text>
                    </View>

                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}>Total sent:</Text>
                      <Text style={styles.transactionDetailValue}>
                        {(transaction.amount * 1.03).toFixed(2)} {transaction.currency}
                      </Text>
                    </View>

                    {/* Solscan Link - Show for all transactions for testing */}
                    <View style={styles.transactionDetailRow}>
                      <Text style={styles.transactionDetailLabel}></Text>
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
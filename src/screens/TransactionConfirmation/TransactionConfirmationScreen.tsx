import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import Icon from '../../components/Icon';
import Avatar from '../../components/shared/Avatar';
import { useApp } from '../../context/AppContext';
import { useWallet } from '../../context/WalletContext';
// formatCryptoAmount exists in cryptoUtils - import from there
import { formatCryptoAmount } from '../../utils/crypto/wallet/cryptoUtils';
import styles from './styles';
import { logger } from '../../services/analytics/loggingService';
import { Container, ModernLoader } from '../../components/shared';
import Header from '../../components/shared/Header';

interface TransactionParams {
  type: 'payment' | 'settlement';
  recipient: {
    id: number;
    name: string;
    email: string;
    wallet_address: string;
  };
  amount: number;
  currency: string;
  groupId: string;
  onSuccess?: () => void;
}

const TransactionConfirmationScreen: React.FC<any> = ({ navigation, route }) => {
  const { state } = useApp();
  const { currentUser } = state;
  const { isConnected, address, sendTransaction, walletName } = useWallet();
  const params: TransactionParams = route.params;

  const [customAmount, setCustomAmount] = useState(params.amount.toString());
  const [memo, setMemo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm');
  const [errorMessage, setErrorMessage] = useState('');
  
  // ✅ CRITICAL: Use ref for immediate synchronous check to prevent race conditions
  const isProcessingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const DEBOUNCE_MS = 500;

  const handleConfirmTransaction = async () => {
    // ✅ CRITICAL: Immediate synchronous check using ref
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (isProcessingRef.current) {
      logger.warn('⚠️ Transaction already in progress - ignoring duplicate click', {
        timeSinceLastClick: `${timeSinceLastClick}ms`
      }, 'TransactionConfirmationScreen');
      return;
    }
    
    if (timeSinceLastClick < DEBOUNCE_MS) {
      logger.warn('⚠️ Click debounced - too soon after previous click', {
        timeSinceLastClick: `${timeSinceLastClick}ms`
      }, 'TransactionConfirmationScreen');
      return;
    }
    
    // Set flags immediately
    isProcessingRef.current = true;
    lastClickTimeRef.current = now;
    
    try {
      setProcessing(true);
      setStep('processing');

      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid amount');
      }

      // Validate wallet connection
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      // Check actual balance using existing wallet service
      const { consolidatedTransactionService } = await import('../../services/blockchain/transaction');
      const balance = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
      if (balance.usdc < amount) {
        throw new Error(`Insufficient balance. Required: ${amount} USDC, Available: ${balance.usdc} USDC`);
      }
      
      // ✅ CRITICAL: Add timeout wrapper (60 seconds max) - aligned with SendConfirmationScreen
      const transactionPromise = sendTransaction({
        to: params.recipient.wallet_address,
        amount: amount,
        currency: params.currency,
        memo: memo || `Payment to ${params.recipient.name}`,
        groupId: params.groupId
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction timeout - please check transaction history')), 60000);
      });
      
      let transactionResult;
      try {
        transactionResult = await Promise.race([transactionPromise, timeoutPromise]);
      } catch (timeoutError) {
        // Timeout occurred - verify on-chain if transaction succeeded
        const isTimeout = timeoutError instanceof Error && 
          (timeoutError.message.includes('timeout') || timeoutError.message.includes('Transaction timeout'));
        
        if (isTimeout) {
          logger.info('Timeout detected, verifying transaction on-chain', {
            recipientAddress: params.recipient.wallet_address,
            amount
          }, 'TransactionConfirmationScreen');
          
          try {
            // Wait a moment for blockchain to update
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check balances to verify transaction
            const recipientBalanceResult = await consolidatedTransactionService.getUsdcBalance(params.recipient.wallet_address);
            const senderBalanceResult = await consolidatedTransactionService.getUserWalletBalance(currentUser.id);
            
            logger.info('On-chain balance verification after timeout', {
              recipientBalance: recipientBalanceResult.balance,
              senderBalance: senderBalanceResult.usdc,
              expectedAmount: amount,
              note: 'Checking if transaction actually succeeded despite timeout'
            }, 'TransactionConfirmationScreen');
            
            // Try to get result from original promise if it completed
            try {
              transactionResult = await transactionPromise;
              if (transactionResult && transactionResult.signature) {
                logger.info('Transaction completed after timeout wrapper', {
                  success: true,
                  signature: transactionResult.signature
                }, 'TransactionConfirmationScreen');
                // Continue with success handling below
              } else {
                throw timeoutError; // Re-throw original timeout error
              }
            } catch (promiseError) {
              // Promise also failed - show timeout message with guidance
              logger.warn('Transaction promise also failed after timeout', {
                error: promiseError instanceof Error ? promiseError.message : String(promiseError)
              }, 'TransactionConfirmationScreen');
              
              isProcessingRef.current = false;
              setProcessing(false);
              
              setErrorMessage('Transaction is being processed. It may have succeeded on the blockchain. Please check your transaction history.');
              setStep('error');
              return;
            }
          } catch (verificationError) {
            logger.warn('Failed to verify transaction on-chain after timeout', {
              error: verificationError instanceof Error ? verificationError.message : String(verificationError)
            }, 'TransactionConfirmationScreen');
            
            // Fallback to original timeout message if verification fails
            isProcessingRef.current = false;
            setProcessing(false);
            
            setErrorMessage('Transaction is being processed. It may have succeeded on the blockchain. Please check your transaction history.');
            setStep('error');
            return;
          }
        } else {
          // Not a timeout error - re-throw
          throw timeoutError;
        }
      }

      // Check if transaction actually succeeded
      if (!transactionResult || !transactionResult.signature) {
        throw new Error('Transaction failed - no signature received');
      }

      logger.info('Transaction completed', { transactionResult }, 'TransactionConfirmationScreen');
      
      setStep('success');
      
      // Call success callback after a short delay
      setTimeout(() => {
        params.onSuccess?.();
        navigation.goBack();
      }, 2000);

    } catch (error) {
      console.error('Transaction failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      setStep('error');
    } finally {
      // ✅ CRITICAL: Always reset both ref and state
      isProcessingRef.current = false;
      setProcessing(false);
    }
  };

  const renderConfirmStep = () => (
    <Container>
      <Header 
        title={params.type === 'payment' ? 'Send Payment' : 'Settle Balance'}
        onBackPress={() => navigation.goBack()}
        showBackButton={true}
      />

      <View style={styles.content}>
        {/* Recipient Info */}
        <View style={styles.recipientCard}>
          <Avatar
            userName={params.recipient.name}
            size={50}
            style={styles.recipientAvatar}
          />
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{params.recipient.name}</Text>
            <Text style={styles.recipientEmail}>{params.recipient.email}</Text>
            <Text style={styles.recipientWallet}>
              {params.recipient.wallet_address.slice(0, 8)}...{params.recipient.wallet_address.slice(-8)}
            </Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionTitle}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <TextInput
              style={styles.amountInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#A89B9B"
            />
            <Text style={styles.currencyLabel}>{params.currency}</Text>
          </View>
          <Text style={styles.amountUSD}>
            ≈ ${parseFloat(customAmount || '0').toFixed(2)} USD
          </Text>
        </View>

        {/* Memo Input */}
        <View style={styles.memoSection}>
          <Text style={styles.sectionTitle}>Memo (Optional)</Text>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder={`Payment to ${params.recipient.name}`}
            placeholderTextColor="#A89B9B"
            maxLength={100}
          />
        </View>

        {/* Wallet Info */}
        <View style={styles.walletInfo}>
          <Text style={styles.sectionTitle}>Paying From</Text>
          <View style={styles.walletCard}>
            <Icon name="wallet" size={20} color="#A5EA15" />
            <View style={styles.walletDetails}>
              <Text style={styles.walletName}>
                {walletName || 'App Wallet'}
              </Text>
              <Text style={styles.walletAddress}>
                {address?.slice(0, 8)}...{address?.slice(-8)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
          onPress={handleConfirmTransaction}
          disabled={processing}
        >
          <Text style={styles.confirmButtonText}>
            Confirm Payment
          </Text>
        </TouchableOpacity>
      </View>
    </Container>
  );

  const renderProcessingStep = () => (
    <View style={styles.statusContainer}>
      <ModernLoader size="large" text="Processing Transaction" />
      <Text style={styles.statusSubtitle}>
        Sending {formatCryptoAmount(parseFloat(customAmount), params.currency)} to {params.recipient.name}
      </Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.statusContainer}>
      <View style={styles.successIcon}>
        <Icon name="check" size={32} color="#212121" />
      </View>
      <Text style={styles.statusTitle}>Transaction Successful!</Text>
      <Text style={styles.statusSubtitle}>
        Your payment has been sent successfully
      </Text>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.statusContainer}>
      <View style={styles.errorIcon}>
        <Icon name="x" size={32} color="#FFF" />
      </View>
      <Text style={styles.statusTitle}>Transaction Failed</Text>
      <Text style={styles.statusSubtitle}>{errorMessage}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => setStep('confirm')}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'confirm':
        return renderConfirmStep();
      case 'processing':
        return renderProcessingStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderConfirmStep();
    }
  };

  return (
    <Container>
      {renderContent()}
    </Container>
  );
};

export default TransactionConfirmationScreen; 
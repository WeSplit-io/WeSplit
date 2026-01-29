/**
 * Fair Split Withdrawal Handler
 * Extracted from ConsolidatedTransactionService to reduce bundle size
 */

import { logger } from '../../../analytics/loggingService';
import type { CentralizedTransactionResult } from '../../../transactions/types';

/**
 * Check if an address is an internal WeSplit app wallet
 * Internal wallets include: user wallets, shared wallets, and split wallets
 * 
 * @param address - The wallet address to check
 * @param getUserWalletAddress - Function to get user's wallet address (for fast check)
 */
async function checkIfInternalWeSplitWallet(
  address: string,
  getUserWalletAddress?: (userId: string) => Promise<string | null>,
  userId?: string
): Promise<boolean> {
  try {
    if (!address) return false;

    // ✅ OPTIMIZATION: First check if it matches the user's own wallet (fastest check)
    if (userId && getUserWalletAddress) {
      try {
        const userWalletAddress = await getUserWalletAddress(userId);
        if (userWalletAddress === address) {
          logger.debug('Address matches user wallet - internal wallet confirmed', {
            address,
            userId
          }, 'FairSplitWithdrawalHandler');
          return true;
        }
      } catch (error) {
        // If getUserWalletAddress fails, continue with Firestore check
        logger.debug('getUserWalletAddress check failed, falling back to Firestore', {
          address,
          userId,
          error: error instanceof Error ? error.message : String(error)
        }, 'FairSplitWithdrawalHandler');
      }
    }

    // Check if it's a user's in-app wallet using Firestore
    try {
      const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
      const { db } = await import('../../../config/firebase/firebase');
      
      // Check users collection (limit to 1 for performance)
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('wallet_address', '==', address), limit(1));
      const usersSnapshot = await getDocs(usersQuery);
      if (!usersSnapshot.empty) {
        return true;
      }

      // Check shared wallets
      const sharedWalletsRef = collection(db, 'sharedWallets');
      const sharedWalletsQuery = query(sharedWalletsRef, where('walletAddress', '==', address), limit(1));
      const sharedWalletsSnapshot = await getDocs(sharedWalletsQuery);
      if (!sharedWalletsSnapshot.empty) {
        return true;
      }

      // Check split wallets
      const splitWalletsRef = collection(db, 'splitWallets');
      const splitWalletsQuery = query(splitWalletsRef, where('walletAddress', '==', address), limit(1));
      const splitWalletsSnapshot = await getDocs(splitWalletsQuery);
      if (!splitWalletsSnapshot.empty) {
        return true;
      }
    } catch (firestoreError) {
      // If Firestore query fails, log but don't throw - we'll return false
      logger.warn('Firestore query failed for internal wallet check, assuming external', {
        address,
        userId,
        error: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
      }, 'FairSplitWithdrawalHandler');
    }

    return false;
  } catch (error) {
    logger.error('Error checking if address is internal wallet', { address, userId, error }, 'FairSplitWithdrawalHandler');
    // On error, assume it's external to be safe (will charge fee)
    return false;
  }
}

export async function handleFairSplitWithdrawal(
  params: any,
  getUserWalletAddress: (userId: string) => Promise<string | null>
): Promise<CentralizedTransactionResult> {
  const { userId, amount, splitWalletId, splitId, billId, memo, destinationAddress } = params;

  try {
    if (!splitWalletId || !userId || !amount || amount <= 0) {
      return {
        success: false,
        error: 'Invalid withdrawal parameters'
      };
    }

    // Get destination address if not provided
    const solanaAddressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    let finalDestinationAddress = destinationAddress;
    
    if (!finalDestinationAddress || !solanaAddressPattern.test(finalDestinationAddress)) {
      finalDestinationAddress = await getUserWalletAddress(userId);
      if (!finalDestinationAddress) {
        return {
          success: false,
          error: 'User wallet address not found. Please ensure your wallet is initialized.'
        };
      }
    }

    // Get split wallet
    const { SplitWalletService } = await import('../../../split');
    const walletResult = await SplitWalletService.getSplitWallet(splitWalletId);
    if (!walletResult.success || !walletResult.wallet) {
      return {
        success: false,
        error: walletResult.error || 'Split wallet not found'
      };
    }

    const wallet = walletResult.wallet;

    // Access control
    const isDegenSplit = !!wallet.degenLoser || !!wallet.degenWinner;
    
    if (isDegenSplit) {
      const loserInfo = wallet.degenLoser || wallet.degenWinner;
      const isLoser = loserInfo?.userId === userId;
      const isWinner = !isLoser && wallet.participants.some((p: any) => p.userId === userId);
      
      if (!isLoser && !isWinner) {
        return {
          success: false,
          error: 'You are not a participant in this degen split'
        };
      }
    } else {
      if (wallet.creatorId !== userId) {
        return {
          success: false,
          error: 'Only the split creator can withdraw funds'
        };
      }
    }

    // Verify on-chain balance
    const { SplitWalletPayments } = await import('../../../split/SplitWalletPayments');
    const balanceResult = await SplitWalletPayments.verifySplitWalletBalance(splitWalletId);
    
    if (!balanceResult.success) {
      return {
        success: false,
        error: `Failed to verify split wallet balance: ${balanceResult.error || 'Unknown error'}`
      };
    }
    
    const availableBalance = balanceResult.balance || 0;
    
    // ✅ FIX: Check if destination is internal WeSplit wallet (0% fee) or external (2% fee)
    // Pass userId and getUserWalletAddress for optimized check
    const isInternalWallet = await checkIfInternalWeSplitWallet(finalDestinationAddress, getUserWalletAddress, userId);
    const { FeeService } = await import('../../../../config/constants/feeConfig');
    
    let feeCalculation;
    let companyFee;
    let totalRequired;
    
    if (isInternalWallet) {
      // No fee for withdrawals to internal WeSplit wallets
      feeCalculation = FeeService.calculateCompanyFee(amount, 'settlement'); // 0% fee
      companyFee = 0;
      totalRequired = amount;
      logger.info('Split withdrawal to internal WeSplit wallet - no fees applied', {
        destinationAddress: finalDestinationAddress,
        amount,
        splitWalletId,
        userId
      }, 'FairSplitWithdrawalHandler');
    } else {
      // 2% fee for withdrawals to external wallets
      feeCalculation = FeeService.calculateCompanyFee(amount, 'withdraw');
      companyFee = feeCalculation.fee;
      totalRequired = feeCalculation.totalAmount; // amount + fee
      logger.info('Split withdrawal to external wallet - 2% fee applied', {
        destinationAddress: finalDestinationAddress,
        amount,
        companyFee,
        totalRequired,
        splitWalletId,
        userId
      }, 'FairSplitWithdrawalHandler');
    }
    
    if (totalRequired > availableBalance) {
      return {
        success: false,
        error: `Insufficient balance in split wallet. Available: ${availableBalance.toFixed(6)} USDC, Required: ${totalRequired.toFixed(6)} USDC (${amount.toFixed(6)}${companyFee > 0 ? ` + ${companyFee.toFixed(6)} fee` : ''})`
      };
    }

    // Get split wallet private key
    const privateKeyResult = await SplitWalletService.getSplitWalletPrivateKey(splitWalletId, userId);
    if (!privateKeyResult.success || !privateKeyResult.privateKey) {
      return {
        success: false,
        error: isDegenSplit 
          ? privateKeyResult.error || 'Failed to access split wallet private key. Please ensure you are a participant in this degen split.'
          : privateKeyResult.error || 'Failed to access split wallet private key. Please ensure you are the creator.'
      };
    }

    const privateKey = privateKeyResult.privateKey;

    // Execute blockchain transaction
    const { getConnectionWithFallback } = await import('../../connection/connectionFactory');
    const connectionInstance = await getConnectionWithFallback();

    const { PublicKey } = await import('@solana/web3.js');
    const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount } = await import('../../secureTokenUtils');
    const { USDC_CONFIG } = await import('../../../shared/walletConstants');

    // Create keypair from split wallet private key
    const { KeypairUtils } = await import('../../../shared/keypairUtils');
    const keypairResult = KeypairUtils.createKeypairFromSecretKey(privateKey);
    
    if (!keypairResult.success || !keypairResult.keypair) {
      return {
        success: false,
        error: keypairResult.error || 'Failed to create keypair from private key'
      };
    }
    
    const actualSplitWalletAddress = keypairResult.keypair.publicKey.toBase58();
    
    if (actualSplitWalletAddress !== wallet.walletAddress) {
      logger.warn('Split wallet address mismatch', {
        storedAddress: wallet.walletAddress,
        derivedAddress: actualSplitWalletAddress,
        splitWalletId,
        userId
      }, 'FairSplitWithdrawalHandler');
    }

    // Validate addresses
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Pattern.test(actualSplitWalletAddress) || !base58Pattern.test(finalDestinationAddress)) {
      return {
        success: false,
        error: 'Invalid address format for withdrawal'
      };
    }

    const fromPublicKey = new PublicKey(actualSplitWalletAddress);
    const toPublicKey = new PublicKey(finalDestinationAddress);
    const usdcMint = new PublicKey(USDC_CONFIG.mintAddress);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(usdcMint, fromPublicKey);
    const toTokenAccount = await getAssociatedTokenAddress(usdcMint, toPublicKey);

    // Check source balance (use 'confirmed' and 3 retries for consistency with shared wallet path)
    let sourceTokenAccount;
    let sourceBalance = 0;
    try {
      sourceTokenAccount = await getAccount(connectionInstance, fromTokenAccount, 'confirmed', 3);
      sourceBalance = Number(sourceTokenAccount.amount) / Math.pow(10, 6);
    } catch (sourceAccountError) {
      const errorMessage =
        sourceAccountError instanceof Error ? sourceAccountError.message : String(sourceAccountError);

      // If the token account truly doesn't exist, keep existing behavior.
      if (errorMessage.includes('Token account not found') || errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Split wallet has no USDC balance. Please fund the wallet first before withdrawing.'
        };
      }

      // Network / RPC failures: fall back to ConsolidatedTransactionService balance (same RPC via getConnectionWithFallback).
      try {
        const { consolidatedTransactionService } = await import('../ConsolidatedTransactionService');
        const fallbackBalance = await consolidatedTransactionService.getUsdcBalance(actualSplitWalletAddress);

        if (!fallbackBalance.success) {
          return {
            success: false,
            error:
              fallbackBalance.error ||
              'Network error while verifying split wallet balance. Please check your connection and try again.'
          };
        }

        sourceBalance = fallbackBalance.balance || 0;
        logger.warn('FairSplitWithdrawalHandler: used fallback ConsolidatedTransactionService balance after getAccount failure', {
          splitWalletId,
          actualSplitWalletAddress,
          sourceBalance,
          originalError: errorMessage,
        }, 'FairSplitWithdrawalHandler');
      } catch (fallbackError) {
        logger.error('FairSplitWithdrawalHandler: fallback balance check failed after getAccount error', {
          splitWalletId,
          actualSplitWalletAddress,
          originalError: errorMessage,
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        }, 'FairSplitWithdrawalHandler');

        return {
          success: false,
          error:
            'Network error while talking to Solana RPC. Please check your connection and try the withdrawal again.'
        };
      }
    }

    // Recalculate fee for on-chain balance check (use same logic as above)
    const onChainFeeCalculation = isInternalWallet 
      ? FeeService.calculateCompanyFee(amount, 'settlement') // 0% fee for internal
      : FeeService.calculateCompanyFee(amount, 'withdraw'); // 2% fee for external
    const onChainTotalRequired = onChainFeeCalculation.totalAmount;
    
    if (sourceBalance < onChainTotalRequired) {
      return {
        success: false,
        error: `Insufficient balance. Available: ${sourceBalance.toFixed(6)} USDC, Required: ${onChainTotalRequired.toFixed(6)} USDC (${amount.toFixed(6)}${onChainFeeCalculation.fee > 0 ? ` + ${onChainFeeCalculation.fee.toFixed(6)} fee` : ''})`
      };
    }

    // Create transaction
    const { Transaction } = await import('@solana/web3.js');
    const transaction = new Transaction();

    // Check if destination token account exists
    try {
      await getAccount(connectionInstance, toTokenAccount);
    } catch {
      const { COMPANY_WALLET_CONFIG } = await import('../../../../config/constants/feeConfig');
      const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
      const companyPublicKey = new PublicKey(companyWalletAddress);

      transaction.add(
        createAssociatedTokenAccountInstruction(
          companyPublicKey,
          toTokenAccount,
          toPublicKey,
          usdcMint
        )
      );
    }

    // ✅ FIX: Calculate transfer amounts (USDC has 6 decimals)
    // Recipient gets full amount (fee is additional, not deducted)
    const recipientAmount = feeCalculation.recipientAmount;
    const recipientAmountRaw = Math.floor(recipientAmount * Math.pow(10, 6));
    const companyFeeAmount = Math.floor(companyFee * Math.pow(10, 6) + 0.5);

    // Get company wallet address and public key (needed for fee transfer)
    const { COMPANY_WALLET_CONFIG } = await import('../../../../config/constants/feeConfig');
    const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
    const companyPublicKey = new PublicKey(companyWalletAddress);

    // ✅ FIX: Add company fee transfer instruction (if fee > 0)
    if (companyFee > 0) {
      const companyTokenAccount = await getAssociatedTokenAddress(usdcMint, companyPublicKey);
      
      // Check if company token account exists, create if needed
      try {
        await getAccount(connectionInstance, companyTokenAccount);
        logger.debug('Company USDC token account exists', {
          companyTokenAccount: companyTokenAccount.toBase58()
        }, 'FairSplitWithdrawalHandler');
      } catch {
        // Create associated token account if it doesn't exist
        logger.debug('Company USDC token account does not exist, will create it', {
          companyTokenAccount: companyTokenAccount.toBase58(),
          note: 'This is expected if company wallet has never received USDC fees'
        }, 'FairSplitWithdrawalHandler');
        
        transaction.add(
          createAssociatedTokenAccountInstruction(
            companyPublicKey,
            companyTokenAccount,
            companyPublicKey,
            usdcMint
          )
        );
      }
      
      // Add company fee transfer instruction
      const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          companyTokenAccount,
          fromPublicKey,
          companyFeeAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      
      logger.info('Added company fee transfer instruction for split withdrawal', {
        companyFee,
        companyFeeAmount,
        recipientAmount,
        totalAmount: amount,
        splitWalletId,
        userId
      }, 'FairSplitWithdrawalHandler');
    }

    // Add main transfer instruction (recipient gets full amount, fee is separate transfer)
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        recipientAmountRaw
      )
    );

    // Sign and send transaction
    const fromKeypair = keypairResult.keypair;

    // Company wallet must be the fee payer (already set above for fee transfer)
    transaction.feePayer = companyPublicKey;

    // Use shared blockhash retry (same as shared wallet path)
    let latestBlockhash: { blockhash: string; lastValidBlockHeight: number };
    try {
      const { getLatestBlockhashWithRetry } = await import('../../../shared/blockhashUtils');
      latestBlockhash = await getLatestBlockhashWithRetry(connectionInstance);
    } catch (blockhashError) {
      logger.error('Fair split withdrawal error', {
        error: blockhashError instanceof Error ? blockhashError.message : String(blockhashError),
        splitWalletId,
        userId,
      }, 'FairSplitWithdrawalHandler');
      return {
        success: false,
        error: 'Network error while contacting Solana. Please check your connection and try again.',
      };
    }
    transaction.recentBlockhash = latestBlockhash.blockhash;

    // Sign transaction with split wallet keypair
    transaction.sign(fromKeypair);

    // Simulate transaction
    try {
      const simulationResult = await connectionInstance.simulateTransaction(transaction);
      if (simulationResult.value.err) {
        const errorMessage = JSON.stringify(simulationResult.value.err);
        if (errorMessage.includes('Attempt to debit an account but found no record of a prior credit')) {
          return {
            success: false,
            error: `Split wallet has insufficient USDC balance. Available: ${sourceBalance.toFixed(6)} USDC, Requested: ${amount.toFixed(6)} USDC. Please fund the wallet first.`
          };
        }
        return {
          success: false,
          error: `Transaction simulation failed: ${errorMessage}`
        };
      }
    } catch (simulationError) {
      const errorMessage = simulationError instanceof Error ? simulationError.message : String(simulationError);
      if (errorMessage.includes('no record of a prior credit') || errorMessage.includes('Attempt to debit')) {
        return {
          success: false,
          error: `Split wallet has insufficient USDC balance. Available: ${sourceBalance.toFixed(6)} USDC, Requested: ${amount.toFixed(6)} USDC. Please fund the wallet first.`
        };
      }
    }

    // Convert to VersionedTransaction
    const solanaWeb3 = await import('@solana/web3.js');
    const { VersionedTransaction: VersionedTransactionType } = solanaWeb3;
    const versionedTransactionForSigning = new VersionedTransactionType(transaction.compileMessage());

    // Sign with split wallet keypair
    versionedTransactionForSigning.sign([fromKeypair]);

    // Serialize
    const serializedTransaction = versionedTransactionForSigning.serialize();
    
    // Send to Firebase Functions for company wallet signature
    const { signTransaction: signTransactionWithCompany, submitTransaction: submitTransactionToNetwork } = await import('../transactionSigningService');
    
    let signature: string;
    try {
      const signedTransaction = await signTransactionWithCompany(serializedTransaction);
      const submitResult = await submitTransactionToNetwork(signedTransaction);
      signature = submitResult.signature;
    } catch (signingError) {
      return {
        success: false,
        error: signingError instanceof Error ? signingError.message : 'Failed to sign or submit transaction'
      };
    }

    // Confirm transaction
    const confirmation = await connectionInstance.confirmTransaction(signature, 'confirmed');
    if (confirmation.value.err) {
      return {
        success: false,
        error: 'Transaction was submitted but confirmation failed'
      };
    }

    logger.info('Fair split withdrawal completed successfully', {
      splitWalletId,
      userId,
      amount,
      signature
    }, 'FairSplitWithdrawalHandler');

    return {
      success: true,
      transactionSignature: signature,
      transactionId: signature,
      txId: signature,
      fee: companyFee,
      netAmount: recipientAmount,
      blockchainFee: 0,
      message: `Successfully withdrew ${amount.toFixed(6)} USDC from fair split${companyFee > 0 ? ` (${companyFee.toFixed(6)} USDC fee applied)` : ''}`
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError =
      rawMessage.includes('Network request failed') ||
      rawMessage.includes('get recent blockhash') ||
      rawMessage.includes('failed to get recent blockhash') ||
      rawMessage.includes('fetch failed');

    logger.error('Fair split withdrawal error', {
      error: rawMessage,
      splitWalletId,
      userId
    }, 'FairSplitWithdrawalHandler');

    return {
      success: false,
      error: isNetworkError
        ? 'Network error. Please check your connection and try again.'
        : rawMessage || 'Fair split withdrawal failed'
    };
  }
}

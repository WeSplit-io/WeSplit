/**
 * Fair Split Withdrawal Handler
 * Extracted from ConsolidatedTransactionService to reduce bundle size
 */

import { logger } from '../../../analytics/loggingService';
import type { CentralizedTransactionResult } from '../../../transactions/types';

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
    
    if (amount > availableBalance) {
      return {
        success: false,
        error: `Insufficient balance in split wallet. Available: ${availableBalance.toFixed(6)} USDC, Requested: ${amount.toFixed(6)} USDC`
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
    const { createSolanaConnection } = await import('../../connection/connectionFactory');
    const connectionInstance = await createSolanaConnection();

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

    // Check source balance
    let sourceTokenAccount;
    let sourceBalance = 0;
    try {
      sourceTokenAccount = await getAccount(connectionInstance, fromTokenAccount);
      sourceBalance = Number(sourceTokenAccount.amount) / Math.pow(10, 6);
    } catch (sourceAccountError) {
      const errorMessage = sourceAccountError instanceof Error ? sourceAccountError.message : String(sourceAccountError);
      if (errorMessage.includes('Token account not found') || errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Split wallet has no USDC balance. Please fund the wallet first before withdrawing.'
        };
      }
      throw sourceAccountError;
    }

    if (sourceBalance < amount) {
      return {
        success: false,
        error: `Insufficient balance. Available: ${sourceBalance.toFixed(6)} USDC, Requested: ${amount.toFixed(6)} USDC`
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

    // Calculate amount (USDC has 6 decimals)
    const transferAmount = Math.floor(amount * Math.pow(10, 6));

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        transferAmount
      )
    );

    // Sign and send transaction
    const fromKeypair = keypairResult.keypair;

    // Company wallet must be the fee payer
    const { COMPANY_WALLET_CONFIG } = await import('../../../../config/constants/feeConfig');
    const companyWalletAddress = await COMPANY_WALLET_CONFIG.getAddress();
    const companyPublicKey = new PublicKey(companyWalletAddress);
    
    transaction.feePayer = companyPublicKey;
    const latestBlockhash = await connectionInstance.getLatestBlockhash();
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
      fee: 0,
      netAmount: amount,
      blockchainFee: 0,
      message: `Successfully withdrew ${amount.toFixed(6)} USDC from fair split`
    };
  } catch (error) {
    logger.error('Fair split withdrawal error', {
      error: error instanceof Error ? error.message : String(error),
      splitWalletId,
      userId
    }, 'FairSplitWithdrawalHandler');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fair split withdrawal failed'
    };
  }
}

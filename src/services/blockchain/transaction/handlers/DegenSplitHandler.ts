/**
 * Degen Split Transaction Handler
 * Extracted from ConsolidatedTransactionService to reduce bundle size
 */

import { logger } from '../../../analytics/loggingService';
import type { CentralizedTransactionResult, CentralizedTransactionParams } from '../../../transactions/types';

export async function handleDegenSplitLock(
  params: any,
  sendUSDCTransaction: (params: any) => Promise<any>
): Promise<CentralizedTransactionResult> {
  const { userId, amount, splitWalletId, splitId, billId, memo } = params;

  if (!splitWalletId) {
    return {
      success: false,
      error: 'Split wallet ID is required'
    };
  }

  try {
    const { SplitWalletService } = await import('../../../split');
    // ✅ OPTIMIZATION: Get wallet once and reuse throughout handler
    const walletResult = await SplitWalletService.getSplitWallet(splitWalletId);
    
    if (!walletResult.success || !walletResult.wallet) {
      logger.error('Failed to get split wallet', {
        splitWalletId,
        error: walletResult.error
      }, 'DegenSplitHandler');
      return {
        success: false,
        error: walletResult.error || 'Split wallet not found'
      };
    }

    const wallet = walletResult.wallet; // Store for reuse
    const splitWalletAddress = wallet.walletAddress;
    if (!splitWalletAddress) {
      logger.error('Split wallet has no address', {
        splitWalletId,
        wallet: walletResult.wallet
      }, 'DegenSplitHandler');
      return {
        success: false,
        error: 'Split wallet address not found'
      };
    }

    // Validate address format
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Pattern.test(splitWalletAddress)) {
      logger.error('Invalid split wallet address format', {
        splitWalletId,
        address: splitWalletAddress,
        addressLength: splitWalletAddress.length
      }, 'DegenSplitHandler');
      return {
        success: false,
        error: `Invalid split wallet address format: expected base58-encoded Solana address (32-44 characters), got ${splitWalletAddress.length} characters`
      };
    }

    // Validate Solana address
    try {
      const { PublicKey } = await import('@solana/web3.js');
      new PublicKey(splitWalletAddress);
    } catch (addressError) {
      logger.error('Invalid split wallet address', {
        splitWalletId,
        address: splitWalletAddress,
        error: addressError instanceof Error ? addressError.message : String(addressError)
      }, 'DegenSplitHandler');
      return {
        success: false,
        error: `Invalid split wallet address: ${addressError instanceof Error ? addressError.message : 'Invalid format'}`
      };
    }

    logger.info('Sending degen split lock', {
      splitWalletId,
      splitWalletAddress,
      amount,
      userId
    }, 'DegenSplitHandler');

    const result = await sendUSDCTransaction({
      to: splitWalletAddress,
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Degen split fund locking - ${splitId}`,
      priority: 'medium',
      transactionType: 'split_payment'
    });

    if (result.success) {
      // Update split wallet balance and participant status
      // ✅ OPTIMIZATION: Reuse wallet data from above instead of fetching again
      try {
        const { SplitWalletAtomicUpdates } = await import('../../../split/SplitWalletAtomicUpdates');
        
        // ✅ OPTIMIZATION: Use wallet already fetched above
        if (wallet) {
          const roundedAmount = Math.floor(amount * Math.pow(10, 6)) / Math.pow(10, 6);
          
          const participant = wallet.participants.find((p: any) => p.userId === userId);
          if (participant) {
            // CRITICAL FIX: Accumulate amountPaid instead of overwriting
            const newAmountPaid = Math.floor(((participant.amountPaid || 0) + roundedAmount) * Math.pow(10, 6)) / Math.pow(10, 6);
            // Validate that amountPaid doesn't exceed amountOwed
            const finalAmountPaid = Math.min(newAmountPaid, participant.amountOwed);
            // Only set status to 'locked' if fully paid
            const newStatus: 'pending' | 'locked' = finalAmountPaid >= participant.amountOwed ? 'locked' as const : participant.status;
            
            const updatedParticipants = wallet.participants.map((p: any) => 
              p.userId === userId 
                ? { 
                    ...p,
                    status: newStatus,
                    amountPaid: finalAmountPaid,
                    transactionSignature: result.signature,
                    paidAt: newStatus === 'locked' ? new Date().toISOString() : p.paidAt
                  }
                : p
            );
            
            const updatedParticipant = updatedParticipants.find((p: any) => p.userId === userId);
            if (updatedParticipant) {
              const firebaseDocId = wallet.firebaseDocId || splitWalletId;
              
              // CRITICAL: Check result of status update - fail if it doesn't succeed
              const updateResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
                firebaseDocId,
                wallet.billId,
                updatedParticipants,
                updatedParticipant,
                userId,
                true // isDegenSplit = true
              );

              if (!updateResult.success) {
                logger.error('Failed to update participant payment status', {
                  splitWalletId,
                  userId,
                  error: updateResult.error
                }, 'DegenSplitHandler');
                
                // Retry once with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 500));
                const retryResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
                  firebaseDocId,
                  wallet.billId,
                  updatedParticipants,
                  updatedParticipant,
                  userId,
                  true
                );

                if (!retryResult.success) {
                  logger.error('Failed to update participant payment status after retry', {
                    splitWalletId,
                    userId,
                    error: retryResult.error
                  }, 'DegenSplitHandler');
                  // Don't fail the transaction - on-chain success is authoritative
                  // But log the error so we know the DB update failed
                } else {
                  logger.info('Participant payment status updated successfully after retry', {
                    splitWalletId,
                    userId,
                    amountPaid: finalAmountPaid,
                    status: newStatus
                  }, 'DegenSplitHandler');
                }
              } else {
                logger.info('Successfully updated participant payment status', {
                  splitWalletId,
                  userId,
                  amountPaid: finalAmountPaid,
                  status: newStatus
                }, 'DegenSplitHandler');
              }

              // ✅ CRITICAL: Invalidate cache to ensure UI shows fresh data
              const { SplitWalletCache } = await import('../../../split/SplitWalletCache');
              SplitWalletCache.invalidate(splitWalletId);
              SplitWalletCache.invalidate(wallet.billId);
            }
          }
        }
      } catch (updateError) {
        logger.error('Error updating split wallet after degen lock', {
          splitWalletId,
          userId,
          error: updateError instanceof Error ? updateError.message : String(updateError)
        }, 'DegenSplitHandler');
        // Don't fail the transaction - on-chain success is authoritative
      }
      
      return {
        success: true,
        transactionSignature: result.signature,
        transactionId: result.txId,
        txId: result.txId,
        message: `Successfully locked ${amount.toFixed(6)} USDC in degen split`
      };
    } else {
      return {
        success: false,
        error: result.error || 'Degen split lock failed'
      };
    }
  } catch (error) {
    logger.error('Error in degen split lock', {
      splitWalletId,
      error: error instanceof Error ? error.message : String(error)
    }, 'DegenSplitHandler');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process degen split lock'
    };
  }
}

/**
 * Fair Split Transaction Handler
 * Extracted from ConsolidatedTransactionService to reduce bundle size
 */

import { logger } from '../../../analytics/loggingService';
import type { CentralizedTransactionResult } from '../../../transactions/types';

export async function handleFairSplitContribution(
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
      }, 'FairSplitHandler');
      return {
        success: false,
        error: walletResult.error || 'Split wallet not found'
      };
    }

    const wallet = walletResult.wallet; // Store for reuse
    const splitWalletAddress = wallet.walletAddress;
    if (!splitWalletAddress) {
      return {
        success: false,
        error: 'Split wallet address not found'
      };
    }

    // Validate address format
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Pattern.test(splitWalletAddress)) {
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
      return {
        success: false,
        error: `Invalid split wallet address: ${addressError instanceof Error ? addressError.message : 'Invalid format'}`
      };
    }

    logger.info('Sending fair split contribution', {
      splitWalletId,
      splitWalletAddress,
      amount,
      userId
    }, 'FairSplitHandler');

    const result = await sendUSDCTransaction({
      to: splitWalletAddress,
      amount: amount,
      currency: 'USDC',
      userId: userId,
      memo: memo || `Fair split contribution - ${splitId}`,
      priority: 'medium',
      transactionType: 'split_payment'
    });

    if (result.success) {
      // Update split wallet balance and participant status
      // CRITICAL: Status update must succeed or transaction should be considered failed
      // ✅ OPTIMIZATION: Reuse wallet data from above instead of fetching again
      try {
        const { SplitWalletAtomicUpdates } = await import('../../../split/SplitWalletAtomicUpdates');
        const { SplitWalletCache } = await import('../../../split/SplitWalletCache');
        
        // ✅ OPTIMIZATION: Use wallet already fetched above, only refresh if needed
        // The wallet data is still valid since transaction just completed
        // If we need fresh data, we can invalidate cache and refetch, but usually not needed
          const roundedAmount = Math.floor(amount * Math.pow(10, 6)) / Math.pow(10, 6);
          
          const participant = wallet.participants.find((p: any) => p.userId === userId);
        if (!participant) {
          logger.error('Participant not found in split wallet', {
            splitWalletId,
            userId
          }, 'FairSplitHandler');
          return {
            success: false,
            error: 'Transaction succeeded but participant not found. Please refresh and try again.',
            transactionSignature: result.signature,
            transactionId: result.txId,
            txId: result.txId
          };
        }

        // CRITICAL FIX: Accumulate amountPaid instead of overwriting
        const newAmountPaid = Math.floor(((participant.amountPaid || 0) + roundedAmount) * Math.pow(10, 6)) / Math.pow(10, 6);
        // Validate that amountPaid doesn't exceed amountOwed
        const finalAmountPaid = Math.min(newAmountPaid, participant.amountOwed);
        // Only set status to 'paid' if fully paid
        const newStatus: 'pending' | 'paid' = finalAmountPaid >= participant.amountOwed ? 'paid' as const : participant.status;
        
            const updatedParticipants = wallet.participants.map((p: any) => 
              p.userId === userId 
                ? { 
                    ...p,
                status: newStatus,
                amountPaid: finalAmountPaid,
                    transactionSignature: result.signature,
                paidAt: newStatus === 'paid' ? new Date().toISOString() : p.paidAt
                  }
                : p
            );
            
            const updatedParticipant = updatedParticipants.find((p: any) => p.userId === userId);
        if (!updatedParticipant) {
          logger.error('Failed to find updated participant', {
            splitWalletId,
            userId
          }, 'FairSplitHandler');
          return {
            success: false,
            error: 'Transaction succeeded but failed to update participant. Please refresh and try again.',
            transactionSignature: result.signature,
            transactionId: result.txId,
            txId: result.txId
          };
        }

              const firebaseDocId = wallet.firebaseDocId || splitWalletId;
              
        // CRITICAL: Check result of status update - fail if it doesn't succeed
        const updateResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
                firebaseDocId,
                wallet.billId,
                updatedParticipants,
                updatedParticipant,
                userId,
                false // isDegenSplit = false
              );

        if (!updateResult.success) {
          logger.error('Failed to update participant payment status', {
            splitWalletId,
            userId,
            error: updateResult.error
          }, 'FairSplitHandler');
          
          // Retry once with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500));
          const retryResult = await SplitWalletAtomicUpdates.updateParticipantPayment(
            firebaseDocId,
            wallet.billId,
            updatedParticipants,
            updatedParticipant,
            userId,
            false
          );

          if (!retryResult.success) {
            return {
              success: false,
              error: `Transaction succeeded but status update failed: ${retryResult.error || 'Unknown error'}. Please refresh the app.`,
              transactionSignature: result.signature,
              transactionId: result.txId,
              txId: result.txId
            };
          }
        }

        // Invalidate cache to ensure fresh data
        SplitWalletCache.invalidate(splitWalletId);
        SplitWalletCache.invalidate(wallet.billId);

        logger.info('Successfully updated participant payment status', {
          splitWalletId,
          userId,
          amountPaid: finalAmountPaid,
          status: newStatus
        }, 'FairSplitHandler');
        
        // ✅ MEMORY OPTIMIZATION: Variables will go out of scope naturally after function completes
        // This helps prevent memory buildup when doing multiple transactions in sequence
        
      } catch (updateError) {
        logger.error('Error updating split wallet after contribution', {
          splitWalletId,
          userId,
          error: updateError instanceof Error ? updateError.message : String(updateError),
          stack: updateError instanceof Error ? updateError.stack : undefined
        }, 'FairSplitHandler');
        
        return {
          success: false,
          error: `Transaction succeeded but status update failed: ${updateError instanceof Error ? updateError.message : 'Unknown error'}. Please refresh the app.`,
          transactionSignature: result.signature,
          transactionId: result.txId,
          txId: result.txId
        };
      }
      
      return {
        success: true,
        transactionSignature: result.signature,
        transactionId: result.txId,
        txId: result.txId,
        message: `Successfully contributed ${amount.toFixed(6)} USDC to fair split`
      };
    } else {
      return {
        success: false,
        error: result.error || 'Fair split contribution failed'
      };
    }
  } catch (error) {
    logger.error('Error in fair split contribution', {
      splitWalletId,
      error: error instanceof Error ? error.message : String(error)
    }, 'FairSplitHandler');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process fair split contribution'
    };
  }
}

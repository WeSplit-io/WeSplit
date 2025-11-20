/**
 * Split Wallet Services - Unified Interface
 * Provides a single entry point for all split wallet operations
 * Replaces the monolithic SplitWalletService with modular services
 */

// Export all interfaces
export type {
  SplitWallet,
  SplitWalletParticipant,
  SplitWalletResult,
  PaymentResult,
  DegenRouletteAuditEntry
} from './types';

// Export atomic updates service
export { SplitWalletAtomicUpdates } from './SplitWalletAtomicUpdates';
export type { AtomicUpdateResult } from './SplitWalletAtomicUpdates';

// Import logger for error handling
import { logger } from '../analytics/loggingService';

// Import modules using dynamic imports to avoid circular dependencies
let SplitWalletCreation: any;
let SplitWalletManagement: any;
let SplitWalletPayments: any;
let SplitWalletSecurity: any;
let SplitWalletQueries: any;
let SplitWalletCleanup: any;
let SplitRouletteService: any;

// Lazy load modules
const loadModules = async () => {
  if (!SplitWalletCreation) {
    SplitWalletCreation = (await import('./SplitWalletCreation')).SplitWalletCreation;
  }
  if (!SplitWalletManagement) {
    SplitWalletManagement = (await import('./SplitWalletManagement')).SplitWalletManagement;
  }
  if (!SplitWalletPayments) {
    SplitWalletPayments = (await import('./SplitWalletPayments')).SplitWalletPayments;
  }
  if (!SplitWalletSecurity) {
    SplitWalletSecurity = (await import('./SplitWalletSecurity')).SplitWalletSecurity;
  }
  if (!SplitWalletQueries) {
    SplitWalletQueries = (await import('./SplitWalletQueries')).SplitWalletQueries;
  }
  if (!SplitWalletCleanup) {
    SplitWalletCleanup = (await import('./SplitWalletCleanup')).SplitWalletCleanup;
  }
  if (!SplitRouletteService) {
    SplitRouletteService = (await import('./SplitRouletteService')).SplitRouletteService;
  }
};

/**
 * Unified SplitWalletService class that delegates to the appropriate module
 * This maintains backward compatibility while using the new modular structure
 */
export class SplitWalletService {
  // Creation methods
  static roundUsdcAmount(amount: number) {
    // These are synchronous utility methods, so we can call them directly
    // Use inline implementation to avoid import issues
    return Math.round(amount * 1000000) / 1000000;
  }

  static async createDegenSplitWallet(
    billId: string,
    creatorId: string,
    creatorName: string,
    totalAmount: number,
    currency: string,
    participants: { userId: string; name: string; walletAddress: string; amountOwed: number }[]
  ) {
    await loadModules();
    return SplitWalletCreation.createDegenSplitWallet(billId, creatorId, creatorName, totalAmount, currency, participants);
  }

  static isValidWalletAddress(address: string) {
    // This is a synchronous utility method
    return address && address.length > 0 && address.startsWith('1') || address.startsWith('9');
  }

  static async ensureUserWalletInitialized(userId: string) {
    await loadModules();
    return SplitWalletCreation.ensureUserWalletInitialized(userId);
  }

  static async checkUsdcBalance(userId: string) {
    await loadModules();
    return SplitWalletCreation.checkUsdcBalance(userId);
  }

  static async ensureUsdcTokenAccount(userId: string) {
    await loadModules();
    return SplitWalletCreation.ensureUsdcTokenAccount(userId);
  }

  static async testSplitWalletCreation() {
    await loadModules();
    return SplitWalletCreation.testSplitWalletCreation();
  }

  static async createSplitWallet(billId: string, creatorId: string, totalAmount: number, currency?: string, participants?: any[]) {
    await loadModules();
    return SplitWalletCreation.createSplitWallet(billId, creatorId, totalAmount, currency, participants || []);
  }

  static async forceResetSplitWallet(splitWalletId: string) {
    await loadModules();
    return SplitWalletCreation.forceResetSplitWallet(splitWalletId);
  }

  // Management methods
  static async updateSplitWalletAmount(splitWalletId: string, newTotalAmount: number, currency?: string) {
    await loadModules();
    return SplitWalletManagement.updateSplitWalletAmount(splitWalletId, newTotalAmount, currency);
  }

  static async updateSplitWallet(splitWalletId: string, updates: any) {
    await loadModules();
    return SplitWalletManagement.updateSplitWallet(splitWalletId, updates);
  }

  static async updateSplitWalletParticipants(splitWalletId: string, participants: any[]) {
    await loadModules();
    return SplitWalletManagement.updateSplitWalletParticipants(splitWalletId, participants);
  }

  static async lockSplitWallet(splitWalletId: string) {
    await loadModules();
    return SplitWalletManagement.lockSplitWallet(splitWalletId);
  }

  static async debugUsdcBalance(walletAddress: string) {
    await loadModules();
    return SplitWalletManagement.debugUsdcBalance(walletAddress);
  }

  static async repairSplitWalletData(splitWalletId: string) {
    await loadModules();
    return SplitWalletManagement.repairSplitWalletData(splitWalletId);
  }

  static async repairSplitWalletSynchronization(splitWalletId: string, creatorId: string) {
    await loadModules();
    return SplitWalletManagement.repairSplitWalletSynchronization(splitWalletId, creatorId);
  }

  static async fixSplitWalletDataConsistency(splitWalletId: string) {
    await loadModules();
    const { fixSplitWalletDataConsistency } = await import('./SplitWalletManagement');
    return fixSplitWalletDataConsistency(splitWalletId);
  }

  // Payment methods
  static async processParticipantPayment(splitWalletId: string, participantId: string, amount: number, transactionSignature?: string) {
    await loadModules();
    return SplitWalletPayments.processParticipantPayment(splitWalletId, participantId, amount, transactionSignature);
  }

  static async sendToCastAccount(splitWalletId: string, castAccountAddress: string, description?: string) {
    await loadModules();
    return SplitWalletPayments.sendToCastAccount(splitWalletId, castAccountAddress, description);
  }

  static async transferToUserWallet(splitWalletId: string, userId: string, amount: number) {
    await loadModules();
    return SplitWalletPayments.transferToUserWallet(splitWalletId, userId, amount);
  }

  static async extractFairSplitFunds(splitWalletId: string, recipientAddress: string, creatorId: string, description?: string) {
    await loadModules();
    return SplitWalletPayments.extractFairSplitFunds(splitWalletId, recipientAddress, creatorId, description);
  }

  static async processDegenWinnerPayout(splitWalletId: string, winnerUserId: string, winnerAddress: string, totalAmount: number, description?: string) {
    await loadModules();
    return SplitWalletPayments.processDegenWinnerPayout(splitWalletId, winnerUserId, winnerAddress, totalAmount, description);
  }

  static async processDegenLoserPayment(splitWalletId: string, loserUserId: string, paymentMethod: any, totalAmount: number, description?: string, cardId?: string) {
    await loadModules();
    // CRITICAL: All participants are losers, funds go to external cards
    return SplitWalletPayments.processDegenLoserPayment(splitWalletId, loserUserId, totalAmount, description, cardId);
  }

  static async payParticipantShare(splitWalletId: string, participantId: string, amount: number) {
    await loadModules();
    return SplitWalletPayments.payParticipantShareNEW(splitWalletId, participantId, amount);
  }

  static async processDegenFundLocking(splitWalletId: string, participantId: string, amount: number, transactionSignature?: string) {
    await loadModules();
    return SplitWalletPayments.processDegenFundLocking(splitWalletId, participantId, amount, transactionSignature);
  }

  static async executeDegenRoulette(splitWalletId: string, requestedByUserId?: string) {
    await loadModules();
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { getFirebaseFunctionsClient } = await import('../firebase/functionsClient');
      const functions = getFirebaseFunctionsClient();
      const callable = httpsCallable(functions, 'executeDegenRoulette', {
        timeout: 30000,
      });
      const response = await callable({
        splitWalletId,
        requestedByUserId,
      });
      return response.data;
    } catch (error) {
      logger.warn('executeDegenRoulette remote call failed, falling back to local implementation', {
        error: error instanceof Error ? error.message : String(error),
      }, 'SplitWalletService');
    }

    return SplitRouletteService.executeDegenRoulette(splitWalletId, requestedByUserId);
  }

  static async verifySplitWalletBalance(splitWalletId: string) {
    await loadModules();
    return SplitWalletPayments.verifySplitWalletBalance(splitWalletId);
  }

  static async reconcilePendingTransactions(splitWalletId: string) {
    await loadModules();
    return SplitWalletPayments.reconcilePendingTransactions(splitWalletId);
  }

  // Security methods
  static async storeSplitWalletPrivateKey(splitWalletId: string, creatorId: string, privateKey: string) {
    await loadModules();
    return SplitWalletSecurity.storeSplitWalletPrivateKey(splitWalletId, creatorId, privateKey);
  }

  static async hasLocalPrivateKey(splitWalletId: string, creatorId: string) {
    await loadModules();
    return SplitWalletSecurity.hasLocalPrivateKey(splitWalletId, creatorId);
  }

  static async getSplitWalletPrivateKey(splitWalletId: string, requesterId: string) {
    await loadModules();
    return SplitWalletSecurity.getSplitWalletPrivateKey(splitWalletId, requesterId);
  }

  static async preFetchPrivateKeyPayload(splitWalletId: string) {
    await loadModules();
    return SplitWalletSecurity.preFetchPrivateKeyPayload(splitWalletId);
  }

  static async deleteSplitWalletPrivateKey(splitWalletId: string, creatorId: string) {
    await loadModules();
    return SplitWalletSecurity.deleteSplitWalletPrivateKey(splitWalletId, creatorId);
  }

  // Degen Split methods for shared private key access
  static async storeSplitWalletPrivateKeyForAllParticipants(
    splitWalletId: string,
    participants: { userId: string; name: string }[],
    privateKey: string
  ) {
    await loadModules();
    return SplitWalletSecurity.storeSplitWalletPrivateKeyForAllParticipants(splitWalletId, participants, privateKey);
  }

  static async deleteSplitWalletPrivateKeyForAllParticipants(
    splitWalletId: string,
    participants: { userId: string; name: string }[]
  ) {
    await loadModules();
    return SplitWalletSecurity.deleteSplitWalletPrivateKeyForAllParticipants(splitWalletId, participants);
  }

  static async syncSharedPrivateKeyParticipants(
    splitWalletId: string,
    participants: { userId: string; name?: string }[]
  ) {
    await loadModules();
    return SplitWalletSecurity.syncSharedPrivateKeyParticipants(splitWalletId, participants);
  }

  static async listStoredPrivateKeys(creatorId: string) {
    await loadModules();
    return SplitWalletSecurity.listStoredPrivateKeys(creatorId);
  }

  static async cleanupOldPrivateKeys(olderThanDays?: number) {
    await loadModules();
    return SplitWalletSecurity.cleanupOldPrivateKeys(olderThanDays);
  }

  // Query methods
  static async getSplitWallet(splitWalletId: string) {
    await loadModules();
    return SplitWalletQueries.getSplitWallet(splitWalletId);
  }

  static async getSplitWalletByBillId(billId: string) {
    await loadModules();
    return SplitWalletQueries.getSplitWalletByBillId(billId);
  }

  static async lockParticipantAmount(splitWalletId: string, participantId: string, amount: number) {
    await loadModules();
    return SplitWalletQueries.lockParticipantAmount(splitWalletId, participantId, amount);
  }

  static async getSplitWalletsByCreator(creatorId: string) {
    await loadModules();
    return SplitWalletQueries.getSplitWalletsByCreator(creatorId);
  }

  static async getSplitWalletsByStatus(status: any) {
    await loadModules();
    return SplitWalletQueries.getSplitWalletsByStatus(status);
  }

  static async splitWalletExists(splitWalletId: string) {
    await loadModules();
    return SplitWalletQueries.splitWalletExists(splitWalletId);
  }

  static async getSplitWalletCompletion(splitWalletId: string) {
    await loadModules();
    return SplitWalletQueries.getSplitWalletCompletion(splitWalletId);
  }

  static async getParticipantPaymentStatus(splitWalletId: string, participantId: string) {
    await loadModules();
    return SplitWalletQueries.getParticipantPaymentStatus(splitWalletId, participantId);
  }

  // Cleanup methods
  static async cancelSplitWallet(splitWalletId: string, reason?: string) {
    await loadModules();
    return SplitWalletCleanup.cancelSplitWallet(splitWalletId, reason);
  }

  static async completeSplitWallet(splitWalletId: string, merchantAddress?: string) {
    await loadModules();
    return SplitWalletCleanup.completeSplitWallet(splitWalletId, merchantAddress);
  }

  static async burnSplitWalletAndCleanup(splitWalletId: string, creatorId: string, reason?: string) {
    await loadModules();
    return SplitWalletCleanup.burnSplitWalletAndCleanup(splitWalletId, creatorId, reason);
  }

  // Security methods
  static async getFairSplitPrivateKey(splitWalletId: string, creatorId: string) {
    await loadModules();
    return SplitWalletSecurity.getFairSplitPrivateKey(splitWalletId, creatorId);
  }

  static async hasFairSplitPrivateKey(splitWalletId: string, creatorId: string) {
    await loadModules();
    return SplitWalletSecurity.hasFairSplitPrivateKey(splitWalletId, creatorId);
  }

  static async isSplitWalletCreator(splitWalletId: string, userId: string) {
    await loadModules();
    return SplitWalletSecurity.isSplitWalletCreator(splitWalletId, userId);
  }
}

// Export the new synchronizer
export { SplitDataSynchronizer } from './SplitDataSynchronizer';

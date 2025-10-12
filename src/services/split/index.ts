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
  PaymentResult
} from './types';

// Import utility functions - using inline implementation to avoid import issues

// Import modules using dynamic imports to avoid circular dependencies
let SplitWalletCreation: any;
let SplitWalletManagement: any;
let SplitWalletPayments: any;
let SplitWalletSecurity: any;
let SplitWalletQueries: any;
let SplitWalletCleanup: any;

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

  static async processDegenLoserPayment(splitWalletId: string, loserUserId: string, paymentMethod: any, totalAmount: number, description?: string) {
    await loadModules();
    return SplitWalletPayments.processDegenLoserPayment(splitWalletId, loserUserId, paymentMethod, totalAmount, description);
  }

  static async payParticipantShare(splitWalletId: string, participantId: string, amount: number) {
    await loadModules();
    return SplitWalletPayments.payParticipantShare(splitWalletId, participantId, amount);
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

  static async deleteSplitWalletPrivateKey(splitWalletId: string, creatorId: string) {
    await loadModules();
    return SplitWalletSecurity.deleteSplitWalletPrivateKey(splitWalletId, creatorId);
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
}

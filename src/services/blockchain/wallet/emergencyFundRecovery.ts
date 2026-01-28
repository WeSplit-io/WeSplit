import { WalletRecoveryService } from './walletRecoveryService';

/**
 * Emergency recovery for lost funds.
 * Thin wrapper that delegates to WalletRecoveryService to avoid importing the entire wallet barrel.
 */
export const emergencyFundRecovery = async (userId: string, originalAddress: string) => {
  return WalletRecoveryService.emergencyFundRecovery(userId, originalAddress);
};


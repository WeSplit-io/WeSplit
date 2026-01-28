/**
 * Wallet Services
 * Centralized exports for all wallet-related services
 */

export { simplifiedWalletService as walletService } from './simplifiedWalletService';
export { walletRecoveryService, WalletRecoveryService, WalletRecoveryError } from './walletRecoveryService';

// Emergency recovery for lost funds
export { emergencyFundRecovery } from './emergencyFundRecovery';
export { walletExportService, WalletExportService } from './walletExportService';
export { LinkedWalletService } from './LinkedWalletService';
export { SolanaAppKitService } from './solanaAppKitService';

// Enhanced wallet services for fixing off-curve wallet issues
export { walletValidationService } from './walletValidationService';
export { walletIssueFixUtility } from './walletIssueFixUtility';
export { walletIntegrationHelper } from './walletIntegrationHelper';

// Wallet utilities
export { generateMnemonic12, generateMnemonic24, deriveKeypairFromMnemonic, publicKeyFromMnemonic, generateWalletFromMnemonic, validateBip39Mnemonic, tryRecoverWalletFromMnemonic, verifyExportImportParity, generateWalletChecksum, validateWalletChecksum } from './derive';
export { externalWalletLinkingService } from './linkExternal';
export type { WalletVerificationResult, LinkWalletParams } from './linkExternal';
export type { LinkedWallet } from './LinkedWalletService';
// Deprecated service removed - use simplifiedWalletService instead

// Wallet discovery and linking
export { mwaDiscoveryService } from './discovery/mwaDiscoveryService';
export { signatureLinkService } from './linking/signatureLinkService';
// export { walletProviders } from './providers/walletProviders';

// Re-export types
export type { 
  WalletInfo, 
  UserWalletBalance, 
  WalletCreationResult,
  WalletProvider,
  WalletManagementEvent
} from './simplifiedWalletService';

// Export walletService as default for backward compatibility
export { simplifiedWalletService as default } from './simplifiedWalletService';

/**
 * Core Services
 * Centralized exports for all core services
 */

// Core services
export { loggingService, logger } from '../analytics/loggingService';
export { subscriptionService } from './subscriptionService';
export { accountDeletionService } from './accountDeletionService';
export { userImageService } from './userImageService';
export { priceManagementService } from './priceManagementService';
export { nfcService } from './nfcService';
export { i18nService } from './i18nService';
export { multiSignStateService, MultiSignStateService } from './multiSignStateService';

// Re-export commonly used types and utilities
export type { 
  NotificationData,
  NotificationType,
  User,
  Transaction
} from '../../types/unified';

// Utility functions are available directly from formatUtils
// Re-exporting them here creates circular dependencies

// Re-export translation utilities
export { 
  useTranslation,
  SupportedLanguage,
  translate,
  getCurrentLanguage,
  setLanguage
} from './i18nService';

// Re-export price utilities
export { 
  formatCurrencyAmount,
  convertFiatToUSDC
} from './priceService';

// Re-export deep link utilities
export { 
  deepLinkHandler,
  parseWeSplitDeepLink
} from './deepLinkHandler';

// Re-export pending invitation service (for deferred deep linking)
export { 
  pendingInvitationService 
} from './pendingInvitationService';
export type { 
  PendingInvitation,
  PendingInvitationResult 
} from './pendingInvitationService';

// Re-export Solana Pay utilities
export { 
  isSolanaPayUri,
  parseUri,
  extractRecipientAddress,
  createUsdcRequestUri
} from './solanaPay';

// Re-export validation utilities
export { 
  isValidSolanaAddress
} from '../../utils/crypto/wallet/walletUtils';

// Default export for backward compatibility
export { loggingService as default } from '../analytics/loggingService';
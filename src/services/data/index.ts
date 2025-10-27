/**
 * Data Services
 * Centralized exports for all data-related services
 */

// Data services
export { firebaseDataService } from './firebaseDataService';
export { firebaseFunctionsService } from './firebaseFunctionsService';

// Re-export verification functions
export { sendVerificationCode, verifyCode } from './firebaseFunctionsService';

// Re-export commonly used types
export type { 
  User,
  Transaction,
  Notification,
  Contact,
  Group
} from '../../types/unified';

// Re-export utility functions
export { 
  validateUserData,
  validateTransactionData,
  validateSplitData
} from './firebaseDataService';

// Default export for backward compatibility
export { firebaseDataService as default } from './firebaseDataService';
/**
 * Billing Services
 * Centralized exports for all billing and bill analysis services
 */

export { ConsolidatedBillAnalysisService } from './consolidatedBillAnalysisService';
export { consolidatedBillAnalysisService } from './consolidatedBillAnalysisService';
export { manualSplitCreationService } from './manualSplitCreationService';
export { ManualSplitCreationService } from './manualSplitCreationService';
export { ocrService } from './ocrService';

// Re-export types
export type { 
  BillAnalysisResult,
  ProcessedBillData,
  ManualBillInput 
} from './consolidatedBillAnalysisService';

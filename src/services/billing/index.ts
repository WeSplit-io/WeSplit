/**
 * Billing Services
 * Centralized exports for all billing and bill analysis services
 */

export { ConsolidatedBillAnalysisService } from './consolidatedBillAnalysisService';
export { consolidatedBillAnalysisService } from './consolidatedBillAnalysisService';
export { manualSplitCreationService } from './manualSplitCreationService';
export { ManualSplitCreationService } from './manualSplitCreationService';

// Export singleton instances for easy access
export { consolidatedBillAnalysisService as ConsolidatedBillAnalysisService } from './consolidatedBillAnalysisService';

// Export class instances for direct access
export { ConsolidatedBillAnalysisService as ConsolidatedBillAnalysisServiceClass } from './consolidatedBillAnalysisService';

// Re-export types
export type { 
  BillAnalysisResult,
  ProcessedBillData,
  ManualBillInput 
} from './consolidatedBillAnalysisService';

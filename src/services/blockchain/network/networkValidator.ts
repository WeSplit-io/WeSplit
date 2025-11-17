/**
 * Network Validator
 * 
 * Validates network consistency to prevent network mismatches that could cause
 * transaction failures or security issues.
 */

import { getCurrentNetwork, isMainnet } from '../../../config/network/solanaNetworkConfig';
import { logger } from '../../analytics/loggingService';

export class NetworkValidator {
  /**
   * Validate network match for transaction
   * 
   * @param expectedNetwork - The network the transaction expects
   * @param operation - Description of the operation being performed
   * @throws Error if network mismatch detected
   */
  static validateTransactionNetwork(
    expectedNetwork: 'devnet' | 'mainnet',
    operation: string
  ): void {
    const currentNetwork = getCurrentNetwork();
    
    if (currentNetwork !== expectedNetwork) {
      const error = new Error(
        `Network mismatch: Attempting ${operation} on ${expectedNetwork} but connected to ${currentNetwork}. ` +
        `Please switch to ${expectedNetwork} to continue.`
      );
      logger.error('Network validation failed', {
        currentNetwork,
        expectedNetwork,
        operation,
      }, 'NetworkValidator');
      throw error;
    }
  }
  
  /**
   * Warn if attempting mainnet operation on devnet
   * 
   * @param operation - Description of the operation being performed
   */
  static warnIfDevnet(operation: string): void {
    if (!isMainnet()) {
      logger.warn(
        `Warning: ${operation} attempted on devnet. This may not work as expected.`,
        { operation, network: getCurrentNetwork() },
        'NetworkValidator'
      );
    }
  }
  
  /**
   * Validate network before critical operations
   * 
   * @param operation - Description of the operation
   * @param requiresMainnet - Whether the operation requires mainnet
   */
  static validateNetworkForOperation(
    operation: string,
    requiresMainnet: boolean
  ): void {
    const currentNetwork = getCurrentNetwork();
    
    if (requiresMainnet && currentNetwork !== 'mainnet') {
      throw new Error(
        `${operation} requires mainnet but currently connected to ${currentNetwork}. ` +
        `Please switch to mainnet to continue.`
      );
    }
    
    if (!requiresMainnet && currentNetwork === 'mainnet') {
      logger.warn(
        `Warning: ${operation} is typically a devnet operation but running on mainnet.`,
        { operation, network: currentNetwork },
        'NetworkValidator'
      );
    }
  }
  
  /**
   * Get user-friendly error message for network mismatch
   * 
   * @param expectedNetwork - Expected network
   * @param currentNetwork - Current network
   * @returns User-friendly error message
   */
  static getNetworkMismatchMessage(
    expectedNetwork: 'devnet' | 'mainnet',
    currentNetwork: string
  ): string {
    if (expectedNetwork === 'mainnet' && currentNetwork === 'devnet') {
      return 'You are connected to devnet, but this operation requires mainnet. Please switch to mainnet to continue.';
    }
    
    if (expectedNetwork === 'devnet' && currentNetwork === 'mainnet') {
      return 'You are connected to mainnet, but this operation requires devnet. This is a development-only feature.';
    }
    
    return `Network mismatch: Expected ${expectedNetwork} but connected to ${currentNetwork}.`;
  }
}

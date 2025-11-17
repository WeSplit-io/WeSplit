/**
 * Network Validator Tests
 */

import { NetworkValidator } from '../networkValidator';
import { getCurrentNetwork } from '../../../../config/network/solanaNetworkConfig';

// Mock dependencies
jest.mock('../../../../config/network/solanaNetworkConfig', () => ({
  getCurrentNetwork: jest.fn(),
  isMainnet: jest.fn(),
}));

describe('Network Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTransactionNetwork', () => {
    it('should pass when networks match', () => {
      (getCurrentNetwork as jest.Mock).mockReturnValue('mainnet');

      expect(() => {
        NetworkValidator.validateTransactionNetwork('mainnet', 'test operation');
      }).not.toThrow();
    });

    it('should throw when networks mismatch', () => {
      (getCurrentNetwork as jest.Mock).mockReturnValue('devnet');

      expect(() => {
        NetworkValidator.validateTransactionNetwork('mainnet', 'test operation');
      }).toThrow('Network mismatch');
    });
  });

  describe('validateNetworkForOperation', () => {
    it('should pass when mainnet required and on mainnet', () => {
      (getCurrentNetwork as jest.Mock).mockReturnValue('mainnet');
      
      expect(() => {
        NetworkValidator.validateNetworkForOperation('test operation', true);
      }).not.toThrow();
    });

    it('should throw when mainnet required but on devnet', () => {
      (getCurrentNetwork as jest.Mock).mockReturnValue('devnet');

      expect(() => {
        NetworkValidator.validateNetworkForOperation('test operation', true);
      }).toThrow('requires mainnet');
    });
  });

  describe('getNetworkMismatchMessage', () => {
    it('should return appropriate message for mainnet mismatch', () => {
      const message = NetworkValidator.getNetworkMismatchMessage('mainnet', 'devnet');
      
      expect(message).toContain('devnet');
      expect(message).toContain('mainnet');
    });
  });
});

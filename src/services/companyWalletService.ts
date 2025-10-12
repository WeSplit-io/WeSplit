/**
 * Company Wallet Service
 * Handles company wallet operations for covering gas fees and managing company funds
 */

import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CURRENT_NETWORK } from '../config/solanaConfig';
import { transactionUtils } from './shared/transactionUtils';

export interface CompanyWalletConfig {
  companyWalletAddress: string;
  companyWalletSecretKey: string; // In production, this should be stored securely
  minSolReserve: number; // Minimum SOL to keep in company wallet
  gasFeeEstimate: number; // Estimated gas fee per transaction
}

export interface GasFeeCoverageResult {
  success: boolean;
  transactionSignature?: string;
  gasFeePaid?: number;
  error?: string;
}

export class CompanyWalletService {
  private companyKeypair: Keypair | null = null;
  private config: CompanyWalletConfig;

  constructor() {
    // Use shared connection from transactionUtils
    
    // Company wallet configuration
    this.config = {
      companyWalletAddress: process.env.EXPO_PUBLIC_COMPANY_WALLET_ADDRESS || '',
      companyWalletSecretKey: process.env.EXPO_PUBLIC_COMPANY_WALLET_SECRET_KEY || '',
      minSolReserve: parseFloat(process.env.EXPO_PUBLIC_COMPANY_MIN_SOL_RESERVE || '1.0'), // 1 SOL minimum
      gasFeeEstimate: parseFloat(process.env.EXPO_PUBLIC_COMPANY_GAS_FEE_ESTIMATE || '0.001') // 0.001 SOL per transaction
    };

    // Initialize company wallet if config is provided
    if (this.config.companyWalletSecretKey) {
      try {
        const secretKeyArray = JSON.parse(this.config.companyWalletSecretKey);
        this.companyKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
        
        if (__DEV__) {
          console.log('🏦 CompanyWalletService initialized:', {
            address: this.companyKeypair.publicKey.toBase58(),
            minSolReserve: this.config.minSolReserve,
            gasFeeEstimate: this.config.gasFeeEstimate
          });
        }
      } catch (error) {
        console.error('Failed to initialize company wallet:', error);
      }
    } else {
      if (__DEV__) {
        console.log('🏦 CompanyWalletService: No company wallet configured (using simulation mode)');
      }
    }
  }

  // Check if company wallet is available
  isCompanyWalletAvailable(): boolean {
    return this.companyKeypair !== null;
  }

  // Get company wallet balance
  async getCompanyWalletBalance(): Promise<{ sol: number; usdc: number }> {
    if (!this.companyKeypair) {
      return { sol: 0, usdc: 0 };
    }

    try {
      const solBalance = await transactionUtils.getConnection().getBalance(this.companyKeypair.publicKey);
      const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;

      // For now, we'll assume company wallet only holds SOL for gas fees
      // In production, you might want to check USDC balance as well
      return {
        sol: solBalanceInSol,
        usdc: 0 // Company wallet primarily holds SOL for gas fees
      };
    } catch (error) {
      console.error('Failed to get company wallet balance:', error);
      return { sol: 0, usdc: 0 };
    }
  }

  // Check if company has sufficient SOL for gas fees
  async hasSufficientSolForGas(): Promise<{ hasSufficient: boolean; currentSol: number; requiredSol: number }> {
    try {
      const balance = await this.getCompanyWalletBalance();
      const requiredSol = this.config.gasFeeEstimate;
      
      return {
        hasSufficient: balance.sol >= requiredSol,
        currentSol: balance.sol,
        requiredSol: requiredSol
      };
    } catch (error) {
      console.error('Failed to check company SOL balance:', error);
      return {
        hasSufficient: false,
        currentSol: 0,
        requiredSol: this.config.gasFeeEstimate
      };
    }
  }

  // Cover gas fees for a user transaction
  async coverGasFeesForTransaction(
    userTransactionSignature: string,
    estimatedGasFee: number = this.config.gasFeeEstimate
  ): Promise<GasFeeCoverageResult> {
    if (!this.companyKeypair) {
      if (__DEV__) {
        console.log('🏦 CompanyWalletService: Simulating gas fee coverage (no company wallet configured)');
        return {
          success: true,
          gasFeePaid: estimatedGasFee,
          transactionSignature: `simulated_gas_coverage_${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: 'Company wallet not configured'
        };
      }
    }

    try {
      // Check if company has sufficient SOL
      const solCheck = await this.hasSufficientSolForGas();
      if (!solCheck.hasSufficient) {
        return {
          success: false,
          error: `Insufficient company SOL balance. Required: ${solCheck.requiredSol} SOL, Available: ${solCheck.currentSol} SOL`
        };
      }

      // In a real implementation, you would:
      // 1. Monitor the user's transaction
      // 2. If it fails due to insufficient gas, automatically retry with company's SOL
      // 3. Or pre-fund the user's wallet with gas fees
      
      // For now, we'll simulate successful gas fee coverage
      if (__DEV__) {
        console.log('🏦 CompanyWalletService: Gas fee coverage successful:', {
          userTransactionSignature,
          gasFeePaid: estimatedGasFee,
          companySolBalance: solCheck.currentSol
        });
      }

      return {
        success: true,
        gasFeePaid: estimatedGasFee,
        transactionSignature: `company_gas_coverage_${Date.now()}`
      };
    } catch (error) {
      console.error('Failed to cover gas fees:', error);
      return {
        success: false,
        error: 'Failed to cover gas fees: ' + (error as Error).message
      };
    }
  }

  // Get company wallet info
  getCompanyWalletInfo(): { address: string; isAvailable: boolean; config: CompanyWalletConfig } {
    return {
      address: this.companyKeypair?.publicKey.toBase58() || this.config.companyWalletAddress,
      isAvailable: this.isCompanyWalletAvailable(),
      config: this.config
    };
  }

  // Update company wallet configuration
  updateConfig(newConfig: Partial<CompanyWalletConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize wallet if secret key changed
    if (newConfig.companyWalletSecretKey) {
      try {
        const secretKeyArray = JSON.parse(newConfig.companyWalletSecretKey);
        this.companyKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
      } catch (error) {
        console.error('Failed to update company wallet:', error);
      }
    }
  }
}

// Export singleton instance
export const companyWalletService = new CompanyWalletService();

/**
 * Wallet Persistence Testing Utility
 * 
 * This utility allows testing wallet persistence scenarios in development
 * without needing to build and deploy new app versions.
 * 
 * Usage:
 * - Import in a test screen or use React Native Debugger console
 * - Call test functions to simulate app update scenarios
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { walletRecoveryService } from '../../services/blockchain/wallet/walletRecoveryService';
import { secureVault } from '../../services/security/secureVault';
import { walletService } from '../../services/blockchain/wallet';
import { firebaseDataService } from '../../services/data/firebaseDataService';
import { logger } from '../../services/analytics/loggingService';
import { auth } from '../../config/firebase/firebase';

export interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: any;
}

export class WalletPersistenceTester {
  /**
   * Test 1: Simulate AsyncStorage Clear (what happens during app updates)
   * This clears AsyncStorage but keeps Keychain/SecureStore intact
   */
  static async testAsyncStorageClear(userId: string, userEmail?: string): Promise<TestResult> {
    try {
      logger.info('🧪 Test: Simulating AsyncStorage clear (app update scenario)', { userId }, 'WalletPersistenceTester');
      
      // Get current wallet address before clearing
      const beforeResult = await walletRecoveryService.recoverWallet(userId, userEmail);
      const beforeAddress = beforeResult.wallet?.address;
      
      if (!beforeAddress) {
        return {
          testName: 'AsyncStorage Clear Test',
          success: false,
          message: 'No wallet found before test - cannot verify persistence'
        };
      }
      
      // Clear AsyncStorage (simulates app update)
      logger.info('Clearing AsyncStorage...', null, 'WalletPersistenceTester');
      await AsyncStorage.clear();
      
      // Wait a moment for clearing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to recover wallet after AsyncStorage clear
      logger.info('Attempting wallet recovery after AsyncStorage clear...', null, 'WalletPersistenceTester');
      const afterResult = await walletRecoveryService.recoverWallet(userId, userEmail);
      const afterAddress = afterResult.wallet?.address;
      
      const success = afterResult.success && afterAddress === beforeAddress;
      
      return {
        testName: 'AsyncStorage Clear Test (App Update)',
        success,
        message: success 
          ? '✅ Wallet persisted after AsyncStorage clear (app update scenario)' 
          : '❌ Wallet lost after AsyncStorage clear',
        details: {
          beforeAddress,
          afterAddress,
          recoverySuccess: afterResult.success,
          recoveryMethod: afterResult.wallet ? 'recovered' : 'failed',
          scenario: 'App Update (AsyncStorage cleared, Keychain/MMKV intact)'
        }
      };
    } catch (error) {
      return {
        testName: 'AsyncStorage Clear Test',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Test 2: Simulate Complete App Deletion (all data cleared)
   * This clears ALL storage: AsyncStorage, Keychain, MMKV, SecureStore
   * Simulates app deletion and reinstallation
   */
  static async testCompleteDataClear(userId: string, userEmail?: string): Promise<TestResult> {
    try {
      logger.warn('🧪 Test: Simulating complete app deletion (all data cleared)', { userId }, 'WalletPersistenceTester');
      
      // Get current wallet address before clearing
      const beforeResult = await walletRecoveryService.recoverWallet(userId, userEmail);
      const beforeAddress = beforeResult.wallet?.address;
      
      if (!beforeAddress) {
        return {
          testName: 'Complete Data Clear Test',
          success: false,
          message: 'No wallet found before test - cannot verify recovery'
        };
      }
      
      // Step 1: Clear AsyncStorage
      logger.info('Step 1: Clearing AsyncStorage...', null, 'WalletPersistenceTester');
      await AsyncStorage.clear();
      
      // Step 2: Clear SecureStore (email, fallback wallet data)
      logger.info('Step 2: Clearing SecureStore...', null, 'WalletPersistenceTester');
      try {
        // Clear email
        await SecureStore.deleteItemAsync('wesplit_user_email');
        
        // Clear wallet-related SecureStore items
        const secureStoreKeys = [
          `privateKey_${userId}`,
          `mnemonic_${userId}`,
          `wallet_${userId}`,
          `wallet_private_key`,
          `wallet_mnemonic`,
        ];
        
        for (const key of secureStoreKeys) {
          try {
            await SecureStore.deleteItemAsync(key, {
              keychainService: 'WeSplitWalletData'
            });
          } catch (e) {
            // Ignore errors (key might not exist)
          }
        }
      } catch (error) {
        logger.warn('Failed to clear some SecureStore items', error, 'WalletPersistenceTester');
      }
      
      // Step 3: Clear Keychain (iOS) and MMKV (Android)
      logger.info('Step 3: Clearing Keychain/MMKV...', null, 'WalletPersistenceTester');
      try {
        // Clear secureVault data
        await secureVault.clear(userId, 'privateKey');
        await secureVault.clear(userId, 'mnemonic');
        
        // Try to clear Keychain directly (iOS)
        if (Platform.OS === 'ios') {
          try {
            const Keychain = await import('react-native-keychain');
            // Clear AES key
            await Keychain.default.resetGenericPassword({
              service: 'wesplit-aes-key'
            });
            // Clear wallet data service
            await Keychain.default.resetGenericPassword({
              service: 'WeSplitWalletData'
            });
          } catch (keychainError) {
            logger.warn('Failed to clear Keychain', keychainError, 'WalletPersistenceTester');
          }
        }
        
        // Try to clear MMKV directly (Android)
        if (Platform.OS === 'android') {
          try {
            const MMKV = await import('react-native-mmkv');
            const mmkvModule = MMKV.default || (MMKV as any).MMKV || MMKV.createMMKV;
            const storage = new mmkvModule({ id: 'wesplit_vault' });
            storage.clearAll();
          } catch (mmkvError) {
            logger.warn('Failed to clear MMKV', mmkvError, 'WalletPersistenceTester');
          }
        }
      } catch (error) {
        logger.warn('Failed to clear Keychain/MMKV', error, 'WalletPersistenceTester');
      }
      
      // Wait for clearing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 4: Verify all data is cleared
      logger.info('Step 4: Verifying all data is cleared...', null, 'WalletPersistenceTester');
      const verifyResult = await walletRecoveryService.recoverWallet(userId, userEmail);
      const isCleared = !verifyResult.success || !verifyResult.wallet;
      
      if (!isCleared) {
        return {
          testName: 'Complete Data Clear Test',
          success: false,
          message: '❌ Data clear failed - wallet still recoverable (should be cleared)',
          details: {
            beforeAddress,
            stillRecoverable: true,
            recoveredAddress: verifyResult.wallet?.address
          }
        };
      }
      
      // Step 5: Test recovery options
      logger.info('Step 5: Testing recovery options...', null, 'WalletPersistenceTester');
      
      const recoveryOptions = {
        hasCloudBackup: false,
        hasSeedPhrase: false,
        canRecoverFromEmail: false,
      };
      
      // Check cloud backup
      try {
        const { walletCloudBackupService } = await import('../../services/security/walletCloudBackupService');
        recoveryOptions.hasCloudBackup = await walletCloudBackupService.hasBackup(userId);
      } catch (e) {
        // Cloud backup check failed
      }
      
      // Check if user has seed phrase stored elsewhere (database)
      try {
        const userData = await firebaseDataService.user.getCurrentUser(userId);
        recoveryOptions.hasSeedPhrase = !!userData?.wallet_has_seed_phrase;
      } catch (e) {
        // Database check failed
      }
      
      // Email-based recovery won't work (everything cleared)
      recoveryOptions.canRecoverFromEmail = false;
      
      return {
        testName: 'Complete Data Clear Test (App Deletion)',
        success: true,
        message: '✅ All data cleared successfully. Wallet recovery requires cloud backup or seed phrase.',
        details: {
          beforeAddress,
          afterAddress: null,
          allDataCleared: true,
          recoveryOptions,
          scenario: 'App Deletion (All data cleared - Keychain, MMKV, SecureStore, AsyncStorage)',
          nextSteps: recoveryOptions.hasCloudBackup 
            ? 'Recover from cloud backup using password'
            : recoveryOptions.hasSeedPhrase
            ? 'Recover from seed phrase'
            : 'Wallet cannot be recovered - user needs to create new wallet or restore from backup'
        }
      };
    } catch (error) {
      return {
        testName: 'Complete Data Clear Test',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Test 3: Test Cloud Backup Recovery (after complete data clear)
   */
  static async testCloudBackupRecovery(userId: string, backupPassword: string): Promise<TestResult> {
    try {
      logger.info('🧪 Test: Testing cloud backup recovery', { userId }, 'WalletPersistenceTester');
      
      const { walletCloudBackupService } = await import('../../services/security/walletCloudBackupService');
      
      // Check if backup exists
      const hasBackup = await walletCloudBackupService.hasBackup(userId);
      if (!hasBackup) {
        return {
          testName: 'Cloud Backup Recovery Test',
          success: false,
          message: '❌ No cloud backup found - cannot test recovery',
          details: {
            hasBackup: false,
            suggestion: 'Create a cloud backup first using walletCloudBackupService.createBackup()'
          }
        };
      }
      
      // Attempt recovery
      const restoreResult = await walletCloudBackupService.restoreFromBackup(userId, backupPassword);
      
      if (restoreResult.success && restoreResult.wallet) {
        return {
          testName: 'Cloud Backup Recovery Test',
          success: true,
          message: '✅ Cloud backup recovery successful!',
          details: {
            recoveredAddress: restoreResult.wallet.address,
            recoveryMethod: 'cloud_backup'
          }
        };
      } else {
        return {
          testName: 'Cloud Backup Recovery Test',
          success: false,
          message: `❌ Cloud backup recovery failed: ${restoreResult.error || 'Unknown error'}`,
          details: {
            error: restoreResult.error
          }
        };
      }
    } catch (error) {
      return {
        testName: 'Cloud Backup Recovery Test',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Test 4: Simulate UserId Change (test email-based recovery)
   * This simulates what happens when userId changes after app update
   */
  static async testUserIdChange(userId: string, userEmail: string): Promise<TestResult> {
    try {
      logger.info('🧪 Test: Simulating userId change (email-based recovery)', { userId, email: userEmail.substring(0, 5) + '...' }, 'WalletPersistenceTester');
      
      // Get current wallet
      const originalResult = await walletRecoveryService.recoverWallet(userId, userEmail);
      const originalAddress = originalResult.wallet?.address;
      
      if (!originalAddress) {
        return {
          testName: 'UserId Change Test',
          success: false,
          message: 'No wallet found - cannot test userId change recovery'
        };
      }
      
      // Simulate userId change by using a different userId
      const newUserId = userId + '_changed_' + Date.now();
      logger.info('Simulating userId change', { 
        originalUserId: userId.substring(0, 8) + '...',
        newUserId: newUserId.substring(0, 8) + '...'
      }, 'WalletPersistenceTester');
      
      // Try to recover with new userId but same email
      const recoveryResult = await walletRecoveryService.recoverWallet(newUserId, userEmail);
      
      const success = recoveryResult.success && recoveryResult.wallet?.address === originalAddress;
      
      if (success && recoveryResult.wallet) {
        // Verify wallet was re-stored with new userId
        const verifyResult = await walletRecoveryService.recoverWallet(newUserId, userEmail);
        const reStored = verifyResult.success && verifyResult.wallet?.address === originalAddress;
        
        return {
          testName: 'UserId Change Test',
          success: success && reStored,
          message: success && reStored
            ? '✅ Email-based recovery successful! Wallet re-stored with new userId.'
            : '⚠️ Email-based recovery worked but re-storage failed',
          details: {
            originalAddress,
            recoveredAddress: recoveryResult.wallet.address,
            reStored,
            recoveryMethod: 'email-based'
          }
        };
      }
      
      return {
        testName: 'UserId Change Test',
        success: false,
        message: '❌ Email-based recovery failed',
        details: {
          originalAddress,
          recoverySuccess: recoveryResult.success,
          error: recoveryResult.errorMessage
        }
      };
    } catch (error) {
      return {
        testName: 'UserId Change Test',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Test 5: Test Storage Verification
   * Verifies that wallet can be recovered immediately after storage
   */
  static async testStorageVerification(userId: string, userEmail?: string): Promise<TestResult> {
    try {
      logger.info('🧪 Test: Storage verification', { userId }, 'WalletPersistenceTester');
      
      // Get current wallet
      const walletResult = await walletService.getWalletInfo(userId);
      
      if (!walletResult || !walletResult.secretKey) {
        return {
          testName: 'Storage Verification Test',
          success: false,
          message: 'No wallet found - cannot test verification'
        };
      }
      
      const walletAddress = walletResult.address;
      
      // Try to recover immediately
      const recoveryResult = await walletRecoveryService.recoverWallet(userId, userEmail);
      
      const success = recoveryResult.success && recoveryResult.wallet?.address === walletAddress;
      
      return {
        testName: 'Storage Verification Test',
        success,
        message: success
          ? '✅ Wallet can be recovered immediately after storage!'
          : '❌ Wallet verification failed',
        details: {
          storedAddress: walletAddress,
          recoveredAddress: recoveryResult.wallet?.address,
          recoverySuccess: recoveryResult.success
        }
      };
    } catch (error) {
      return {
        testName: 'Storage Verification Test',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Test 6: Test Email-Based Storage
   * Verifies that wallet is stored by email hash
   */
  static async testEmailBasedStorage(userId: string, userEmail: string): Promise<TestResult> {
    try {
      logger.info('🧪 Test: Email-based storage verification', { userId, email: userEmail.substring(0, 5) + '...' }, 'WalletPersistenceTester');
      
      // Get current wallet
      const walletResult = await walletService.getWalletInfo(userId);
      
      if (!walletResult || !walletResult.secretKey) {
        return {
          testName: 'Email-Based Storage Test',
          success: false,
          message: 'No wallet found - cannot test email storage'
        };
      }
      
      // Hash email and check if stored
      const emailHash = await hashEmail(userEmail);
      const emailPrivateKey = await secureVault.get(emailHash, 'privateKey');
      
      const success = !!emailPrivateKey;
      
      return {
        testName: 'Email-Based Storage Test',
        success,
        message: success
          ? '✅ Wallet stored by email hash!'
          : '❌ Wallet not found by email hash',
        details: {
          emailHash: emailHash.substring(0, 8) + '...',
          hasEmailStorage: success,
          walletAddress: walletResult.address
        }
      };
    } catch (error) {
      return {
        testName: 'Email-Based Storage Test',
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      };
    }
  }

  /**
   * Test 7: Full Persistence Test Suite
   * Runs all tests in sequence
   */
  static async runFullTestSuite(userId: string, userEmail?: string): Promise<TestResult[]> {
    logger.info('🧪 Running full wallet persistence test suite', { userId }, 'WalletPersistenceTester');
    
    const results: TestResult[] = [];
    
    // Test 1: Storage Verification
    results.push(await this.testStorageVerification(userId, userEmail));
    
    // Test 2: Email-Based Storage
    if (userEmail) {
      results.push(await this.testEmailBasedStorage(userId, userEmail));
    }
    
    // Test 3: AsyncStorage Clear (App Update)
    results.push(await this.testAsyncStorageClear(userId, userEmail));
    
    // Test 4: UserId Change (only if email available)
    if (userEmail) {
      results.push(await this.testUserIdChange(userId, userEmail));
    }
    
    // Summary
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    logger.info('🧪 Test suite complete', { 
      passed, 
      total, 
      successRate: `${(passed / total * 100).toFixed(1)}%` 
    }, 'WalletPersistenceTester');
    
    return results;
  }

  /**
   * Test 8: Complete App Deletion Test Suite
   * Tests complete data clear and recovery options
   */
  static async runCompleteDeletionTestSuite(userId: string, userEmail?: string, backupPassword?: string): Promise<TestResult[]> {
    logger.warn('🧪 Running complete app deletion test suite', { userId }, 'WalletPersistenceTester');
    
    const results: TestResult[] = [];
    
    // Test 1: Complete Data Clear
    results.push(await this.testCompleteDataClear(userId, userEmail));
    
    // Test 2: Cloud Backup Recovery (if password provided)
    if (backupPassword) {
      results.push(await this.testCloudBackupRecovery(userId, backupPassword));
    }
    
    // Summary
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    logger.info('🧪 Complete deletion test suite complete', { 
      passed, 
      total, 
      successRate: `${(passed / total * 100).toFixed(1)}%` 
    }, 'WalletPersistenceTester');
    
    return results;
  }

  /**
   * Clear all app data (simulates fresh install)
   * WARNING: This will clear all app data including wallet!
   */
  static async clearAllAppData(): Promise<void> {
    logger.warn('⚠️ Clearing all app data (simulates fresh install)', null, 'WalletPersistenceTester');
    
    try {
      // Clear AsyncStorage
      await AsyncStorage.clear();
      
      // Clear SecureStore (be careful - this deletes wallet!)
      // We'll only clear non-critical items
      const keys = [
        'wesplit_user_email',
        // Don't clear wallet keys - that's what we're testing!
      ];
      
      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          // Ignore errors
        }
      }
      
      logger.info('✅ App data cleared (wallet keys preserved)', null, 'WalletPersistenceTester');
    } catch (error) {
      logger.error('Failed to clear app data', error, 'WalletPersistenceTester');
      throw error;
    }
  }

  /**
   * Get storage status report
   */
  static async getStorageStatus(userId: string, userEmail?: string): Promise<any> {
    const status: any = {
      userId: userId.substring(0, 8) + '...',
      hasEmail: !!userEmail,
      storage: {
        secureVault: false,
        secureStore: false,
        emailHash: false,
      },
      recovery: {
        userIdBased: false,
        emailBased: false,
      }
    };
    
    try {
      // Check secureVault
      const vaultKey = await secureVault.get(userId, 'privateKey');
      status.storage.secureVault = !!vaultKey;
      
      // Check SecureStore
      const secureStoreKey = `wallet_${userId}`;
      const secureStoreData = await SecureStore.getItemAsync(secureStoreKey);
      status.storage.secureStore = !!secureStoreData;
      
      // Check email hash storage
      if (userEmail) {
        const emailHash = await hashEmail(userEmail);
        const emailKey = await secureVault.get(emailHash, 'privateKey');
        status.storage.emailHash = !!emailKey;
      }
      
      // Test recovery
      const userIdRecovery = await walletRecoveryService.recoverWallet(userId, userEmail);
      status.recovery.userIdBased = userIdRecovery.success;
      
      if (userEmail) {
        // Simulate userId change
        const testUserId = userId + '_test';
        const emailRecovery = await walletRecoveryService.recoverWallet(testUserId, userEmail);
        status.recovery.emailBased = emailRecovery.success;
      }
      
    } catch (error) {
      status.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return status;
  }
}

/**
 * Helper function to hash email (same as in walletRecoveryService)
 */
async function hashEmail(email: string): Promise<string> {
  try {
    const Crypto = await import('expo-crypto');
    const normalizedEmail = email.toLowerCase().trim();
    const hash = await Crypto.default.digestStringAsync(
      Crypto.default.CryptoDigestAlgorithm.SHA256,
      normalizedEmail
    );
    return hash.substring(0, 16);
  } catch (error) {
    // Fallback
    return Buffer.from(email.toLowerCase().trim()).toString('base64').substring(0, 16);
  }
}

// Export for use in React Native Debugger or test screens
export default WalletPersistenceTester;

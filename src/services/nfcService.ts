/**
 * NFC Service
 * Handles NFC functionality for split invitations
 */

import { logger } from './loggingService';

export interface NFCService {
  hasHardwareAsync(): Promise<boolean>;
  isEnabledAsync(): Promise<boolean>;
  requestTechnologyAsync(technologies: any[]): Promise<void>;
  writeTagAsync(message: any): Promise<void>;
  getTagAsync?(): Promise<any>;
  closeTechnologyAsync(): Promise<void>;
}

export class NFCSplitService {
  private static nfcModule: NFCService | null = null;

  /**
   * Initialize NFC module
   */
  private static async initializeNFC(): Promise<NFCService | null> {
    try {
      if (this.nfcModule) {
        return this.nfcModule;
      }

      // Dynamically import NFC module with error handling
      try {
        const NFC = await import('expo-nfc');
        this.nfcModule = NFC;
      } catch (importError) {
        logger.warn('NFC module not available', { error: importError }, 'NFCSplitService');
        return null;
      }
      return this.nfcModule;
    } catch (error) {
      logger.error('Failed to initialize NFC module', error, 'NFCSplitService');
      return null;
    }
  }

  /**
   * Check if NFC is available on the device
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const NFC = await this.initializeNFC();
      if (!NFC) return false;

      return await NFC.hasHardwareAsync();
    } catch (error) {
      logger.error('Error checking NFC availability', error, 'NFCSplitService');
      return false;
    }
  }

  /**
   * Check if NFC is enabled
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const NFC = await this.initializeNFC();
      if (!NFC) return false;

      return await NFC.isEnabledAsync();
    } catch (error) {
      logger.error('Error checking NFC enabled status', error, 'NFCSplitService');
      return false;
    }
  }

  /**
   * Write split invitation to NFC tag
   */
  static async writeSplitInvitation(payload: string): Promise<{ success: boolean; error?: string }> {
    try {
      const NFC = await this.initializeNFC();
      if (!NFC) {
        return { success: false, error: 'NFC module not available' };
      }

      // Check if NFC is available
      const isAvailable = await NFC.hasHardwareAsync();
      if (!isAvailable) {
        return { success: false, error: 'NFC not available on this device' };
      }

      // Check if NFC is enabled
      const isEnabled = await NFC.isEnabledAsync();
      if (!isEnabled) {
        return { success: false, error: 'NFC is disabled. Please enable NFC in device settings.' };
      }

      // Start NFC session
      await NFC.requestTechnologyAsync(['Ndef']);
      
      // Create NDEF message
      const ndefMessage = {
        records: [
          {
            type: 'T', // Text record
            payload: payload,
            id: 'split-invitation',
          },
        ],
      };

      // Write the message to the NFC tag
      await NFC.writeTagAsync(ndefMessage);
      
      logger.info('Successfully wrote split invitation to NFC tag', { payload }, 'NFCSplitService');
      return { success: true };

    } catch (error) {
      logger.error('Error writing to NFC tag', error, 'NFCSplitService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to write to NFC tag' 
      };
    } finally {
      // Always close the NFC session
      try {
        const NFC = await this.initializeNFC();
        if (NFC) {
          await NFC.closeTechnologyAsync();
        }
      } catch (closeError) {
        logger.error('Error closing NFC session', closeError, 'NFCSplitService');
      }
    }
  }

  /**
   * Read NFC tag (for future use)
   */
  static async readNFCTag(): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const NFC = await this.initializeNFC();
      if (!NFC) {
        return { success: false, error: 'NFC module not available' };
      }

      // Check if NFC is available
      const isAvailable = await NFC.hasHardwareAsync();
      if (!isAvailable) {
        return { success: false, error: 'NFC not available on this device' };
      }

      // Check if NFC is enabled
      const isEnabled = await NFC.isEnabledAsync();
      if (!isEnabled) {
        return { success: false, error: 'NFC is disabled. Please enable NFC in device settings.' };
      }

      // Start NFC session
      await NFC.requestTechnologyAsync(['Ndef']);
      
      // Read the tag
      const tag = NFC.getTagAsync ? await NFC.getTagAsync() : null;
      
      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        const record = tag.ndefMessage[0];
        const payload = record.payload;
        
        logger.info('Successfully read NFC tag', { payload }, 'NFCSplitService');
        return { success: true, data: payload };
      } else {
        return { success: false, error: 'No data found on NFC tag' };
      }

    } catch (error) {
      logger.error('Error reading NFC tag', error, 'NFCSplitService');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to read NFC tag' 
      };
    } finally {
      // Always close the NFC session
      try {
        const NFC = await this.initializeNFC();
        if (NFC) {
          await NFC.closeTechnologyAsync();
        }
      } catch (closeError) {
        logger.error('Error closing NFC session', closeError, 'NFCSplitService');
      }
    }
  }
}

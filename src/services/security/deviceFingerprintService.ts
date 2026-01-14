/**
 * Device Fingerprinting Service
 * Generates and manages device fingerprints for security and session binding
 */

import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { logger } from '../analytics/loggingService';

export interface DeviceFingerprint {
  deviceId: string;
  platform: string;
  modelName: string;
  osVersion: string;
  appVersion: string;
  fingerprint: string;
}

class DeviceFingerprintService {
  private cachedFingerprint: DeviceFingerprint | null = null;

  /**
   * Generate a unique device fingerprint
   */
  async getDeviceFingerprint(): Promise<DeviceFingerprint> {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    try {
      // Get device identifiers
      let deviceId: string;
      try {
        if (Platform.OS === 'android') {
          deviceId = await Application.getAndroidId() || 'unknown';
        } else {
          deviceId = Device.modelId || Device.modelName || 'unknown';
        }
      } catch (error) {
        logger.warn('Failed to get device ID', { error }, 'DeviceFingerprintService');
        deviceId = 'unknown';
      }
      
      const platform = Platform.OS;
      const modelName = Device.modelName || 'unknown';
      const osVersion = Device.osVersion || 'unknown';
      const appVersion = Application.nativeApplicationVersion || 'unknown';
      
      // Create a unique fingerprint hash
      const fingerprintString = `${deviceId}-${platform}-${modelName}-${osVersion}-${appVersion}`;
      const fingerprintHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fingerprintString
      );
      
      this.cachedFingerprint = {
        deviceId,
        platform,
        modelName,
        osVersion,
        appVersion,
        fingerprint: fingerprintHash.substring(0, 32) // Use first 32 chars for readability
      };
      
      logger.info('Device fingerprint generated', {
        platform,
        modelName,
        fingerprint: this.cachedFingerprint.fingerprint.substring(0, 8) + '...'
      }, 'DeviceFingerprintService');
      
      return this.cachedFingerprint;
    } catch (error) {
      logger.error('Error generating device fingerprint', { error }, 'DeviceFingerprintService');
      // Return a fallback fingerprint
      return {
        deviceId: 'unknown',
        platform: Platform.OS,
        modelName: 'unknown',
        osVersion: 'unknown',
        appVersion: 'unknown',
        fingerprint: 'unknown'
      };
    }
  }

  /**
   * Store device fingerprint in Firestore
   */
  async storeDeviceFingerprint(userId: string): Promise<void> {
    try {
      const fingerprint = await this.getDeviceFingerprint();
      
      // Store in Firestore
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      
      const deviceDocId = `${userId}_${fingerprint.fingerprint}`;
      const deviceRef = doc(db, 'userDevices', deviceDocId);
      
      await setDoc(deviceRef, {
        userId,
        deviceId: fingerprint.deviceId,
        platform: fingerprint.platform,
        modelName: fingerprint.modelName,
        osVersion: fingerprint.osVersion,
        appVersion: fingerprint.appVersion,
        fingerprint: fingerprint.fingerprint,
        firstSeen: serverTimestamp(),
        lastSeen: serverTimestamp(),
        trusted: true
      }, { merge: true });
      
      logger.info('Device fingerprint stored', {
        userId,
        fingerprint: fingerprint.fingerprint.substring(0, 8) + '...'
      }, 'DeviceFingerprintService');
    } catch (error) {
      logger.error('Error storing device fingerprint', { error, userId }, 'DeviceFingerprintService');
      // Don't throw - this is non-critical
    }
  }

  /**
   * Verify if device fingerprint is trusted
   */
  async verifyDeviceFingerprint(userId: string): Promise<boolean> {
    try {
      const fingerprint = await this.getDeviceFingerprint();
      
      // Check if device is trusted
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase/firebase');
      
      const devicesRef = collection(db, 'userDevices');
      const q = query(
        devicesRef,
        where('userId', '==', userId),
        where('fingerprint', '==', fingerprint.fingerprint)
      );
      
      const querySnapshot = await getDocs(q);
      const isTrusted = !querySnapshot.empty;
      
      if (isTrusted) {
        logger.info('Device fingerprint verified', {
          userId,
          fingerprint: fingerprint.fingerprint.substring(0, 8) + '...'
        }, 'DeviceFingerprintService');
      } else {
        logger.warn('Device fingerprint not found', {
          userId,
          fingerprint: fingerprint.fingerprint.substring(0, 8) + '...'
        }, 'DeviceFingerprintService');
      }
      
      return isTrusted;
    } catch (error) {
      logger.error('Error verifying device fingerprint', { error, userId }, 'DeviceFingerprintService');
      return false;
    }
  }

  /**
   * Clear cached fingerprint (useful for testing or device changes)
   */
  clearCache(): void {
    this.cachedFingerprint = null;
    logger.info('Device fingerprint cache cleared', null, 'DeviceFingerprintService');
  }
}

export const deviceFingerprintService = new DeviceFingerprintService();

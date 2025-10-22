/**
 * Camera Permission Test Utility
 * Helps debug camera access issues
 */

import { Camera } from 'expo-camera';
import { Alert, Linking } from 'react-native';
import { logger } from '../services/core';

export interface CameraTestResult {
  hasPermission: boolean;
  canAskAgain: boolean;
  status: string;
  error?: string;
}

export async function testCameraPermissions(): Promise<CameraTestResult> {
  try {
    logger.info('Testing camera permissions', null, 'cameraTest');
    
    // Check if camera is available
    const isAvailable = await Camera.isAvailableAsync();
    if (!isAvailable) {
      logger.error('Camera not available on device', null, 'cameraTest');
      return {
        hasPermission: false,
        canAskAgain: false,
        status: 'unavailable',
        error: 'Camera not available on this device'
      };
    }

    // Get current permission status
    const permission = await Camera.getCameraPermissionsAsync();
    
    logger.info('Camera permission status', {
      granted: permission.granted,
      canAskAgain: permission.canAskAgain,
      status: permission.status
    }, 'cameraTest');

    return {
      hasPermission: permission.granted,
      canAskAgain: permission.canAskAgain,
      status: permission.status
    };
  } catch (error) {
    logger.error('Error testing camera permissions', error, 'cameraTest');
    return {
      hasPermission: false,
      canAskAgain: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function requestCameraPermissionWithFallback(): Promise<boolean> {
  try {
    const result = await Camera.requestCameraPermissionsAsync();
    
    if (result.granted) {
      logger.info('Camera permission granted', null, 'cameraTest');
      return true;
    }

    if (!result.canAskAgain) {
      // Permission permanently denied, show settings alert
      Alert.alert(
        'Camera Permission Required',
        'Camera access is required to scan QR codes. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    } else {
      Alert.alert(
        'Camera Permission Denied',
        'Please allow camera access to scan QR codes.',
        [{ text: 'OK' }]
      );
    }

    return false;
  } catch (error) {
    logger.error('Error requesting camera permission', error, 'cameraTest');
    Alert.alert('Error', 'Failed to request camera permission. Please try again.');
    return false;
  }
}

export function showCameraTroubleshooting(): void {
  Alert.alert(
    'Camera Troubleshooting',
    'If you\'re having camera issues:\n\n1. Make sure camera permission is granted\n2. Close and reopen the app\n3. Restart your device\n4. Check if another app is using the camera\n5. Update your device software',
    [
      { text: 'Test Permissions', onPress: () => testCameraPermissions() },
      { text: 'OK' }
    ]
  );
}

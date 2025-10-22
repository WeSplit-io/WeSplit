/**
 * Unified QR Scanner Screen
 * Functional camera scanner with Solana Pay USDC support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  StatusBar,
  Linking,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme';
import { parseUri, extractRecipientAddress, isSolanaPayUri } from './solanaPay';
import { logger } from '../../services/core';
import { isValidSolanaAddress } from '../../utils/validation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// FlashMode constants (since FlashMode import is not working)
const FlashMode = {
  off: 'off',
  on: 'on',
  auto: 'auto',
  torch: 'torch'
} as const;

interface ScannerScreenProps {
  onScan?: (data: { recipient: string; amount?: number; label?: string; message?: string }) => void;
  title?: string;
  subtitle?: string;
}

const ScannerScreen: React.FC<ScannerScreenProps> = ({
  onScan,
  title = 'Scan QR Code',
  subtitle = 'Position the QR code within the frame'
}) => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto' | 'torch'>('off');
  const [isScanning, setIsScanning] = useState(true);
  const lastScanTime = useRef<number>(0);
  const scanThrottleMs = 1500; // 1.5 seconds throttle

  const hasPermission = permission?.granted;

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    const now = Date.now();
    
    // Throttle scans to prevent double navigation
    if (now - lastScanTime.current < scanThrottleMs) {
      return;
    }
    
    lastScanTime.current = now;
    
    if (scanned || !isScanning) {
      return;
    }
    
    setScanned(true);
    setIsScanning(false);
    
    logger.info('QR Code scanned', { data }, 'ScannerScreen');
    
    try {
      // Check if it's a Solana Pay URI
      if (isSolanaPayUri(data)) {
        const parsed = parseUri(data);
        
        if (parsed.isValid) {
          // Valid Solana Pay USDC request
          const scanResult = {
            recipient: parsed.recipient,
            amount: parsed.amount,
            label: parsed.label,
            message: parsed.message
          };
          
          if (onScan) {
            onScan(scanResult);
          } else {
            // Navigate to Send screen with prefilled data
            navigation.navigate('Send' as never, {
              recipient: scanResult.recipient,
              amount: scanResult.amount,
              label: scanResult.label,
              message: scanResult.message
            } as never);
          }
          return;
        } else {
          // Invalid Solana Pay URI
          Alert.alert(
            'Invalid QR Code',
            parsed.error || 'This QR code is not a valid USDC payment request',
            [
              { text: 'OK', onPress: () => resetScanner() }
            ]
          );
          return;
        }
      }
      
      // Check if it's a raw Solana address
      const recipient = extractRecipientAddress(data);
      if (recipient && isValidSolanaAddress(recipient)) {
        const scanResult = {
          recipient,
          amount: undefined,
          label: undefined,
          message: undefined
        };
        
        if (onScan) {
          onScan(scanResult);
        } else {
          // Navigate to Send screen with prefilled recipient
          navigation.navigate('Send' as never, {
            recipient: scanResult.recipient
          } as never);
        }
        return;
      }
      
      // Unsupported QR code
      Alert.alert(
        'Unsupported QR Code',
        'This QR code is not a valid Solana address or USDC payment request',
        [
          { text: 'OK', onPress: () => resetScanner() }
        ]
      );
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Error',
        'Failed to process QR code. Please try again.',
        [
          { text: 'OK', onPress: () => resetScanner() }
        ]
      );
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setIsScanning(true);
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'torch' : 'off');
  };

  const goBack = () => {
    navigation.goBack();
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required to scan QR codes</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            try {
              const result = await requestPermission();
              logger.info('Camera permission requested', { result }, 'ScannerScreen');
              if (!result.granted) {
                Alert.alert(
                  'Camera Permission Required',
                  'WeSplit needs camera access to scan QR codes. Please enable it in your device settings.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                  ]
                );
              }
            } catch (error) {
              logger.error('Error requesting camera permission', error, 'ScannerScreen');
              Alert.alert('Error', 'Failed to request camera permission. Please try again.');
            }
          }}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
          <Text style={styles.headerButtonText}>
            {flashMode === 'off' ? '💡' : '🔦'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.camera}
          flash={flashMode}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'pdf417'],
          }}
        />
        
        {/* Scanning Overlay */}
        <View style={styles.overlay}>
          {/* Corner Guides */}
          <View style={styles.cornerGuides}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          
          {/* Scanning Indicator */}
          {isScanning && (
            <View style={styles.scanningIndicator}>
              <Text style={styles.scanningText}>Scanning...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>{subtitle}</Text>
        <Text style={styles.instructionsSubtext}>
          Supports Solana addresses and USDC payment requests
        </Text>
      </View>

      {/* Reset Button */}
      {scanned && (
        <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
          <Text style={styles.resetButtonText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  message: {
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  button: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerGuides: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderColor: colors.primaryGreen,
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  scanningText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  instructions: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  instructionsText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionsSubtext: {
    color: colors.textLight,
    fontSize: 12,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: colors.primaryGreen,
    margin: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScannerScreen;

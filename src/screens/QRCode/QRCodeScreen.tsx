import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QrCodeView } from '@features/qr';
import Icon from '../../components/Icon';
import { styles } from './QRCodeScreen.styles';
import { colors } from '../../theme';
import { parseUri, extractRecipientAddress, isSolanaPayUri } from '@features/qr/solanaPay';
import { isValidSolanaAddress } from '@libs/validation';
import { QRCodeService } from '../../services/qrCodeService';
import { SplitInvitationService } from '../../services/splitInvitationService';
import { logger } from '../../services/loggingService';

// Fonction pour hacher l'adresse du wallet
const hashWalletAddress = (address: string): string => {
  if (!address || address.length < 8) return address;

  const start = address.substring(0, 4);
  const end = address.substring(address.length - 4);

  return `${start}...${end}`;
};

interface QRCodeScreenProps {
  onBack: () => void;
  userPseudo: string;
  userWallet: string;
  qrValue: string;
  navigation?: any; // Add navigation prop for split invitations
}

type TabType = 'myCode' | 'scan';

const QRCodeScreen: React.FC<QRCodeScreenProps> = ({
  onBack,
  userPseudo,
  userWallet,
  qrValue,
  navigation,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('myCode');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const lastScanTime = useRef<number>(0);
  const scanThrottleMs = 1500; // 1.5 seconds throttle

  const hasPermission = permission?.granted;

  const resetScanner = () => {
    setScanned(false);
    setIsScanning(true);
  };

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
    
    logger.info('QR Code scanned', { data }, 'QRCodeScreen');
    
    try {
      // Check if it's a split invitation QR code
      const qrData = QRCodeService.parseQRCode(data);
      if (qrData && qrData.type === 'split_invitation') {
        if (QRCodeService.validateSplitInvitationQR(qrData)) {
          const splitData = qrData.data;
          
          // Convert QR data to split invitation data format
          const invitationData = {
            type: 'split_invitation' as const,
            splitId: splitData.splitId,
            billName: splitData.billName,
            totalAmount: splitData.totalAmount,
            currency: splitData.currency,
            creatorId: splitData.creatorId,
            creatorName: splitData.creatorName,
            timestamp: qrData.timestamp,
          };
          
          // Generate shareable link from invitation data
          const shareableLink = SplitInvitationService.generateShareableLink(invitationData);
          
          // Navigate to SplitDetails screen with the invitation data
          if (navigation) {
            navigation.navigate('SplitDetails', {
              shareableLink: shareableLink,
              splitInvitationData: JSON.stringify(invitationData)
            });
          } else {
            Alert.alert(
              'Split Invitation Found',
              `Bill: ${splitData.billName}\nAmount: ${splitData.totalAmount} ${splitData.currency}\nCreator: ${splitData.creatorName}`,
              [
                { text: 'OK', onPress: () => resetScanner() }
              ]
            );
          }
          return;
        } else {
          Alert.alert(
            'Invalid Split Invitation',
            'This QR code contains an invalid split invitation',
            [
              { text: 'OK', onPress: () => resetScanner() }
            ]
          );
          return;
        }
      }
      
      // Check if it's a Solana Pay URI
      if (isSolanaPayUri(data)) {
        const parsed = parseUri(data);
        
        if (parsed.isValid) {
          // Valid Solana Pay USDC request
          Alert.alert(
            'QR Code Scanned',
            `Recipient: ${parsed.recipient}\nAmount: ${parsed.amount} USDC`,
            [
              { text: 'OK', onPress: () => resetScanner() }
            ]
          );
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
        Alert.alert(
          'QR Code Scanned',
          `Solana Address: ${recipient}`,
          [
            { text: 'OK', onPress: () => resetScanner() }
          ]
        );
        return;
      }
      
      // Unsupported QR code
      Alert.alert(
        'Unsupported QR Code',
        'This QR code is not a valid Solana address, USDC payment request, or split invitation',
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          onBack();
        }}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../assets/chevron-left.png')}
          style={styles.backIcon}
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {activeTab === 'myCode' ? 'QR Code' : 'Scan QR Code'}
      </Text>
      <View style={styles.menuButton} />
    </View>
  );

  const renderMyCodeTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.qrContainer}>
        <View style={styles.userInfo}>
          <Text style={styles.userPseudo}>{userPseudo}</Text>
          <Text style={styles.expiryText}>{hashWalletAddress(userWallet)}</Text>   
        </View>

        <View style={styles.qrCodeWrapper}>
          <QrCodeView
            value={qrValue}
            size={270}
            backgroundColor="transparent"
            color={colors.black}
            showAddress={false}
            showButtons={false}
            subtext=""
            qrContainerBackgroundColor="transparent"
          />
        </View>

      </View>
    </View>
  );

  const renderScanTab = () => {
    if (!hasPermission) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.scanContainer}>
            <View style={styles.cameraFrame}>
              <View style={styles.scanArea}>
                <View style={styles.cameraPlaceholder}>
                  <Icon name="camera" size={48} color={colors.white70} />
                  <Text style={styles.cameraPlaceholderText}>Camera Permission Required</Text>
                  <TouchableOpacity 
                    style={styles.permissionButton}
                    onPress={requestPermission}
                  >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.scanContainer}>
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.scanArea}>
                <View style={styles.scanFrame}>
                  <View style={styles.scanCorner} />
                  <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
                  <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
                  <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
                </View>
                <Text style={styles.scanInstruction}>
                  Position the QR code within the frame
                </Text>
              </View>
            </CameraView>
          </View>
        </View>
      </View>
    );
  };

  const renderToggle = () => (
    <View style={styles.toggleContainer}>
      {activeTab === 'myCode' ? (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.toggleButtonGradient}
        >
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setActiveTab('myCode')}
          >
            <Text style={styles.toggleButtonTextActive}>
              My Code
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      ) : (
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setActiveTab('myCode')}
        >
          <Text style={styles.toggleButtonText}>
            My Code
          </Text>
        </TouchableOpacity>
      )}
      
      {activeTab === 'scan' ? (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.toggleButtonGradient}
        >
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setActiveTab('scan')}
          >
            <Text style={styles.toggleButtonTextActive}>
              Scan
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      ) : (
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setActiveTab('scan')}
        >
          <Text style={styles.toggleButtonText}>
            Scan
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />

      {renderHeader()}

      {activeTab === 'myCode' ? renderMyCodeTab() : renderScanTab()}

      {renderToggle()}
    </SafeAreaView>
  );
};

export default QRCodeScreen;

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import QrCodeView from '../services/core/QrCodeView';
import { createUsdcRequestUri } from '../services/core/solanaPay';
import Icon from './Icon';
import { styles } from './QRCodeModal.styles';
import { colors } from '../theme';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  qrValue: string; // QR code value (wallet address or invite link)
  title: string; // Modal title
  displayName: string; // User name or group name
  displayIcon?: string; // Icon name for group (optional)
  displayColor?: string; // Color for group icon (optional)
  isGroup?: boolean; // Whether this is for a group or user
  rawAddress?: string; // Optional: raw wallet address to display below QR
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Image mapping for group categories
const GROUP_IMAGES: { [key: string]: any } = {
  trip: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ftrip-icon-black.png?alt=media&token=3afeb768-566f-4fd7-a550-a19c5c4f5caf' },
  food: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Ffood-icon-black.png?alt=media&token=ef382697-bf78-49e6-b3b3-f669378ebd36' },
  home: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fhouse-icon-black.png?alt=media&token=03406723-1c5b-45fd-a20b-dda8c49a2f83' },
  event: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fevent-icon-black.png?alt=media&token=b11d12c2-c4d9-4029-be12-0ddde31ad0d1' },
  rocket: { uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Frocket-icon-black.png?alt=media&token=90fabb5a-8110-4fd9-9753-9c785fa953a4' },
};

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  qrValue,
  title,
  displayName,
  displayIcon = 'trip',
  displayColor = colors.primaryGreen,
  isGroup = false,
  rawAddress,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      // Reset opacity animation
      opacity.setValue(1);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationY > 100) { // Threshold to close modal
        // Close modal
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
          // Reset values
          translateY.setValue(0);
          opacity.setValue(0);
        });
      } else {
        // Reset to original position
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Animate in when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Get the appropriate image source for the group
  const getGroupImageSource = (iconName: string) => {
    return GROUP_IMAGES[iconName] || GROUP_IMAGES['trip']; // Default to trip if not found
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.qrModalOverlay, { opacity }]}>
        <TouchableOpacity
          style={styles.qrOverlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <Animated.View
              style={[
                styles.qrModalContent,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Handle bar for slide down */}
              <View style={styles.qrHandle} />

              {/* Title */}
              <Text style={styles.qrModalTitle}>{title}</Text>

              <View style={styles.qrCodeContent}>
                {/* QR Code Container */}
                <View style={styles.qrCodeContainerWrapper}>
                  <View style={styles.qrCodeContainer}>
                    <QrCodeView
                      value={qrValue}
                      size={200}
                      backgroundColor={colors.white}
                      color={colors.black}
                      useSolanaPay={qrValue && !qrValue.startsWith('wesplit://')}
                      address={rawAddress}
                      label="WeSplit"
                      message={isGroup ? 'Group invite link' : 'Send USDC'}
                      showAddress={false}
                      showButtons={false}
                    />
                  </View>
                </View>

                {/* User/Group Info */}
                <View style={styles.qrUserInfo}>
                  {isGroup ? (
                    // Group display with image
                    <View style={styles.qrGroupDisplay}>
                      <View style={[styles.qrGroupIcon, { backgroundColor: displayColor }]}>
                        <Image
                          source={getGroupImageSource(displayIcon)}
                          style={styles.qrGroupImage}
                        />
                      </View>
                      <Text style={styles.qrUserName}>{displayName}</Text>
                      {/* Show raw address if provided (for group) */}
                      {rawAddress && (
                        <Text style={[styles.qrWalletAddress, { fontSize: 13, color: colors.textLightSecondary, marginTop: 4 }]}>
                          {rawAddress}
                        </Text>
                      )}
                    </View>
                  ) : (
                    // User display
                    <>
                      <Text style={styles.qrUserName}>{displayName}</Text>
                      {/* Show raw address if provided (for user) */}
                      {rawAddress && (
                        <Text style={[styles.qrWalletAddress, { fontSize: 13, color: colors.textLightSecondary, marginTop: 4 }]}>
                          {rawAddress}
                        </Text>
                      )}
                    </>
                  )}
                  <Text style={styles.qrWalletAddress}>
                    {isGroup ?
                      'Group invite link' :
                      qrValue && qrValue.startsWith('wesplit://profile/') ?
                        (() => {
                          // Extract wallet address from profile QR code
                          const parts = qrValue.split('/');
                          const walletAddress = parts[parts.length - 1];
                          if (walletAddress && walletAddress.length > 12) {
                            return `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 6)}`;
                          }
                          return 'Profile QR code for adding contact';
                        })() :
                      qrValue && qrValue.startsWith('wesplit://send/') ?
                        (() => {
                          // Extract wallet address from send QR code
                          const parts = qrValue.split('/');
                          const walletAddress = parts[2]; // send/walletAddress/...
                          if (walletAddress && walletAddress.length > 12) {
                            return `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 6)}`;
                          }
                          return 'Send money QR code';
                        })() :
                      qrValue && qrValue.startsWith('wesplit://transfer/') ?
                        (() => {
                          // Extract wallet address from transfer QR code
                          const parts = qrValue.split('/');
                          const walletAddress = parts[2]; // transfer/walletAddress/...
                          if (walletAddress && walletAddress.length > 12) {
                            return `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 6)}`;
                          }
                          return 'External wallet transfer QR code';
                        })() :
                      qrValue ?
                        `${qrValue.substring(0, 6)}...${qrValue.substring(qrValue.length - 6)}` :
                        'No wallet connected'
                    }
                  </Text>
                </View>
              </View>

              {/* Done Button */}
              <TouchableOpacity style={styles.qrDoneButton} onPress={onClose}>
                <Text style={styles.qrDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          </PanGestureHandler>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

export default QRCodeModal; 
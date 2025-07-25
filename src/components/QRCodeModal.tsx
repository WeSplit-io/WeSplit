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
import QRCode from 'react-native-qrcode-svg';
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
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Image mapping for group categories
const GROUP_IMAGES: { [key: string]: any } = {
  trip: require('../../assets/trip-icon-black.png'),
  food: require('../../assets/food-icon-black.png'),
  home: require('../../assets/house-icon-black.png'),
  event: require('../../assets/event-icon-black.png'),
  rocket: require('../../assets/rocket-icon-black.png'),
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
                    <QRCode
                      value={qrValue}
                      size={200}
                      backgroundColor={colors.white}
                      color={colors.black}
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
                    </View>
                  ) : (
                    // User display
                    <Text style={styles.qrUserName}>{displayName}</Text>
                  )}
                  <Text style={styles.qrWalletAddress}>
                    {isGroup ? 
                      'Group invite link' :
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
/**
 * BaseModal Component
 * Extracts common modal animation and gesture handling logic
 * Used by all modal components to eliminate duplication
 */

import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'fade' | 'slide';
  transparent?: boolean;
  statusBarTranslucent?: boolean;
  closeOnBackdrop?: boolean;
  closeThreshold?: number;
  style?: any;
}

const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  children,
  animationType = 'fade',
  transparent = true,
  statusBarTranslucent = true,
  closeOnBackdrop = true,
  closeThreshold = 100,
  style,
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
      if (translationY > closeThreshold) { // Threshold to close modal
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
  useEffect(() => {
    if (visible) {
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
    } else {
      // Reset values when modal is hidden
      translateY.setValue(0);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={transparent}
      onRequestClose={onClose}
      statusBarTranslucent={statusBarTranslucent}
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <View style={styles.container}>
          {closeOnBackdrop && (
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={onClose}
            />
          )}
          
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleStateChange}
          >
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ translateY }] },
                style,
              ]}
            >
              {children}
            </Animated.View>
          </PanGestureHandler>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
});

export default BaseModal;

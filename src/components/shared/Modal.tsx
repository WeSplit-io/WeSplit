/**
 * Modal Component
 * Modal réutilisable avec overlay noir, animations fade/slide et handle pour fermer
 */

import { colors, spacing, typography } from '@/theme';
import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  ScrollView,
  Keyboard,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'fade' | 'slide';
  transparent?: boolean;
  statusBarTranslucent?: boolean;
  closeOnBackdrop?: boolean;
  closeThreshold?: number;
  style?: StyleProp<ViewStyle>;
  showHandle?: boolean;
  title?: string;
  description?: string;
  maxHeight?: string | number;
}

const ModalComponent: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  animationType = 'fade',
  transparent = true,
  statusBarTranslucent = true,
  closeOnBackdrop = true,
  closeThreshold = 100,
  style,
  showHandle = true,
  title,
  description,
  maxHeight,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

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
          translateY.setValue(SCREEN_HEIGHT);
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

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
      translateY.setValue(SCREEN_HEIGHT);
      opacity.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // opacity and translateY are Animated.Value objects that shouldn't be in dependencies
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
                { 
                  transform: [{ translateY }],
                  height: keyboardHeight > 0 ? '100%' : (maxHeight || SCREEN_HEIGHT * 0.8),
                  maxHeight: maxHeight || SCREEN_HEIGHT * 0.8,
                },
                style,
              ]}
            >
              {showHandle && (
                <View style={styles.handleContainer}>
                  <View style={styles.handle} />
                </View>
              )}
              
              {/* Header avec titre et description */}
              {(title || description) && (
                <View style={styles.modalHeader}>
                  {title && (
                    <Text style={styles.modalTitle}>{title}</Text>
                  )}
                  {description && (
                    <Text style={styles.modalDescription}>{description}</Text>
                  )}
                </View>
              )}
              
              {/* Contenu principal */}
              <View 
                style={[
                  styles.modalBody,
                  keyboardHeight > 0 && styles.modalBodyKeyboardVisible
                ]}
              >
                {children}
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Overlay noir semi-transparent
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
    backgroundColor: colors.blackWhite5,
    borderTopLeftRadius: spacing.lg,
    borderTopRightRadius: spacing.lg,
    paddingTop: spacing.md, // Réduit pour laisser place à la handle
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 300,
    alignSelf: 'stretch', // S'étend sur toute la largeur
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  handle: {
    width: 50,
    height: 4,
    backgroundColor: colors.white50, // Handle blanche/gris clair
    borderRadius: 2,
  },
  modalHeader: {
    paddingBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyKeyboardVisible: {
    flex: 1,
  },
  modalBodyContentKeyboardVisible: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
});

export default ModalComponent;

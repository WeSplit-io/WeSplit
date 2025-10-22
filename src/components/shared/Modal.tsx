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
  style?: any;
  showHandle?: boolean;
  title?: string;
  description?: string;
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
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
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
              <ScrollView 
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
                nestedScrollEnabled={true}
              >
                {children}
              </ScrollView>
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
    paddingTop: spacing.lg, // Réduit pour laisser place à la handle
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: SCREEN_HEIGHT * 0.7, // Limité à 70% de la hauteur d'écran
    minHeight: 200,
    alignSelf: 'stretch', // S'étend sur toute la largeur
    // Supprimer flex pour permettre l'adaptation au contenu
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  handle: {
    width: 50,
    height: 4,
    backgroundColor: colors.white50, // Handle blanche/gris clair
    borderRadius: 2,
  },
  modalHeader: {
    marginBottom: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.white70,
    textAlign: 'center',
  },
  modalBody: {
    // Supprimer flex: 1 et maxHeight pour permettre l'adaptation au contenu
    // Le ScrollView s'adaptera automatiquement au contenu
  },
  modalBodyContent: {
    flexGrow: 1, // Permet au contenu de grandir selon ses besoins
    paddingBottom: 10, // Petit padding en bas
  },
});

export default ModalComponent;

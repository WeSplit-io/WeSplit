import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Icon from './Icon';
import { colors, spacing, typography } from '../theme';

interface SlideButtonProps {
  onSlideComplete: () => void;
  text: string;
  disabled?: boolean;
  loading?: boolean;
}

const SLIDER_HEIGHT = 56;
const THUMB_SIZE = 48;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_WIDTH = SCREEN_WIDTH - (spacing.lg * 2);
const SLIDE_DISTANCE = CONTAINER_WIDTH - THUMB_SIZE - 8;

const SlideButton: React.FC<SlideButtonProps> = ({
  onSlideComplete,
  text,
  disabled = false,
  loading = false,
}) => {
  const [isSliding, setIsSliding] = useState(false);
  const [completed, setCompleted] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (disabled || loading || completed) return;

    const { translationX, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      setIsSliding(true);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationX >= SLIDE_DISTANCE * 0.8) {
        // Complete the slide
        setCompleted(true);
        Animated.timing(translateX, {
          toValue: SLIDE_DISTANCE,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setTimeout(() => {
            onSlideComplete();
          }, 300);
        });
      } else {
        // Reset to start
        setIsSliding(false);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  const clampedTranslateX = translateX.interpolate({
    inputRange: [0, SLIDE_DISTANCE],
    outputRange: [0, SLIDE_DISTANCE],
    extrapolate: 'clamp',
  });

  // Green background width that follows the thumb
  const greenWidth = translateX.interpolate({
    inputRange: [0, SLIDE_DISTANCE],
    outputRange: [THUMB_SIZE + 4, CONTAINER_WIDTH - 4],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.outerContainer, disabled && styles.disabled]}>
      {/* Background container with border */}
      <View style={styles.container}>
        {/* Animated green background */}
        <Animated.View
          style={[
            styles.greenBackground,
            {
              width: greenWidth,
            },
          ]}
        />
        
        {/* Text overlay */}
        <View style={styles.textContainer}>
          <Text style={[styles.text, (completed || loading) && styles.textCompleted]}>
            {loading ? 'Processing...' : completed ? 'Completed!' : text}
          </Text>
        </View>

        {/* Sliding thumb */}
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleStateChange}
          enabled={!disabled && !loading && !completed}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                transform: [{ translateX: clampedTranslateX }],
                opacity: completed ? 0 : 1,
              },
            ]}
          >
            <Icon name="chevron-right" size={24} color={colors.darkBackground} />
          </Animated.View>
        </PanGestureHandler>

        {/* Success checkmark */}
        {completed && (
          <View style={styles.checkmark}>
            <Icon name="check" size={24} color={colors.darkBackground} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  container: {
    height: SLIDER_HEIGHT,
    backgroundColor: colors.darkBackground,
    borderRadius: spacing.lg,
    borderWidth: 2,
    borderColor: colors.textLight,
    position: 'relative',
  },
  greenBackground: {
    position: 'absolute',
    left: 2,
    top: 2,
    height: SLIDER_HEIGHT - 4,
    backgroundColor: colors.brandGreen,
    borderRadius: spacing.lg - 2,
  },
  textContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: colors.textLight,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  textCompleted: {
    color: colors.darkBackground,
  },
  thumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: colors.textLight,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  checkmark: {
    position: 'absolute',
    right: spacing.md,
    top: (SLIDER_HEIGHT - 32) / 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SlideButton; 
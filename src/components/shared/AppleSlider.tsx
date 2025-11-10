import React, { useState, useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform, PanResponder, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import PhosphorIcon from './PhosphorIcon';
import { colors, spacing } from '../../theme';
import { logger } from '../../services/analytics/loggingService';

interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
  style?: StyleProp<ViewStyle>;
}

const AppleSlider: React.FC<AppleSliderProps> = ({ 
  onSlideComplete, 
  disabled = false, 
  loading = false, 
  text = 'Sign transaction',
  style 
}) => {
  // Calculate dynamic slide distance based on screen width and paddings
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = spacing.md * 2; // paddingHorizontal.md on both sides
  const sliderPadding = 20 * 2; // marginHorizontal: 20 on both sides from styles
  const thumbWidth = 52; // thumb width from styles
  const maxSlideDistance = screenWidth - horizontalPadding - sliderPadding - thumbWidth/2;
  
  const sliderValue = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState('');
  const [_isSliderActive, setIsSliderActive] = useState(false);

  // Animation for loading dots
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev === '...') {return '';}
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots('');
    }
    // Return undefined if no cleanup needed
    return undefined;
  }, [loading]);

  // Debug logging for slider props
  if (__DEV__) {
    logger.debug('AppleSlider props', {
      disabled,
      loading,
      text,
      onSlideComplete: !!onSlideComplete,
      platform: Platform.OS
    }, 'AppleSlider');
  }

  // iOS implementation using PanGestureHandler
  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: sliderValue } }],
    { 
      useNativeDriver: false,
      listener: (event: { nativeEvent: { translationX: number } }) => {
        const translationX = event.nativeEvent.translationX;
        const newValue = Math.max(0, Math.min(translationX, maxSlideDistance));
        sliderValue.setValue(newValue);
      }
    }
  );

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, state } = event.nativeEvent;

    if (state === 2) { // BEGAN
      setIsSliderActive(true);
    } else if (state === 4 || state === 5) { // END or CANCELLED
      if (translationX > maxSlideDistance * 0.6) {
        // Complete the slide
        Animated.timing(sliderValue, {
          toValue: maxSlideDistance,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          if (onSlideComplete) {
            onSlideComplete();
          }
          setTimeout(() => {
            sliderValue.setValue(0);
            setIsSliderActive(false);
          }, 1000);
        });
      } else {
        // Reset to start
        setIsSliderActive(false);
        Animated.timing(sliderValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  // Android implementation using PanResponder
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      return !disabled && !loading;
    },
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only respond to horizontal gestures
      return !disabled && !loading && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderGrant: () => {
      setIsSliderActive(true);
      if (__DEV__) {
        logger.debug('AppleSlider Android: Gesture started', {}, 'AppleSlider');
      }
    },
    onPanResponderMove: (_, gestureState) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
      sliderValue.setValue(newValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (__DEV__) {
        logger.debug('AppleSlider Android: Gesture ended', { 
          dx: gestureState.dx, 
          threshold: maxSlideDistance * 0.6 
        }, 'AppleSlider');
      }
      
      if (gestureState.dx > maxSlideDistance * 0.6) {
        // Complete the slide
        Animated.timing(sliderValue, {
          toValue: maxSlideDistance,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          if (onSlideComplete) {
            onSlideComplete();
          }
          setTimeout(() => {
            sliderValue.setValue(0);
            setIsSliderActive(false);
          }, 1000);
        });
      } else {
        // Reset to start
        setIsSliderActive(false);
        Animated.timing(sliderValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
    onPanResponderTerminate: () => {
      // Handle interruption (e.g., by modal gestures)
      setIsSliderActive(false);
      Animated.timing(sliderValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
  });

  const styles = StyleSheet.create({
    appleSliderGradientBorder: {
      borderRadius: 30,
      padding: 2,
      marginVertical: 10,
    },
    appleSliderContainer: {
      backgroundColor: colors.blackWhite5,
      borderRadius: 28,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    appleSliderTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 28,
    },
    appleSliderText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    appleSliderThumb: {
      position: 'absolute',
      left: 4,
      top: 4,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.white,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  // Determine colors based on state
  const borderColors = disabled 
    ? [colors.white50, colors.white50] as const
    : [colors.gradientStart, colors.gradientEnd] as const;

  const thumbColors = disabled 
    ? [colors.white50, colors.white50] as const
    : [colors.gradientStart, colors.gradientEnd] as const;

  // For signing state, move thumb to right and show full gradient
  const getThumbPosition = () => {
    if (loading) {
      // Move thumb to the very right edge (accounting for thumb width and padding)
      return maxSlideDistance - 4; // 4px padding from the right edge
    }
    return sliderValue;
  };

  const getTrackOpacity = () => {
    if (loading) {
      return 1; // Full gradient for signing
    }
    return sliderValue.interpolate({ 
      inputRange: [0, maxSlideDistance], 
      outputRange: [0, 1] 
    });
  };

  // Render slider content
  const renderSliderContent = () => (
    <View style={[styles.appleSliderContainer, disabled && { opacity: 0.5 }]}>
      <Animated.View style={styles.appleSliderTrack}>
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: getTrackOpacity(),
            borderRadius: 28,
          }}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              ...StyleSheet.absoluteFillObject,
              borderRadius: 28,
            }}
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.appleSliderText,
            { color: loading ? colors.black : colors.white }
          ]}
        >
          {loading ? `Signing${dots}` : text}
        </Animated.Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.appleSliderThumb,
          {
            transform: [{ translateX: getThumbPosition() }],
          },
        ]}
      >
        <LinearGradient
          colors={thumbColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 26,
          }}
        />
        <PhosphorIcon name="CaretRight" size={20} color={colors.black} weight="bold" />
      </Animated.View>
    </View>
  );

  return (
    <LinearGradient
      colors={borderColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.appleSliderGradientBorder, style]}
    >
      {Platform.OS === 'ios' ? (
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleStateChange}
          enabled={!disabled && !loading}
        >
          {renderSliderContent()}
        </PanGestureHandler>
      ) : (
        <View {...panResponder.panHandlers}>
          {renderSliderContent()}
        </View>
      )}
    </LinearGradient>
  );
};

export default AppleSlider;

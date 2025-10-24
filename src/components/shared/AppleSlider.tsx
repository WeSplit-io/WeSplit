import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PhosphorIcon from './PhosphorIcon';
import { colors, spacing } from '../../theme';
import { logger } from '../../services/analytics/loggingService';

interface AppleSliderProps {
  onSlideComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
  style?: any;
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
  const [isSliderActive, setIsSliderActive] = useState(false);
  const [dots, setDots] = useState('');

  // Animation for loading dots
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots('');
    }
  }, [loading]);

  // Debug logging for slider props
  if (__DEV__) {
    logger.debug('AppleSlider props', {
      disabled,
      loading,
      text,
      onSlideComplete: !!onSlideComplete
    }, 'AppleSlider');
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      return !disabled && !loading;
    },
    onMoveShouldSetPanResponder: () => {
      return !disabled && !loading;
    },
    onPanResponderGrant: () => {
      setIsSliderActive(true);
    },
    onPanResponderMove: (_, gestureState) => {
      const newValue = Math.max(0, Math.min(gestureState.dx, maxSlideDistance));
      sliderValue.setValue(newValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > maxSlideDistance * 0.6) {
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
        Animated.timing(sliderValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setIsSliderActive(false);
        });
      }
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
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
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

  return (
    <LinearGradient
      colors={borderColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.appleSliderGradientBorder, style]}
    >
      <View style={[styles.appleSliderContainer, disabled && { opacity: 0.5 }]} {...panResponder.panHandlers}>
        <Animated.View style={styles.appleSliderTrack}>
          <Animated.View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: getTrackOpacity() as any,
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
    </LinearGradient>
  );
};

export default AppleSlider;

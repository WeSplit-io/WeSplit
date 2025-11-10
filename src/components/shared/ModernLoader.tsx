import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

interface ModernLoaderProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  color?: 'primary' | 'secondary' | 'white';
  style?: StyleProp<ViewStyle>;
}

const ModernLoader: React.FC<ModernLoaderProps> = ({ 
  size = 'medium', 
  text, 
  color = 'primary',
  style 
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rotation animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // pulseValue and spinValue are Animated.Value objects that shouldn't be in dependencies
  }, []);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: 40,
          spinner: 30,
          text: 12,
        };
      case 'large':
        return {
          container: 80,
          spinner: 60,
          text: 16,
        };
      default: // medium
        return {
          container: 60,
          spinner: 45,
          text: 14,
        };
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case 'secondary':
        return {
          gradient: [colors.white50, colors.white10] as const,
          text: colors.darkGray,
        };
      case 'white':
        return {
          gradient: [colors.white, colors.white80] as const,
          text: colors.white,
        };
      default: // primary
        return {
          gradient: [colors.gradientStart, colors.gradientEnd] as const,
          text: colors.white,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const colorStyles = getColorStyles();

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    spinnerContainer: {
      width: sizeStyles.container,
      height: sizeStyles.container,
      justifyContent: 'center',
      alignItems: 'center',
    },
    spinner: {
      width: sizeStyles.spinner,
      height: sizeStyles.spinner,
      borderRadius: sizeStyles.spinner / 2,
      borderWidth: 3,
      borderColor: 'transparent',
      borderTopColor: colors.gradientStart,
      borderRightColor: colors.gradientEnd,
    },
    gradientSpinner: {
      width: sizeStyles.spinner,
      height: sizeStyles.spinner,
      borderRadius: sizeStyles.spinner / 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    innerCircle: {
      width: sizeStyles.spinner - 6,
      height: sizeStyles.spinner - 6,
      borderRadius: (sizeStyles.spinner - 6) / 2,
      backgroundColor: colors.surface,
    },
    text: {
      marginTop: 12,
      fontSize: sizeStyles.text,
      fontWeight: '500',
      color: colorStyles.text,
      textAlign: 'center',
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.spinnerContainer}>
        <Animated.View
          style={[
            styles.gradientSpinner,
            {
              transform: [
                { rotate: spin },
                { scale: pulseValue },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={colorStyles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientSpinner}
          >
            <View style={styles.innerCircle} />
          </LinearGradient>
        </Animated.View>
      </View>
      {text && (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
};

export default ModernLoader;

import React, { useEffect } from 'react';
import { View, Image, Animated, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN, GRAY } from './SplashScreen.styles';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();
  const progress = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: false,
    }).start();
    const timeout = setTimeout(() => {
      navigation.replace('GetStarted');
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const barWidth = 160;
  const barHeight = 10;

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={require('../../assets/WeSplitLogo.png')} style={styles.logo} />
      {/* Progress Bar */}
      <View style={[styles.barContainer, { width: barWidth, height: barHeight }]}> 
        <Animated.View style={[styles.barGreen, { width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, barWidth] }) }]} />
        <View style={[styles.barGray, { left: 0, width: barWidth, height: barHeight, position: 'absolute' }]} />
      </View>
      {/* Version Text */}
      <Text style={styles.version}>Version 1.0.0</Text>
    </View>
  );
};

export default SplashScreen; 
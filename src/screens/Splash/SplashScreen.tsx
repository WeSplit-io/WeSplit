import React, { useEffect } from 'react';
import { View, Image, Text, StatusBar } from 'react-native';
import { styles } from './styles';
import { colors } from '../../theme';

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('GetStarted');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.darkBackground} barStyle="light-content" />
      
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../../assets/WeSplitLogoName.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.taglineContainer}>
        <Text style={styles.tagline}>Split Expenses Seamlessly</Text>
        <Text style={styles.subtitle}>Track, Split, and Settle with Friends</Text>
      </View>
    </View>
  );
};

export default SplashScreen; 
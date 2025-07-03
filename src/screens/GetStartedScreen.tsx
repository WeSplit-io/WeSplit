import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { styles, BG_COLOR, GREEN } from './GetStartedScreen.styles';

const GetStartedScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      {/* Logo and swirl */}
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>
          We<Text style={styles.logoSplit}>Split</Text>
        </Text>
      </View>
      <Image source={require('../../assets/GetStartedImage.png')} style={styles.hero} />
      <View style={{ height: 32 }} />
      <Text style={styles.tagline}>Split bills. </Text>
      <Text style={{...styles.tagline, marginBottom: 12}}>Share crypto.</Text>
      <Text style={styles.description}>
        Manage group expenses and settle up instantly, without the hassle.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AuthMethods')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
};

export default GetStartedScreen; 
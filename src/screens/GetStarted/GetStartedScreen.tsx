import React from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, StatusBar, Linking } from 'react-native';
import { styles } from './styles';
import { colors } from '../../theme';

interface GetStartedScreenProps {
  navigation: any;
}

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.darkBackground} barStyle="light-content" />
      
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>
            We<Text style={styles.logoSplit}>Split</Text>
          </Text>
        </View>

        {/* Hero Spiral Image */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2FGetStartedImage.png?alt=media&token=ef899285-2d3e-4d85-90a4-202a979cbc09' }} 
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Main Content */}
        <View style={styles.messageSection}>
          <Text style={styles.headline}>Split bills.</Text>
          <Text style={styles.headline}>Share crypto.</Text>
          
          <Text style={styles.subtitle}>
            Manage group expenses and settle up instantly, without the hassle.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={() => navigation.navigate('AuthMethods')}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        {/* Help Link */}
        <View style={styles.helpSection}>
          <TouchableOpacity onPress={() => Linking.openURL('https://t.me/wesplit_support_bot')}>
            <Text style={styles.helpText}>Need help?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default GetStartedScreen; 
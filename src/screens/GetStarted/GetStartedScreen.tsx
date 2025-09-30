import React from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, StatusBar, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      

        {/* Hero Spiral Image */}
        <View style={styles.heroSection}>
          <Image 
            source={require('../../../assets/bg-getstarted.png')} 
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Main Content */}
        <View style={styles.messageSection}>
          <Text style={styles.headline}>Split everything.</Text>
          <Text style={styles.headline}>Pay in crypto.</Text>
          
          <Text style={styles.subtitle}>
          One tap to settle, share, and move on.
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => navigation.navigate('AuthMethods')}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.getStartedButtonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        
      </View>
    </SafeAreaView>
  );
};

export default GetStartedScreen; 
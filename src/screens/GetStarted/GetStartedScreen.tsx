import React from 'react';
import { View, Text, Image, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';
import { colors } from '../../theme';
import { Container } from '../../components/shared';
import Button from '../../components/shared/Button';

interface GetStartedScreenProps {
  navigation: any;
}

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ navigation }) => {
  return (
    <Container>
      <StatusBar backgroundColor={colors.black} barStyle="light-content" />
      
      <View style={styles.content}>
      

        {/* Hero Spiral Image */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Fbg-getstarted.png?alt=media&token=5af05446-57a9-4b7d-9689-446fd382f5a3' }} 
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
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('AuthMethods')}
            variant="primary"
            size="large"
            fullWidth={true}
          />
        </View>

        
      </View>
    </Container>
  );
};

export default GetStartedScreen; 
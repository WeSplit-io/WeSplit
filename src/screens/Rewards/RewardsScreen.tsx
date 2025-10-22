import React from 'react';
import { View, Text, Platform, Image } from 'react-native';
import { colors } from '../../theme';
import NavBar from '../../components/NavBar';
import { Container, Header } from '../../components/shared';

const RewardsScreen: React.FC<any> = ({ navigation }) => {
  const handleBackPress = () => {
    if (Platform.OS === 'android') {
      navigation.navigate('Dashboard');
    } else {
      navigation.goBack();
    }
  };

  return (
    <Container>
      <Header
        title="Rewards"
        onBackPress={handleBackPress}
        backgroundColor={colors.black}
      />

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 8, paddingBottom: 100 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Freward-icon.png?alt=media&token=02dc6cb6-7c94-463e-8dd5-9ed1710b9f1a' }} style={{ width: 72, height: 72, marginBottom: 16, opacity: 0.9 }} />
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Coming soon</Text>
          <Text style={{ color: colors.white70, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>Earn rewards for using WeSplit. Check back here for perks and bonuses.</Text>
        </View>
      </View>

      <NavBar currentRoute="Rewards" navigation={navigation} />
    </Container>
  );
};

export default RewardsScreen;



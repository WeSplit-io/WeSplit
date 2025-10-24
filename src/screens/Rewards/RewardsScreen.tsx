import React from 'react';
import { View, Text, Platform, Image } from 'react-native';
import { colors } from '../../theme';
import NavBar from '../../components/shared/NavBar';
import { Container, Header } from '../../components/shared';
import PhosphorIcon from '../../components/shared/PhosphorIcon';

const RewardsScreen: React.FC<any> = ({ navigation }) => {
 
  return (
    <Container>
      <Header
        title="Rewards"
        showBackButton={false}
        backgroundColor={colors.black}
      />

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 8, paddingBottom: 100 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <PhosphorIcon name="Medal" size={72} color={colors.white} style={{ marginBottom: 16, opacity: 0.9 }} />
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Coming soon</Text>
          <Text style={{ color: colors.white70, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>Earn rewards for using WeSplit. Check back here for perks and bonuses.</Text>
        </View>
      </View>
      <NavBar currentRoute="Rewards" navigation={navigation} />
    </Container>
  );
};

export default RewardsScreen;

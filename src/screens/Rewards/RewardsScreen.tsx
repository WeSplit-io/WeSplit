import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import NavBar from '../../components/NavBar';

const RewardsScreen: React.FC<any> = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#061113' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../../../assets/chevron-left.png')} style={{ width: 20, height: 20, tintColor: colors.white }} />
        </TouchableOpacity>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '600' }}>Rewards</Text>
        <View style={{ width: 36, height: 36 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../../../assets/award-icon.png')} style={{ width: 72, height: 72, marginBottom: 16, opacity: 0.9 }} />
          <Text style={{ color: colors.white, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Coming soon</Text>
          <Text style={{ color: colors.white70, fontSize: 14, textAlign: 'center' }}>Earn rewards for using WeSplit. Check back here for perks and bonuses.</Text>
        </View>
      </View>

      <NavBar currentRoute="Rewards" navigation={navigation} />
    </SafeAreaView>
  );
};

export default RewardsScreen;



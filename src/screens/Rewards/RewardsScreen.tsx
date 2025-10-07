import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import NavBar from '../../components/NavBar';

const RewardsScreen: React.FC<any> = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.black }}>
        <TouchableOpacity onPress={() => {
          if (Platform.OS === 'android') {
            navigation.navigate('Dashboard');
          } else {
            navigation.goBack();
          }
        }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../../../assets/chevron-left.png')} style={{ width: 20, height: 20, tintColor: colors.white }} />
        </TouchableOpacity>
        <Text style={{ color: colors.white, fontSize: 20, fontWeight: '600' }}>Rewards</Text>
        <View style={{ width: 40, height: 40 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 8, paddingBottom: 100 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/wesplit-35186.firebasestorage.app/o/visuals-app%2Freward-icon.png?alt=media&token=02dc6cb6-7c94-463e-8dd5-9ed1710b9f1a' }} style={{ width: 72, height: 72, marginBottom: 16, opacity: 0.9 }} />
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Coming soon</Text>
          <Text style={{ color: colors.white70, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>Earn rewards for using WeSplit. Check back here for perks and bonuses.</Text>
        </View>
      </View>

      <NavBar currentRoute="Rewards" navigation={navigation} />
    </SafeAreaView>
  );
};

export default RewardsScreen;



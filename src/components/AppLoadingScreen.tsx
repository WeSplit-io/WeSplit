import React from 'react';
import { View, StatusBar } from 'react-native';
import { colors } from '../theme';

/**
 * AppLoadingScreen - Prevents white screen flash during app initialization
 * This component provides an immediate dark background while the app loads
 */
const AppLoadingScreen: React.FC = () => {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: colors.black,
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <StatusBar backgroundColor={colors.black} barStyle="light-content" />
    </View>
  );
};

export default AppLoadingScreen;

import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import styles from './styles';

const LanguageScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.header}>Language Selection</Text>
    <View style={styles.content}>
      <Text style={styles.text}>Select your preferred language here. (Coming soon)</Text>
    </View>
  </SafeAreaView>
);

export default LanguageScreen; 
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const LanguageScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.header}>Language Selection</Text>
    <View style={styles.content}>
      <Text>Select your preferred language here. (Coming soon)</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#212121' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#A5EA15', margin: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default LanguageScreen; 
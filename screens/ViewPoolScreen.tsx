import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ViewPoolScreen = () => (
  <View style={styles.container}>
    <Text>View Pool Screen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default ViewPoolScreen; 
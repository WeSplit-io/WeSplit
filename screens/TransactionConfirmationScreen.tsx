import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TransactionConfirmationScreen = () => (
  <View style={styles.container}>
    <Text>Transaction Confirmation Screen</Text>
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

export default TransactionConfirmationScreen; 
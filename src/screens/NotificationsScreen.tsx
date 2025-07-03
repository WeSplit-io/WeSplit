import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const NotificationsScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.header}>Notifications</Text>
    <View style={styles.content}>
      <Text>Manage your notification preferences here. (Coming soon)</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#212121' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#A5EA15', margin: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default NotificationsScreen; 
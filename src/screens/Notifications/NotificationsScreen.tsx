import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import styles from './styles';

const NotificationsScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.header}>Notifications</Text>
    <View style={styles.content}>
      <Text style={styles.text}>Manage your notification preferences here. (Coming soon)</Text>
    </View>
  </SafeAreaView>
);

export default NotificationsScreen; 
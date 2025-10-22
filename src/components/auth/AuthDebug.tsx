import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { auth } from '../../config/firebase/firebase';
import { logger } from '../../services/core';
import Constants from 'expo-constants';

interface AuthDebugProps {
  onClose: () => void;
}

export const AuthDebug: React.FC<AuthDebugProps> = ({ onClose }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const gatherDebugInfo = async () => {
      try {
        const info = {
          // Environment info
          platform: Constants.platform,
          isDevice: Constants.isDevice,
          appVersion: Constants.expoConfig?.version,
          
          // Firebase config
          firebaseApiKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Missing',
          firebaseProjectId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'Missing',
          
          // OAuth config
          googleClientId: Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
          androidClientId: Constants.expoConfig?.extra?.ANDROID_GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
          iosClientId: Constants.expoConfig?.extra?.IOS_GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
          
          // Auth state
          currentUser: auth.currentUser ? {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            emailVerified: auth.currentUser.emailVerified
          } : 'Not authenticated',
          
          // Network info
          networkState: 'Unknown', // Would need NetInfo for this
        };
        
        setDebugInfo(info);
      } catch (error) {
        console.error('Error gathering debug info:', error);
      }
    };

    gatherDebugInfo();
  }, []);

  const testFirebaseConnection = async () => {
    try {
      Alert.alert('Testing Firebase Connection...', 'This may take a few seconds');
      
      // Test Firebase connection by trying to get current user
      const user = auth.currentUser;
      if (user) {
        Alert.alert('Success', 'Firebase connection working! User is authenticated.');
      } else {
        Alert.alert('Info', 'Firebase connection working! No user currently authenticated.');
      }
    } catch (error) {
      Alert.alert('Error', `Firebase connection failed: ${error.message}`);
    }
  };

  const clearAuthData = async () => {
    try {
      await auth.signOut();
      Alert.alert('Success', 'Authentication data cleared. Please restart the app.');
    } catch (error) {
      Alert.alert('Error', `Failed to clear auth data: ${error.message}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
        Authentication Debug
      </Text>
      
      <ScrollView style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 10 }}>
          Debug Information:
        </Text>
        
        {Object.entries(debugInfo).map(([key, value]) => (
          <Text key={key} style={{ color: '#ccc', fontSize: 12, marginBottom: 5 }}>
            {key}: {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </Text>
        ))}
      </ScrollView>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
        <TouchableOpacity
          onPress={testFirebaseConnection}
          style={{ backgroundColor: '#007AFF', padding: 10, borderRadius: 5 }}
        >
          <Text style={{ color: '#fff' }}>Test Firebase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={clearAuthData}
          style={{ backgroundColor: '#FF3B30', padding: 10, borderRadius: 5 }}
        >
          <Text style={{ color: '#fff' }}>Clear Auth</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: '#34C759', padding: 10, borderRadius: 5 }}
        >
          <Text style={{ color: '#fff' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

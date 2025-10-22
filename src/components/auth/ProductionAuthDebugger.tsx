import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { logger } from '../../services/core';

interface ProductionAuthDebuggerProps {
  onClose: () => void;
}

export const ProductionAuthDebugger: React.FC<ProductionAuthDebuggerProps> = ({ onClose }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    gatherDebugInfo();
  }, []);

  const getEnvVar = (key: string): string => {
    if (process.env[key]) {return process.env[key]!;}
    if (process.env[`EXPO_PUBLIC_${key}`]) {return process.env[`EXPO_PUBLIC_${key}`]!;}
    if (Constants.expoConfig?.extra?.[key]) {return Constants.expoConfig.extra[key];}
    if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) {return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];}
    if ((Constants.manifest as any)?.extra?.[key]) {return (Constants.manifest as any).extra[key];}
    if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) {return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];}
    return '';
  };

  const gatherDebugInfo = async () => {
    try {
      const info = {
        // App Info
        app: {
          version: Constants.expoConfig?.version || 'Unknown',
          buildNumber: Constants.expoConfig?.android?.versionCode || 'Unknown',
          bundleId: Constants.expoConfig?.android?.package || 'Unknown',
          isProduction: Constants.expoConfig?.extra?.APP_ENV === 'production',
          isDevelopment: Constants.expoConfig?.extra?.APP_ENV === 'development'
        },
        
        // Environment Variables
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'Not set',
          APP_ENV: getEnvVar('APP_ENV') || 'Not set',
          hasFirebaseApiKey: !!getEnvVar('FIREBASE_API_KEY'),
          hasFirebaseProjectId: !!getEnvVar('FIREBASE_PROJECT_ID'),
          hasGoogleClientId: !!getEnvVar('GOOGLE_CLIENT_ID'),
          hasAndroidClientId: !!getEnvVar('ANDROID_GOOGLE_CLIENT_ID'),
          hasHeliusApiKey: !!getEnvVar('HELIUS_API_KEY')
        },
        
        // Firebase Config
        firebase: {
          apiKey: getEnvVar('FIREBASE_API_KEY') ? `${getEnvVar('FIREBASE_API_KEY').substring(0, 20)}...` : 'Missing',
          authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN') || 'Missing',
          projectId: getEnvVar('FIREBASE_PROJECT_ID') || 'Missing',
          appId: getEnvVar('FIREBASE_APP_ID') ? `${getEnvVar('FIREBASE_APP_ID').substring(0, 20)}...` : 'Missing'
        },
        
        // OAuth Config
        oauth: {
          googleWebClientId: getEnvVar('GOOGLE_CLIENT_ID') ? `${getEnvVar('GOOGLE_CLIENT_ID').substring(0, 20)}...` : 'Missing',
          androidClientId: getEnvVar('ANDROID_GOOGLE_CLIENT_ID') ? `${getEnvVar('ANDROID_GOOGLE_CLIENT_ID').substring(0, 20)}...` : 'Missing',
          iosClientId: getEnvVar('IOS_GOOGLE_CLIENT_ID') ? `${getEnvVar('IOS_GOOGLE_CLIENT_ID').substring(0, 20)}...` : 'Missing'
        },
        
        // Constants Info
        constants: {
          expoConfigExists: !!Constants.expoConfig,
          manifestExists: !!Constants.manifest,
          extraKeys: Constants.expoConfig?.extra ? Object.keys(Constants.expoConfig.extra) : [],
          manifestExtraKeys: (Constants.manifest as any)?.extra ? Object.keys((Constants.manifest as any).extra) : []
        }
      };
      
      setDebugInfo(info);
    } catch (error) {
      console.error('Error gathering debug info:', error);
      setDebugInfo({ error: error.message });
    }
  };

  const runTests = async () => {
    setIsLoading(true);
    const results: any = {};
    
    try {
      // Test Firebase connection
      const { auth, db } = await import('../../config/firebase/firebase');
      if (auth) {
        results.firebase = { success: true, message: 'Firebase auth initialized' };
      } else {
        results.firebase = { success: false, message: 'Firebase auth not initialized' };
      }
    } catch (error) {
      results.firebase = { success: false, error: error.message };
    }
    
    try {
      // Test network connectivity
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      results.network = { success: response.ok, status: response.status };
    } catch (error) {
      results.network = { success: false, error: error.message };
    }
    
    try {
      // Test Firebase project connectivity
      const response = await fetch(`https://${getEnvVar('FIREBASE_PROJECT_ID')}.firebaseapp.com`, { method: 'HEAD' });
      results.firebaseProject = { success: response.ok, status: response.status };
    } catch (error) {
      results.firebaseProject = { success: false, error: error.message };
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testEmailAuth = async () => {
    try {
      const { signInWithEmail } = await import('../../services/auth');
      // Test with a dummy email to see if the service is working
      Alert.alert('Email Auth Test', 'This will test the email authentication service. Check console for results.');
      console.log('Testing email auth service...');
    } catch (error) {
      Alert.alert('Error', `Email auth test failed: ${error.message}`);
    }
  };

  const clearAppData = async () => {
    Alert.alert(
      'Clear App Data',
      'This will clear all stored authentication data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.clear();
              
              const { auth } = await import('../../config/firebase/firebase');
              if (auth) {
                await auth.signOut();
              }
              
              Alert.alert('Success', 'App data cleared. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', `Failed to clear app data: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Production Auth Debugger</Text>
        
        <ScrollView style={styles.scrollView}>
          <Text style={styles.sectionTitle}>Debug Information:</Text>
          
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              {JSON.stringify(debugInfo, null, 2)}
            </Text>
          </View>
          
          {Object.keys(testResults).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Test Results:</Text>
              
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>
                  {JSON.stringify(testResults, null, 2)}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={runTests}
            disabled={isLoading}
            style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Run Tests</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={testEmailAuth}
            style={[styles.button, styles.secondaryButton]}
          >
            <Text style={styles.buttonText}>Test Email Auth</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={clearAppData}
            style={[styles.button, styles.dangerButton]}
          >
            <Text style={styles.buttonText}>Clear Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={onClose}
            style={[styles.button, styles.successButton]}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugContainer: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  debugText: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#FF9500',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});


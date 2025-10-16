import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { auth } from '../../config/firebase';
import { ProductionAuthService } from '../../services/ProductionAuthService';
import { logger } from '../../services/loggingService';

interface EnvironmentStatus {
  isProduction: boolean;
  issues: string[];
  recommendations: string[];
  environmentStatus: any;
}

const AuthDebugScreen: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Unknown');

  const productionAuthService = ProductionAuthService.getInstance();

  useEffect(() => {
    runDiagnostics();
    checkFirebaseStatus();
  }, []);

  const checkFirebaseStatus = async () => {
    try {
      if (auth) {
        setFirebaseStatus('✅ Firebase initialized successfully');
      } else {
        setFirebaseStatus('❌ Firebase not initialized');
      }
    } catch (error) {
      setFirebaseStatus('❌ Firebase initialization error');
      logger.error('Firebase status check failed', error, 'AuthDebugScreen');
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const results = await productionAuthService.diagnoseAuthIssues();
      setDiagnostics(results);
      logger.info('Auth diagnostics completed', results, 'AuthDebugScreen');
    } catch (error) {
      logger.error('Auth diagnostics failed', error, 'AuthDebugScreen');
      Alert.alert('Diagnostics Error', 'Failed to run authentication diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([runDiagnostics(), checkFirebaseStatus()]);
    setRefreshing(false);
  };

  const clearAuthData = () => {
    Alert.alert(
      'Clear Authentication Data',
      'This will clear all stored authentication data. You will need to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear AsyncStorage auth data
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.multiRemove([
                'userToken',
                'userData',
                'authState',
                'firebaseUser',
              ]);
              
              // Sign out from Firebase
              if (auth.currentUser) {
                await auth.signOut();
              }
              
              Alert.alert('Success', 'Authentication data cleared successfully');
              logger.info('Authentication data cleared', null, 'AuthDebugScreen');
            } catch (error) {
              logger.error('Failed to clear auth data', error, 'AuthDebugScreen');
              Alert.alert('Error', 'Failed to clear authentication data');
            }
          },
        },
      ]
    );
  };

  const testNetworkConnectivity = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD', 
        timeout: 5000 
      });
      
      if (response.ok) {
        Alert.alert('Network Test', '✅ Network connectivity is working');
      } else {
        Alert.alert('Network Test', '❌ Network connectivity issues detected');
      }
    } catch (error) {
      Alert.alert('Network Test', '❌ Network connectivity test failed');
    } finally {
      setLoading(false);
    }
  };

  const testFirebaseConnectivity = async () => {
    setLoading(true);
    try {
      const firebaseConfig = Constants.expoConfig?.extra;
      if (firebaseConfig?.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
        const response = await fetch(
          `https://${firebaseConfig.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
          { method: 'HEAD', timeout: 5000 }
        );
        
        if (response.ok) {
          Alert.alert('Firebase Test', '✅ Firebase project is accessible');
        } else {
          Alert.alert('Firebase Test', '❌ Firebase project is not accessible');
        }
      } else {
        Alert.alert('Firebase Test', '❌ Firebase project ID not configured');
      }
    } catch (error) {
      Alert.alert('Firebase Test', '❌ Firebase connectivity test failed');
    } finally {
      setLoading(false);
    }
  };

  const renderEnvironmentVariables = () => {
    const envVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
      'ANDROID_GOOGLE_CLIENT_ID',
      'IOS_GOOGLE_CLIENT_ID',
      'EXPO_PUBLIC_APPLE_CLIENT_ID',
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment Variables</Text>
        {envVars.map((varName) => {
          const value = Constants.expoConfig?.extra?.[varName];
          const isConfigured = value && value !== 'undefined' && value !== '';
          
          return (
            <View key={varName} style={styles.envVarRow}>
              <Text style={styles.envVarName}>{varName}</Text>
              <Text style={[styles.envVarStatus, isConfigured ? styles.success : styles.error]}>
                {isConfigured ? '✅ Configured' : '❌ Missing'}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderIssues = () => {
    if (!diagnostics?.issues.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issues Found</Text>
        {diagnostics.issues.map((issue, index) => (
          <View key={index} style={styles.issueRow}>
            <Text style={styles.issueText}>❌ {issue}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!diagnostics?.recommendations.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        {diagnostics.recommendations.map((recommendation, index) => (
          <View key={index} style={styles.recommendationRow}>
            <Text style={styles.recommendationText}>💡 {recommendation}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Authentication Debug</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firebase Status</Text>
          <Text style={styles.statusText}>{firebaseStatus}</Text>
        </View>

        {renderEnvironmentVariables()}
        {renderIssues()}
        {renderRecommendations()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={testNetworkConnectivity}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Test Network Connectivity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.disabledButton]}
            onPress={testFirebaseConnectivity}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Test Firebase Connectivity</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={clearAuthData}
          >
            <Text style={styles.actionButtonText}>Clear Authentication Data</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Running diagnostics...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  envVarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  envVarName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  envVarStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  issueRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  issueText: {
    fontSize: 14,
    color: '#F44336',
  },
  recommendationRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recommendationText: {
    fontSize: 14,
    color: '#FF9800',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default AuthDebugScreen;
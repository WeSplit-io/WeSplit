import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductionAuthService } from '../../services/ProductionAuthService';
import { logger } from '../../services/loggingService';

export const AuthDebugScreen: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const authService = ProductionAuthService.getInstance();
      const diagnosis = await authService.diagnoseAuthIssues();
      setDebugInfo(diagnosis);
    } catch (error) {
      console.error('Diagnosis failed:', error);
      setDebugInfo({ error: error.message });
    }
    setIsLoading(false);
  };

  const runTests = async () => {
    setIsLoading(true);
    const results: any = {};
    
    try {
      const authService = ProductionAuthService.getInstance();
      
      // Test Firebase auth
      const firebaseTest = await authService.testFirebaseAuth();
      results.firebase = firebaseTest;
      
      // Test OAuth config
      const oauthTest = await authService.testOAuthConfig();
      results.oauth = oauthTest;
      
      setTestResults(results);
    } catch (error) {
      console.error('Tests failed:', error);
      setTestResults({ error: error.message });
    }
    setIsLoading(false);
  };

  const clearAuthData = async () => {
    Alert.alert(
      'Clear Authentication Data',
      'This will clear all stored authentication data and sign out. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const authService = ProductionAuthService.getInstance();
              const result = await authService.clearAuthData();
              
              if (result.success) {
                Alert.alert('Success', 'Authentication data cleared successfully. Please restart the app.');
              } else {
                Alert.alert('Error', `Failed to clear data: ${result.error}`);
              }
            } catch (error) {
              Alert.alert('Error', `Failed to clear data: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const showRecommendations = () => {
    const authService = ProductionAuthService.getInstance();
    const recommendations = authService.getProductionRecommendations();
    
    Alert.alert(
      'Production Recommendations',
      recommendations.join('\n\n'),
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔧 Authentication Debug</Text>
        <Text style={styles.subtitle}>Production APK Troubleshooting</Text>
        
        <ScrollView style={styles.scrollView}>
          {debugInfo && (
            <>
              <Text style={styles.sectionTitle}>📊 Diagnosis Results:</Text>
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>
                  {JSON.stringify(debugInfo, null, 2)}
                </Text>
              </View>
            </>
          )}
          
          {Object.keys(testResults).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🧪 Test Results:</Text>
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
            onPress={runDiagnostics}
            disabled={isLoading}
            style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>🔍 Run Diagnostics</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={runTests}
            disabled={isLoading}
            style={[styles.button, styles.secondaryButton, isLoading && styles.disabledButton]}
          >
            <Text style={styles.buttonText}>🧪 Run Tests</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={clearAuthData}
            style={[styles.button, styles.dangerButton]}
          >
            <Text style={styles.buttonText}>🗑️ Clear Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={showRecommendations}
            style={[styles.button, styles.infoButton]}
          >
            <Text style={styles.buttonText}>💡 Recommendations</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
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
    minWidth: 100,
    alignItems: 'center',
    marginBottom: 10,
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
  infoButton: {
    backgroundColor: '#5856D6',
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

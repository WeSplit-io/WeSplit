/**
 * Wallet Persistence Test Screen
 * 
 * Development-only screen for testing wallet persistence
 * Access via: navigation.navigate('WalletPersistenceTest')
 * 
 * WARNING: This screen should be removed or disabled in production builds
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import WalletPersistenceTester, { TestResult } from '../../utils/testing/walletPersistenceTester';
import { logger } from '../../services/analytics/loggingService';

const WalletPersistenceTestScreen: React.FC = () => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [storageStatus, setStorageStatus] = useState<any>(null);

  const userId = currentUser?.id || '';
  const userEmail = currentUser?.email || '';

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    setIsRunning(true);
    try {
      logger.info(`Running test: ${testName}`, { userId }, 'WalletPersistenceTestScreen');
      const result = await testFn();
      setResults(prev => [...prev, result]);
      
      Alert.alert(
        result.success ? '✅ Test Passed' : '❌ Test Failed',
        result.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const runFullSuite = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      const testResults = await WalletPersistenceTester.runFullTestSuite(userId, userEmail);
      setResults(testResults);
      
      const passed = testResults.filter(r => r.success).length;
      const total = testResults.length;
      
      Alert.alert(
        'Test Suite Complete',
        `${passed}/${total} tests passed\n\nSee results below for details.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const checkStorageStatus = async () => {
    setIsRunning(true);
    try {
      const status = await WalletPersistenceTester.getStorageStatus(userId, userEmail);
      setStorageStatus(status);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const clearAsyncStorage = async () => {
    Alert.alert(
      'Clear AsyncStorage?',
      'This will simulate an app update scenario. Your wallet should persist via Keychain/SecureStore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsRunning(true);
            try {
              await WalletPersistenceTester.testAsyncStorageClear(userId, userEmail);
              Alert.alert('Success', 'AsyncStorage cleared. Check if wallet still works.');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setIsRunning(false);
            }
          }
        }
      ]
    );
  };

  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to run tests</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet Persistence Tests</Text>
        <Text style={styles.subtitle}>Development Only</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Info</Text>
        <Text style={styles.info}>User ID: {userId.substring(0, 16)}...</Text>
        <Text style={styles.info}>Email: {userEmail || 'Not available'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Tests</Text>
        
        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={checkStorageStatus}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Check Storage Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={() => runTest('Storage Verification', () => 
            WalletPersistenceTester.testStorageVerification(userId, userEmail)
          )}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test Storage Verification</Text>
        </TouchableOpacity>

        {userEmail && (
          <TouchableOpacity
            style={[styles.button, isRunning && styles.buttonDisabled]}
            onPress={() => runTest('Email Storage', () => 
              WalletPersistenceTester.testEmailBasedStorage(userId, userEmail)
            )}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>Test Email-Based Storage</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.buttonWarning, isRunning && styles.buttonDisabled]}
          onPress={clearAsyncStorage}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test 1: App Update (Clear AsyncStorage)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, isRunning && styles.buttonDisabled]}
          onPress={async () => {
            Alert.alert(
              '⚠️ Complete Data Clear Test',
              'This will clear ALL data (Keychain, MMKV, SecureStore, AsyncStorage) to simulate app deletion.\n\nWARNING: This will delete your wallet credentials!\n\nYou will need cloud backup or seed phrase to recover.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear All Data',
                  style: 'destructive',
                  onPress: async () => {
                    setIsRunning(true);
                    try {
                      const result = await WalletPersistenceTester.testCompleteDataClear(userId, userEmail);
                      setResults(prev => [...prev, result]);
                      
                      Alert.alert(
                        result.success ? '✅ Test Complete' : '❌ Test Failed',
                        result.message + '\n\n' + (result.details?.nextSteps || ''),
                        [{ text: 'OK' }]
                      );
                    } catch (error) {
                      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
                    } finally {
                      setIsRunning(false);
                    }
                  }
                }
              ]
            );
          }}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>Test 2: App Deletion (Clear ALL Data)</Text>
        </TouchableOpacity>

        {userEmail && (
          <TouchableOpacity
            style={[styles.button, isRunning && styles.buttonDisabled]}
            onPress={() => runTest('UserId Change', () => 
              WalletPersistenceTester.testUserIdChange(userId, userEmail)
            )}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>Test Email-Based Recovery</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, isRunning && styles.buttonDisabled]}
          onPress={runFullSuite}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Run Full Test Suite (App Update)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, isRunning && styles.buttonDisabled]}
          onPress={async () => {
            Alert.prompt(
              'Cloud Backup Password',
              'Enter your cloud backup password to test recovery:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Test Recovery',
                  onPress: async (password) => {
                    if (!password) {
                      Alert.alert('Error', 'Password is required');
                      return;
                    }
                    setIsRunning(true);
                    try {
                      const results = await WalletPersistenceTester.runCompleteDeletionTestSuite(userId, userEmail, password);
                      setResults(prev => [...prev, ...results]);
                      
                      const passed = results.filter(r => r.success).length;
                      Alert.alert(
                        'Deletion Test Complete',
                        `${passed}/${results.length} tests passed\n\nSee results below for details.`,
                        [{ text: 'OK' }]
                      );
                    } catch (error) {
                      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
                    } finally {
                      setIsRunning(false);
                    }
                  }
                }
              ],
              'secure-text'
            );
          }}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Run Deletion Test Suite (Requires Backup)</Text>
          )}
        </TouchableOpacity>
      </View>

      {storageStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Status</Text>
          <Text style={styles.statusText}>
            SecureVault: {storageStatus.storage.secureVault ? '✅' : '❌'}
          </Text>
          <Text style={styles.statusText}>
            SecureStore: {storageStatus.storage.secureStore ? '✅' : '❌'}
          </Text>
          {userEmail && (
            <Text style={styles.statusText}>
              Email Hash: {storageStatus.storage.emailHash ? '✅' : '❌'}
            </Text>
          )}
          <Text style={styles.statusText}>
            UserId Recovery: {storageStatus.recovery.userIdBased ? '✅' : '❌'}
          </Text>
          {userEmail && (
            <Text style={styles.statusText}>
              Email Recovery: {storageStatus.recovery.emailBased ? '✅' : '❌'}
            </Text>
          )}
        </View>
      )}

      {results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={[styles.resultTitle, result.success ? styles.success : styles.failure]}>
                {result.success ? '✅' : '❌'} {result.testName}
              </Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.details && (
                <Text style={styles.resultDetails}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ⚠️ Development Only - Remove in Production
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 20,
    backgroundColor: '#FFF',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#34C759',
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  resultItem: {
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  success: {
    color: '#34C759',
  },
  failure: {
    color: '#FF3B30',
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultDetails: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 50,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default WalletPersistenceTestScreen;


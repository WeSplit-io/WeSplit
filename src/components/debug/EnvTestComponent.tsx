/**
 * Environment Test Component
 * Add this component temporarily to your app to test environment variables
 * Remove this component before production deployment
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
// Removed import - runtimeEnvTest is in OLD_LEGACY and not available
// import { runAllEnvironmentTests, testEnvironmentVariables } from '../utils/runtimeEnvTest';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export const EnvTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Capture console output - intentionally intercepting console for test output capture
    // eslint-disable-next-line no-console
    const originalLog = console.log;
    // eslint-disable-next-line no-console
    const originalError = console.error;
    const logs: string[] = [];
    
    // eslint-disable-next-line no-console
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    // eslint-disable-next-line no-console
    console.error = (...args) => {
      logs.push('ERROR: ' + args.join(' '));
      originalError(...args);
    };
    
    try {
      // Run the tests - disabled since runtimeEnvTest is in OLD_LEGACY
      // const passed = runAllEnvironmentTests();
      // Placeholder - tests disabled
      
      // Parse results from logs
      const results: TestResult[] = [];
      
      logs.forEach(log => {
        if (log.includes('✅') || log.includes('❌')) {
          const isPassed = log.includes('✅');
          const testName = log.replace(/[✅❌🔴🟡]/gu, '').trim();
          results.push({
            name: testName,
            passed: isPassed,
            details: log
          });
        }
      });
      
      setTestResults(results);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Test failed:', error);
      setTestResults([{
        name: 'Test Execution',
        passed: false,
        details: `Error: ${error}`
      }]);
    } finally {
      // Restore console
      // eslint-disable-next-line no-console
      console.log = originalLog;
      // eslint-disable-next-line no-console
      console.error = originalError;
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run tests when component mounts
    runTests();
  }, []);

  const getStatusColor = (passed: boolean) => {
    return passed ? '#4CAF50' : '#F44336';
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Environment Variable Test</Text>
      <Text style={styles.subtitle}>Testing EAS environment variable access</Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]} 
        onPress={runTests}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Tests...' : 'Run Tests Again'}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.resultIcon}>
              {getStatusIcon(result.passed)}
            </Text>
            <View style={styles.resultContent}>
              <Text style={[
                styles.resultName, 
                { color: getStatusColor(result.passed) }
              ]}>
                {result.name}
              </Text>
              {result.details && (
                <Text style={styles.resultDetails}>
                  {result.details}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ⚠️ Remove this component before production deployment
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  footer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  footerText: {
    color: '#856404',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default EnvTestComponent;

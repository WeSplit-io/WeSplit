import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PrivyTestComponent: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('Testing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testPrivy = async () => {
      try {
        console.log('🧪 [PrivyTest] Starting Privy test...');
        
        // Test 1: Static require
        try {
          const privyModule = require('@privy-io/react-auth');
          console.log('✅ [PrivyTest] Static require successful');
          console.log('📦 [PrivyTest] Module exports:', Object.keys(privyModule));
          console.log('📦 [PrivyTest] Module default:', privyModule.default);
          
          // Try different ways to find PrivyProvider
          let foundProvider = false;
          if (privyModule.PrivyProvider) {
            console.log('✅ [PrivyTest] PrivyProvider found (named export)');
            foundProvider = true;
          } else if (privyModule.default && privyModule.default.PrivyProvider) {
            console.log('✅ [PrivyTest] PrivyProvider found (default.PrivyProvider)');
            foundProvider = true;
          } else if (privyModule.default && typeof privyModule.default === 'function') {
            console.log('✅ [PrivyTest] PrivyProvider found (default export)');
            foundProvider = true;
          }
          
          if (foundProvider) {
            setTestResult('✅ Privy static import successful');
          } else {
            console.log('❌ [PrivyTest] PrivyProvider not found');
            setTestResult('❌ PrivyProvider not found in module');
          }
        } catch (staticError) {
          console.log('❌ [PrivyTest] Static require failed:', staticError);
          setError(`Static import failed: ${staticError.message}`);
        }

        // Test 2: Dynamic import
        try {
          const privyModule = await import('@privy-io/react-auth');
          console.log('✅ [PrivyTest] Dynamic import successful');
          console.log('📦 [PrivyTest] Dynamic module exports:', Object.keys(privyModule));
          console.log('📦 [PrivyTest] Dynamic module default:', privyModule.default);
          
          // Try different ways to find PrivyProvider
          let foundDynamicProvider = false;
          if (privyModule.PrivyProvider) {
            console.log('✅ [PrivyTest] Dynamic PrivyProvider found (named export)');
            foundDynamicProvider = true;
          } else if (privyModule.default && privyModule.default.PrivyProvider) {
            console.log('✅ [PrivyTest] Dynamic PrivyProvider found (default.PrivyProvider)');
            foundDynamicProvider = true;
          } else if (privyModule.default && typeof privyModule.default === 'function') {
            console.log('✅ [PrivyTest] Dynamic PrivyProvider found (default export)');
            foundDynamicProvider = true;
          }
          
          if (foundDynamicProvider) {
            setTestResult(prev => prev + ' | ✅ Dynamic import successful');
          } else {
            console.log('❌ [PrivyTest] Dynamic PrivyProvider not found');
            setTestResult(prev => prev + ' | ❌ Dynamic PrivyProvider not found');
          }
        } catch (dynamicError) {
          console.log('❌ [PrivyTest] Dynamic import failed:', dynamicError);
          setError(prev => prev ? `${prev} | Dynamic import failed: ${dynamicError.message}` : `Dynamic import failed: ${dynamicError.message}`);
        }

      } catch (error) {
        console.error('❌ [PrivyTest] Test failed:', error);
        setError(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testPrivy();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privy Import Test</Text>
      <Text style={styles.result}>{testResult}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  result: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  error: {
    fontSize: 14,
    color: '#d32f2f',
  },
});

export default PrivyTestComponent;

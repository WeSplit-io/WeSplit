import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Temporarily comment out AppKit imports to prevent Super expression error
// import { createAppKit, AppKit } from '@reown/appkit-react-native';
// import { SolanaAdapter } from '@reown/appkit-adapter-solana';
// import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit-react-native';
import { WalletProvider } from './context/WalletContext';
import WelcomeScreen from './screens/WelcomeScreen';
import CreatePoolScreen from './screens/CreatePoolScreen';
import ViewPoolScreen from './screens/ViewPoolScreen';
import TransactionConfirmationScreen from './screens/TransactionConfirmationScreen';
import { Text, View, StyleSheet } from 'react-native';

// Try to import DashboardScreen with error handling
let DashboardScreen: React.ComponentType<any> | null = null;
try {
  DashboardScreen = require('./screens/DashboardScreen').default;
} catch (error) {
  console.log('DashboardScreen import failed, using fallback');
  DashboardScreen = null;
}

const Stack = createStackNavigator();
const queryClient = new QueryClient();

// Your Reown project ID
const projectId = '75640aea520dc7e11470b5bd4695d1d5';

const metadata = {
  name: 'WeSplit',
  description: 'Web3 Expense Sharing App on Solana',
  url: 'https://wesplit.app',
  icons: ['https://wesplit.app/icon.png'],
};

// Temporarily disable AppKit initialization
// const solanaAdapter = new SolanaAdapter();

// Loading Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Loading WeSplit...</Text>
  </View>
);

console.log('App.tsx loaded - minimal version');

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Simple initialization without AppKit
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('App initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  console.log('App component rendered, initialized:', isInitialized);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider appKitInstance={null}>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Welcome"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            {DashboardScreen && <Stack.Screen name="Dashboard" component={DashboardScreen} />}
            <Stack.Screen name="CreatePool" component={CreatePoolScreen} />
            <Stack.Screen name="ViewPool" component={ViewPoolScreen} />
            <Stack.Screen name="TransactionConfirmation" component={TransactionConfirmationScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </WalletProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

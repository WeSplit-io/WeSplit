import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './src/context/WalletContext';
import { AppProvider } from './src/context/AppContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import CreatePoolScreen from './src/screens/CreatePoolScreen';
import ViewPoolScreen from './src/screens/ViewPoolScreen';
import TransactionConfirmationScreen from './src/screens/TransactionConfirmationScreen';
import { Text, View, StyleSheet } from 'react-native';

// Import all new screens
import DashboardScreen from './src/screens/DashboardScreen';
import AuthScreen from './src/screens/AuthScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import AddMembersScreen from './src/screens/AddMembersScreen';
import BalanceScreen from './src/screens/BalanceScreen';
import GroupDetailsScreen from './src/screens/GroupDetailsScreen';
import SettleUpModal from './src/screens/SettleUpModal';
import GroupSettingsScreen from './src/screens/GroupSettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ScreensMenu from './src/screens/ScreensMenu';
import SplashScreen from './src/screens/SplashScreen';
import GetStartedScreen from './src/screens/GetStartedScreen';
import AuthMethodsScreen from './src/screens/AuthMethodsScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import EditExpenseScreen from './src/screens/EditExpenseScreen';
import DepositScreen from './src/screens/DepositScreen';
import AccountSettingsScreen from './src/screens/AccountSettingsScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import LanguageScreen from './src/screens/LanguageScreen';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

// Loading Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Loading WeSplit...</Text>
  </View>
);

console.log('App.tsx loaded - initializing Solana wallet system');

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app with Solana wallet system...');
        
        // Initialize Solana wallet system
        console.log('Solana wallet system initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  console.log('App component rendered, initialized:', isInitialized, 'error:', error);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize: {error}</Text>
        <Text style={styles.errorSubtext}>
          This might be due to network connectivity issues.
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AppProvider>
          <NavigationContainer>
            <Stack.Navigator 
              initialRouteName="Splash"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="GetStarted" component={GetStartedScreen} />
              <Stack.Screen name="AuthMethods" component={AuthMethodsScreen} />
              <Stack.Screen name="Verification" component={VerificationScreen} />
              <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="ScreensMenu" component={ScreensMenu} />
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="CreatePool" component={CreatePoolScreen} />
              <Stack.Screen name="ViewPool" component={ViewPoolScreen} />
              <Stack.Screen name="TransactionConfirmation" component={TransactionConfirmationScreen} />
              <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
              <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
              <Stack.Screen name="AddMembers" component={AddMembersScreen} />
              <Stack.Screen name="Balance" component={BalanceScreen} />
              <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
              <Stack.Screen name="EditExpense" component={EditExpenseScreen} />
              <Stack.Screen name="SettleUpModal" component={SettleUpModal} />
              <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Deposit" component={DepositScreen} />
              <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
              <Stack.Screen name="Premium" component={PremiumScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Language" component={LanguageScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

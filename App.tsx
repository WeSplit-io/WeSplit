import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './src/context/WalletContext';
import { AppProvider } from './src/context/AppContext';
import { WalletLinkingProvider } from './src/context/WalletLinkingContext';
import { Text, View } from 'react-native';
import { styles } from './App.styles';
import NavigationWrapper from './src/components/NavigationWrapper';
import ErrorBoundary from './src/components/ErrorBoundary';
import { environmentValidator } from './src/services/environmentValidationService';
import { logger } from './src/services/loggingService';

// Import Firebase configuration
import './src/config/firebase';
import { checkFirebaseConfiguration } from './src/utils/firebaseCheck';

// Import all new screens
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import AddExpenseScreen from './src/screens/AddExpense/AddExpenseScreen';
import ExpenseSuccessScreen from './src/screens/AddExpense/ExpenseSuccessScreen';
import CreateGroupScreen from './src/screens/CreateGroup/CreateGroupScreen';
import GroupCreatedScreen from './src/screens/GroupCreated/GroupCreatedScreen';
import AddMembersScreen from './src/screens/AddMembers/AddMembersScreen';
import BalanceScreen from './src/screens/Balance/BalanceScreen';
import GroupDetailsScreen from './src/screens/GroupDetails/GroupDetailsScreen';
import SettleUpModal from './src/screens/SettleUp/SettleUpModal';
import GroupSettingsScreen from './src/screens/GroupSettings/GroupSettingsScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import SplashScreen from './src/screens/Splash/SplashScreen';
import GetStartedScreen from './src/screens/GetStarted/GetStartedScreen';
import AuthMethodsScreen from './src/screens/AuthMethods/AuthMethodsScreen';
import VerificationScreen from './src/screens/Verification/VerificationScreen';
import CreateProfileScreen from './src/screens/CreateProfile/CreateProfileScreen';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';

import DepositScreen from './src/screens/Deposit/DepositScreen';
import CryptoTransferScreen from './src/screens/Deposit/CryptoTransferScreen';
import MoonPayWebViewScreen from './src/screens/Deposit/MoonPayWebViewScreen';
import AccountSettingsScreen from './src/screens/AccountSettings/AccountSettingsScreen';
import PremiumScreen from './src/screens/Premium/PremiumScreen';
import NotificationsScreen from './src/screens/Notifications/NotificationsScreen';
import LanguageScreen from './src/screens/Language/LanguageScreen';
import SendScreen from './src/screens/Send/SendScreen';
import SendAmountScreen from './src/screens/Send/SendAmountScreen';
import SendConfirmationScreen from './src/screens/Send/SendConfirmationScreen';
import SendSuccessScreen from './src/screens/Send/SendSuccessScreen';
import RequestContactsScreen from './src/screens/Request/RequestContactsScreen';
import RequestAmountScreen from './src/screens/Request/RequestAmountScreen';
import RequestConfirmationScreen from './src/screens/Request/RequestConfirmationScreen';
import RequestSuccessScreen from './src/screens/Request/RequestSuccessScreen';
import GroupsListScreen from './src/screens/GroupsList/GroupsListScreen';
import WithdrawAmountScreen from './src/screens/Withdraw/WithdrawAmountScreen';
import WithdrawConfirmationScreen from './src/screens/Withdraw/WithdrawConfirmationScreen';
import WithdrawSuccessScreen from './src/screens/Withdraw/WithdrawSuccessScreen';
import WalletManagementScreen from './src/screens/WalletManagement/WalletManagementScreen';
import SeedPhraseViewScreen from './src/screens/WalletManagement/SeedPhraseViewScreen';
import SeedPhraseVerifyScreen from './src/screens/WalletManagement/SeedPhraseVerifyScreen';
import { ContactsScreen } from './src/screens/Contacts';
import ContactActionScreen from './src/screens/ContactAction/ContactActionScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistory/TransactionHistoryScreen';
import ExternalWalletConnectionScreen from './src/screens/ExternalWalletConnection';


const Stack = createStackNavigator();
const queryClient = new QueryClient();

// Loading Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Loading WeSplit...</Text>
  </View>
);

// App.tsx loaded - initializing Firebase and Solana wallet system

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Validate environment configuration (non-blocking in development)
        const configValid = environmentValidator.validateAll();
        if (!configValid && process.env.NODE_ENV === 'production') {
          throw new Error('Environment configuration validation failed');
        }

        // Firebase is automatically initialized when the config file is imported
        
        // Check Firebase configuration
        const firebaseCheck = checkFirebaseConfiguration();
        
        // Initialize Solana wallet system
        logger.info('App initialized successfully', null, 'App');
        setIsInitialized(true);
      } catch (error) {
        // In development, log as warning instead of error
        if (process.env.NODE_ENV === 'development') {
          logger.warn('App initialization warnings (non-blocking in development)', error, 'App');
          setIsInitialized(true);
        } else {
          logger.error('Failed to initialize app', error, 'App');
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setError(errorMessage);
          setIsInitialized(true);
        }
      }
    };

    initializeApp();
  }, []);

  // Set up deep link listeners when app is initialized
  useEffect(() => {
    if (isInitialized) {
      // This will be set up in the NavigationContainer
      // Deep link system ready
    }
  }, [isInitialized]);

  // App component rendered

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize: {error}</Text>
        <Text style={styles.errorSubtext}>
          This might be due to Firebase configuration issues.
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <AppProvider>
            <WalletLinkingProvider>
              <NavigationWrapper>
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
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
                <Stack.Screen name="ExpenseSuccess" component={ExpenseSuccessScreen} />
                <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
                <Stack.Screen name="GroupCreated" component={GroupCreatedScreen} />
                <Stack.Screen name="AddMembers" component={AddMembersScreen} />
                <Stack.Screen name="Balance" component={BalanceScreen} />
                <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
        
                <Stack.Screen name="SettleUpModal" component={SettleUpModal} />
                <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Deposit" component={DepositScreen} />
                <Stack.Screen name="CryptoTransfer" component={CryptoTransferScreen} />
                <Stack.Screen name="MoonPayWebView" component={MoonPayWebViewScreen} />
                <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
                <Stack.Screen name="Premium" component={PremiumScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Language" component={LanguageScreen} />
                <Stack.Screen name="Contacts" component={ContactsScreen} />
                <Stack.Screen name="ContactAction" component={ContactActionScreen} />
                <Stack.Screen name="Send" component={SendScreen} />
                <Stack.Screen name="SendAmount" component={SendAmountScreen} />
                <Stack.Screen name="SendConfirmation" component={SendConfirmationScreen} />
                <Stack.Screen name="SendSuccess" component={SendSuccessScreen} />
                <Stack.Screen name="RequestContacts" component={RequestContactsScreen} />
                <Stack.Screen name="RequestAmount" component={RequestAmountScreen} />
                <Stack.Screen name="RequestConfirmation" component={RequestConfirmationScreen} />
                <Stack.Screen name="RequestSuccess" component={RequestSuccessScreen} />
                <Stack.Screen name="GroupsList" component={GroupsListScreen} />
                <Stack.Screen name="WithdrawAmount" component={WithdrawAmountScreen} />
                <Stack.Screen name="WithdrawConfirmation" component={WithdrawConfirmationScreen} />
                <Stack.Screen name="WithdrawSuccess" component={WithdrawSuccessScreen} />
                <Stack.Screen name="WalletManagement" component={WalletManagementScreen} />
                <Stack.Screen name="SeedPhraseView" component={SeedPhraseViewScreen} />
                <Stack.Screen name="SeedPhraseVerify" component={SeedPhraseVerifyScreen} />
                <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
                <Stack.Screen name="ExternalWalletConnection" component={ExternalWalletConnectionScreen} />
              </Stack.Navigator>
              </NavigationWrapper>
            </WalletLinkingProvider>
          </AppProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}



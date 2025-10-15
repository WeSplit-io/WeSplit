import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './src/context/WalletContext';
import { AppProvider } from './src/context/AppContext';
import { WalletLinkingProvider } from './src/context/WalletLinkingContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NavigationWrapper from './src/components/NavigationWrapper';
import ErrorBoundary from './src/components/ErrorBoundary';
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
import LinkedCardsScreen from './src/screens/LinkedCards/LinkedCardsScreen';
import RequestContactsScreen from './src/screens/Request/RequestContactsScreen';
import RequestAmountScreen from './src/screens/Request/RequestAmountScreen';
import RequestConfirmationScreen from './src/screens/Request/RequestConfirmationScreen';
import RequestSuccessScreen from './src/screens/Request/RequestSuccessScreen';
import GroupsListScreen from './src/screens/GroupsList/GroupsListScreen';
import BillCameraScreen from './src/screens/BillCamera/BillCameraScreen';
import BillProcessingScreen from './src/screens/BillProcessing/BillProcessingScreen';
import SplitDetailsScreen from './src/screens/SplitDetails/SplitDetailsScreen';
import SplitsListScreen from './src/screens/SplitsList/SplitsListScreen';
import FairSplitScreen from './src/screens/FairSplit/FairSplitScreen';
import PaymentConfirmationScreen from './src/screens/PaymentConfirmation/PaymentConfirmationScreen';
import KastAccountLinkingScreen from './src/screens/KastAccountLinking/KastAccountLinkingScreen';
import DegenLockScreen from './src/screens/DegenSplit/DegenLockScreen';
import DegenSpinScreen from './src/screens/DegenSplit/DegenSpinScreen';
import DegenResultScreen from './src/screens/DegenSplit/DegenResultScreen';
import SplitPaymentScreen from './src/screens/SplitPayment/SplitPaymentScreen';
import WithdrawAmountScreen from './src/screens/Withdraw/WithdrawAmountScreen';
import WithdrawConfirmationScreen from './src/screens/Withdraw/WithdrawConfirmationScreen';
import WithdrawSuccessScreen from './src/screens/Withdraw/WithdrawSuccessScreen';
import WalletManagementScreen from './src/screens/WalletManagement/WalletManagementScreen';
import RewardsScreen from './src/screens/Rewards/RewardsScreen';
import SeedPhraseViewScreen from './src/screens/WalletManagement/SeedPhraseViewScreen';
import SeedPhraseVerifyScreen from './src/screens/WalletManagement/SeedPhraseVerifyScreen';
import { ContactsScreen } from './src/screens/Contacts';
import ContactActionScreen from './src/screens/ContactAction/ContactActionScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistory/TransactionHistoryScreen';
import ExternalWalletConnectionScreen from './src/screens/ExternalWalletConnection';
import ManualSignatureInputScreen from './src/screens/ExternalWalletConnection/ManualSignatureInputScreen';
import ManualBillCreationScreen from './src/screens/ManualBillCreation/ManualBillCreationScreen';
import { AuthDebugScreen } from './src/screens/Debug/AuthDebugScreen';


const Stack = createStackNavigator();
const queryClient = new QueryClient();

export default function App() {

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <AppProvider>
                <WalletLinkingProvider>
                  <NavigationWrapper>
              <Stack.Navigator 
                initialRouteName="Splash"
                screenOptions={{
                  headerShown: false,
                  cardStyle: {
                    backgroundColor: '#061113',
                  },
                  animationEnabled: true,
                  gestureEnabled: true,
                  animationTypeForReplace: 'push',
                  transitionSpec: {
                    open: {
                      animation: 'spring',
                      config: {
                        stiffness: 1500,
                        damping: 600,
                        mass: 2,
                        useNativeDriver: true,
                      },
                    },
                    close: {
                      animation: 'timing',
                      config: {
                        duration: 150,
                        useNativeDriver: true,
                      },
                    },
                  },
                  cardStyleInterpolator: ({ current, next, layouts }) => {
                    return {
                      cardStyle: {
                        opacity: current.progress.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.95, 0.98, 1],
                          extrapolate: 'clamp',
                        }),
                        transform: [
                          {
                            scale: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.98, 1],
                              extrapolate: 'clamp',
                            }),
                          },
                        ],
                      },
                    };
                  },
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
                <Stack.Screen name="LinkedCards" component={LinkedCardsScreen} />
                <Stack.Screen name="RequestContacts" component={RequestContactsScreen} />
                <Stack.Screen name="RequestAmount" component={RequestAmountScreen} />
                <Stack.Screen name="RequestConfirmation" component={RequestConfirmationScreen} />
                <Stack.Screen name="RequestSuccess" component={RequestSuccessScreen} />
                <Stack.Screen name="GroupsList" component={GroupsListScreen} />
                <Stack.Screen name="BillCamera" component={BillCameraScreen} />
                <Stack.Screen name="BillProcessing" component={BillProcessingScreen} />
                <Stack.Screen name="SplitDetails" component={SplitDetailsScreen} />
                <Stack.Screen name="SplitsList" component={SplitsListScreen} />
                <Stack.Screen name="FairSplit" component={FairSplitScreen} />
                <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
                <Stack.Screen name="KastAccountLinking" component={KastAccountLinkingScreen} />
                <Stack.Screen name="DegenLock" component={DegenLockScreen} />
                <Stack.Screen name="DegenSpin" component={DegenSpinScreen} />
                <Stack.Screen name="DegenResult" component={DegenResultScreen} />
                <Stack.Screen name="SplitPayment" component={SplitPaymentScreen} />
                <Stack.Screen name="WithdrawAmount" component={WithdrawAmountScreen} />
                <Stack.Screen name="WithdrawConfirmation" component={WithdrawConfirmationScreen} />
                <Stack.Screen name="WithdrawSuccess" component={WithdrawSuccessScreen} />
        <Stack.Screen name="WalletManagement" component={WalletManagementScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />
        <Stack.Screen name="SeedPhraseView" component={SeedPhraseViewScreen} />
                <Stack.Screen name="SeedPhraseVerify" component={SeedPhraseVerifyScreen} />
                <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
                <Stack.Screen name="ExternalWalletConnection" component={ExternalWalletConnectionScreen} />
                <Stack.Screen name="ManualSignatureInput" component={ManualSignatureInputScreen} />
                <Stack.Screen name="ManualBillCreation" component={ManualBillCreationScreen} />
                <Stack.Screen name="AuthDebug" component={AuthDebugScreen} />
                <Stack.Screen name="SettleUpModal" component={SettleUpModal} />
              </Stack.Navigator>
                  </NavigationWrapper>
                </WalletLinkingProvider>
              </AppProvider>
            </WalletProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
  );
}



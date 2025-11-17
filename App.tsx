import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './src/context/WalletContext';
import { AppProvider } from './src/context/AppContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NavigationWrapper from './src/components/NavigationWrapper';
import ErrorBoundary from './src/components/ErrorBoundary';
import { View, StatusBar } from 'react-native';
import { colors } from './src/theme';

// Import Firebase configuration
import './src/config/firebase/firebase';

// Import all new screens
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import ProfileScreen from './src/screens/Settings/Profile/ProfileScreen';
import SplashScreen from './src/screens/Splash/SplashScreen';
import GetStartedScreen from './src/screens/GetStarted/GetStartedScreen';
import AuthMethodsScreen from './src/screens/AuthMethods/AuthMethodsScreen';
import VerificationScreen from './src/screens/Verification/VerificationScreen';
import CreateProfileScreen from './src/screens/CreateProfile/CreateProfileScreen';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';

import DepositScreen from './src/screens/Deposit/DepositScreen';
import CryptoTransferScreen from './src/screens/Deposit/CryptoTransferScreen';
import MoonPayWebViewScreen from './src/screens/Deposit/MoonPayWebViewScreen';
import AccountSettingsScreen from './src/screens/Settings/AccountSettings/AccountSettingsScreen';
import PremiumScreen from './src/screens/Settings/Premium/PremiumScreen';
import NotificationsScreen from './src/screens/Notifications/NotificationsScreen';
import LanguageScreen from './src/screens/Settings/Language/LanguageScreen';
import RewardsScreen from './src/screens/Rewards/RewardsScreen';
import LeaderboardDetailScreen from './src/screens/Rewards/LeaderboardDetailScreen';
import HowToEarnPointsScreen from './src/screens/Rewards/HowToEarnPointsScreen';
import HowItWorksScreen from './src/screens/Rewards/HowItWorks';
import ReferralScreen from './src/screens/Rewards/ReferralScreen';
import PointsHistoryScreen from './src/screens/Rewards/PointsHistoryScreen';
import ChristmasCalendarScreen from './src/screens/Rewards/ChristmasCalendarScreen';
import SendScreen from './src/screens/Send/SendScreen';
import SendAmountScreen from './src/screens/Send/SendAmountScreen';
import SendConfirmationScreen from './src/screens/Send/SendConfirmationScreen';
import SendSuccessScreen from './src/screens/Send/SendSuccessScreen';
import LinkedCardsScreen from './src/screens/Settings/LinkedCards/LinkedCardsScreen';
import RequestContactsScreen from './src/screens/Request/RequestContactsScreen';
import RequestAmountScreen from './src/screens/Request/RequestAmountScreen';
import RequestSuccessScreen from './src/screens/Request/RequestSuccessScreen';
import BillCameraScreen from './src/screens/Billing/BillCamera/BillCameraScreen';
import BillProcessingScreen from './src/screens/Billing/BillProcessing/BillProcessingScreen';
import SplitDetailsScreen from './src/screens/SplitDetails/SplitDetailsScreen';
import SplitsListScreen from './src/screens/Splits/SplitsList/SplitsListScreen';
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
import SeedPhraseViewScreen from './src/screens/WalletManagement/SeedPhraseViewScreen';
import SeedPhraseVerifyScreen from './src/screens/WalletManagement/SeedPhraseVerifyScreen';
import { ContactsScreen } from './src/screens/Contacts';
import ContactActionScreen from './src/screens/ContactAction/ContactActionScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistory/TransactionHistoryScreen';
import ExternalWalletConnectionScreen from './src/screens/ExternalWalletConnection/ExternalWalletConnectionScreen';
import ManualSignatureInputScreen from './src/screens/ExternalWalletConnection/ManualSignatureInputScreen';
import ManualBillCreationScreen from './src/screens/Billing/ManualBillCreation/ManualBillCreationScreen';
// import AuthDebugScreen from './src/screens/Debug/AuthDebugScreen';

// Development-only test screen
let WalletPersistenceTestScreen: any = null;
if (__DEV__) {
  try {
    WalletPersistenceTestScreen = require('./src/screens/Testing/WalletPersistenceTestScreen').default;
  } catch (e) {
    // Screen not available
  }
}


const Stack = createStackNavigator();
const queryClient = new QueryClient();

export default function App() {

  return (
    <View style={{ flex: 1, backgroundColor: colors.darkBackground }}>
      <StatusBar backgroundColor={colors.darkBackground} barStyle="light-content" />
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AppProvider>
              <WalletProvider>
                <NavigationWrapper>
                  <Stack.Navigator
                    initialRouteName="Splash"
                    screenOptions={{
                      headerShown: false,
                      cardStyle: {
                        backgroundColor: '#061113',
                      },
                      gestureEnabled: true,
                      animationTypeForReplace: 'push',
                      transitionSpec: {
                        open: {
                          animation: 'spring',
                          config: {
                            stiffness: 1500,
                            damping: 600,
                            mass: 2,
                          },
                        },
                        close: {
                          animation: 'timing',
                          config: {
                            duration: 150,
                          },
                        },
                      },
                      cardStyleInterpolator: ({ current }) => {
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
                    <Stack.Screen name="RequestSuccess" component={RequestSuccessScreen} />
                    <Stack.Screen name="BillCamera" component={BillCameraScreen} />
                    <Stack.Screen name="BillProcessing" component={BillProcessingScreen} />
                    <Stack.Screen name="SplitDetails" component={SplitDetailsScreen} />
                    <Stack.Screen name="SplitsList" component={SplitsListScreen} />
                    <Stack.Screen name="FairSplit" component={FairSplitScreen} />
                    <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
                    <Stack.Screen name="KastAccountLinking" component={KastAccountLinkingScreen} />
                    <Stack.Screen name="Rewards" component={RewardsScreen} />
                    <Stack.Screen name="LeaderboardDetail" component={LeaderboardDetailScreen} />
                    <Stack.Screen name="HowToEarnPoints" component={HowToEarnPointsScreen} />
                    <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
                    <Stack.Screen name="Referral" component={ReferralScreen} />
                    <Stack.Screen name="PointsHistory" component={PointsHistoryScreen} />
                    <Stack.Screen name="ChristmasCalendar" component={ChristmasCalendarScreen} />
                    <Stack.Screen name="DegenLock" component={DegenLockScreen} />
                    <Stack.Screen name="DegenSpin" component={DegenSpinScreen} />
                    <Stack.Screen name="DegenResult" component={DegenResultScreen} />
                    <Stack.Screen name="SplitPayment" component={SplitPaymentScreen} />
                    <Stack.Screen name="WithdrawAmount" component={WithdrawAmountScreen} />
                    <Stack.Screen name="WithdrawConfirmation" component={WithdrawConfirmationScreen} />
                    <Stack.Screen name="WithdrawSuccess" component={WithdrawSuccessScreen} />
                    <Stack.Screen name="WalletManagement" component={WalletManagementScreen} />
                    <Stack.Screen name="SeedPhraseView" component={SeedPhraseViewScreen} />
                    <Stack.Screen name="SeedPhraseVerify" component={SeedPhraseVerifyScreen} />
                    <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
                    <Stack.Screen name="ExternalWalletConnection" component={ExternalWalletConnectionScreen} />
                    <Stack.Screen name="ManualSignatureInput" component={ManualSignatureInputScreen} />
                    <Stack.Screen name="ManualBillCreation" component={ManualBillCreationScreen} />
                    {/* <Stack.Screen name="AuthDebug" component={AuthDebugScreen} /> */}
                    {__DEV__ && WalletPersistenceTestScreen && (
                      <Stack.Screen name="WalletPersistenceTest" component={WalletPersistenceTestScreen} />
                    )}
                  </Stack.Navigator>
                </NavigationWrapper>
              </WalletProvider>
            </AppProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </View>
  );
}



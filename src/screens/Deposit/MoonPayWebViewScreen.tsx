import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Icon from '../../components/Icon';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/firebaseDataService';
import styles from './styles';

interface MoonPayWebViewParams {
  url: string;
  targetWallet?: {
    address: string;
    name: string;
    type: 'personal' | 'group';
  };
  onSuccess?: () => void;
  isAppWallet?: boolean;
  userId?: string;
}

const MoonPayWebViewScreen: React.FC<any> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewRef, setWebViewRef] = useState<any>(null);
  
  const { getAppWalletBalance } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;
  
  const params: MoonPayWebViewParams = route?.params || {};
  const { url, targetWallet, onSuccess, isAppWallet, userId } = params;

  console.log('🔍 MoonPayWebView: Screen loaded with params:', {
    url,
    isAppWallet,
    userId,
    targetWallet
  });

  // Validate URL
  if (!url || typeof url !== 'string') {
    console.error('🔍 MoonPayWebView: Invalid URL provided:', url);
    Alert.alert('Error', 'Invalid MoonPay URL. Please try again.');
    navigation.goBack();
    return null;
  }

  console.log('🔍 MoonPayWebView: Loading URL:', url);

  const handleBack = () => {
    if (canGoBack && webViewRef) {
      webViewRef.goBack();
    } else {
      navigation.goBack();
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleLoadStart = () => {
    console.log('🔍 MoonPayWebView: WebView load started');
    setLoading(true);
  };

  const handleLoadEnd = () => {
    console.log('🔍 MoonPayWebView: WebView load ended');
    setLoading(false);
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle MoonPay success/failure messages
      if (data.type === 'moonpay-success') {
        console.log('🔍 MoonPayWebView: Purchase successful, refreshing app wallet balance...');
        
        // If this is for app wallet, refresh the balance
        if (isAppWallet && userId) {
          try {
            // Refresh app wallet balance
            await getAppWalletBalance(userId);
            console.log('🔍 MoonPayWebView: App wallet balance refreshed successfully');
            
            // Log successful balance refresh
            console.log('🔍 MoonPayWebView: App wallet balance refreshed successfully');
          } catch (balanceError) {
            console.error('🔍 MoonPayWebView: Error refreshing app wallet balance:', balanceError);
          }
        }
        
        Alert.alert(
          'Purchase Successful',
          'Your purchase has been completed successfully! Your app wallet balance will be updated shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.();
                navigation.goBack();
              }
            }
          ]
        );
      } else if (data.type === 'moonpay-error') {
        Alert.alert(
          'Purchase Failed',
          data.message || 'There was an error with your purchase. Please try again.',
          [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      // Ignore parsing errors for non-JSON messages
    }
  };

  const injectedJavaScript = `
    // Simple message listener for MoonPay events
    try {
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type) {
        window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
      }
    });
    } catch (error) {
      console.log('MoonPay WebView: Error setting up message listener');
        }
    
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image
            source={require('../../../assets/chevron-left.png')}
            style={styles.iconWrapper}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MoonPay</Text>
        <View style={styles.placeholder} />
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading MoonPay...</Text>
          </View>
        )}
        
        <WebView
          ref={setWebViewRef}
          source={{ uri: url }}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsBackForwardNavigationGestures={true}
          timeout={30000} // 30 second timeout
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🔍 MoonPayWebView: WebView error:', nativeEvent);
            Alert.alert('WebView Error', 'Failed to load MoonPay. Please try again.');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🔍 MoonPayWebView: WebView HTTP error:', nativeEvent);
            Alert.alert('HTTP Error', 'Failed to load MoonPay. Please check your connection and try again.');
          }}
          onShouldStartLoadWithRequest={(request) => {
            console.log('🔍 MoonPayWebView: Loading request:', request.url);
            return true;
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default MoonPayWebViewScreen; 
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from '../../components/Icon';
import styles from './styles';

interface MoonPayWebViewParams {
  url: string;
  targetWallet?: {
    address: string;
    name: string;
    type: 'personal' | 'group';
  };
  onSuccess?: () => void;
}

const MoonPayWebViewScreen: React.FC<any> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewRef, setWebViewRef] = useState<any>(null);
  
  const params: MoonPayWebViewParams = route?.params || {};
  const { url, targetWallet, onSuccess } = params;

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
    setLoading(true);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle MoonPay success/failure messages
      if (data.type === 'moonpay-success') {
        Alert.alert(
          'Purchase Successful',
          'Your purchase has been completed successfully!',
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
    // Listen for MoonPay events
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type) {
        window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
      }
    });
    
    // Monitor URL changes for success/failure
    let currentUrl = window.location.href;
    setInterval(function() {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        
        if (currentUrl.includes('success') || currentUrl.includes('completed')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'moonpay-success'
          }));
        } else if (currentUrl.includes('error') || currentUrl.includes('failed')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'moonpay-error',
            message: 'Purchase was cancelled or failed'
          }));
        }
      }
    }, 1000);
    
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Image
            source={require('../../../assets/arrow-left.png')}
            style={{ width: 24, height: 24 }}
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
        />
      </View>
    </SafeAreaView>
  );
};

export default MoonPayWebViewScreen; 
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { Header } from '../../components/shared';
import { WebView } from 'react-native-webview';
import Icon from '../../components/Icon';
import { useWallet } from '../../context/WalletContext';
import { useApp } from '../../context/AppContext';
import { firebaseDataService } from '../../services/data';
import styles from './styles';
import { logger } from '../../services/analytics/loggingService';
import { Container } from '../../components/shared';

interface MoonPayWebViewParams {
  url: string;
  targetWallet?: {
    address: string;
    name: string;
    type: 'personal' | 'group';
  };
  isAppWallet?: boolean;
  userId?: string;
}

const MoonPayWebViewScreen: React.FC<any> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [webViewError, setWebViewError] = useState(false);
  const webViewRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { getAppWalletBalance } = useWallet();
  const { state } = useApp();
  const { currentUser } = state;
  
  const params: MoonPayWebViewParams = route?.params || {};
  const { url, targetWallet, isAppWallet, userId } = params;

  // Prevent multiple screen loads
  const [hasLoaded, setHasLoaded] = useState(false);

  logger.debug('Screen loaded with params', {
    url,
    isAppWallet,
    userId,
    targetWallet,
    hasLoaded
  });

  // Validate URL
  if (!url || typeof url !== 'string') {
    console.error('🔍 MoonPayWebView: Invalid URL provided:', url);
    Alert.alert('Error', 'Invalid MoonPay URL. Please try again.');
    navigation.goBack();
    return null;
  }

  // Additional URL validation
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error('🔍 MoonPayWebView: Invalid URL protocol:', url);
    Alert.alert('Error', 'Invalid URL protocol. Please try again.');
    navigation.goBack();
    return null;
  }

  // Prevent multiple renders
  if (!hasLoaded) {
    logger.info('Loading URL', { url }, 'MoonPayWebViewScreen');
  }

  // Prevent multiple initializations
  useEffect(() => {
    if (!hasLoaded && url) {
      setHasLoaded(true);
      logger.info('MoonPayWebView: Initializing screen', { url: url.substring(0, 50) + '...' });
    }
  }, [url, hasLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Add timeout for WebView loading
  useEffect(() => {
    if (loading) {
      loadTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && loading) {
          console.warn('🔍 MoonPayWebView: Loading timeout, setting error state');
          setWebViewError(true);
          setLoading(false);
        }
      }, 15000); // 15 second timeout
    } else {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    }
  }, [loading]);

  const handleBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      navigation.goBack();
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleLoadStart = () => {
    if (isMountedRef.current) {
      setLoading(true);
    }
  };

  const handleLoadEnd = () => {
    if (isMountedRef.current) {
      setLoading(false);
    }
  };

  const handleMessage = async (event: any) => {
    if (!isMountedRef.current) {return;}
    
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle MoonPay success/failure messages
      if (data.type === 'moonpay-success') {
        logger.info('Purchase successful, refreshing app wallet balance', null, 'MoonPayWebViewScreen');
        
        // If this is for app wallet, refresh the balance
        if (isAppWallet && userId) {
          try {
            // Refresh app wallet balance
            await getAppWalletBalance(userId);
            logger.info('App wallet balance refreshed successfully', null, 'MoonPayWebViewScreen');
          } catch (balanceError) {
            console.error('🔍 MoonPayWebView: Error refreshing app wallet balance:', balanceError);
          }
        }
        
        if (isMountedRef.current) {
          Alert.alert(
            'Purchase Successful',
            'Your purchase has been completed successfully! Your app wallet balance will be updated shortly.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back to the previous screen
                  navigation.goBack();
                }
              }
            ]
          );
        }
      } else if (data.type === 'moonpay-error') {
        if (isMountedRef.current) {
          Alert.alert(
            'Purchase Failed',
            data.message || 'There was an error with your purchase. Please try again.',
            [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]
          );
        }
      }
    } catch (error) {
      // Ignore parsing errors for non-JSON messages
      console.warn('🔍 MoonPayWebView: Failed to parse message:', error);
    }
  };

  // Simplified injected JavaScript to prevent conflicts
  const injectedJavaScript = `
    // Basic message listener for MoonPay events
    try {
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type) {
          window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
        }
      });
    } catch (error) {
      console.warn('Error setting up message listener:', error);
    }
    true;
  `;

  return (
    <Container>
      <Header
        title="MoonPay"
        onBackPress={handleBack}
      />

      {/* WebView */}
      <View style={styles.webViewContainer}>
        {loading && !webViewError && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading MoonPay...</Text>
          </View>
        )}
        
        {webViewError && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#181818',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
            padding: 20,
          }}>
            <Text style={{
              color: '#FF6B6B',
              fontSize: 18,
              marginBottom: 20,
              textAlign: 'center',
            }}>Failed to load MoonPay</Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#A5EA15',
                borderRadius: 8,
                paddingHorizontal: 20,
                paddingVertical: 12,
                marginBottom: 12,
                minWidth: 120,
              }}
              onPress={() => {
                setWebViewError(false);
                setLoading(true);
                if (webViewRef.current) {
                  webViewRef.current.reload();
                }
              }}
            >
              <Text style={{
                color: '#212121',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center',
              }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#A5EA15',
                paddingHorizontal: 20,
                paddingVertical: 12,
                minWidth: 120,
              }}
              onPress={() => navigation.goBack()}
            >
              <Text style={{
                color: '#A5EA15',
                fontSize: 16,
                fontWeight: '500',
                textAlign: 'center',
              }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ 
            uri: url,
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            }
          }}
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
          mixedContentMode="compatibility"
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🔍 MoonPayWebView: WebView error:', nativeEvent);
            if (isMountedRef.current) {
              setWebViewError(true);
              setLoading(false);
            }
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🔍 MoonPayWebView: WebView HTTP error:', nativeEvent);
            if (isMountedRef.current) {
              Alert.alert('HTTP Error', 'Failed to load MoonPay. Please check your connection and try again.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            }
          }}
          onShouldStartLoadWithRequest={(request) => {
            // Block invalid URLs that can cause crashes
            if (request.url === 'about:srcdoc' || 
                request.url === 'about:blank' || 
                request.url.startsWith('about:') ||
                request.url === 'data:' ||
                request.url === 'javascript:') {
              console.warn('🔍 MoonPayWebView: Blocking invalid URL:', request.url);
              return false;
            }
            
            // Only allow HTTP/HTTPS URLs
            if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
              console.warn('🔍 MoonPayWebView: Blocking non-HTTP URL:', request.url);
              return false;
            }
            
            // Allow all valid HTTP/HTTPS requests
            return true;
          }}
          onContentProcessDidTerminate={() => {
            // Handle WebView crashes gracefully
            console.warn('🔍 MoonPayWebView: WebView process terminated, reloading...');
            if (isMountedRef.current && webViewRef.current) {
              webViewRef.current.reload();
            }
          }}
        />
      </View>
    </Container>
  );
};

export default MoonPayWebViewScreen; 
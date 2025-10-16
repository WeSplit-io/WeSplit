/**
 * Production Authentication Service
 * Handles authentication issues specific to production APK builds
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from './loggingService';

export class ProductionAuthService {
  private static instance: ProductionAuthService;
  
  public static getInstance(): ProductionAuthService {
    if (!ProductionAuthService.instance) {
      ProductionAuthService.instance = new ProductionAuthService();
    }
    return ProductionAuthService.instance;
  }

  /**
   * Get environment variable with production-specific fallbacks
   */
  private getEnvVar(key: string): string {
    // Try all possible sources in order of preference
    const sources = [
      process.env[key],
      process.env[`EXPO_PUBLIC_${key}`],
      Constants.expoConfig?.extra?.[key],
      Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`],
      (Constants.manifest as any)?.extra?.[key],
      (Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]
    ];
    
    for (const source of sources) {
      if (source && typeof source === 'string' && source.trim() !== '') {
        return source.trim();
      }
    }
    
    return '';
  }

  /**
   * Diagnose production authentication issues
   */
  public async diagnoseAuthIssues(): Promise<{
    isProduction: boolean;
    issues: string[];
    recommendations: string[];
    environmentStatus: any;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check if running in production
    const isProduction = this.getEnvVar('APP_ENV') === 'production' || 
                        this.getEnvVar('NODE_ENV') === 'production' ||
                        !__DEV__;
    
    // Check environment variables
    const requiredVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
      'EXPO_PUBLIC_GOOGLE_CLIENT_ID'
    ];
    
    const missingVars: string[] = [];
    requiredVars.forEach(varName => {
      if (!this.getEnvVar(varName)) {
        missingVars.push(varName);
      }
    });
    
    if (missingVars.length > 0) {
      issues.push(`Missing environment variables: ${missingVars.join(', ')}`);
      recommendations.push('Check EAS environment variables configuration');
    }
    
    // Check Firebase configuration
    const firebaseConfig = {
      apiKey: this.getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
      projectId: this.getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
      appId: this.getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID')
    };
    
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
      issues.push('Firebase configuration is incomplete');
      recommendations.push('Verify Firebase configuration in EAS environment variables');
    }
    
    // Check OAuth configuration
    const oauthConfig = {
      googleClientId: this.getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
      androidClientId: this.getEnvVar('ANDROID_GOOGLE_CLIENT_ID'),
      iosClientId: this.getEnvVar('IOS_GOOGLE_CLIENT_ID')
    };
    
    if (!oauthConfig.googleClientId) {
      issues.push('Google OAuth client ID is missing');
      recommendations.push('Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to EAS environment variables');
    }
    
    if (Platform.OS === 'android' && !oauthConfig.androidClientId) {
      issues.push('Android OAuth client ID is missing');
      recommendations.push('Add ANDROID_GOOGLE_CLIENT_ID to EAS environment variables');
    }
    
    if (Platform.OS === 'ios' && !oauthConfig.iosClientId) {
      issues.push('iOS OAuth client ID is missing');
      recommendations.push('Add IOS_GOOGLE_CLIENT_ID to EAS environment variables');
    }
    
    // Check network connectivity
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD', timeout: 5000 });
      if (!response.ok) {
        issues.push('Network connectivity issues detected');
        recommendations.push('Check device internet connection');
      }
    } catch (error) {
      issues.push('Network connectivity test failed');
      recommendations.push('Verify device has internet access');
    }
    
    // Check Firebase project accessibility
    if (firebaseConfig.projectId) {
      try {
        const response = await fetch(`https://${firebaseConfig.projectId}.firebaseapp.com`, { 
          method: 'HEAD', 
          timeout: 5000 
        });
        if (!response.ok) {
          issues.push('Firebase project is not accessible');
          recommendations.push('Check Firebase project configuration and network access');
        }
      } catch (error) {
        issues.push('Firebase project connectivity test failed');
        recommendations.push('Verify Firebase project ID and network access');
      }
    }
    
    const environmentStatus = {
      isProduction,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || 'Unknown',
      buildNumber: Constants.expoConfig?.android?.versionCode || Constants.expoConfig?.ios?.buildNumber || 'Unknown',
      bundleId: Constants.expoConfig?.android?.package || Constants.expoConfig?.ios?.bundleIdentifier || 'Unknown',
      hasExpoConfig: !!Constants.expoConfig,
      hasManifest: !!Constants.manifest,
      environmentVars: {
        NODE_ENV: this.getEnvVar('NODE_ENV'),
        APP_ENV: this.getEnvVar('APP_ENV'),
        hasFirebaseApiKey: !!this.getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
        hasFirebaseProjectId: !!this.getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
        hasGoogleClientId: !!this.getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
        hasAndroidClientId: !!this.getEnvVar('ANDROID_GOOGLE_CLIENT_ID'),
        hasIosClientId: !!this.getEnvVar('IOS_GOOGLE_CLIENT_ID')
      }
    };
    
    return {
      isProduction,
      issues,
      recommendations,
      environmentStatus
    };
  }

  /**
   * Test Firebase authentication initialization
   */
  public async testFirebaseAuth(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const { auth } = await import('../config/firebase');
      
      if (!auth) {
        return {
          success: false,
          error: 'Firebase auth not initialized'
        };
      }
      
      // Test auth state
      const currentUser = auth.currentUser;
      const authState = auth.authStateReady();
      
      return {
        success: true,
        details: {
          hasCurrentUser: !!currentUser,
          authStateReady: !!authState
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test OAuth configuration
   */
  public async testOAuthConfig(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const googleClientId = this.getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
      const androidClientId = this.getEnvVar('ANDROID_GOOGLE_CLIENT_ID');
      const iosClientId = this.getEnvVar('IOS_GOOGLE_CLIENT_ID');
      
      if (!googleClientId) {
        return {
          success: false,
          error: 'Google OAuth client ID is missing'
        };
      }
      
      const platformClientId = Platform.OS === 'android' ? androidClientId : iosClientId;
      
      if (!platformClientId) {
        return {
          success: false,
          error: `${Platform.OS} OAuth client ID is missing`
        };
      }
      
      return {
        success: true,
        details: {
          platform: Platform.OS,
          hasWebClientId: !!googleClientId,
          hasPlatformClientId: !!platformClientId,
          clientIdFormat: googleClientId.includes('googleusercontent.com') ? 'Valid' : 'Invalid'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear authentication data
   */
  public async clearAuthData(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Clear AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.clear();
      
      // Sign out from Firebase
      const { auth } = await import('../config/firebase');
      if (auth) {
        await auth.signOut();
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get production-specific recommendations
   */
  public getProductionRecommendations(): string[] {
    return [
      'Ensure all environment variables are set in EAS environment variables',
      'Verify Firebase project configuration matches production settings',
      'Check that OAuth client IDs are correctly configured for production',
      'Test network connectivity on the device',
      'Clear app data and restart the app',
      'Check device date/time settings',
      'Verify app permissions (internet, network state)',
      'Test with different network connections (WiFi vs mobile data)'
    ];
  }
}

export default ProductionAuthService;

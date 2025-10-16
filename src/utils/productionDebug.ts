/**
 * Production Debug Utility
 * Helps diagnose issues in production builds
 */

import Constants from 'expo-constants';
import { logger } from '../services/loggingService';

export interface ProductionDebugInfo {
  environment: string;
  isProduction: boolean;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    hasAllRequired: boolean;
  };
  networkInfo: {
    isConnected: boolean;
    connectionType?: string;
  };
  appInfo: {
    version: string;
    buildNumber: string;
    bundleId: string;
  };
  issues: string[];
  recommendations: string[];
}

/**
 * Get environment variable with comprehensive fallback chain
 */
const getEnvVar = (key: string): string => {
  // Try process.env first
  if (process.env[key]) return process.env[key]!;
  if (process.env[`EXPO_PUBLIC_${key}`]) return process.env[`EXPO_PUBLIC_${key}`]!;
  
  // Try Constants.expoConfig.extra
  if (Constants.expoConfig?.extra?.[key]) return Constants.expoConfig.extra[key];
  if (Constants.expoConfig?.extra?.[`EXPO_PUBLIC_${key}`]) return Constants.expoConfig.extra[`EXPO_PUBLIC_${key}`];
  
  // Try Constants.manifest.extra (older Expo versions)
  if ((Constants.manifest as any)?.extra?.[key]) return (Constants.manifest as any).extra[key];
  if ((Constants.manifest as any)?.extra?.[`EXPO_PUBLIC_${key}`]) return (Constants.manifest as any).extra[`EXPO_PUBLIC_${key}`];
  
  return '';
};

/**
 * Diagnose production build issues
 */
export function diagnoseProductionIssues(): ProductionDebugInfo {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Environment detection
  const environment = getEnvVar('NODE_ENV') || getEnvVar('APP_ENV') || 'development';
  const isProduction = environment === 'production';
  
  // Firebase configuration check
  const firebaseApiKey = getEnvVar('FIREBASE_API_KEY');
  const firebaseAuthDomain = getEnvVar('FIREBASE_AUTH_DOMAIN');
  const firebaseProjectId = getEnvVar('FIREBASE_PROJECT_ID');
  const firebaseAppId = getEnvVar('FIREBASE_APP_ID');
  
  const hasAllFirebaseConfig = !!(firebaseApiKey && firebaseAuthDomain && firebaseProjectId && firebaseAppId);
  
  if (!hasAllFirebaseConfig) {
    issues.push('Firebase configuration is incomplete');
    recommendations.push('Check that all Firebase environment variables are properly set in production build');
  }
  
  if (!firebaseApiKey) {
    issues.push('Firebase API Key is missing');
    recommendations.push('Add EXPO_PUBLIC_FIREBASE_API_KEY to your production environment');
  }
  
  if (!firebaseProjectId) {
    issues.push('Firebase Project ID is missing');
    recommendations.push('Add EXPO_PUBLIC_FIREBASE_PROJECT_ID to your production environment');
  }
  
  // Network connectivity check
  const networkInfo = {
    isConnected: true, // This would need NetInfo to be accurate
    connectionType: 'unknown'
  };
  
  // App info
  const appInfo = {
    version: Constants.expoConfig?.version || 'unknown',
    buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || 'unknown',
    bundleId: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || 'unknown'
  };
  
  // Production-specific checks
  if (isProduction) {
    if (!getEnvVar('HELIUS_API_KEY')) {
      issues.push('Helius API Key is missing in production');
      recommendations.push('Add EXPO_PUBLIC_HELIUS_API_KEY to your production environment');
    }
    
    if (getEnvVar('FORCE_MAINNET') !== 'true') {
      issues.push('FORCE_MAINNET should be true in production');
      recommendations.push('Set EXPO_PUBLIC_FORCE_MAINNET=true in production');
    }
  }
  
  return {
    environment,
    isProduction,
    firebaseConfig: {
      apiKey: firebaseApiKey ? `${firebaseApiKey.substring(0, 20)}...` : 'MISSING',
      authDomain: firebaseAuthDomain || 'MISSING',
      projectId: firebaseProjectId || 'MISSING',
      hasAllRequired: hasAllFirebaseConfig
    },
    networkInfo,
    appInfo,
    issues,
    recommendations
  };
}

/**
 * Log production debug information
 */
export function logProductionDebugInfo(): void {
  const debugInfo = diagnoseProductionIssues();
  
  logger.info('Production Debug Information', {
    environment: debugInfo.environment,
    isProduction: debugInfo.isProduction,
    firebaseConfig: debugInfo.firebaseConfig,
    appInfo: debugInfo.appInfo,
    issueCount: debugInfo.issues.length
  }, 'productionDebug');
  
  if (debugInfo.issues.length > 0) {
    console.warn('⚠️ Production Issues Detected:');
    debugInfo.issues.forEach(issue => console.warn(`  - ${issue}`));
    
    console.log('\n💡 Recommendations:');
    debugInfo.recommendations.forEach(rec => console.log(`  - ${rec}`));
  } else {
    console.log('✅ Production configuration looks good!');
  }
}

/**
 * Test Firebase connection in production
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    // Import Firebase dynamically to avoid initialization issues
    const { auth } = await import('../config/firebase');
    
    // Test if Firebase is properly initialized
    if (!auth) {
      console.error('❌ Firebase Auth is not initialized');
      return false;
    }
    
    // Test if we can access Firebase services
    const currentUser = auth.currentUser;
    console.log('✅ Firebase Auth is accessible');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
}

/**
 * Test network connectivity
 */
export async function testNetworkConnectivity(): Promise<boolean> {
  try {
    // Test basic connectivity
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Network connectivity is working');
      return true;
    } else {
      console.warn('⚠️ Network connectivity issues detected');
      return false;
    }
  } catch (error) {
    console.error('❌ Network connectivity test failed:', error);
    return false;
  }
}

/**
 * Comprehensive production health check
 */
export async function runProductionHealthCheck(): Promise<{
  firebase: boolean;
  network: boolean;
  overall: boolean;
  issues: string[];
}> {
  console.log('🔍 Running Production Health Check...');
  
  const issues: string[] = [];
  
  // Test Firebase
  const firebaseOk = await testFirebaseConnection();
  if (!firebaseOk) {
    issues.push('Firebase connection failed');
  }
  
  // Test Network
  const networkOk = await testNetworkConnectivity();
  if (!networkOk) {
    issues.push('Network connectivity failed');
  }
  
  const overall = firebaseOk && networkOk;
  
  console.log(`\n📊 Health Check Results:`);
  console.log(`  Firebase: ${firebaseOk ? '✅' : '❌'}`);
  console.log(`  Network: ${networkOk ? '✅' : '❌'}`);
  console.log(`  Overall: ${overall ? '✅' : '❌'}`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️ Issues found: ${issues.join(', ')}`);
  }
  
  return {
    firebase: firebaseOk,
    network: networkOk,
    overall,
    issues
  };
}

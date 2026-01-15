/**
 * Network Configuration Diagnostic Utility
 * Helps verify what network configuration is actually being used at runtime
 */

import Constants from 'expo-constants';
import { getNetworkConfig, getCurrentNetwork, isMainnet, isDevnet } from '../../config/network/solanaNetworkConfig';
import { getConfig } from '../../config/unified';
import { getUSDC_CONFIG } from '../../services/shared/walletConstants';
import { logger } from '../../services/analytics/loggingService';

export interface NetworkDiagnosticResult {
  // Environment Detection
  isProduction: boolean;
  nodeEnv: string | undefined;
  buildProfile: string | undefined;
  appEnv: string | undefined;
  
  // Network Configuration
  detectedNetwork: 'devnet' | 'mainnet' | 'testnet';
  isMainnet: boolean;
  isDevnet: boolean;
  
  // Environment Variables (what was read)
  envVars: {
    EXPO_PUBLIC_NETWORK?: string;
    EXPO_PUBLIC_DEV_NETWORK?: string;
    EXPO_PUBLIC_FORCE_MAINNET?: string;
    ALLOW_CLIENT_NETWORK_OVERRIDE?: string;
    NODE_ENV?: string;
    EAS_BUILD_PROFILE?: string;
    APP_ENV?: string;
  };
  
  // Runtime Configuration (what is actually being used)
  runtimeConfig: {
    network: string;
    rpcUrl: string;
    usdcMintAddress: string;
    endpointCount: number;
    primaryProvider: string;
  };
  
  // Issues Found
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    recommendation?: string;
  }>;
}

/**
 * Get comprehensive network configuration diagnostic
 */
export async function getNetworkDiagnostic(): Promise<NetworkDiagnosticResult> {
  const issues: NetworkDiagnosticResult['issues'] = [];
  
  // Get environment variables
  const getEnvVar = (key: string): string | undefined => {
    return Constants.expoConfig?.extra?.[key] || process.env[key];
  };
  
  const nodeEnv = getEnvVar('NODE_ENV');
  const buildProfile = getEnvVar('EAS_BUILD_PROFILE');
  const appEnv = getEnvVar('APP_ENV');
  
  // Check production detection
  const isProduction = buildProfile === 'production' || 
                      appEnv === 'production' ||
                      nodeEnv === 'production' ||
                      !__DEV__;
  
  // Check NODE_ENV case sensitivity
  if (nodeEnv && nodeEnv !== 'production' && nodeEnv !== 'development') {
    if (nodeEnv === 'Production') {
      issues.push({
        severity: 'error',
        message: 'NODE_ENV has incorrect case: "Production" should be "production" (lowercase)',
        recommendation: 'Change NODE_ENV=Production to NODE_ENV=production in your .env file'
      });
    }
  }
  
  // Get network configuration
  const networkConfig = await getNetworkConfig();
  const unifiedConfig = getConfig();
  const usdcConfig = getUSDC_CONFIG();
  
  // Check environment variables
  const envVars = {
    EXPO_PUBLIC_NETWORK: getEnvVar('EXPO_PUBLIC_NETWORK'),
    EXPO_PUBLIC_DEV_NETWORK: getEnvVar('EXPO_PUBLIC_DEV_NETWORK'),
    EXPO_PUBLIC_FORCE_MAINNET: getEnvVar('EXPO_PUBLIC_FORCE_MAINNET'),
    ALLOW_CLIENT_NETWORK_OVERRIDE: getEnvVar('ALLOW_CLIENT_NETWORK_OVERRIDE'),
    NODE_ENV: nodeEnv,
    EAS_BUILD_PROFILE: buildProfile,
    APP_ENV: appEnv,
  };
  
  // Check for security issues
  if (isProduction && envVars.ALLOW_CLIENT_NETWORK_OVERRIDE === 'true') {
    issues.push({
      severity: 'error',
      message: 'ALLOW_CLIENT_NETWORK_OVERRIDE=true in production is a security risk',
      recommendation: 'Set ALLOW_CLIENT_NETWORK_OVERRIDE=false in production'
    });
  }
  
  // Check for confusing network config
  if (envVars.EXPO_PUBLIC_NETWORK === 'mainnet' && envVars.EXPO_PUBLIC_DEV_NETWORK === 'mainnet') {
    if (!isProduction) {
      issues.push({
        severity: 'warning',
        message: 'EXPO_PUBLIC_DEV_NETWORK=mainnet in development is confusing (should be "devnet" for dev testing)',
        recommendation: 'For dev testing, set EXPO_PUBLIC_NETWORK=devnet and EXPO_PUBLIC_DEV_NETWORK=devnet'
      });
    }
  }
  
  // Determine primary RPC provider
  const rpcUrl = networkConfig.rpcUrl;
  let primaryProvider = 'Official Solana';
  if (rpcUrl.includes('alchemy')) {
    primaryProvider = 'Alchemy';
  } else if (rpcUrl.includes('getblock')) {
    primaryProvider = 'GetBlock';
  } else if (rpcUrl.includes('helius')) {
    primaryProvider = 'Helius';
  } else if (rpcUrl.includes('quiknode')) {
    primaryProvider = 'QuickNode';
  } else if (rpcUrl.includes('chainstack')) {
    primaryProvider = 'Chainstack';
  }
  
  // Verify USDC mint address matches network
  const expectedMainnetMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const expectedDevnetMint = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
  
  if (networkConfig.network === 'mainnet' && usdcConfig.mintAddress !== expectedMainnetMint) {
    issues.push({
      severity: 'error',
      message: `USDC mint address mismatch: Expected mainnet mint (${expectedMainnetMint.substring(0, 10)}...), got ${usdcConfig.mintAddress.substring(0, 10)}...`,
      recommendation: 'Check unified config is using correct network'
    });
  }
  
  if (networkConfig.network === 'devnet' && usdcConfig.mintAddress !== expectedDevnetMint) {
    issues.push({
      severity: 'error',
      message: `USDC mint address mismatch: Expected devnet mint (${expectedDevnetMint.substring(0, 10)}...), got ${usdcConfig.mintAddress.substring(0, 10)}...`,
      recommendation: 'Check unified config is using correct network'
    });
  }
  
  return {
    isProduction,
    nodeEnv,
    buildProfile,
    appEnv,
    detectedNetwork: networkConfig.network,
    isMainnet: isMainnet(),
    isDevnet: isDevnet(),
    envVars,
    runtimeConfig: {
      network: networkConfig.network,
      rpcUrl: rpcUrl.replace(/api-key=[^&]+/, 'api-key=***').replace(/\/v2\/[^\/]+/, '/v2/***'),
      usdcMintAddress: usdcConfig.mintAddress,
      endpointCount: networkConfig.rpcEndpoints.length,
      primaryProvider,
    },
    issues,
  };
}

/**
 * Log network diagnostic to console (for debugging)
 */
export async function logNetworkDiagnostic(): Promise<void> {
  const diagnostic = await getNetworkDiagnostic();
  
  logger.info('=== Network Configuration Diagnostic ===', diagnostic, 'NetworkDiagnostic');
  
  console.log('\n🔍 Network Configuration Diagnostic');
  console.log('=====================================');
  console.log('\n📊 Environment Detection:');
  console.log(`  Production: ${diagnostic.isProduction}`);
  console.log(`  NODE_ENV: ${diagnostic.nodeEnv || 'not set'}`);
  console.log(`  EAS_BUILD_PROFILE: ${diagnostic.buildProfile || 'not set'}`);
  console.log(`  APP_ENV: ${diagnostic.appEnv || 'not set'}`);
  
  console.log('\n🌐 Network Configuration:');
  console.log(`  Detected Network: ${diagnostic.detectedNetwork}`);
  console.log(`  Is Mainnet: ${diagnostic.isMainnet}`);
  console.log(`  Is Devnet: ${diagnostic.isDevnet}`);
  
  console.log('\n📝 Environment Variables:');
  Object.entries(diagnostic.envVars).forEach(([key, value]) => {
    if (value !== undefined) {
      console.log(`  ${key}: ${value}`);
    }
  });
  
  console.log('\n⚙️  Runtime Configuration:');
  console.log(`  Network: ${diagnostic.runtimeConfig.network}`);
  console.log(`  RPC URL: ${diagnostic.runtimeConfig.rpcUrl}`);
  console.log(`  USDC Mint: ${diagnostic.runtimeConfig.usdcMintAddress.substring(0, 10)}...`);
  console.log(`  Endpoints: ${diagnostic.runtimeConfig.endpointCount}`);
  console.log(`  Primary Provider: ${diagnostic.runtimeConfig.primaryProvider}`);
  
  if (diagnostic.issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    diagnostic.issues.forEach((issue, index) => {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${index + 1}. ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
      if (issue.recommendation) {
        console.log(`     💡 Recommendation: ${issue.recommendation}`);
      }
    });
  } else {
    console.log('\n✅ No issues found!');
  }
  
  console.log('\n=====================================\n');
}

/**
 * Environment validation service for WeSplit app
 * Ensures all required environment variables are properly configured
 */

import { logger } from './loggingService';

interface EnvironmentConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  solana: {
    network: 'devnet' | 'testnet' | 'mainnet';
    rpcEndpoint: string;
  };
  moonpay: {
    apiKey?: string;
  };
}

class EnvironmentValidationService {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvironmentConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
      },
      solana: {
        network: isProduction ? 'mainnet' : 'devnet',
        rpcEndpoint: isProduction 
          ? 'https://api.mainnet-beta.solana.com'
          : 'https://api.devnet.solana.com',
      },
      moonpay: {
        apiKey: process.env.MOONPAY_API_KEY,
      }
    };
  }

  validateFirebaseConfig(): boolean {
    const { firebase } = this.config;
    const requiredFields = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];
    
    for (const field of requiredFields) {
      if (!firebase[field as keyof typeof firebase]) {
        logger.warn(`Missing Firebase configuration: ${field}`, null, 'EnvironmentValidation');
        // Don't fail validation for missing Firebase keys in development
        if (this.isProduction()) {
          return false;
        }
      }
    }

    logger.info('Firebase configuration validated successfully', null, 'EnvironmentValidation');
    return true;
  }

  validateSolanaConfig(): boolean {
    const { solana } = this.config;
    
    if (!solana.rpcEndpoint) {
      logger.error('Missing Solana RPC endpoint', null, 'EnvironmentValidation');
      return false;
    }

    logger.info(`Solana configuration validated: ${solana.network}`, null, 'EnvironmentValidation');
    return true;
  }

  validateMoonPayConfig(): boolean {
    const { moonpay } = this.config;
    
    if (!moonpay.apiKey) {
      logger.warn('MoonPay API key not configured (optional)', null, 'EnvironmentValidation');
      return false;
    }

    logger.info('MoonPay configuration validated successfully', null, 'EnvironmentValidation');
    return true;
  }

  validateAll(): boolean {
    const firebaseValid = this.validateFirebaseConfig();
    const solanaValid = this.validateSolanaConfig();
    const moonpayValid = this.validateMoonPayConfig();

    // In development, only require Solana to be valid
    const allValid = this.isDevelopment() ? solanaValid : (firebaseValid && solanaValid);
    
    if (allValid) {
      logger.info('All environment configurations validated successfully', null, 'EnvironmentValidation');
    } else {
      logger.error('Environment validation failed', { firebaseValid, solanaValid, moonpayValid }, 'EnvironmentValidation');
    }

    return allValid;
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}

export const environmentValidator = new EnvironmentValidationService(); 
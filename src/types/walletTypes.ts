/**
 * Shared wallet types and interfaces
 * Centralized type definitions to avoid duplication across services
 */

import { PublicKey } from '@solana/web3.js';

// Wallet information interface
export interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: string;
  balance: number;
  usdcBalance: number;
  isConnected: boolean;
  walletName?: string;
  walletType?: 'app-generated' | 'external';
}

// Wallet provider interface
export interface WalletProvider {
  name: string;
  icon: string;
  logoUrl: string;
  isAvailable: boolean;
  detectionMethod: 'deep-link' | 'package' | 'browser-extension' | 'manual';
  deepLinkScheme?: string;
  appStoreId?: string;
  playStoreId?: string;
  websiteUrl?: string;
}

// UI-specific wallet provider interface (extends base with methods)
export interface UIWalletProvider extends WalletProvider {
  connect(): Promise<any>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signMessage(message: any): Promise<any>;
}

// Wallet connection result
export interface WalletConnectionResult {
  publicKey: string;
  success: boolean;
  error?: string;
}

// Wallet linking result
export interface WalletLinkingResult {
  publicKey: string;
  signature: string;
  success: boolean;
  error?: string;
}

// Wallet connection options
export interface WalletConnectionOptions {
  providerName: string;
  userId?: string;
  network?: string;
}

// Wallet creation result
export interface WalletCreationResult {
  success: boolean;
  wallet?: {
    address: string;
    publicKey: string;
  };
  error?: string;
}

// External wallet authentication result
export interface ExternalWalletAuthResult {
  publicKey: string;
  signature: string;
  success: boolean;
  error?: string;
}

// Wallet connection state
export interface WalletConnectionState {
  connecting: boolean;
  connected: boolean;
  publicKey: PublicKey | null;
  signature: string | null;
}

// Wallet adapter message
export interface WalletAdapterMessage {
  method: string;
  params: any;
  id: string;
}

// Wallet adapter response
export interface WalletAdapterResponse {
  result?: any;
  error?: any;
}

// Phone analysis result
export interface PhoneAnalysisResult {
  availableWallets: WalletProvider[];
  totalWallets: number;
  platform: 'ios' | 'android' | 'web';
}

// Wallet provider info (for logo service)
export interface WalletProviderInfo {
  name: string;
  logoUrl: string;
  fallbackIcon: string;
  isAvailable: boolean;
  detectionMethod: 'deep-link' | 'browser-extension' | 'app-installation' | 'manual';
  deepLinkScheme?: string;
  appStoreId?: string;
  playStoreId?: string;
  websiteUrl?: string;
}

// Wallet logo interface
export interface WalletLogo {
  name: string;
  logoUrl: string;
  fallbackIcon: string;
  isAvailable: boolean;
  detectionMethod: 'deep-link' | 'browser-extension' | 'app-installation' | 'manual';
}

export default {
  WalletInfo,
  WalletProvider,
  UIWalletProvider,
  WalletConnectionResult,
  WalletLinkingResult,
  WalletConnectionOptions,
  WalletCreationResult,
  ExternalWalletAuthResult,
  WalletConnectionState,
  WalletAdapterMessage,
  WalletAdapterResponse,
  PhoneAnalysisResult,
  WalletProviderInfo,
  WalletLogo
};


/**
 * Wallet State Slice
 * Manages wallet connection and balance state
 */

import { StateCreator } from 'zustand';
import { WalletState, WalletActions, AppStore } from '../types';
import { logger } from '../../services/loggingService';

export const createWalletSlice: StateCreator<
  AppStore,
  [],
  [],
  WalletState & WalletActions
> = (set, get) => ({
  // Initial state
  isConnected: false,
  address: null,
  balance: null,
  walletName: null,
  chainId: null,
  appWalletAddress: null,
  appWalletBalance: null,
  appWalletConnected: false,
  isLoading: false,
  error: null,
  availableWallets: [],
  currentWalletId: null,

  // Actions
  connectWallet: (address: string, walletName: string, chainId?: string) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        isConnected: true,
        address,
        walletName,
        chainId: chainId || null,
        error: null,
      },
    }));

    logger.info('Wallet connected', { 
      address, 
      walletName, 
      chainId 
    }, 'WalletSlice');
  },

  disconnectWallet: () => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        isConnected: false,
        address: null,
        balance: null,
        walletName: null,
        chainId: null,
        error: null,
      },
    }));

    logger.info('Wallet disconnected', null, 'WalletSlice');
  },

  updateBalance: (balance: number) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        balance,
      },
    }));
  },

  setAppWallet: (address: string, balance: number) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        appWalletAddress: address,
        appWalletBalance: balance,
        appWalletConnected: true,
        error: null,
      },
    }));

    logger.info('App wallet set', { address, balance }, 'WalletSlice');
  },

  updateAppWalletBalance: (balance: number) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        appWalletBalance: balance,
      },
    }));
  },

  setWalletLoading: (loading: boolean) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        isLoading: loading,
      },
    }));
  },

  setWalletError: (error: string | null) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        error,
      },
    }));
  },

  clearWalletError: () => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        error: null,
      },
    }));
  },

  setAvailableWallets: (wallets: any[]) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        availableWallets: wallets,
      },
    }));
  },

  setCurrentWalletId: (walletId: string | null) => {
    set((state) => ({
      wallet: {
        ...state.wallet,
        currentWalletId: walletId,
      },
    }));
  },
});

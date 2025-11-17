/**
 * Network Configuration Tests
 */

import { 
  getNetworkConfig, 
  getNetworkConfigSync,
  clearNetworkConfigCache,
  setNetworkOverride,
  isMainnet,
  isDevnet,
  getCurrentNetwork,
} from '../solanaNetworkConfig';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('expo-constants');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../services/analytics/loggingService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Solana Network Configuration', () => {
  beforeEach(() => {
    clearNetworkConfigCache();
    jest.clearAllMocks();
    (Constants.expoConfig as any) = { extra: {} };
    (global as any).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_NETWORK;
    delete process.env.EXPO_PUBLIC_DEV_NETWORK;
    delete process.env.EXPO_PUBLIC_FORCE_MAINNET;
    delete process.env.DEV_NETWORK;
    delete process.env.FORCE_MAINNET;
    delete process.env.EAS_BUILD_PROFILE;
    delete process.env.APP_ENV;
  });

  describe('getNetworkConfig', () => {
    it('should default to devnet in development', async () => {
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('devnet');
      expect(config.rpcUrl).toContain('devnet');
      expect(config.usdcMintAddress).toBe('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
    });

    it('should default to mainnet in production', async () => {
      (global as any).__DEV__ = false;
      process.env.EAS_BUILD_PROFILE = 'production';
      
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('mainnet');
      expect(config.rpcUrl).toContain('mainnet');
      expect(config.usdcMintAddress).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });

    it('should read EXPO_PUBLIC_NETWORK env var', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'mainnet' },
      };
      
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('mainnet');
    });

    it('should override devnet in production builds', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'devnet' },
      };
      process.env.EAS_BUILD_PROFILE = 'production';
      (global as any).__DEV__ = false;
      
      const config = await getNetworkConfig();
      
      // Should force mainnet in production
      expect(config.network).toBe('mainnet');
    });

    it('should return correct USDC mint address per network', async () => {
      // Mainnet
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'mainnet' },
      };
      const mainnetConfig = await getNetworkConfig();
      expect(mainnetConfig.usdcMintAddress).toBe(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
      );
      
      clearNetworkConfigCache();
      
      // Devnet
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'devnet' },
      };
      const devnetConfig = await getNetworkConfig();
      expect(devnetConfig.usdcMintAddress).toBe(
        '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
      );
    });

    it('should support legacy EXPO_PUBLIC_DEV_NETWORK env var', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_DEV_NETWORK: 'mainnet' },
      };
      
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('mainnet');
    });

    it('should support legacy FORCE_MAINNET env var', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_FORCE_MAINNET: 'true' },
      };
      
      const config = await getNetworkConfig();
      
      expect(config.network).toBe('mainnet');
    });

    it('should enhance RPC endpoints with API keys', async () => {
      (Constants.expoConfig as any) = {
        extra: { 
          EXPO_PUBLIC_NETWORK: 'mainnet',
          EXPO_PUBLIC_HELIUS_API_KEY: 'test_helius_key',
        },
      };
      
      const config = await getNetworkConfig();
      
      expect(config.rpcEndpoints[0]).toContain('helius-rpc.com');
      expect(config.rpcEndpoints[0]).toContain('test_helius_key');
    });
  });

  describe('isMainnet / isDevnet', () => {
    it('should correctly identify mainnet', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'mainnet' },
      };
      await getNetworkConfig();
      
      expect(isMainnet()).toBe(true);
      expect(isDevnet()).toBe(false);
    });

    it('should correctly identify devnet', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'devnet' },
      };
      await getNetworkConfig();
      
      expect(isMainnet()).toBe(false);
      expect(isDevnet()).toBe(true);
    });
  });

  describe('getCurrentNetwork', () => {
    it('should return current network', async () => {
      (Constants.expoConfig as any) = {
        extra: { EXPO_PUBLIC_NETWORK: 'mainnet' },
      };
      await getNetworkConfig();
      
      expect(getCurrentNetwork()).toBe('mainnet');
    });
  });

  describe('setNetworkOverride', () => {
    it('should set network override in dev builds', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await setNetworkOverride('mainnet');
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('NETWORK_OVERRIDE', 'mainnet');
    });

    it('should throw error in production builds', async () => {
      (global as any).__DEV__ = false;
      process.env.EAS_BUILD_PROFILE = 'production';
      
      await expect(setNetworkOverride('devnet')).rejects.toThrow(
        'Network override not allowed in production builds'
      );
    });
  });
});

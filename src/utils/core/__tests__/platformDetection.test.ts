/**
 * Platform Detection Tests
 */

import { getPlatformInfo, isMWAAvailable, isRunningInExpoGo } from '../platformDetection';

// Mock global variables
const mockGlobal = global as any;

describe('Platform Detection', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockGlobal.__DEV__ = true;
  });

  describe('getPlatformInfo', () => {
    it('should detect Expo Go environment', () => {
      // Mock Expo Go environment
      mockGlobal.Expo = undefined;
      
      const platformInfo = getPlatformInfo();
      
      expect(platformInfo.isExpoGo).toBe(true);
      expect(platformInfo.environment).toBe('expo-go');
      expect(platformInfo.canUseMWA).toBe(false);
    });

    it('should detect development build environment', () => {
      // Mock development build environment
      mockGlobal.Expo = {
        modules: {
          expo: {
            modules: {
              ExpoModulesCore: {}
            }
          }
        }
      };
      
      const platformInfo = getPlatformInfo();
      
      expect(platformInfo.isDevelopmentBuild).toBe(true);
      expect(platformInfo.environment).toBe('development-build');
      expect(platformInfo.canUseMWA).toBe(true);
    });

    it('should detect production environment', () => {
      // Mock production environment
      mockGlobal.__DEV__ = false;
      mockGlobal.Expo = {
        modules: {
          expo: {
            modules: {
              ExpoModulesCore: {}
            }
          }
        }
      };
      
      const platformInfo = getPlatformInfo();
      
      expect(platformInfo.isProduction).toBe(true);
      expect(platformInfo.environment).toBe('production');
      expect(platformInfo.canUseMWA).toBe(true);
    });
  });

  describe('isMWAAvailable', () => {
    it('should return false in Expo Go', () => {
      mockGlobal.Expo = undefined;
      
      expect(isMWAAvailable()).toBe(false);
    });

    it('should return true in development build', () => {
      mockGlobal.Expo = {
        modules: {
          expo: {
            modules: {
              ExpoModulesCore: {}
            }
          }
        }
      };
      
      expect(isMWAAvailable()).toBe(true);
    });
  });

  describe('isRunningInExpoGo', () => {
    it('should return true in Expo Go', () => {
      mockGlobal.Expo = undefined;
      
      expect(isRunningInExpoGo()).toBe(true);
    });

    it('should return false in development build', () => {
      mockGlobal.Expo = {
        modules: {
          expo: {
            modules: {
              ExpoModulesCore: {}
            }
          }
        }
      };
      
      expect(isRunningInExpoGo()).toBe(false);
    });
  });
});

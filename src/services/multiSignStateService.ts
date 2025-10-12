import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './loggingService';

interface MultiSignState {
  isEnabled: boolean;
  activatedAt: string;
  expiresAt: string;
}

const MULTI_SIGN_STORAGE_KEY = 'multiSignState';

export class MultiSignStateService {
  /**
   * Initialize the service and clean up expired states
   */
  static async initialize(): Promise<void> {
    try {
      await this.cleanupExpiredStates();
    } catch (error) {
      console.error('Error initializing multi-sign state service:', error);
    }
  }

  /**
   * Clean up expired states
   */
  static async cleanupExpiredStates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(MULTI_SIGN_STORAGE_KEY);
      
      if (stored) {
        const state: MultiSignState = JSON.parse(stored);
        const now = new Date();
        const expiresAt = new Date(state.expiresAt);
        
        if (now > expiresAt) {
          await AsyncStorage.removeItem(MULTI_SIGN_STORAGE_KEY);
          
          if (__DEV__) {
            logger.info('Cleaned up expired multi-sign state', null, 'multiSignStateService');
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired states:', error);
    }
  }

  /**
   * Save multi-sign state with 1-month expiration
   */
  static async saveMultiSignState(isEnabled: boolean): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
      
      const state: MultiSignState = {
        isEnabled,
        activatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      await AsyncStorage.setItem(MULTI_SIGN_STORAGE_KEY, JSON.stringify(state));
      
      if (__DEV__) {
        logger.info('Multi-sign state saved', {
          isEnabled,
          activatedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving multi-sign state:', error);
      throw error;
    }
  }

  /**
   * Load multi-sign state and check if it's still valid
   */
  static async loadMultiSignState(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(MULTI_SIGN_STORAGE_KEY);
      
      if (!stored) {
        return false;
      }
      
      const state: MultiSignState = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(state.expiresAt);
      
      // Check if the state has expired
      if (now > expiresAt) {
        // State has expired, remove it and return false
        await AsyncStorage.removeItem(MULTI_SIGN_STORAGE_KEY);
        
        if (__DEV__) {
          logger.warn('Multi-sign state expired, removed from storage', null, 'multiSignStateService');
        }
        
        return false;
      }
      
      if (__DEV__) {
        logger.info('Multi-sign state loaded', {
          isEnabled: state.isEnabled,
          activatedAt: state.activatedAt,
          expiresAt: state.expiresAt,
          daysRemaining: Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        });
      }
      
      return state.isEnabled;
    } catch (error) {
      console.error('Error loading multi-sign state:', error);
      return false;
    }
  }

  /**
   * Clear multi-sign state
   */
  static async clearMultiSignState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MULTI_SIGN_STORAGE_KEY);
      
      if (__DEV__) {
        logger.info('Multi-sign state cleared', null, 'multiSignStateService');
      }
    } catch (error) {
      console.error('Error clearing multi-sign state:', error);
      throw error;
    }
  }

  /**
   * Get remaining days for multi-sign state
   */
  static async getRemainingDays(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(MULTI_SIGN_STORAGE_KEY);
      
      if (!stored) {
        return 0;
      }
      
      const state: MultiSignState = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(state.expiresAt);
      
      if (now > expiresAt) {
        return 0;
      }
      
      return Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    } catch (error) {
      console.error('Error getting remaining days:', error);
      return 0;
    }
  }
} 
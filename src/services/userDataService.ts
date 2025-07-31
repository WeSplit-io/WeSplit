import { firestoreService } from '../config/firebase';
import { logger } from './loggingService';
import { userWalletService } from './userWalletService';

export interface UserData {
  id: string;
  name: string;
  email: string;
  wallet_address?: string;
  wallet_public_key?: string;
  created_at: string;
  avatar?: string;
  provider: 'google' | 'apple' | 'twitter' | 'email';
  emailVerified: boolean;
  lastLoginAt: string;
  hasCompletedOnboarding: boolean;
}

export interface SaveUserDataResult {
  success: boolean;
  userData?: UserData;
  error?: string;
}

class UserDataService {
  /**
   * Save user data to Firestore after successful SSO login
   */
  async saveUserDataAfterSSO(
    firebaseUser: any,
    provider: 'google' | 'apple' | 'twitter'
  ): Promise<SaveUserDataResult> {
    try {
      logger.info('🔄 Saving user data after SSO login', { 
        uid: firebaseUser.uid, 
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        provider 
      }, 'UserData');

      // Check if user already exists in Firestore
      let existingUserData = await firestoreService.getUserDocument(firebaseUser.uid);

      if (existingUserData) {
        // Update existing user data
        logger.info('✅ Updating existing user data', { 
          uid: firebaseUser.uid,
          existingName: existingUserData.name,
          existingEmail: existingUserData.email
        }, 'UserData');
        
        const updatedUserData = await this.updateExistingUserData(firebaseUser, existingUserData, provider);
        
        logger.info('✅ User data updated successfully', { 
          uid: firebaseUser.uid,
          name: updatedUserData.name,
          hasCompletedOnboarding: updatedUserData.hasCompletedOnboarding
        }, 'UserData');
        
        return {
          success: true,
          userData: updatedUserData
        };
      } else {
        // Create new user data
        logger.info('🔄 Creating new user data', { 
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        }, 'UserData');
        
        const newUserData = await this.createNewUserData(firebaseUser, provider);
        
        logger.info('✅ New user data created successfully', { 
          uid: firebaseUser.uid,
          name: newUserData.name,
          hasCompletedOnboarding: newUserData.hasCompletedOnboarding
        }, 'UserData');
        
        return {
          success: true,
          userData: newUserData
        };
      }

    } catch (error) {
      logger.error('❌ Failed to save user data after SSO login', error, 'UserData');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save user data'
      };
    }
  }

  /**
   * Create new user data for first-time SSO login
   */
  private async createNewUserData(
    firebaseUser: any,
    provider: 'google' | 'apple' | 'twitter'
  ): Promise<UserData> {
    try {
      // Ensure user has a wallet
      const walletResult = await userWalletService.ensureUserWallet(firebaseUser.uid);
      
      if (!walletResult.success) {
        logger.warn('Failed to create wallet for new user', { 
          uid: firebaseUser.uid,
          error: walletResult.error 
        }, 'UserData');
      }

      // Create user document in Firestore
      const userData = await firestoreService.createUserDocument(firebaseUser, 
        walletResult.success ? walletResult.wallet : undefined
      );

      // Transform to our UserData format
      const transformedUserData: UserData = {
        id: userData.id || firebaseUser.uid,
        name: userData.name || firebaseUser.displayName || '',
        email: userData.email || firebaseUser.email || '',
        wallet_address: userData.wallet_address || walletResult.wallet?.address || '',
        wallet_public_key: userData.wallet_public_key || walletResult.wallet?.publicKey || '',
        created_at: userData.created_at || new Date().toISOString(),
        avatar: userData.avatar || firebaseUser.photoURL || '',
        provider,
        emailVerified: userData.emailVerified || firebaseUser.emailVerified || false,
        lastLoginAt: new Date().toISOString(),
        hasCompletedOnboarding: userData.hasCompletedOnboarding || false
      };

      logger.info('Successfully created new user data', { 
        uid: firebaseUser.uid,
        provider 
      }, 'UserData');

      return transformedUserData;

    } catch (error) {
      logger.error('Failed to create new user data', error, 'UserData');
      throw error;
    }
  }

  /**
   * Update existing user data for returning SSO login
   */
  private async updateExistingUserData(
    firebaseUser: any,
    existingUserData: any,
    provider: 'google' | 'apple' | 'twitter'
  ): Promise<UserData> {
    try {
      // Update last login timestamp
      await firestoreService.updateLastVerifiedAt(firebaseUser.email || '');

      // Ensure user has a wallet if they don't have one
      let walletData = existingUserData.wallet_address ? {
        address: existingUserData.wallet_address,
        publicKey: existingUserData.wallet_public_key
      } : undefined;

      if (!walletData) {
        const walletResult = await userWalletService.ensureUserWallet(firebaseUser.uid);
        
        if (walletResult.success && walletResult.wallet) {
          walletData = walletResult.wallet;
          
          // Update user document with wallet info
          await firestoreService.updateUserWallet(firebaseUser.uid, walletData);
          
          logger.info('Added wallet to existing user', { 
            uid: firebaseUser.uid,
            walletAddress: walletData.address 
          }, 'UserData');
        }
      }

      // Update user profile if we have new information
      const profileUpdates: any = {
        lastLoginAt: new Date().toISOString(),
        emailVerified: firebaseUser.emailVerified || existingUserData.emailVerified || false
      };

      // Update name if we have a new one and the existing one is empty
      if (firebaseUser.displayName && !existingUserData.name) {
        profileUpdates.name = firebaseUser.displayName;
      }

      // Update avatar if we have a new one and the existing one is empty
      if (firebaseUser.photoURL && !existingUserData.avatar) {
        profileUpdates.avatar = firebaseUser.photoURL;
      }

      // Update user document
      await firestoreService.updateUserDocument(firebaseUser.uid, profileUpdates);

      // Transform to our UserData format
      const transformedUserData: UserData = {
        id: existingUserData.id || firebaseUser.uid,
        name: profileUpdates.name || existingUserData.name || firebaseUser.displayName || '',
        email: existingUserData.email || firebaseUser.email || '',
        wallet_address: walletData?.address || existingUserData.wallet_address || '',
        wallet_public_key: walletData?.publicKey || existingUserData.wallet_public_key || '',
        created_at: existingUserData.created_at || new Date().toISOString(),
        avatar: profileUpdates.avatar || existingUserData.avatar || firebaseUser.photoURL || '',
        provider: provider,
        emailVerified: profileUpdates.emailVerified || existingUserData.emailVerified || false,
        lastLoginAt: profileUpdates.lastLoginAt,
        hasCompletedOnboarding: existingUserData.hasCompletedOnboarding || false
      };

      logger.info('Successfully updated existing user data', { 
        uid: firebaseUser.uid,
        provider 
      }, 'UserData');

      return transformedUserData;

    } catch (error) {
      logger.error('Failed to update existing user data', error, 'UserData');
      throw error;
    }
  }

  /**
   * Get user data by UID
   */
  async getUserData(uid: string): Promise<UserData | null> {
    try {
      const userData = await firestoreService.getUserDocument(uid);
      
      if (!userData) {
        return null;
      }

      // Transform to our UserData format
      const transformedUserData: UserData = {
        id: userData.id || uid,
        name: userData.name || '',
        email: userData.email || '',
        wallet_address: userData.wallet_address || '',
        wallet_public_key: userData.wallet_public_key || '',
        created_at: userData.created_at || new Date().toISOString(),
        avatar: userData.avatar || '',
        provider: userData.provider || 'email',
        emailVerified: userData.emailVerified || false,
        lastLoginAt: userData.lastLoginAt || new Date().toISOString(),
        hasCompletedOnboarding: userData.hasCompletedOnboarding || false
      };

      return transformedUserData;

    } catch (error) {
      logger.error('Failed to get user data', error, 'UserData');
      return null;
    }
  }

  /**
   * Update user onboarding status
   */
  async updateOnboardingStatus(uid: string, hasCompletedOnboarding: boolean): Promise<boolean> {
    try {
      await firestoreService.updateExistingUserOnboardingStatus(uid, hasCompletedOnboarding);
      
      logger.info('Updated user onboarding status', { 
        uid, 
        hasCompletedOnboarding 
      }, 'UserData');
      
      return true;
    } catch (error) {
      logger.error('Failed to update onboarding status', error, 'UserData');
      return false;
    }
  }

  /**
   * Update user profile data
   */
  async updateUserProfile(uid: string, profileData: {
    name?: string;
    avatar?: string;
    email?: string;
  }): Promise<boolean> {
    try {
      await firestoreService.updateUserDocument(uid, profileData);
      
      logger.info('Updated user profile', { 
        uid, 
        profileData 
      }, 'UserData');
      
      return true;
    } catch (error) {
      logger.error('Failed to update user profile', error, 'UserData');
      return false;
    }
  }

  /**
   * Check if user should skip onboarding
   */
  async shouldSkipOnboarding(uid: string): Promise<boolean> {
    try {
      const userData = await this.getUserData(uid);
      
      if (!userData) {
        return false;
      }

      return userData.hasCompletedOnboarding;
    } catch (error) {
      logger.error('Failed to check onboarding status', error, 'UserData');
      return false;
    }
  }
}

export const userDataService = new UserDataService(); 
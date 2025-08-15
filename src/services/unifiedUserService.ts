/**
 * Unified User Service for WeSplit
 * Prevents duplicate user creation across multiple systems
 */

import { User } from '../types';
import { firebaseDataService } from './firebaseDataService';
import { firestoreService } from '../config/firebase';
import { userWalletService } from './userWalletService';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface CreateUserData {
  email: string;
  name: string;
  walletAddress?: string;
  walletPublicKey?: string;
  avatar?: string;
}

export interface UnifiedUserResponse {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

class UnifiedUserService {
  /**
   * Create or get user with unified logic
   * This is the ONLY place where users should be created
   */
  async createOrGetUser(userData: CreateUserData): Promise<UnifiedUserResponse> {
    try {
      if (__DEV__) {
        console.log('🔄 UnifiedUserService: Creating/getting user for email:', userData.email);
      }

      // Step 1: Check if user exists in Firestore
      const existingUser = await this.getUserByEmail(userData.email);
      
      if (existingUser) {
        if (__DEV__) {
          console.log('✅ UnifiedUserService: User already exists:', existingUser.id);
        }
        
        // Update user if needed (e.g., wallet info)
        const updatedUser = await this.updateUserIfNeeded(existingUser, userData);
        
        return {
          success: true,
          user: updatedUser,
          isNewUser: false
        };
      }

      // Step 2: Create new user in Firestore with random document ID
      // Note: Firebase Functions will create a separate document with Firebase Auth UID
      // We'll handle this by checking for existing users by email
      if (__DEV__) {
        console.log('🆕 UnifiedUserService: Creating new user in Firestore');
      }

      const newUser = await firebaseDataService.user.createUserIfNotExists({
        email: userData.email,
        name: userData.name,
        wallet_address: userData.walletAddress || '',
        wallet_public_key: userData.walletPublicKey || '',
        avatar: userData.avatar || '',
        hasCompletedOnboarding: true // Mark as completed since user is creating profile
      });

      // Step 3: Ensure user has a wallet
      if (!newUser.wallet_address) {
        if (__DEV__) {
          console.log('🔄 UnifiedUserService: Ensuring wallet for new user');
        }

        const walletResult = await userWalletService.ensureUserWallet(newUser.id.toString());
        
        if (walletResult.success && walletResult.wallet) {
          // Update user with wallet information
          const updatedUser = await firebaseDataService.user.updateUser(newUser.id.toString(), {
            wallet_address: walletResult.wallet.address,
            wallet_public_key: walletResult.wallet.publicKey
          });

          if (__DEV__) {
            console.log('✅ UnifiedUserService: User created with wallet:', updatedUser.wallet_address);
          }

          return {
            success: true,
            user: updatedUser,
            isNewUser: true
          };
        } else {
          console.error('❌ UnifiedUserService: Failed to create wallet:', walletResult.error);
          // Return user without wallet - they can add it later
          return {
            success: true,
            user: newUser,
            isNewUser: true
          };
        }
      }

      return {
        success: true,
        user: newUser,
        isNewUser: true
      };

    } catch (error) {
      console.error('❌ UnifiedUserService: Error creating/getting user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  /**
   * Get user by email from Firestore
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Return the first user found (should be only one)
        const userDoc = querySnapshot.docs[0];
        return firebaseDataService.transformers.firestoreToUser(userDoc);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Update user if new data is provided
   */
  async updateUserIfNeeded(existingUser: User, newData: CreateUserData): Promise<User> {
    const updates: Partial<User> = {};
    let hasUpdates = false;

    // Check if we need to update wallet info
    if (newData.walletAddress && !existingUser.wallet_address) {
      updates.wallet_address = newData.walletAddress;
      hasUpdates = true;
    }

    if (newData.walletPublicKey && !existingUser.wallet_public_key) {
      updates.wallet_public_key = newData.walletPublicKey;
      hasUpdates = true;
    }

    // Check if we need to update name
    if (newData.name && newData.name !== existingUser.name) {
      updates.name = newData.name;
      updates.hasCompletedOnboarding = true; // User has completed profile creation
      hasUpdates = true;
    }

    // Check if we need to update avatar
    if (newData.avatar && newData.avatar !== existingUser.avatar) {
      updates.avatar = newData.avatar;
      hasUpdates = true;
    }

    if (hasUpdates) {
      if (__DEV__) {
        console.log('🔄 UnifiedUserService: Updating user with new data');
      }
      return await firebaseDataService.user.updateUser(existingUser.id.toString(), updates);
    }

    return existingUser;
  }

  /**
   * Ensure user has a wallet, create if needed
   */
  async ensureUserWallet(userId: string): Promise<UnifiedUserResponse> {
    try {
      const user = await firebaseDataService.user.getCurrentUser(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (user.wallet_address) {
        return {
          success: true,
          user
        };
      }

      // Create wallet for user
      const walletResult = await userWalletService.ensureUserWallet(userId);
      
      if (walletResult.success && walletResult.wallet) {
        const updatedUser = await firebaseDataService.user.updateUser(userId, {
          wallet_address: walletResult.wallet.address,
          wallet_public_key: walletResult.wallet.publicKey
        });

        return {
          success: true,
          user: updatedUser
        };
      } else {
        return {
          success: false,
          error: walletResult.error || 'Failed to create wallet'
        };
      }
    } catch (error) {
      console.error('Error ensuring user wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to ensure wallet'
      };
    }
  }

  /**
   * Clean up duplicate users (migration function)
   */
  async cleanupDuplicateUsers(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('🧹 UnifiedUserService: Starting duplicate user cleanup');
      }

      // This would be implemented to clean up existing duplicates
      // For now, we'll just log the intention
      console.log('Duplicate user cleanup not implemented yet');
    } catch (error) {
      console.error('Error cleaning up duplicate users:', error);
    }
  }
}

export const unifiedUserService = new UnifiedUserService(); 
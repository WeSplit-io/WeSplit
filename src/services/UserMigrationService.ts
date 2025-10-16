/**
 * User Migration Service
 * Ensures consistent user identification across Expo Go and production environments
 * Uses email as primary identifier, Firebase UID as secondary
 */

import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteField } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types';
import { logger } from './loggingService';
import { firebaseDataTransformers } from './firebaseDataService';

export class UserMigrationService {
  /**
   * Ensure consistent user identification across environments
   * Uses email as primary identifier, Firebase UID as secondary
   */
  static async ensureUserConsistency(firebaseUser: any): Promise<User> {
    try {
      const email = firebaseUser.email;
      const firebaseUid = firebaseUser.uid;
      
      if (!email) {
        throw new Error('User email is required for consistent identification');
      }
      
      logger.info('Ensuring user consistency', { 
        email: email.substring(0, 5) + '...', 
        firebaseUid: firebaseUid.substring(0, 8) + '...' 
      }, 'UserMigrationService');
      
      // 1. Always search by email first (primary identifier)
      let userData = await this.findUserByEmail(email);
      
      if (userData) {
        logger.info('Found existing user by email', { 
          email: email.substring(0, 5) + '...',
          existingUserId: userData.id.substring(0, 8) + '...',
          newFirebaseUid: firebaseUid.substring(0, 8) + '...'
        }, 'UserMigrationService');
        
        // User exists - update Firebase UID if different
        if (userData.id !== firebaseUid) {
          await this.updateUserFirebaseUid(userData.id, firebaseUid);
          userData.id = firebaseUid; // Update local reference
          logger.info('Updated user Firebase UID', { 
            email: email.substring(0, 5) + '...',
            oldUid: userData.id.substring(0, 8) + '...',
            newUid: firebaseUid.substring(0, 8) + '...'
          }, 'UserMigrationService');
        }
        
        // Update user profile data if needed
        await this.updateUserProfileData(userData.id, firebaseUser);
        
        return userData;
      }
      
      // 2. User doesn't exist - create new user with email as primary key
      logger.info('Creating new user', { 
        email: email.substring(0, 5) + '...',
        firebaseUid: firebaseUid.substring(0, 8) + '...'
      }, 'UserMigrationService');
      
      return await this.createNewUser(firebaseUser);
      
    } catch (error) {
      logger.error('Failed to ensure user consistency', error, 'UserMigrationService');
      throw error;
    }
  }
  
  /**
   * Find user by email (primary identifier)
   */
  private static async findUserByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('email', '==', email));
      const userDocs = await getDocs(userQuery);
      
      if (!userDocs.empty) {
        const userDoc = userDocs.docs[0];
        const userData = firebaseDataTransformers.firestoreToUser(userDoc);
        logger.info('Found user by email', { 
          email: email.substring(0, 5) + '...',
          userId: userData.id.substring(0, 8) + '...'
        }, 'UserMigrationService');
        return userData;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to find user by email', error, 'UserMigrationService');
      return null;
    }
  }
  
  /**
   * Update user's Firebase UID in database
   */
  private static async updateUserFirebaseUid(oldUid: string, newUid: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', oldUid);
      await updateDoc(userRef, {
        id: newUid,
        firebase_uid: newUid,
        last_uid_update: new Date().toISOString()
      });
      
      logger.info('Updated user Firebase UID in database', { 
        oldUid: oldUid.substring(0, 8) + '...',
        newUid: newUid.substring(0, 8) + '...'
      }, 'UserMigrationService');
    } catch (error) {
      logger.error('Failed to update user Firebase UID', error, 'UserMigrationService');
      throw error;
    }
  }
  
  /**
   * Update user profile data from Firebase user
   */
  private static async updateUserProfileData(userId: string, firebaseUser: any): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updates: any = {
        last_profile_update: new Date().toISOString()
      };
      
      // Update name if available and different
      if (firebaseUser.displayName) {
        updates.name = firebaseUser.displayName;
      }
      
      // Update avatar if available
      if (firebaseUser.photoURL) {
        updates.avatar = firebaseUser.photoURL;
      }
      
      // Update email verification status
      if (firebaseUser.emailVerified !== undefined) {
        updates.email_verified = firebaseUser.emailVerified;
      }
      
      await updateDoc(userRef, updates);
      
      logger.info('Updated user profile data', { 
        userId: userId.substring(0, 8) + '...',
        hasDisplayName: !!firebaseUser.displayName,
        hasPhotoURL: !!firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified
      }, 'UserMigrationService');
    } catch (error) {
      logger.error('Failed to update user profile data', error, 'UserMigrationService');
      // Don't throw - this is not critical
    }
  }
  
  /**
   * Create new user with consistent identification
   */
  private static async createNewUser(firebaseUser: any): Promise<User> {
    try {
      const userData = {
        id: firebaseUser.uid,
        firebase_uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        wallet_address: '',
        wallet_public_key: '',
        created_at: new Date().toISOString(),
        avatar: firebaseUser.photoURL || '',
        hasCompletedOnboarding: false,
        email_verified: firebaseUser.emailVerified || false,
        wallet_status: 'no_wallet',
        wallet_type: 'app-generated',
        wallet_migration_status: 'none'
      };
      
      const userRef = await addDoc(collection(db, 'users'), userData);
      const newUser = {
        ...userData,
        id: userRef.id
      } as User;
      
      logger.info('Created new user', { 
        userId: newUser.id.substring(0, 8) + '...',
        email: newUser.email.substring(0, 5) + '...'
      }, 'UserMigrationService');
      
      return newUser;
    } catch (error) {
      logger.error('Failed to create new user', error, 'UserMigrationService');
      throw error;
    }
  }
  
  /**
   * Migrate existing users to use email-based identification
   */
  static async migrateExistingUsers(): Promise<{ migrated: number; errors: number }> {
    try {
      logger.info('Starting user migration process', null, 'UserMigrationService');
      
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      let migrated = 0;
      let errors = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData = userDoc.data();
          
          // 1. Remove private keys from database if they exist
          if (userData.wallet_secret_key) {
            await updateDoc(userDoc.ref, {
              wallet_secret_key: deleteField(),
              wallet_has_private_key: true, // Set flag instead
              migration_removed_private_key: new Date().toISOString()
            });
            logger.info('Removed private key from database', { 
              userId: userDoc.id.substring(0, 8) + '...',
              email: userData.email?.substring(0, 5) + '...'
            }, 'UserMigrationService');
          }
          
          // 2. Ensure email-based identification
          if (userData.email && !userData.primary_email) {
            await updateDoc(userDoc.ref, {
              primary_email: userData.email,
              migration_email_primary: new Date().toISOString()
            });
          }
          
          // 3. Add migration tracking
          await updateDoc(userDoc.ref, {
            migration_completed: new Date().toISOString(),
            migration_version: '1.0'
          });
          
          migrated++;
          
        } catch (error) {
          logger.error('Failed to migrate user', { 
            userId: userDoc.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'UserMigrationService');
          errors++;
        }
      }
      
      logger.info('User migration completed', { migrated, errors }, 'UserMigrationService');
      return { migrated, errors };
      
    } catch (error) {
      logger.error('Failed to migrate existing users', error, 'UserMigrationService');
      throw error;
    }
  }
  
  /**
   * Check if user needs migration
   */
  static async checkUserMigrationStatus(userId: string): Promise<{
    needsMigration: boolean;
    hasPrivateKeyInDb: boolean;
    hasEmailPrimary: boolean;
  }> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDocs(query(collection(db, 'users'), where('id', '==', userId)));
      
      if (userDoc.empty) {
        return { needsMigration: false, hasPrivateKeyInDb: false, hasEmailPrimary: false };
      }
      
      const userData = userDoc.docs[0].data();
      
      return {
        needsMigration: !userData.migration_completed,
        hasPrivateKeyInDb: !!userData.wallet_secret_key,
        hasEmailPrimary: !!userData.primary_email
      };
      
    } catch (error) {
      logger.error('Failed to check user migration status', error, 'UserMigrationService');
      return { needsMigration: false, hasPrivateKeyInDb: false, hasEmailPrimary: false };
    }
  }
}

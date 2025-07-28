/**
 * Duplicate User Cleanup Service
 * Merges duplicate user documents in Firestore
 */

import { db } from '../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firebaseDataService } from './firebaseDataService';

export interface DuplicateUser {
  email: string;
  documents: Array<{
    id: string;
    data: any;
    createdAt: Date;
  }>;
}

export interface CleanupResult {
  success: boolean;
  mergedUsers: number;
  deletedDocuments: number;
  errors: string[];
}

class DuplicateUserCleanupService {
  /**
   * Find all duplicate users by email
   */
  async findDuplicateUsers(): Promise<DuplicateUser[]> {
    try {
      const usersRef = collection(db, 'users');
      const allUsers = await getDocs(usersRef);
      
      const userGroups: { [email: string]: Array<{ id: string; data: any; createdAt: Date }> } = {};
      
      allUsers.docs.forEach(userDoc => {
        const data = userDoc.data();
        const email = data.email;
        
        if (!userGroups[email]) {
          userGroups[email] = [];
        }
        
        userGroups[email].push({
          id: userDoc.id,
          data,
          createdAt: data.created_at?.toDate?.() || new Date(data.created_at) || new Date()
        });
      });
      
      // Filter only emails with multiple documents
      const duplicates = Object.entries(userGroups)
        .filter(([email, docs]) => docs.length > 1)
        .map(([email, docs]) => ({
          email,
          documents: docs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) // Sort by creation date
        }));
      
      return duplicates;
    } catch (error) {
      console.error('Error finding duplicate users:', error);
      return [];
    }
  }

  /**
   * Merge duplicate users - keep the oldest document and merge data from others
   */
  async mergeDuplicateUsers(duplicates: DuplicateUser[]): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      mergedUsers: 0,
      deletedDocuments: 0,
      errors: []
    };

    for (const duplicate of duplicates) {
      try {
        console.log(`🔄 Merging duplicates for email: ${duplicate.email}`);
        
        // Keep the oldest document (first in sorted array)
        const primaryDoc = duplicate.documents[0];
        const otherDocs = duplicate.documents.slice(1);
        
        // Merge data from other documents into the primary document
        const mergedData = { ...primaryDoc.data };
        
        for (const otherDoc of otherDocs) {
          // Merge non-empty fields from other documents
          Object.entries(otherDoc.data).forEach(([key, value]) => {
            if (value && value !== '' && value !== null && value !== undefined) {
              if (!mergedData[key] || mergedData[key] === '' || mergedData[key] === null) {
                mergedData[key] = value;
              }
            }
          });
        }
        
        // Update the primary document with merged data
        const primaryRef = doc(db, 'users', primaryDoc.id);
        await updateDoc(primaryRef, mergedData);
        
        // Delete other documents
        for (const otherDoc of otherDocs) {
          const otherRef = doc(db, 'users', otherDoc.id);
          await deleteDoc(otherRef);
          result.deletedDocuments++;
        }
        
        result.mergedUsers++;
        console.log(`✅ Merged ${duplicate.documents.length} documents for ${duplicate.email}`);
        
      } catch (error) {
        const errorMsg = `Error merging duplicates for ${duplicate.email}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    return result;
  }

  /**
   * Run the complete cleanup process
   */
  async runCleanup(): Promise<CleanupResult> {
    console.log('🧹 Starting duplicate user cleanup...');
    
    const duplicates = await this.findDuplicateUsers();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate users found');
      return {
        success: true,
        mergedUsers: 0,
        deletedDocuments: 0,
        errors: []
      };
    }
    
    console.log(`Found ${duplicates.length} emails with duplicate users:`);
    duplicates.forEach(dup => {
      console.log(`  - ${dup.email}: ${dup.documents.length} documents`);
    });
    
    return await this.mergeDuplicateUsers(duplicates);
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{ totalUsers: number; duplicateEmails: number; totalDuplicates: number }> {
    const duplicates = await this.findDuplicateUsers();
    const totalDuplicates = duplicates.reduce((sum, dup) => sum + dup.documents.length, 0);
    
    // Get total users
    const usersRef = collection(db, 'users');
    const allUsers = await getDocs(usersRef);
    
    return {
      totalUsers: allUsers.size,
      duplicateEmails: duplicates.length,
      totalDuplicates
    };
  }
}

export const duplicateUserCleanup = new DuplicateUserCleanupService(); 
import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { firebaseDataService } from '../services/data';
import { User, UserContact } from '../types';
import { logger } from '../services/core';

interface ContactActionResult {
  success: boolean;
  error?: string;
  contact?: UserContact;
}

/**
 * Hook for managing contact-related actions
 * Consolidates all contact addition, removal, and update logic
 */
export const useContactActions = () => {
  const { state } = useApp();
  const { currentUser } = state;

  /**
   * Add a new contact to the user's contact list
   */
  const addContact = useCallback(async (user: User): Promise<ContactActionResult> => {
    if (!currentUser?.id) {
      return { success: false, error: 'No current user found' };
    }

    try {
      logger.info('Adding contact', { 
        userId: currentUser.id, 
        contactName: user.name,
        contactEmail: user.email 
      }, 'useContactActions');

      const newContact = await firebaseDataService.user.addContact(currentUser.id.toString(), {
        name: user.name,
        email: user.email,
        wallet_address: user.wallet_address,
        wallet_public_key: user.wallet_public_key,
        avatar: user.avatar || '',
        mutual_groups_count: 0,
        isFavorite: false
      });

      logger.info('Contact added successfully', { 
        contactId: newContact.id,
        contactName: user.name 
      }, 'useContactActions');

      // Sync first contact quest completion
      try {
        const { userActionSyncService } = await import('../services/rewards/userActionSyncService');
        await userActionSyncService.syncFirstContact(currentUser.id.toString());
      } catch (syncError) {
        logger.error('Failed to sync first contact quest', { userId: currentUser.id, syncError }, 'useContactActions');
        // Don't fail contact addition if sync fails
      }

      return { success: true, contact: newContact };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to add contact', error, 'useContactActions');
      return { success: false, error: errorMessage };
    }
  }, [currentUser?.id]);

  /**
   * Remove a contact from the user's contact list
   */
  const removeContact = useCallback(async (contactId: string): Promise<ContactActionResult> => {
    if (!currentUser?.id) {
      return { success: false, error: 'No current user found' };
    }

    try {
      logger.info('Removing contact', { 
        userId: currentUser.id, 
        contactId 
      }, 'useContactActions');

      await firebaseDataService.user.removeContact(currentUser.id.toString(), contactId);

      logger.info('Contact removed successfully', { 
        contactId 
      }, 'useContactActions');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to remove contact', error, 'useContactActions');
      return { success: false, error: errorMessage };
    }
  }, [currentUser?.id]);

  /**
   * Toggle favorite status of a contact
   */
  const toggleFavorite = useCallback(async (contactId: string, isFavorite: boolean): Promise<ContactActionResult> => {
    if (!currentUser?.id) {
      return { success: false, error: 'No current user found' };
    }

    try {
      logger.info('Toggling contact favorite status', { 
        userId: currentUser.id, 
        contactId,
        isFavorite 
      }, 'useContactActions');

      await firebaseDataService.user.toggleFavorite(currentUser.id.toString(), contactId, isFavorite);

      logger.info('Contact favorite status updated', { 
        contactId,
        isFavorite 
      }, 'useContactActions');

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to toggle contact favorite', error, 'useContactActions');
      return { success: false, error: errorMessage };
    }
  }, [currentUser?.id]);

  /**
   * Check if a user is already in the current user's contacts
   */
  const isUserAlreadyContact = useCallback((user: User, contacts: UserContact[]): boolean => {
    return contacts.some(contact =>
      String(contact.id) === String(user.id) ||
      contact.email === user.email ||
      contact.wallet_address === user.wallet_address
    );
  }, []);

  return {
    addContact,
    removeContact,
    toggleFavorite,
    isUserAlreadyContact
  };
};

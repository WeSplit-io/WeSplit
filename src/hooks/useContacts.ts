import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { TransactionBasedContactService } from '../services/contacts';
import { UserContact } from '../types';
import { logger } from '../services/core';

interface UseContactsResult {
  contacts: UserContact[];
  loading: boolean;
  error: string | null;
  loadContacts: (forceRefresh?: boolean) => Promise<void>;
  refreshContacts: () => Promise<void>;
}

/**
 * Hook for managing contact data loading and state
 * Provides unified contact loading using TransactionBasedContactService
 */
export const useContacts = (): UseContactsResult => {
  const { state } = useApp();
  const { currentUser } = state;
  
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load contacts from all sources (transactions, splits, manual)
   */
  const loadContacts = useCallback(async (forceRefresh: boolean = false) => {
    if (!currentUser?.id) {
      logger.warn('No current user found for contact loading', null, 'useContacts');
      setLoading(false);
      setError('No current user found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.info('Loading contacts', { 
        userId: currentUser.id, 
        forceRefresh 
      }, 'useContacts');

      const loadedContacts = await TransactionBasedContactService.getTransactionBasedContacts(
        currentUser.id.toString()
      );

      logger.info('Contacts loaded successfully', { 
        count: loadedContacts.length,
        userId: currentUser.id 
      }, 'useContacts');

      setContacts(loadedContacts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contacts';
      logger.error('Failed to load contacts', err, 'useContacts');
      setError(errorMessage);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  /**
   * Refresh contacts (alias for loadContacts with force refresh)
   */
  const refreshContacts = useCallback(async () => {
    await loadContacts(true);
  }, [loadContacts]);

  // Load contacts on mount and when currentUser changes
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return {
    contacts,
    loading,
    error,
    loadContacts,
    refreshContacts
  };
};

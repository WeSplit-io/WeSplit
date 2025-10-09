/**
 * Linked Wallets Service
 * Manages external wallets and KAST cards linked to user accounts
 * Handles storage, retrieval, validation, and management of linked destinations
 * Uses Firebase subcollections within user documents for storage
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from './loggingService';
import { validateAddress, validateKastIdentifier } from '../utils/sendUtils';

export interface ExternalWallet {
  id: string;
  label: string;
  address: string;
  chain: string;
  createdAt: string;
  updatedAt: string;
  firebaseDocId?: string; // Firebase document ID for direct access
}

export interface KastCard {
  id: string;
  label: string;
  identifier: string;
  identifierMasked: string;
  last4: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  firebaseDocId?: string; // Firebase document ID for direct access
}

export interface LinkedWalletsData {
  externalWallets: ExternalWallet[];
  kastCards: KastCard[];
}

class LinkedWalletsService {
  private readonly EXTERNAL_WALLETS_COLLECTION = 'externalWallets';
  private readonly KAST_CARDS_COLLECTION = 'kastCards';

  /**
   * Get all linked wallets and KAST cards for a user
   */
  async getLinkedDestinations(userId: string): Promise<LinkedWalletsData> {
    try {
      logger.info(`Getting linked destinations for user ${userId}`, null, 'LinkedWalletsService');

      const [externalWallets, kastCards] = await Promise.all([
        this.getExternalWallets(userId),
        this.getKastCards(userId)
      ]);

      return {
        externalWallets,
        kastCards
      };
    } catch (error) {
      logger.error('Failed to get linked destinations', error, 'LinkedWalletsService');
      return {
        externalWallets: [],
        kastCards: []
      };
    }
  }

  /**
   * Get external wallets for a user
   */
  async getExternalWallets(userId: string): Promise<ExternalWallet[]> {
    try {
      logger.info(`Getting external wallets for user ${userId}`, null, 'LinkedWalletsService');
      
      const userRef = doc(db, 'users', userId);
      const walletsRef = collection(userRef, this.EXTERNAL_WALLETS_COLLECTION);
      
      // Query wallets ordered by creation date (newest first)
      const walletsQuery = query(
        walletsRef,
        orderBy('createdAt', 'desc')
      );
      
      const walletsSnapshot = await getDocs(walletsQuery);
      const wallets: ExternalWallet[] = [];
      
      walletsSnapshot.forEach((doc) => {
        const data = doc.data();
        wallets.push({
          id: data.id || doc.id,
          label: data.label || '',
          address: data.address || '',
          chain: data.chain || 'solana',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          firebaseDocId: doc.id
        });
      });
      
      logger.info(`Retrieved ${wallets.length} external wallets for user ${userId}`, null, 'LinkedWalletsService');
      return wallets;
    } catch (error) {
      logger.error('Failed to get external wallets', error, 'LinkedWalletsService');
      return [];
    }
  }

  /**
   * Get KAST cards for a user
   */
  async getKastCards(userId: string): Promise<KastCard[]> {
    try {
      logger.info(`Getting KAST cards for user ${userId}`, null, 'LinkedWalletsService');
      
      const userRef = doc(db, 'users', userId);
      const cardsRef = collection(userRef, this.KAST_CARDS_COLLECTION);
      
      // Query cards ordered by creation date (newest first)
      const cardsQuery = query(
        cardsRef,
        orderBy('createdAt', 'desc')
      );
      
      const cardsSnapshot = await getDocs(cardsQuery);
      const cards: KastCard[] = [];
      
      cardsSnapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          id: data.id || doc.id,
          label: data.label || '',
          identifier: data.identifier || '',
          identifierMasked: data.identifierMasked || '',
          last4: data.last4 || '',
          address: data.address || data.identifier || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          firebaseDocId: doc.id
        });
      });
      
      logger.info(`Retrieved ${cards.length} KAST cards for user ${userId}`, null, 'LinkedWalletsService');
      return cards;
    } catch (error) {
      logger.error('Failed to get KAST cards', error, 'LinkedWalletsService');
      return [];
    }
  }

  /**
   * Add a new external wallet
   */
  async addExternalWallet(userId: string, walletData: {
    label: string;
    address: string;
    chain?: string;
  }): Promise<ExternalWallet> {
    try {
      logger.info(`Adding external wallet for user ${userId}: ${walletData.label}`, null, 'LinkedWalletsService');
      
      // Validate the wallet address
      const validation = validateAddress(walletData.address);
      if (!validation.isValid) {
        throw new Error(`Invalid wallet address: ${validation.error}`);
      }

      // Get existing wallets to check for duplicates
      const existingWallets = await this.getExternalWallets(userId);

      // Check for duplicates
      const duplicateWallet = existingWallets.find(
        wallet => wallet.address.toLowerCase() === walletData.address.toLowerCase()
      );
      if (duplicateWallet) {
        throw new Error('This wallet address is already linked');
      }

      // Create wallet data for Firebase
      const walletId = this.generateId();
      const now = serverTimestamp();
      
      const walletFirebaseData = {
        id: walletId,
        label: walletData.label.trim(),
        address: walletData.address.trim(),
        chain: walletData.chain || 'solana',
        createdAt: now,
        updatedAt: now
      };

      // Add to Firebase subcollection
      const userRef = doc(db, 'users', userId);
      const walletsRef = collection(userRef, this.EXTERNAL_WALLETS_COLLECTION);
      const docRef = await addDoc(walletsRef, walletFirebaseData);

      // Create the wallet object to return
      const newWallet: ExternalWallet = {
        id: walletId,
        label: walletData.label.trim(),
        address: walletData.address.trim(),
        chain: walletData.chain || 'solana',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        firebaseDocId: docRef.id
      };

      logger.info(`Successfully added external wallet for user ${userId}: ${newWallet.label}`, null, 'LinkedWalletsService');
      return newWallet;
    } catch (error) {
      logger.error('Failed to add external wallet', error, 'LinkedWalletsService');
      throw error;
    }
  }

  /**
   * Add a new KAST card
   */
  async addKastCard(userId: string, cardData: {
    label: string;
    identifier: string;
  }): Promise<KastCard> {
    try {
      logger.info(`Adding KAST card for user ${userId}: ${cardData.label}`, null, 'LinkedWalletsService');
      
      // Validate the KAST identifier
      const validation = validateKastIdentifier(cardData.identifier);
      if (!validation.isValid) {
        throw new Error(`Invalid KAST identifier: ${validation.error}`);
      }

      // Get existing KAST cards to check for duplicates
      const existingCards = await this.getKastCards(userId);

      // Check for duplicates
      const duplicateCard = existingCards.find(
        card => card.identifier.toLowerCase() === cardData.identifier.toLowerCase()
      );
      if (duplicateCard) {
        throw new Error('This KAST card is already linked');
      }

      // Create card data for Firebase
      const cardId = this.generateId();
      const now = serverTimestamp();
      const maskedIdentifier = this.maskKastIdentifier(cardData.identifier);
      
      const cardFirebaseData = {
        id: cardId,
        label: cardData.label.trim(),
        identifier: cardData.identifier.trim(),
        identifierMasked: maskedIdentifier,
        last4: cardData.identifier.slice(-4),
        address: cardData.identifier, // For compatibility with existing code
        createdAt: now,
        updatedAt: now
      };

      // Add to Firebase subcollection
      const userRef = doc(db, 'users', userId);
      const cardsRef = collection(userRef, this.KAST_CARDS_COLLECTION);
      const docRef = await addDoc(cardsRef, cardFirebaseData);

      // Create the card object to return
      const newCard: KastCard = {
        id: cardId,
        label: cardData.label.trim(),
        identifier: cardData.identifier.trim(),
        identifierMasked: maskedIdentifier,
        last4: cardData.identifier.slice(-4),
        address: cardData.identifier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        firebaseDocId: docRef.id
      };

      logger.info(`Successfully added KAST card for user ${userId}: ${newCard.label}`, null, 'LinkedWalletsService');
      return newCard;
    } catch (error) {
      logger.error('Failed to add KAST card', error, 'LinkedWalletsService');
      throw error;
    }
  }

  /**
   * Update an external wallet
   */
  async updateExternalWallet(userId: string, walletId: string, updates: {
    label?: string;
    address?: string;
    chain?: string;
  }): Promise<ExternalWallet> {
    try {
      const existingWallets = await this.getExternalWallets(userId);
      const walletIndex = existingWallets.findIndex(wallet => wallet.id === walletId);

      if (walletIndex === -1) {
        throw new Error('Wallet not found');
      }

      const wallet = existingWallets[walletIndex];

      // Validate address if it's being updated
      if (updates.address && updates.address !== wallet.address) {
        const validation = validateAddress(updates.address);
        if (!validation.isValid) {
          throw new Error(`Invalid wallet address: ${validation.error}`);
        }

        // Check for duplicates
        const duplicateWallet = existingWallets.find(
          w => w.id !== walletId && w.address.toLowerCase() === updates.address!.toLowerCase()
        );
        if (duplicateWallet) {
          throw new Error('This wallet address is already linked');
        }
      }

      // Update wallet
      const updatedWallet: ExternalWallet = {
        ...wallet,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      existingWallets[walletIndex] = updatedWallet;

      // Save to secure storage
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      await secureStorageService.storeSecureData(key, JSON.stringify(existingWallets));

      logger.info(`Updated external wallet ${walletId} for user ${userId}`, null, 'LinkedWalletsService');
      return updatedWallet;
    } catch (error) {
      logger.error('Failed to update external wallet', error, 'LinkedWalletsService');
      throw error;
    }
  }

  /**
   * Update a KAST card
   */
  async updateKastCard(userId: string, cardId: string, updates: {
    label?: string;
    identifier?: string;
  }): Promise<KastCard> {
    try {
      const existingCards = await this.getKastCards(userId);
      const cardIndex = existingCards.findIndex(card => card.id === cardId);

      if (cardIndex === -1) {
        throw new Error('KAST card not found');
      }

      const card = existingCards[cardIndex];

      // Validate identifier if it's being updated
      if (updates.identifier && updates.identifier !== card.identifier) {
        const validation = validateKastIdentifier(updates.identifier);
        if (!validation.isValid) {
          throw new Error(`Invalid KAST identifier: ${validation.error}`);
        }

        // Check for duplicates
        const duplicateCard = existingCards.find(
          c => c.id !== cardId && c.identifier.toLowerCase() === updates.identifier!.toLowerCase()
        );
        if (duplicateCard) {
          throw new Error('This KAST card is already linked');
        }
      }

      // Update card
      const updatedCard: KastCard = {
        ...card,
        ...updates,
        identifierMasked: updates.identifier ? this.maskKastIdentifier(updates.identifier) : card.identifierMasked,
        last4: updates.identifier ? updates.identifier.slice(-4) : card.last4,
        address: updates.identifier || card.address, // For compatibility
        updatedAt: new Date().toISOString()
      };

      existingCards[cardIndex] = updatedCard;

      // Save to secure storage
      const key = `${this.KAST_CARDS_KEY_PREFIX}${userId}`;
      await secureStorageService.storeSecureData(key, JSON.stringify(existingCards));

      logger.info(`Updated KAST card ${cardId} for user ${userId}`, null, 'LinkedWalletsService');
      return updatedCard;
    } catch (error) {
      logger.error('Failed to update KAST card', error, 'LinkedWalletsService');
      throw error;
    }
  }

  /**
   * Remove an external wallet
   */
  async removeExternalWallet(userId: string, walletId: string): Promise<void> {
    try {
      logger.info(`Removing external wallet ${walletId} for user ${userId}`, null, 'LinkedWalletsService');
      
      // Get existing wallets to find the Firebase document ID
      const existingWallets = await this.getExternalWallets(userId);
      const walletToRemove = existingWallets.find(wallet => wallet.id === walletId);

      if (!walletToRemove || !walletToRemove.firebaseDocId) {
        throw new Error('Wallet not found');
      }

      // Delete from Firebase subcollection
      const userRef = doc(db, 'users', userId);
      const walletRef = doc(userRef, this.EXTERNAL_WALLETS_COLLECTION, walletToRemove.firebaseDocId);
      await deleteDoc(walletRef);

      logger.info(`Successfully removed external wallet ${walletId} for user ${userId}`, null, 'LinkedWalletsService');
    } catch (error) {
      logger.error('Failed to remove external wallet', error, 'LinkedWalletsService');
      throw error;
    }
  }

  /**
   * Remove a KAST card
   */
  async removeKastCard(userId: string, cardId: string): Promise<void> {
    try {
      logger.info(`Removing KAST card ${cardId} for user ${userId}`, null, 'LinkedWalletsService');
      
      // Get existing cards to find the Firebase document ID
      const existingCards = await this.getKastCards(userId);
      const cardToRemove = existingCards.find(card => card.id === cardId);

      if (!cardToRemove || !cardToRemove.firebaseDocId) {
        throw new Error('KAST card not found');
      }

      // Delete from Firebase subcollection
      const userRef = doc(db, 'users', userId);
      const cardRef = doc(userRef, this.KAST_CARDS_COLLECTION, cardToRemove.firebaseDocId);
      await deleteDoc(cardRef);

      logger.info(`Successfully removed KAST card ${cardId} for user ${userId}`, null, 'LinkedWalletsService');
    } catch (error) {
      logger.error('Failed to remove KAST card', error, 'LinkedWalletsService');
      throw error;
    }
  }

  /**
   * Clear all linked destinations for a user
   */
  async clearAllLinkedDestinations(userId: string): Promise<void> {
    try {
      logger.info(`Clearing all linked destinations for user ${userId}`, null, 'LinkedWalletsService');
      
      // Get all wallets and cards to delete
      const [wallets, cards] = await Promise.all([
        this.getExternalWallets(userId),
        this.getKastCards(userId)
      ]);

      const userRef = doc(db, 'users', userId);

      // Delete all wallets
      const walletDeletePromises = wallets
        .filter(wallet => wallet.firebaseDocId)
        .map(wallet => deleteDoc(doc(userRef, this.EXTERNAL_WALLETS_COLLECTION, wallet.firebaseDocId!)));

      // Delete all cards
      const cardDeletePromises = cards
        .filter(card => card.firebaseDocId)
        .map(card => deleteDoc(doc(userRef, this.KAST_CARDS_COLLECTION, card.firebaseDocId!)));

      // Execute all deletions
      await Promise.all([...walletDeletePromises, ...cardDeletePromises]);

      logger.info(`Successfully cleared all linked destinations for user ${userId}`, null, 'LinkedWalletsService');
    } catch (error) {
      logger.error('Failed to clear linked destinations', error, 'LinkedWalletsService');
      throw error;
    }
  }

  /**
   * Validate wallet address
   */
  validateWalletAddress(address: string, chain: string = 'solana'): { isValid: boolean; error?: string } {
    return validateAddress(address);
  }

  /**
   * Validate KAST identifier
   */
  validateKastCardIdentifier(identifier: string): { isValid: boolean; error?: string } {
    return validateKastIdentifier(identifier);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mask KAST identifier for display
   */
  private maskKastIdentifier(identifier: string): string {
    if (!identifier || identifier.length < 8) {
      return identifier;
    }
    return `${identifier.slice(0, 4)}...${identifier.slice(-4)}`;
  }
}

export const linkedWalletsService = new LinkedWalletsService();

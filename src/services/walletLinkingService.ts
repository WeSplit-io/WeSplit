import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface WalletLink {
  id: string;
  userId: string;
  walletAddress: string;
  walletName: string;
  walletType: 'external' | 'internal';
  linkedAt: Date;
  isActive: boolean;
  network: string;
  balance?: number;
  lastUpdated?: Date;
}

class WalletLinkingService {
  constructor() {
    console.log('🔗 WalletLinkingService: Initialized for wallet linking');
  }

  /**
   * Link a wallet to a user's account
   */
  async linkWalletToUser(
    userId: string, 
    walletAddress: string, 
    walletName: string, 
    walletType: 'external' | 'internal' = 'external',
    network: string = 'solana'
  ): Promise<boolean> {
    try {
      console.log('🔗 WalletLinkingService: Linking wallet to user:', { userId, walletAddress, walletName, walletType });

      // Validate wallet address format (basic Solana address validation)
      if (!this.isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid Solana wallet address format');
      }

      // Check if wallet is already linked to another user
      const existingLink = await this.getWalletLinkByAddress(walletAddress);
      if (existingLink && existingLink.userId !== userId) {
        throw new Error('This wallet is already linked to another account');
      }

      // Check if wallet is already linked to this user
      const userWallets = await this.getLinkedWallets(userId);
      const alreadyLinked = userWallets.find(wallet => wallet.walletAddress === walletAddress);
      if (alreadyLinked) {
        console.log('🔗 WalletLinkingService: Wallet already linked to user');
        return true; // Already linked, consider it successful
      }

      // Create wallet link document
      const walletLinkId = `wallet_${userId}_${Date.now()}`;
      const walletLink: WalletLink = {
        id: walletLinkId,
        userId,
        walletAddress,
        walletName,
        walletType,
        linkedAt: new Date(),
        isActive: true,
        network,
        lastUpdated: new Date()
      };

      // Save to Firestore
      await setDoc(doc(db, 'wallet_links', walletLinkId), walletLink);

      // Update user document to include linked wallet
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        linked_wallets: arrayUnion(walletAddress),
        last_updated: new Date()
      });

      // If this is the first external wallet, set it as primary
      const externalWallets = userWallets.filter(w => w.walletType === 'external');
      if (externalWallets.length === 0) {
        await updateDoc(userRef, {
          primary_wallet: walletAddress
        });
        console.log('🔗 WalletLinkingService: Set as primary wallet');
      }

      console.log('🔗 WalletLinkingService: Wallet linked successfully');
      return true;

    } catch (error) {
      console.error('🔗 WalletLinkingService: Error linking wallet:', error);
      throw error;
    }
  }

  /**
   * Get all linked wallets for a user
   */
  async getLinkedWallets(userId: string): Promise<WalletLink[]> {
    try {
      console.log('🔗 WalletLinkingService: Getting linked wallets for user:', userId);

      const walletLinksRef = collection(db, 'wallet_links');
      const q = query(walletLinksRef, where('userId', '==', userId), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);

      const wallets: WalletLink[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        wallets.push({
          id: doc.id,
          userId: data.userId,
          walletAddress: data.walletAddress,
          walletName: data.walletName,
          walletType: data.walletType,
          linkedAt: data.linkedAt.toDate(),
          isActive: data.isActive,
          network: data.network,
          balance: data.balance,
          lastUpdated: data.lastUpdated?.toDate()
        });
      });

      console.log('🔗 WalletLinkingService: Found linked wallets:', wallets.length);
      return wallets;

    } catch (error) {
      console.error('🔗 WalletLinkingService: Error getting linked wallets:', error);
      throw error;
    }
  }

  /**
   * Get wallet link by address
   */
  async getWalletLinkByAddress(walletAddress: string): Promise<WalletLink | null> {
    try {
      console.log('🔗 WalletLinkingService: Getting wallet link by address:', walletAddress);

      const walletLinksRef = collection(db, 'wallet_links');
      const q = query(walletLinksRef, where('walletAddress', '==', walletAddress), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        userId: data.userId,
        walletAddress: data.walletAddress,
        walletName: data.walletName,
        walletType: data.walletType,
        linkedAt: data.linkedAt.toDate(),
        isActive: data.isActive,
        network: data.network,
        balance: data.balance,
        lastUpdated: data.lastUpdated?.toDate()
      };

    } catch (error) {
      console.error('🔗 WalletLinkingService: Error getting wallet link by address:', error);
      throw error;
    }
  }

  /**
   * Unlink a wallet from a user
   */
  async unlinkWalletFromUser(userId: string, walletAddress: string): Promise<boolean> {
    try {
      console.log('🔗 WalletLinkingService: Unlinking wallet from user:', { userId, walletAddress });

      // Find the wallet link
      const walletLink = await this.getWalletLinkByAddress(walletAddress);
      if (!walletLink || walletLink.userId !== userId) {
        throw new Error('Wallet not found or not linked to this user');
      }

      // Mark as inactive
      await updateDoc(doc(db, 'wallet_links', walletLink.id), {
        isActive: false,
        lastUpdated: new Date()
      });

      // Remove from user's linked wallets
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        linked_wallets: arrayRemove(walletAddress),
        last_updated: new Date()
      });

      // If this was the primary wallet, clear it
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && userDoc.data().primary_wallet === walletAddress) {
        await updateDoc(userRef, {
          primary_wallet: null
        });
      }

      console.log('🔗 WalletLinkingService: Wallet unlinked successfully');
      return true;

    } catch (error) {
      console.error('🔗 WalletLinkingService: Error unlinking wallet:', error);
      throw error;
    }
  }

  /**
   * Check if a wallet is linked to a user
   */
  async isWalletLinked(userId: string, walletAddress: string): Promise<boolean> {
    try {
      const walletLink = await this.getWalletLinkByAddress(walletAddress);
      return walletLink !== null && walletLink.userId === userId && walletLink.isActive;
    } catch (error) {
      console.error('🔗 WalletLinkingService: Error checking wallet link:', error);
      return false;
    }
  }

  /**
   * Update wallet balance
   */
  async updateWalletBalance(walletAddress: string, balance: number): Promise<void> {
    try {
      const walletLink = await this.getWalletLinkByAddress(walletAddress);
      if (walletLink) {
        await updateDoc(doc(db, 'wallet_links', walletLink.id), {
          balance,
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      console.error('🔗 WalletLinkingService: Error updating wallet balance:', error);
    }
  }

  /**
   * Validate Solana wallet address format
   */
  private isValidSolanaAddress(address: string): boolean {
    // Basic Solana address validation (32-44 characters, base58)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
  }

  /**
   * Get wallet balance from blockchain
   */
  async getWalletBalance(walletAddress: string): Promise<number> {
    try {
      // This would typically call a blockchain API
      // For now, we'll return 0 or fetch from stored data
      const walletLink = await this.getWalletLinkByAddress(walletAddress);
      return walletLink?.balance || 0;
    } catch (error) {
      console.error('🔗 WalletLinkingService: Error getting wallet balance:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const walletLinkingService = new WalletLinkingService(); 
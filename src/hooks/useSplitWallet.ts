import { useState, useCallback } from 'react';
import { logger } from '../services/analytics/loggingService';
import { Alert } from 'react-native';

export interface WalletData {
  externalWallets: { id: string; address: string; name?: string }[];
  kastCards: { id: string; address: string; name?: string }[];
  inAppWallet: { address: string } | null;
}

export interface UseSplitWalletReturn {
  // State
  externalWallets: WalletData['externalWallets'];
  kastCards: WalletData['kastCards'];
  inAppWallet: WalletData['inAppWallet'];
  isLoadingWallets: boolean;

  // Actions
  loadUserWallets: () => Promise<void>;
  reloadWallets: () => Promise<void>;
}

export const useSplitWallet = (currentUserId?: string): UseSplitWalletReturn => {
  const [externalWallets, setExternalWallets] = useState<WalletData['externalWallets']>([]);
  const [kastCards, setKastCards] = useState<WalletData['kastCards']>([]);
  const [inAppWallet, setInAppWallet] = useState<WalletData['inAppWallet']>(null);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  const loadUserWallets = useCallback(async () => {
    if (!currentUserId) return;

    setIsLoadingWallets(true);
    try {
      // Use LinkedWalletService to get both external wallets and KAST cards
      const { LinkedWalletService } = await import('../services/blockchain/wallet/LinkedWalletService');
      const linkedData = await LinkedWalletService.getLinkedDestinations(currentUserId);

      // Transform external wallets to the format expected by the UI
      const externalWalletsData = linkedData.externalWallets.map(wallet => ({
        id: wallet.id,
        address: wallet.address || wallet.identifier || '',
        name: wallet.label || `External Wallet ${wallet.id.slice(-4)}`
      }));

      // Transform KAST cards to the format expected by the UI
      const kastCardsData = linkedData.kastCards.map(card => ({
        id: card.id,
        address: card.address || card.identifier || '',
        name: card.label || `KAST Card ${card.id.slice(-4)}`
      }));

      setExternalWallets(externalWalletsData);
      setKastCards(kastCardsData);

      // Load in-app wallet from user document
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase/firebase');
      const userDocRef = doc(db, 'users', currentUserId);
      const userDocSnapshot = await getDoc(userDocRef);

      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        if (userData.wallet_address) {
          setInAppWallet({ address: userData.wallet_address });
        }
      }

      logger.debug('Loaded user wallets', {
        externalWalletsCount: externalWalletsData.length,
        kastCardsCount: kastCardsData.length,
        hasInAppWallet: userDocSnapshot.exists() && userDocSnapshot.data().wallet_address
      }, 'useSplitWallet');

    } catch (error) {
      logger.error('Error loading user wallets', error as Record<string, unknown>, 'useSplitWallet');
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setIsLoadingWallets(false);
    }
  }, [currentUserId]);

  const reloadWallets = useCallback(async () => {
    await loadUserWallets();
  }, [loadUserWallets]);

  return {
    externalWallets,
    kastCards,
    inAppWallet,
    isLoadingWallets,
    loadUserWallets,
    reloadWallets
  };
};

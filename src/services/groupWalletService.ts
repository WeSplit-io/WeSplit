import { Keypair, PublicKey } from '@solana/web3.js';
import { firebaseDataService } from './firebaseDataService';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface GroupWallet {
  id: number;
  group_id: number;
  wallet_address: string;
  wallet_public_key: string;
  wallet_secret_key?: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface GroupWalletTransaction {
  id: number;
  group_wallet_id: number;
  from_address?: string;
  to_address?: string;
  amount: number;
  currency: string;
  transaction_type: 'deposit' | 'withdrawal' | 'settlement';
  transaction_hash?: string;
  user_id?: number;
  memo?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export async function createGroupWallet(groupId: string, createdBy: string): Promise<GroupWallet> {
  try {
    // Generate a new Solana keypair for the group wallet
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = Buffer.from(keypair.secretKey).toString('base64');

    // Create wallet document in Firestore
    const walletRef = await addDoc(collection(db, 'groupWallets'), {
      group_id: groupId,
      wallet_address: publicKey,
      wallet_public_key: publicKey,
      wallet_secret_key: secretKey,
      created_by: createdBy,
      currency: 'USDC',
      balance: 0,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });

    return {
      id: parseInt(walletRef.id),
      group_id: parseInt(groupId),
      wallet_address: publicKey,
      wallet_public_key: publicKey,
      wallet_secret_key: secretKey,
      balance: 0,
      currency: 'USDC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch (e) {
    console.error('Error creating group wallet:', e);
    throw e;
  }
}

export async function getGroupWallet(groupId: string): Promise<GroupWallet | null> {
  try {
    const walletsRef = collection(db, 'groupWallets');
    const walletQuery = query(walletsRef, where('group_id', '==', groupId));
    const walletDocs = await getDocs(walletQuery);
    
    if (walletDocs.empty) {
      return null;
    }
    
    const walletDoc = walletDocs.docs[0];
    const data = walletDoc.data();
    
    return {
      id: parseInt(walletDoc.id),
      group_id: parseInt(groupId),
      wallet_address: data.wallet_address,
      wallet_public_key: data.wallet_public_key,
      wallet_secret_key: data.wallet_secret_key,
      balance: data.balance || 0,
      currency: data.currency || 'USDC',
      created_at: data.created_at?.toDate().toISOString() || new Date().toISOString(),
      updated_at: data.updated_at?.toDate().toISOString() || new Date().toISOString()
    };
  } catch (e) {
    console.error('Error fetching group wallet:', e);
    throw e;
  }
}

export async function fundGroupWallet(
  groupId: string, 
  userId: string, 
  amount: number, 
  currency: string = 'USDC',
  fromAddress: string
): Promise<GroupWalletTransaction> {
  try {
    // Create transaction record in Firestore
    const transactionRef = await addDoc(collection(db, 'groupWalletTransactions'), {
      group_id: groupId,
      from_address: fromAddress,
      amount: amount,
      currency: currency,
      transaction_type: 'deposit',
      user_id: userId,
      memo: `Funding group wallet from ${fromAddress}`,
      status: 'completed',
      created_at: serverTimestamp()
    });

    return {
      id: parseInt(transactionRef.id),
      group_wallet_id: parseInt(groupId),
      from_address: fromAddress,
      amount: amount,
      currency: currency,
      transaction_type: 'deposit',
      user_id: parseInt(userId),
      memo: `Funding group wallet from ${fromAddress}`,
      status: 'completed',
      created_at: new Date().toISOString()
    };
  } catch (e) {
    console.error('Error funding group wallet:', e);
    throw e;
  }
}

export const settleGroupExpenses = async (groupId: string, userId: string) => {
  return await firebaseDataService.settlement.settleGroupExpenses(groupId, userId, 'individual');
};

// Add function for full group settlement if needed
export const settleAllGroupExpenses = async (groupId: string, userId: string) => {
  return await firebaseDataService.settlement.settleGroupExpenses(groupId, userId, 'full');
};

export async function getGroupWalletTransactions(groupId: string): Promise<GroupWalletTransaction[]> {
  try {
    const transactionsRef = collection(db, 'groupWalletTransactions');
    const transactionQuery = query(transactionsRef, where('group_id', '==', groupId));
    const transactionDocs = await getDocs(transactionQuery);
    
    return transactionDocs.docs.map(doc => {
      const data = doc.data();
      return {
        id: parseInt(doc.id),
        group_wallet_id: parseInt(groupId),
        from_address: data.from_address,
        to_address: data.to_address,
        amount: data.amount,
        currency: data.currency,
        transaction_type: data.transaction_type,
        transaction_hash: data.transaction_hash,
        user_id: data.user_id,
        memo: data.memo,
        status: data.status,
        created_at: data.created_at?.toDate().toISOString() || new Date().toISOString()
      };
    });
  } catch (e) {
    console.error('Error fetching group wallet transactions:', e);
    throw e;
  }
}

export async function calculateOptimalSettlement(
  groupId: string
): Promise<Array<{ from: string; to: string; amount: number }>> {
  try {
    const settlements = await firebaseDataService.settlement.getSettlementCalculation(groupId);
    return settlements.map(settlement => ({
      from: settlement.from,
      to: settlement.to,
      amount: settlement.amount
    }));
  } catch (e) {
    console.error('Error calculating optimal settlement:', e);
    throw e;
  }
} 
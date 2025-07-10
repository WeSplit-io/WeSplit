import { Keypair, PublicKey } from '@solana/web3.js';

import { apiRequest } from '../config/api';

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

    return await apiRequest<GroupWallet>(`/api/groups/${groupId}/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: publicKey,
        walletPublicKey: publicKey,
        walletSecretKey: secretKey,
        createdBy,
        currency: 'USDC'
      }),
    });
  } catch (e) {
    console.error('Error creating group wallet:', e);
    throw e;
  }
}

export async function getGroupWallet(groupId: string): Promise<GroupWallet | null> {
  try {
    return await apiRequest<GroupWallet>(`/api/groups/${groupId}/wallet`);
  } catch (e: any) {
    if (e.message && e.message.includes('404')) {
      return null;
    }
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
    return await apiRequest<GroupWalletTransaction>(`/api/groups/${groupId}/wallet/fund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        amount,
        currency,
        fromAddress,
        memo: `Funding group wallet from ${fromAddress}`
      }),
    });
  } catch (e) {
    console.error('Error funding group wallet:', e);
    throw e;
  }
}

export const settleGroupExpenses = async (groupId: string, userId: string) => {
  return await apiRequest(`/api/groups/${groupId}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      userId: userId,
      settlementType: 'individual' // Use individual settlement by default
    }),
  });
};

// Add function for full group settlement if needed
export const settleAllGroupExpenses = async (groupId: string, userId: string) => {
  return await apiRequest(`/api/groups/${groupId}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      userId: userId,
      settlementType: 'full' // Full settlement for all members
    }),
  });
};

export async function getGroupWalletTransactions(groupId: string): Promise<GroupWalletTransaction[]> {
  try {
    return await apiRequest<GroupWalletTransaction[]>(`/api/groups/${groupId}/wallet/transactions`);
  } catch (e) {
    console.error('Error fetching group wallet transactions:', e);
    throw e;
  }
}

export async function calculateOptimalSettlement(
  groupId: string
): Promise<Array<{ from: string; to: string; amount: number }>> {
  try {
    return await apiRequest<Array<{ from: string; to: string; amount: number }>>(`/api/groups/${groupId}/settlement-calculation`);
  } catch (e) {
    console.error('Error calculating optimal settlement:', e);
    throw e;
  }
} 
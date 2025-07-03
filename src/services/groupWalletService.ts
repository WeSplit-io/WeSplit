import { Keypair, PublicKey } from '@solana/web3.js';

const BACKEND_URL = 'http://192.168.1.75:4000';

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

    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/wallet`, {
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

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create group wallet');
    }
  } catch (e) {
    console.error('Error creating group wallet:', e);
    throw e;
  }
}

export async function getGroupWallet(groupId: string): Promise<GroupWallet | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/wallet`);
    if (response.ok) {
      return await response.json();
    } else if (response.status === 404) {
      return null; // No wallet exists for this group
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch group wallet');
    }
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
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/wallet/fund`, {
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

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fund group wallet');
    }
  } catch (e) {
    console.error('Error funding group wallet:', e);
    throw e;
  }
}

export const settleGroupExpenses = async (groupId: string, userId: string) => {
  const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      userId: userId,
      settlementType: 'individual' // Use individual settlement by default
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to settle group expenses');
  }

  return response.json();
};

// Add function for full group settlement if needed
export const settleAllGroupExpenses = async (groupId: string, userId: string) => {
  const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      userId: userId,
      settlementType: 'full' // Full settlement for all members
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to settle all group expenses');
  }

  return response.json();
};

export async function getGroupWalletTransactions(groupId: string): Promise<GroupWalletTransaction[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/wallet/transactions`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch group wallet transactions');
    }
  } catch (e) {
    console.error('Error fetching group wallet transactions:', e);
    throw e;
  }
}

export async function calculateOptimalSettlement(
  groupId: string
): Promise<Array<{ from: string; to: string; amount: number }>> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/settlement-calculation`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to calculate optimal settlement');
    }
  } catch (e) {
    console.error('Error calculating optimal settlement:', e);
    throw e;
  }
} 
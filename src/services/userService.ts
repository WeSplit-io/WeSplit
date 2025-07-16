import { firebaseDataService } from './firebaseDataService';

export async function findUserByEmail(email: string) {
  try {
    // For now, return null as Firebase doesn't have a direct email lookup
    // This would need to be implemented with a custom index or query
    return null;
  } catch (e) {
    console.error('Error finding user by email:', e);
    throw e;
  }
}

export interface CreateUserData {
  email: string;
  name: string;
  walletAddress?: string;
  walletPublicKey?: string;
  avatar?: string;
}

export async function createUser(userData: CreateUserData) {
  try {
    return await firebaseDataService.user.createUser({
      email: userData.email,
      name: userData.name,
      wallet_address: userData.walletAddress || '',
      wallet_public_key: userData.walletPublicKey || '',
      avatar: userData.avatar || ''
    });
  } catch (e) {
    console.error('Error creating user:', e);
    throw e;
  }
}

export async function loginUser(email: string) {
  try {
    // Firebase authentication is handled separately
    // This function is kept for compatibility but doesn't need to do anything
    return { success: true };
  } catch (e) {
    console.error('Error logging in user:', e);
    throw e;
  }
}

export async function getUserWallet(userId: number) {
  try {
    const user = await firebaseDataService.user.getCurrentUser(userId.toString());
    return {
      walletAddress: user.wallet_address,
      walletPublicKey: user.wallet_public_key
    };
  } catch (e) {
    console.error('Error fetching user wallet:', e);
    throw e;
  }
}

export async function updateUserWallet(userId: number, walletData: { walletAddress: string; walletPublicKey: string }) {
  try {
    return await firebaseDataService.user.updateUser(userId.toString(), {
      wallet_address: walletData.walletAddress,
      wallet_public_key: walletData.walletPublicKey
    });
  } catch (e) {
    console.error('Error updating user wallet:', e);
    throw e;
  }
}

export async function updateUserAvatar(userId: number, avatarData: { avatar: string }) {
  try {
    return await firebaseDataService.user.updateUser(userId.toString(), {
      avatar: avatarData.avatar
    });
  } catch (e) {
    console.error('Error updating user avatar:', e);
    throw e;
  }
} 
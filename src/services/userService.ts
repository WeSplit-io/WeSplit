import { apiRequest } from '../config/api';

export async function findUserByEmail(email: string) {
  try {
    return await apiRequest(`/api/users/findByEmail?email=${encodeURIComponent(email)}`);
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
    return await apiRequest('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
  } catch (e) {
    console.error('Error creating user:', e);
    throw e;
  }
}

export async function loginUser(email: string) {
  try {
    return await apiRequest('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
  } catch (e) {
    console.error('Error logging in user:', e);
    throw e;
  }
}

export async function getUserWallet(userId: number) {
  try {
    return await apiRequest(`/api/users/${userId}/wallet`);
  } catch (e) {
    console.error('Error fetching user wallet:', e);
    throw e;
  }
}

export async function updateUserWallet(userId: number, walletData: { walletAddress: string; walletPublicKey: string }) {
  try {
    return await apiRequest(`/api/users/${userId}/wallet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(walletData),
    });
  } catch (e) {
    console.error('Error updating user wallet:', e);
    throw e;
  }
}

export async function updateUserAvatar(userId: number, avatarData: { avatar: string }) {
  try {
    return await apiRequest(`/api/users/${userId}/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(avatarData),
    });
  } catch (e) {
    console.error('Error updating user avatar:', e);
    throw e;
  }
} 
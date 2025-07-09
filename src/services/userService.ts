const BACKEND_URL = 'http://192.168.1.75:4000';

export async function findUserByEmail(email: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/findByEmail?email=${encodeURIComponent(email)}`);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (e) {
    console.error('Error finding user by email:', e);
    return null;
  }
}

export async function createUser(userData: {
  email: string;
  name: string;
  walletAddress: string;
  walletPublicKey: string;
  walletSecretKey?: string;
  avatar?: string;
}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create user');
    }
  } catch (e) {
    console.error('Error creating user:', e);
    throw e;
  }
}

export async function loginUser(email: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }
  } catch (e) {
    console.error('Error logging in user:', e);
    throw e;
  }
}

export async function getUserWallet(userId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/wallet`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get wallet info');
    }
  } catch (e) {
    console.error('Error getting wallet info:', e);
    throw e;
  }
}

export async function updateUserWallet(userId: string, walletAddress: string, walletPublicKey: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/wallet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        walletPublicKey
      }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update wallet');
    }
  } catch (e) {
    console.error('Error updating wallet:', e);
    throw e;
  }
}

export async function updateUserAvatar(userId: string, avatar: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ avatar }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update avatar');
    }
  } catch (e) {
    console.error('Error updating avatar:', e);
    throw e;
  }
} 
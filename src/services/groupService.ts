const BACKEND_URL = 'http://192.168.1.75:4000';

export interface ExpenseByCurrency {
  currency: string;
  total_amount: number;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  category: string;
  currency: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  member_count: number;
  expense_count: number;
  expenses_by_currency: ExpenseByCurrency[];
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${userId}`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch groups');
    }
  } catch (e) {
    console.error('Error fetching groups:', e);
    throw e;
  }
}

export async function createGroup(groupData: {
  name: string;
  description?: string;
  category?: string;
  currency?: string;
  createdBy: string;
  members?: string[];
}): Promise<Group> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groupData),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create group');
    }
  } catch (e) {
    console.error('Error creating group:', e);
    throw e;
  }
}

export interface GroupMember {
  id: number;
  name: string;
  email: string;
  wallet_address: string;
  joined_at: string;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/members`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch group members');
    }
  } catch (e) {
    console.error('Error fetching group members:', e);
    throw e;
  }
}

export async function generateInviteLink(groupId: string, userId: string): Promise<{
  inviteLink: string;
  inviteCode: string;
  groupName: string;
  expiresAt: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate invite link');
    }
  } catch (e) {
    console.error('Error generating invite link:', e);
    throw e;
  }
}

export async function joinGroupViaInvite(inviteCode: string, userId: string): Promise<{
  message: string;
  groupId: number;
  groupName: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/join/${inviteCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to join group via invite');
    }
  } catch (e) {
    console.error('Error joining group via invite:', e);
    throw e;
  }
}

export async function leaveGroup(groupId: string, userId: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to leave group');
    }
  } catch (e) {
    console.error('Error leaving group:', e);
    throw e;
  }
}

export async function deleteGroup(groupId: string, userId: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete group');
    }
  } catch (e) {
    console.error('Error deleting group:', e);
    throw e;
  }
}

export async function getGroupInviteCode(groupId: string, userId: string): Promise<{
  inviteCode: string;
  expiresAt: string;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/invite-code`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get invite code');
    }
  } catch (e) {
    console.error('Error getting invite code:', e);
    throw e;
  }
} 
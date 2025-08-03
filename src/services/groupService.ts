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
  icon: string;
  color: string;
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

export async function getGroupDetails(groupId: string): Promise<Group> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/details/${groupId}`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch group details');
    }
  } catch (e) {
    console.error('Error fetching group details:', e);
    throw e;
  }
}

export async function createGroup(groupData: {
  name: string;
  description?: string;
  category?: string;
  currency?: string;
  icon?: string;
  color?: string;
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

export async function updateGroup(
  groupId: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    category?: string;
    currency?: string;
    icon?: string;
    color?: string;
  }
): Promise<{ message: string; group: Group }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, ...updates }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update group');
    }
  } catch (e) {
    console.error('Error updating group:', e);
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

export interface UserContact extends GroupMember {
  first_met_at: string;
  mutual_groups_count: number;
  isFavorite?: boolean;
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

export async function getUserContacts(userId: string): Promise<UserContact[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/contacts`);
    if (response.ok) {
      const contacts = await response.json();
      // Add isFavorite flag (you could store this in database or local storage)
      return contacts.map((contact: UserContact) => ({
        ...contact,
        isFavorite: false // Default to false, you can implement favorites later
      }));
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch user contacts');
    }
  } catch (e) {
    console.error('Error fetching user contacts:', e);
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
      throw new Error(errorData.error || 'Failed to get group invite code');
    }
  } catch (e) {
    console.error('Error getting group invite code:', e);
    throw e;
  }
}

// Settlement-related functions
export interface SettlementTransaction {
  userId: number;
  amount: number;
  currency: string;
  address: string;
  name: string;
}

export interface SettlementResult {
  message: string;
  amountSettled?: number;
  settlements: SettlementTransaction[];
}

export async function settleGroupExpenses(
  groupId: string, 
  userId: string, 
  settlementType: 'individual' | 'full' = 'individual'
): Promise<SettlementResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, settlementType }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to settle group expenses');
    }
  } catch (e) {
    console.error('Error settling group expenses:', e);
    throw e;
  }
}

export interface SettlementCalculation {
  from: string;
  to: string;
  amount: number;
  fromName: string;
  toName: string;
}

export async function getSettlementCalculation(groupId: string): Promise<SettlementCalculation[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/settlement-calculation`);
    
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to calculate settlement');
    }
  } catch (e) {
    console.error('Error calculating settlement:', e);
    throw e;
  }
}

export async function recordPersonalSettlement(
  groupId: string,
  userId: string,
  recipientId: string,
  amount: number,
  currency: string = 'USDC'
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/record-settlement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, amount, recipientId, currency }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to record settlement');
    }
  } catch (e) {
    console.error('Error recording settlement:', e);
    throw e;
  }
}

// Reminder-related interfaces and functions
export interface ReminderCooldown {
  nextAllowedAt: string;
  timeRemainingMinutes?: number;
  formattedTimeRemaining?: string;
}

export interface ReminderStatus {
  individualCooldowns: { [recipientId: string]: ReminderCooldown };
  bulkCooldown: ReminderCooldown | null;
}

export async function sendPaymentReminder(
  groupId: string,
  senderId: string,
  recipientId: string,
  amount: number
): Promise<{ success: boolean; message: string; recipientName: string; amount: number }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ senderId, recipientId, amount, reminderType: 'individual' }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send reminder');
    }
  } catch (e) {
    console.error('Error sending reminder:', e);
    throw e;
  }
}

export async function sendBulkPaymentReminders(
  groupId: string,
  senderId: string,
  debtors: { recipientId: string; amount: number; name: string }[]
): Promise<{ 
  success: boolean; 
  message: string; 
  results: { recipientId: string; recipientName: string; amount: number; success: boolean }[];
  totalAmount: number;
}> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/send-reminder-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ senderId, debtors }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send bulk reminders');
    }
  } catch (e) {
    console.error('Error sending bulk reminders:', e);
    throw e;
  }
}

export async function getReminderStatus(
  groupId: string,
  userId: string
): Promise<ReminderStatus> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/groups/${groupId}/reminder-status/${userId}`);
    
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get reminder status');
    }
  } catch (e) {
    console.error('Error getting reminder status:', e);
    throw e;
  }
} 
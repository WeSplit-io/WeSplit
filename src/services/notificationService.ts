const BACKEND_URL = 'http://192.168.1.75:4000';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'settlement_request' | 'settlement_notification' | 'funding_notification' | 'payment_request' | 'general';
  data?: any; // Additional data for the notification
  read: boolean;
  created_at: string;
}

// Send notification to a specific user
export async function sendNotification(
  userId: number,
  title: string,
  message: string,
  type: Notification['type'],
  data?: any
): Promise<Notification> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title,
        message,
        type,
        data
      }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send notification');
    }
  } catch (e) {
    console.error('Error sending notification:', e);
    throw e;
  }
}

// Send notifications to multiple users
export async function sendNotificationsToUsers(
  userIds: number[],
  title: string,
  message: string,
  type: Notification['type'],
  data?: any
): Promise<Notification[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds,
        title,
        message,
        type,
        data
      }),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send notifications');
    }
  } catch (e) {
    console.error('Error sending bulk notifications:', e);
    throw e;
  }
}

// Get notifications for a user
export async function getUserNotifications(userId: number): Promise<Notification[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/${userId}`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch notifications');
    }
  } catch (e) {
    console.error('Error fetching notifications:', e);
    throw e;
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to mark notification as read');
    }
  } catch (e) {
    console.error('Error marking notification as read:', e);
    throw e;
  }
}

// Send settlement request notifications
export async function sendSettlementRequestNotifications(
  groupId: number,
  groupName: string,
  requestedBy: { id: number; name: string },
  membersWhoOwe: Array<{ id: number; name: string; amount: number; currency: string }>,
  membersWhoAdvanced: Array<{ id: number; name: string; amount: number; currency: string }>
): Promise<void> {
  try {
    // Send notifications to members who owe money
    for (const member of membersWhoOwe) {
      await sendNotification(
        member.id,
        'Settlement Request',
        `${requestedBy.name} has requested settlement for ${groupName}. Please send ${member.amount.toFixed(4)} ${member.currency} to the group wallet.`,
        'settlement_request',
        {
          groupId,
          groupName,
          requestedBy: requestedBy.id,
          requestedByName: requestedBy.name,
          amountOwed: member.amount,
          currency: member.currency,
          settlementType: 'payment_required'
        }
      );
    }

    // Send notifications to members who advanced funds
    for (const member of membersWhoAdvanced) {
      await sendNotification(
        member.id,
        'Settlement in Progress',
        `${requestedBy.name} has initiated settlement for ${groupName}. You will receive ${member.amount.toFixed(4)} ${member.currency} once all members contribute to the group wallet.`,
        'settlement_notification',
        {
          groupId,
          groupName,
          requestedBy: requestedBy.id,
          requestedByName: requestedBy.name,
          amountToReceive: member.amount,
          currency: member.currency,
          settlementType: 'payment_incoming'
        }
      );
    }
  } catch (error) {
    console.error('Error sending settlement notifications:', error);
    throw error;
  }
} 
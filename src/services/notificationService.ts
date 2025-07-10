import { apiRequest } from '../config/api';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'settlement_request' | 'settlement_notification' | 'funding_notification' | 'payment_request' | 'general';
  data?: any; // Additional data for the notification
  is_read: boolean; // Rename from 'read' to 'is_read' to match types/index
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
    return await apiRequest<Notification>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        title,
        message,
        type,
        data
      }),
    });
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
    return await apiRequest<Notification[]>('/api/notifications/bulk', {
      method: 'POST',
      body: JSON.stringify({
        userIds,
        title,
        message,
        type,
        data
      }),
    });
  } catch (e) {
    console.error('Error sending bulk notifications:', e);
    throw e;
  }
}

// Get notifications for a user
export async function getUserNotifications(userId: number): Promise<Notification[]> {
  try {
    return await apiRequest<Notification[]>(`/api/notifications/${userId}`);
  } catch (e) {
    console.error('Error fetching notifications:', e);
    throw e;
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    await apiRequest<void>(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
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
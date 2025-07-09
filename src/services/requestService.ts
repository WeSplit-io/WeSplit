const BACKEND_URL = 'http://192.168.1.75:4000';

export interface PaymentRequest {
  id: number;
  sender_id: number;
  recipient_id: number;
  amount: number;
  currency: string;
  description?: string;
  group_id?: number;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
  sender_name?: string;
  recipient_name?: string;
  sender_email?: string;
  recipient_email?: string;
  sender_wallet?: string;
  recipient_wallet?: string;
  group_name?: string;
}

export interface CreatePaymentRequestData {
  senderId: number;
  recipientId: number;
  amount: number;
  currency: string;
  description?: string;
  groupId?: number;
}

export interface UpdateRequestStatusData {
  status: 'accepted' | 'declined' | 'completed';
  userId: number;
}

export async function createPaymentRequest(data: CreatePaymentRequestData): Promise<PaymentRequest> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment request');
    }
  } catch (e) {
    console.error('Error creating payment request:', e);
    throw e;
  }
}

export async function getPaymentRequests(userId: number, type: 'sent' | 'received' | 'all' = 'all'): Promise<PaymentRequest[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/requests/${userId}?type=${type}`);

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch payment requests');
    }
  } catch (e) {
    console.error('Error fetching payment requests:', e);
    throw e;
  }
}

export async function getPaymentRequest(requestId: number): Promise<PaymentRequest> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/requests/request/${requestId}`);

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch payment request');
    }
  } catch (e) {
    console.error('Error fetching payment request:', e);
    throw e;
  }
}

export async function updatePaymentRequestStatus(requestId: number, data: UpdateRequestStatusData): Promise<{ message: string; requestId: number; status: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/requests/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update payment request status');
    }
  } catch (e) {
    console.error('Error updating payment request status:', e);
    throw e;
  }
}

export async function deletePaymentRequest(requestId: number, userId: number): Promise<{ message: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/requests/${requestId}`, {
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
      throw new Error(errorData.error || 'Failed to delete payment request');
    }
  } catch (e) {
    console.error('Error deleting payment request:', e);
    throw e;
  }
}

// Helper function to get pending payment requests for a user
export async function getPendingPaymentRequests(userId: number): Promise<PaymentRequest[]> {
  try {
    const requests = await getPaymentRequests(userId, 'received');
    return requests.filter(request => request.status === 'pending');
  } catch (e) {
    console.error('Error fetching pending payment requests:', e);
    throw e;
  }
}

// Helper function to get sent payment requests for a user
export async function getSentPaymentRequests(userId: number): Promise<PaymentRequest[]> {
  try {
    return await getPaymentRequests(userId, 'sent');
  } catch (e) {
    console.error('Error fetching sent payment requests:', e);
    throw e;
  }
}

// Helper function to accept a payment request
export async function acceptPaymentRequest(requestId: number, userId: number): Promise<{ message: string; requestId: number; status: string }> {
  return await updatePaymentRequestStatus(requestId, { status: 'accepted', userId });
}

// Helper function to decline a payment request
export async function declinePaymentRequest(requestId: number, userId: number): Promise<{ message: string; requestId: number; status: string }> {
  return await updatePaymentRequestStatus(requestId, { status: 'declined', userId });
}

// Helper function to mark a payment request as completed
export async function completePaymentRequest(requestId: number, userId: number): Promise<{ message: string; requestId: number; status: string }> {
  return await updatePaymentRequestStatus(requestId, { status: 'completed', userId });
} 
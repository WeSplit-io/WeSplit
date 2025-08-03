import { apiRequest } from '../config/api';

export interface PaymentRequest {
  id: number;
  senderId: number;
  recipientId: number;
  amount: number;
  currency: string;
  description?: string;
  groupId?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: number;
    name: string;
    email: string;
  };
  recipient?: {
    id: number;
    name: string;
    email: string;
  };
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
  status: 'accepted' | 'rejected' | 'cancelled';
  userId: number;
}

export async function createPaymentRequest(data: CreatePaymentRequestData): Promise<PaymentRequest> {
  try {
    return await apiRequest<PaymentRequest>('/api/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error('Error creating payment request:', e);
    throw e;
  }
}

export async function getPaymentRequests(userId: number, type: 'sent' | 'received' | 'all' = 'all'): Promise<PaymentRequest[]> {
  try {
    return await apiRequest<PaymentRequest[]>(`/api/requests/${userId}?type=${type}`);
  } catch (e) {
    console.error('Error fetching payment requests:', e);
    throw e;
  }
}

export async function getPaymentRequest(requestId: number): Promise<PaymentRequest> {
  try {
    return await apiRequest<PaymentRequest>(`/api/requests/request/${requestId}`);
  } catch (e) {
    console.error('Error fetching payment request:', e);
    throw e;
  }
}

export async function updatePaymentRequestStatus(requestId: number, data: UpdateRequestStatusData): Promise<{ message: string; requestId: number; status: string }> {
  try {
    return await apiRequest<{ message: string; requestId: number; status: string }>(`/api/requests/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.error('Error updating payment request status:', e);
    throw e;
  }
}

export async function deletePaymentRequest(requestId: number): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>(`/api/requests/${requestId}`, {
      method: 'DELETE',
    });
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
  return await updatePaymentRequestStatus(requestId, { status: 'rejected', userId });
}

// Helper function to mark a payment request as completed
export async function completePaymentRequest(requestId: number, userId: number): Promise<{ message: string; requestId: number; status: string }> {
  return await updatePaymentRequestStatus(requestId, { status: 'cancelled', userId });
} 
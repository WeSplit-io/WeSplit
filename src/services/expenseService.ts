import { apiRequest } from '../config/api';

export interface Expense {
  id: number;
  group_id: number;
  description: string;
  amount: number;
  currency: string;
  paid_by: number;
  category: string;
  split_type?: string;
  split_data?: any;
  created_at: string;
  updated_at: string;
  paid_by_user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateExpenseData {
  description: string;
  amount: number;
  currency: string;
  paidBy: number;
  groupId: number;
  category: string;
  splitType?: string;
  splitData?: any;
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  try {
    return await apiRequest<Expense[]>(`/api/expenses/${groupId}`);
  } catch (e) {
    console.error('Error fetching group expenses:', e);
    throw e;
  }
}

export async function createExpense(expenseData: CreateExpenseData): Promise<Expense> {
  try {
    return await apiRequest<Expense>('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    });
  } catch (e) {
    console.error('Error creating expense:', e);
    throw e;
  }
}

export async function updateExpense(expenseId: number, updates: Partial<Expense>): Promise<Expense> {
  try {
    return await apiRequest<Expense>(`/api/expenses/${expenseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
  } catch (e) {
    console.error('Error updating expense:', e);
    throw e;
  }
}

export async function deleteExpense(expenseId: number): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>(`/api/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.error('Error deleting expense:', e);
    throw e;
  }
} 
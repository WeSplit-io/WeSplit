const BACKEND_URL = 'http://192.168.1.75:4000';

export interface Expense {
  id: number;
  description: string;
  amount: number;
  currency: string;
  paid_by: number;
  group_id: number;
  category: string;
  created_at: string;
  paid_by_name: string;
  paid_by_wallet: string;
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/expenses/${groupId}`);
    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch expenses');
    }
  } catch (e) {
    console.error('Error fetching expenses:', e);
    throw e;
  }
}

export async function createExpense(expenseData: {
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  groupId: string;
  category?: string;
}): Promise<Expense> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create expense');
    }
  } catch (e) {
    console.error('Error creating expense:', e);
    throw e;
  }
}

export async function updateExpense(expenseId: number, expenseData: {
  description: string;
  amount: number;
  currency: string;
  category?: string;
}): Promise<Expense> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/expenses/${expenseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    });

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update expense');
    }
  } catch (e) {
    console.error('Error updating expense:', e);
    throw e;
  }
}

export async function deleteExpense(expenseId: number): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete expense');
    }
  } catch (e) {
    console.error('Error deleting expense:', e);
    throw e;
  }
} 
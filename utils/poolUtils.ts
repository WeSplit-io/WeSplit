// Pool and expense management utilities

export interface PoolMember {
  id: string;
  address: string;
  name: string;
  balance: number; // in USDC
}

export interface Expense {
  id: string;
  amount: number; // in SOL
  amountUsdc: number; // converted to USDC
  description: string;
  paidBy: string; // member address
  timestamp: number;
  poolId: string;
}

export interface Pool {
  id: string;
  name: string;
  members: PoolMember[];
  expenses: Expense[];
  createdAt: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number; // in USDC
}

export class PoolUtils {
  /**
   * Create a new expense pool
   */
  static createPool(name: string, members: string[], creatorAddress: string): Pool {
    const poolMembers: PoolMember[] = members.map((address, index) => ({
      id: `member-${index}`,
      address,
      name: `Member ${index + 1}`,
      balance: 0,
    }));

    return {
      id: `pool-${Date.now()}`,
      name,
      members: poolMembers,
      expenses: [],
      createdAt: Date.now(),
    };
  }

  /**
   * Add an expense to a pool
   */
  static addExpense(
    pool: Pool,
    amount: number, // in SOL
    amountUsdc: number, // in USDC
    description: string,
    paidBy: string
  ): Pool {
    const expense: Expense = {
      id: `expense-${Date.now()}`,
      amount,
      amountUsdc,
      description,
      paidBy,
      timestamp: Date.now(),
      poolId: pool.id,
    };

    // Update the payer's balance
    const updatedMembers = pool.members.map(member => {
      if (member.address === paidBy) {
        return { ...member, balance: member.balance + amountUsdc };
      }
      return member;
    });

    return {
      ...pool,
      members: updatedMembers,
      expenses: [...pool.expenses, expense],
    };
  }

  /**
   * Calculate optimal settlements using equilibrium algorithm
   * This implements a simplified version of the equilibrium algorithm
   */
  static calculateSettlements(pool: Pool): Settlement[] {
    const settlements: Settlement[] = [];
    const members = [...pool.members];

    // Calculate total expenses and average per person
    const totalExpenses = pool.expenses.reduce((sum, expense) => sum + expense.amountUsdc, 0);
    const averagePerPerson = totalExpenses / members.length;

    // Calculate each person's net balance
    const netBalances = members.map(member => ({
      ...member,
      netBalance: member.balance - averagePerPerson,
    }));

    // Sort by net balance (creditors first, then debtors)
    netBalances.sort((a, b) => b.netBalance - a.netBalance);

    // Simple settlement algorithm
    let i = 0;
    let j = netBalances.length - 1;

    while (i < j) {
      const creditor = netBalances[i];
      const debtor = netBalances[j];

      if (creditor.netBalance <= 0 || debtor.netBalance >= 0) {
        break;
      }

      const settlementAmount = Math.min(
        Math.abs(creditor.netBalance),
        Math.abs(debtor.netBalance)
      );

      if (settlementAmount > 0.01) { // Minimum settlement threshold
        settlements.push({
          from: debtor.address,
          to: creditor.address,
          amount: settlementAmount,
        });

        creditor.netBalance -= settlementAmount;
        debtor.netBalance += settlementAmount;
      }

      if (Math.abs(creditor.netBalance) < 0.01) i++;
      if (Math.abs(debtor.netBalance) < 0.01) j--;
    }

    return settlements;
  }

  /**
   * Get member balance summary
   */
  static getMemberBalance(pool: Pool, memberAddress: string): number {
    const member = pool.members.find(m => m.address === memberAddress);
    return member?.balance || 0;
  }

  /**
   * Get total pool expenses
   */
  static getTotalExpenses(pool: Pool): number {
    return pool.expenses.reduce((sum, expense) => sum + expense.amountUsdc, 0);
  }

  /**
   * Get average expense per person
   */
  static getAveragePerPerson(pool: Pool): number {
    const total = this.getTotalExpenses(pool);
    return total / pool.members.length;
  }

  /**
   * Check if a member is a net creditor or debtor
   */
  static getMemberStatus(pool: Pool, memberAddress: string): 'creditor' | 'debtor' | 'even' {
    const balance = this.getMemberBalance(pool, memberAddress);
    const average = this.getAveragePerPerson(pool);
    const netBalance = balance - average;

    if (Math.abs(netBalance) < 0.01) return 'even';
    return netBalance > 0 ? 'creditor' : 'debtor';
  }
} 